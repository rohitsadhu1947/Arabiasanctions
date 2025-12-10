"""User and Access Control Models"""
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Table, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum


class PermissionType(str, enum.Enum):
    """Permission types for access control"""
    # Screening Permissions
    SCREEN_INDIVIDUAL = "screen:individual"
    SCREEN_CORPORATE = "screen:corporate"
    SCREEN_BULK = "screen:bulk"
    
    # Decision Permissions
    DECISION_RELEASE = "decision:release"
    DECISION_FLAG = "decision:flag"
    DECISION_ESCALATE = "decision:escalate"
    
    # Workflow Permissions
    WORKFLOW_APPROVE = "workflow:approve"
    WORKFLOW_REJECT = "workflow:reject"
    WORKFLOW_REASSIGN = "workflow:reassign"
    
    # Admin Permissions
    ADMIN_USERS = "admin:users"
    ADMIN_ROLES = "admin:roles"
    ADMIN_LISTS = "admin:lists"
    ADMIN_CONFIG = "admin:config"
    
    # Report Permissions
    REPORT_VIEW = "report:view"
    REPORT_EXPORT = "report:export"
    REPORT_AUDIT = "report:audit"


# Association table for User-Role many-to-many
user_role_association = Table(
    'user_role_association',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('user.id', ondelete='CASCADE'), primary_key=True),
    Column('role_id', Integer, ForeignKey('role.id', ondelete='CASCADE'), primary_key=True)
)

# Association table for Role-Permission many-to-many
role_permission_association = Table(
    'role_permission_association',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('role.id', ondelete='CASCADE'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permission.id', ondelete='CASCADE'), primary_key=True)
)


class Permission(Base):
    """Permission model for granular access control"""
    
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    category = Column(String(50))  # screening, decision, workflow, admin, report
    
    roles = relationship("Role", secondary=role_permission_association, back_populates="permissions")


class Role(Base):
    """Role model for role-based access control"""
    
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    level = Column(Integer, default=1)  # Hierarchy level for escalation
    is_system = Column(Boolean, default=False)  # System roles cannot be deleted
    
    # Country-specific role (null = global)
    country_id = Column(Integer, ForeignKey('country.id', ondelete='SET NULL'), nullable=True)
    
    permissions = relationship("Permission", secondary=role_permission_association, back_populates="roles")
    users = relationship("User", secondary=user_role_association, back_populates="roles")
    country = relationship("Country", back_populates="roles")


class User(Base):
    """User model with multi-tenant support"""
    
    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    
    # Profile
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    employee_id = Column(String(50), unique=True, index=True)
    phone = Column(String(20))
    
    # Organization
    country_id = Column(Integer, ForeignKey('country.id', ondelete='RESTRICT'), nullable=False)
    branch_id = Column(Integer, ForeignKey('branch.id', ondelete='SET NULL'), nullable=True)
    department = Column(String(100))
    
    # Status
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    last_login = Column(String(50))
    
    # Relationships
    country = relationship("Country", back_populates="users")
    branch = relationship("Branch", back_populates="users")
    roles = relationship("Role", secondary=user_role_association, back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")
    screening_requests = relationship("ScreeningRequest", back_populates="requested_by")
    workflow_actions = relationship("WorkflowAction", back_populates="performed_by")
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    @property
    def all_permissions(self) -> set[str]:
        """Get all permissions from all roles"""
        perms = set()
        for role in self.roles:
            for perm in role.permissions:
                perms.add(perm.code)
        return perms
    
    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission"""
        if self.is_superuser:
            return True
        return permission in self.all_permissions


# Alias for the association model if needed directly
class UserRole(Base):
    """Explicit user-role association for additional metadata"""
    __tablename__ = 'user_role_explicit'
    
    user_id = Column(Integer, ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    role_id = Column(Integer, ForeignKey('role.id', ondelete='CASCADE'), nullable=False)
    assigned_by = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'))
    notes = Column(Text)

