"""Workflow Engine Models"""
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum


class CaseStatus(str, enum.Enum):
    """Workflow case status"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING_APPROVAL = "pending_approval"
    ESCALATED = "escalated"
    RETURNED = "returned"  # Ping-pong
    CLOSED = "closed"
    CANCELLED = "cancelled"


class CasePriority(str, enum.Enum):
    """Case priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ActionType(str, enum.Enum):
    """Types of workflow actions"""
    ASSIGN = "assign"
    REVIEW = "review"
    APPROVE = "approve"
    REJECT = "reject"
    ESCALATE = "escalate"
    RETURN = "return"
    COMMENT = "comment"
    ATTACH = "attach"
    CLOSE = "close"


class WorkflowCase(Base):
    """Workflow case for screening match review"""
    
    # Case identification
    case_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Link to screening
    screening_result_id = Column(Integer, ForeignKey('screening_result.id', ondelete='CASCADE'), nullable=False)
    screening_match_id = Column(Integer, ForeignKey('screening_match.id', ondelete='SET NULL'))
    
    # Status
    status = Column(SQLEnum(CaseStatus), default=CaseStatus.OPEN)
    priority = Column(SQLEnum(CasePriority), default=CasePriority.MEDIUM)
    
    # Assignment
    assigned_to_id = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'))
    assigned_by_id = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'))
    assigned_role_id = Column(Integer, ForeignKey('role.id', ondelete='SET NULL'))
    
    # Escalation
    escalation_level = Column(Integer, default=0)
    escalated_from_id = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'))
    escalation_reason = Column(Text)
    
    # Timing
    due_date = Column(String(50))
    sla_deadline = Column(String(50))
    sla_breached = Column(Boolean, default=False)
    
    # Resolution
    resolution = Column(String(50))
    resolution_notes = Column(Text)
    resolved_by_id = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'))
    resolved_at = Column(String(50))
    
    # Ping-pong tracking
    return_count = Column(Integer, default=0)
    max_returns = Column(Integer, default=3)
    
    # Country/Branch context
    country_id = Column(Integer, ForeignKey('country.id', ondelete='RESTRICT'))
    branch_id = Column(Integer, ForeignKey('branch.id', ondelete='SET NULL'))
    
    # Metadata
    metadata = Column(JSON, default=dict)
    
    # Relationships
    actions = relationship("WorkflowAction", back_populates="case", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<WorkflowCase {self.case_number}>"


class WorkflowAction(Base):
    """Individual action in a workflow case"""
    
    case_id = Column(Integer, ForeignKey('workflow_case.id', ondelete='CASCADE'), nullable=False)
    
    # Action details
    action_type = Column(SQLEnum(ActionType), nullable=False)
    performed_by_id = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'), nullable=False)
    
    # Content
    comment = Column(Text)
    attachments = Column(JSON, default=list)
    
    # For assignments
    assigned_from_id = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'))
    assigned_to_id = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'))
    
    # For escalations
    escalation_level = Column(Integer)
    escalation_rule_id = Column(Integer, ForeignKey('escalation_rule.id', ondelete='SET NULL'))
    
    # Decision (for approve/reject)
    decision = Column(String(50))
    
    # Metadata
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    
    # Relationships
    case = relationship("WorkflowCase", back_populates="actions")
    performed_by = relationship("User", back_populates="workflow_actions", foreign_keys=[performed_by_id])


class EscalationRule(Base):
    """Rules for automatic escalation"""
    
    name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Scope
    country_id = Column(Integer, ForeignKey('country.id', ondelete='CASCADE'))
    is_global = Column(Boolean, default=False)
    
    # Trigger conditions
    trigger_type = Column(String(50), nullable=False)  # sla_breach, score_threshold, manual
    trigger_config = Column(JSON, default=dict)  # e.g., {"hours": 24, "score": 0.95}
    
    # Escalation target
    escalate_to_role_id = Column(Integer, ForeignKey('role.id', ondelete='SET NULL'))
    escalate_to_user_id = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'))
    
    # Settings
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=100)
    
    # Notification
    notify_email = Column(Boolean, default=True)
    notify_sms = Column(Boolean, default=False)
    
    def __repr__(self):
        return f"<EscalationRule {self.name}>"

