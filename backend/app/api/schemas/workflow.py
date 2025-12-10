"""Workflow API Schemas"""
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class CaseStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING_APPROVAL = "pending_approval"
    ESCALATED = "escalated"
    RETURNED = "returned"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class CasePriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ActionType(str, Enum):
    ASSIGN = "assign"
    REVIEW = "review"
    APPROVE = "approve"
    REJECT = "reject"
    ESCALATE = "escalate"
    RETURN = "return"
    COMMENT = "comment"
    ATTACH = "attach"
    CLOSE = "close"


# ==================== Case ====================

class WorkflowCaseCreate(BaseModel):
    """Create a new workflow case"""
    screening_result_id: int
    screening_match_id: Optional[int] = None
    priority: CasePriority = CasePriority.MEDIUM
    assigned_to_id: Optional[int] = None
    due_date: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)


class WorkflowCaseUpdate(BaseModel):
    """Update a workflow case"""
    priority: Optional[CasePriority] = None
    assigned_to_id: Optional[int] = None
    due_date: Optional[str] = None
    status: Optional[CaseStatus] = None


class WorkflowCaseResponse(BaseModel):
    """Workflow case response"""
    id: int
    case_number: str
    screening_result_id: int
    screening_match_id: Optional[int]
    
    # Status
    status: CaseStatus
    priority: CasePriority
    
    # Assignment
    assigned_to_id: Optional[int]
    assigned_to_name: Optional[str]
    assigned_by_id: Optional[int]
    assigned_by_name: Optional[str]
    
    # Escalation
    escalation_level: int
    escalated_from_name: Optional[str]
    escalation_reason: Optional[str]
    
    # Timing
    created_at: str
    due_date: Optional[str]
    sla_deadline: Optional[str]
    sla_breached: bool
    
    # Turn-around time
    tat_hours: Optional[float]
    
    # Resolution
    resolution: Optional[str]
    resolution_notes: Optional[str]
    resolved_by_name: Optional[str]
    resolved_at: Optional[str]
    
    # Ping-pong
    return_count: int
    max_returns: int
    
    # Context
    country_code: Optional[str]
    branch_code: Optional[str]
    
    # Related data
    screened_name: Optional[str]
    highest_match_score: Optional[float]


# ==================== Actions ====================

class WorkflowActionRequest(BaseModel):
    """Request to perform a workflow action"""
    action_type: ActionType
    comment: Optional[str] = Field(None, max_length=2000)
    attachments: Optional[List[str]] = Field(default_factory=list)
    
    # For assignments
    assign_to_user_id: Optional[int] = None
    assign_to_role_id: Optional[int] = None
    
    # For escalation
    escalation_reason: Optional[str] = Field(None, max_length=500)
    
    # For decisions
    decision: Optional[str] = Field(None, max_length=50)


class WorkflowActionResponse(BaseModel):
    """Response for a workflow action"""
    id: int
    case_id: int
    case_number: str
    action_type: ActionType
    performed_by_name: str
    performed_at: str
    comment: Optional[str]
    
    # Result
    success: bool = True
    message: Optional[str]
    
    # State change
    previous_status: Optional[CaseStatus]
    new_status: CaseStatus


# ==================== Escalation Rules ====================

class EscalationRuleCreate(BaseModel):
    """Create an escalation rule"""
    name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    
    # Scope
    country_id: Optional[int] = None
    is_global: bool = False
    
    # Trigger
    trigger_type: str = Field(..., max_length=50)  # sla_breach, score_threshold, manual
    trigger_config: dict = Field(default_factory=dict)
    
    # Target
    escalate_to_role_id: Optional[int] = None
    escalate_to_user_id: Optional[int] = None
    
    # Settings
    is_active: bool = True
    priority: int = Field(100, ge=1, le=999)
    notify_email: bool = True
    notify_sms: bool = False


class EscalationRuleResponse(BaseModel):
    """Escalation rule response"""
    id: int
    name: str
    description: Optional[str]
    
    country_code: Optional[str]
    is_global: bool
    
    trigger_type: str
    trigger_config: dict
    
    escalate_to_role_name: Optional[str]
    escalate_to_user_name: Optional[str]
    
    is_active: bool
    priority: int
    
    created_at: str
    updated_at: str


# ==================== Search/Query ====================

class CaseSearchRequest(BaseModel):
    """Search for workflow cases"""
    # Filters
    case_number: Optional[str] = None
    status: Optional[CaseStatus] = None
    priority: Optional[CasePriority] = None
    assigned_to_id: Optional[int] = None
    
    # Context
    country_code: Optional[str] = None
    branch_code: Optional[str] = None
    
    # Date range
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    
    # SLA
    sla_breached: Optional[bool] = None
    
    # Pagination
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    
    # Sorting
    sort_by: str = "created_at"
    sort_order: str = "desc"


# ==================== Dashboard Stats ====================

class WorkflowDashboardStats(BaseModel):
    """Dashboard statistics for workflow"""
    # Counts by status
    open_cases: int
    in_progress_cases: int
    pending_approval: int
    escalated_cases: int
    
    # SLA metrics
    sla_breached_count: int
    sla_at_risk_count: int  # Within 2 hours of breach
    
    # My work
    my_assigned_cases: int
    my_pending_decisions: int
    
    # Today's activity
    cases_created_today: int
    cases_closed_today: int
    
    # Average TAT
    avg_tat_hours: float
    
    # By priority
    urgent_cases: int
    high_priority_cases: int

