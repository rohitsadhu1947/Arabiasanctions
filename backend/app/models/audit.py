"""Audit Logging Model"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum


class AuditAction(str, enum.Enum):
    """Types of auditable actions"""
    # Authentication
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGE = "password_change"
    
    # Screening
    SCREEN_SUBMIT = "screen_submit"
    SCREEN_COMPLETE = "screen_complete"
    SCREEN_BULK = "screen_bulk"
    
    # Decisions
    DECISION_RELEASE = "decision_release"
    DECISION_FLAG = "decision_flag"
    DECISION_ESCALATE = "decision_escalate"
    DECISION_FALSE_POSITIVE = "decision_false_positive"
    DECISION_TRUE_MATCH = "decision_true_match"
    
    # Workflow
    CASE_CREATE = "case_create"
    CASE_ASSIGN = "case_assign"
    CASE_ESCALATE = "case_escalate"
    CASE_RETURN = "case_return"
    CASE_CLOSE = "case_close"
    
    # Administration
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    ROLE_CREATE = "role_create"
    ROLE_UPDATE = "role_update"
    LIST_UPDATE = "list_update"
    CONFIG_UPDATE = "config_update"
    
    # Reports
    REPORT_GENERATE = "report_generate"
    REPORT_EXPORT = "report_export"
    
    # Data
    DATA_EXPORT = "data_export"
    DATA_IMPORT = "data_import"


class AuditLog(Base):
    """Comprehensive audit trail"""
    
    # Actor
    user_id = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'))
    user_email = Column(String(255))  # Denormalized for historical reference
    user_name = Column(String(200))
    
    # Action
    action = Column(SQLEnum(AuditAction), nullable=False, index=True)
    action_detail = Column(String(500))
    
    # Target
    target_type = Column(String(50))  # user, screening, case, list, etc.
    target_id = Column(String(100))
    target_reference = Column(String(200))  # Human-readable reference
    
    # Context
    country_id = Column(Integer, ForeignKey('country.id', ondelete='SET NULL'))
    country_code = Column(String(3))  # Denormalized
    branch_id = Column(Integer, ForeignKey('branch.id', ondelete='SET NULL'))
    branch_code = Column(String(20))  # Denormalized
    
    # Request details
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    request_id = Column(String(100))  # For tracing
    
    # Data
    old_value = Column(JSON)  # Previous state
    new_value = Column(JSON)  # New state
    metadata = Column(JSON, default=dict)  # Additional context
    
    # Status
    status = Column(String(50), default="success")  # success, failure, error
    error_message = Column(Text)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    def __repr__(self):
        return f"<AuditLog {self.action.value} by {self.user_email}>"

