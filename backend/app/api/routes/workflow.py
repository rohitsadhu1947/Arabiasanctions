"""Workflow API Routes"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import uuid
from app.api.schemas.workflow import (
    WorkflowCaseCreate, WorkflowCaseUpdate, WorkflowCaseResponse,
    WorkflowActionRequest, WorkflowActionResponse,
    EscalationRuleCreate, EscalationRuleResponse,
    CaseSearchRequest, WorkflowDashboardStats,
    CaseStatus, CasePriority, ActionType
)
from app.api.schemas.common import APIResponse, PaginatedResponse, PaginationMeta
from app.api.routes.auth import get_current_user, require_permission, CurrentUser

router = APIRouter()


def generate_case_number() -> str:
    """Generate a unique case number."""
    return f"WF-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


# In-memory storage for workflow cases and actions (in production, use database)
WORKFLOW_CASES: Dict[int, dict] = {}
CASE_ACTIONS: Dict[int, List[dict]] = {}
NEXT_CASE_ID = 1


def create_workflow_case_from_screening(
    screened_name: str,
    highest_score: float,
    reference_id: str,
    country_code: str = "UAE",
    assigned_to_id: int = None,
    assigned_to_name: str = None,
) -> dict:
    """Create a workflow case from screening result."""
    global NEXT_CASE_ID
    
    # Determine priority based on score
    if highest_score >= 0.95:
        priority = CasePriority.URGENT
    elif highest_score >= 0.85:
        priority = CasePriority.HIGH
    elif highest_score >= 0.70:
        priority = CasePriority.MEDIUM
    else:
        priority = CasePriority.LOW
    
    case = {
        "id": NEXT_CASE_ID,
        "case_number": generate_case_number(),
        "screening_result_id": NEXT_CASE_ID,
        "screening_match_id": 1,
        "reference_id": reference_id,
        "status": CaseStatus.OPEN,
        "priority": priority,
        "assigned_to_id": assigned_to_id,
        "assigned_to_name": assigned_to_name or "Unassigned",
        "assigned_by_id": 1,
        "assigned_by_name": "System",
        "escalation_level": 0,
        "escalated_from_name": None,
        "escalation_reason": None,
        "created_at": datetime.utcnow().isoformat(),
        "due_date": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
        "sla_deadline": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
        "sla_breached": False,
        "tat_hours": 0,
        "resolution": None,
        "resolution_notes": None,
        "resolved_by_name": None,
        "resolved_at": None,
        "return_count": 0,
        "max_returns": 3,
        "country_code": country_code,
        "branch_code": "DXB001",
        "screened_name": screened_name,
        "highest_match_score": highest_score,
    }
    
    WORKFLOW_CASES[NEXT_CASE_ID] = case
    CASE_ACTIONS[NEXT_CASE_ID] = [{
        "id": 1,
        "case_id": NEXT_CASE_ID,
        "action_type": "created",
        "performed_by_name": "System",
        "performed_at": datetime.utcnow().isoformat(),
        "comment": f"Case created from screening (Score: {highest_score*100:.0f}%)",
        "previous_status": None,
        "new_status": CaseStatus.OPEN,
    }]
    
    NEXT_CASE_ID += 1
    return case


# Initialize with some demo cases
def init_demo_cases():
    global WORKFLOW_CASES, CASE_ACTIONS, NEXT_CASE_ID
    
    demo_cases = [
        {
            "id": 1,
            "case_number": "WF-20241210-ABC123",
            "screening_result_id": 1,
            "screening_match_id": 1,
            "reference_id": "SCR-20241210-DEMO001",
            "status": CaseStatus.OPEN,
            "priority": CasePriority.HIGH,
            "assigned_to_id": 2,
            "assigned_to_name": "Sarah Johnson",
            "assigned_by_id": 1,
            "assigned_by_name": "Admin User",
            "escalation_level": 0,
            "escalated_from_name": None,
            "escalation_reason": None,
            "created_at": datetime.utcnow().isoformat(),
            "due_date": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
            "sla_deadline": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
            "sla_breached": False,
            "tat_hours": 0,
            "resolution": None,
            "resolution_notes": None,
            "resolved_by_name": None,
            "resolved_at": None,
            "return_count": 0,
            "max_returns": 3,
            "country_code": "UAE",
            "branch_code": "DXB001",
            "screened_name": "Mohammad Al-Rashid (Demo)",
            "highest_match_score": 0.92,
        },
        {
            "id": 2,
            "case_number": "WF-20241210-DEF456",
            "screening_result_id": 2,
            "screening_match_id": 2,
            "reference_id": "SCR-20241210-DEMO002",
            "status": CaseStatus.ESCALATED,
            "priority": CasePriority.URGENT,
            "assigned_to_id": 3,
            "assigned_to_name": "Michael Chen",
            "assigned_by_id": 2,
            "assigned_by_name": "Sarah Johnson",
            "escalation_level": 1,
            "escalated_from_name": "Sarah Johnson",
            "escalation_reason": "Score above 95%, requires senior review",
            "created_at": (datetime.utcnow() - timedelta(hours=4)).isoformat(),
            "due_date": (datetime.utcnow() + timedelta(hours=8)).isoformat(),
            "sla_deadline": (datetime.utcnow() + timedelta(hours=8)).isoformat(),
            "sla_breached": False,
            "tat_hours": 4.0,
            "resolution": None,
            "resolution_notes": None,
            "resolved_by_name": None,
            "resolved_at": None,
            "return_count": 0,
            "max_returns": 3,
            "country_code": "SAU",
            "branch_code": "RUH001",
            "screened_name": "Ahmed Hassan Ibrahim",
            "highest_match_score": 0.96,
        },
    ]
    
    for case in demo_cases:
        WORKFLOW_CASES[case["id"]] = case
        CASE_ACTIONS[case["id"]] = [{
            "id": 1,
            "case_id": case["id"],
            "action_type": "created",
            "performed_by_name": "System",
            "performed_at": (datetime.utcnow() - timedelta(hours=5)).isoformat(),
            "comment": "Demo case initialized",
            "previous_status": None,
            "new_status": CaseStatus.OPEN,
        }]
    
    NEXT_CASE_ID = max(case["id"] for case in demo_cases) + 1


# Initialize demo data
init_demo_cases()


def case_to_response(case: dict) -> WorkflowCaseResponse:
    """Convert a case dict to response model."""
    return WorkflowCaseResponse(
        id=case["id"],
        case_number=case["case_number"],
        screening_result_id=case["screening_result_id"],
        screening_match_id=case["screening_match_id"],
        status=case["status"],
        priority=case["priority"],
        assigned_to_id=case["assigned_to_id"],
        assigned_to_name=case["assigned_to_name"],
        assigned_by_id=case["assigned_by_id"],
        assigned_by_name=case["assigned_by_name"],
        escalation_level=case["escalation_level"],
        escalated_from_name=case["escalated_from_name"],
        escalation_reason=case["escalation_reason"],
        created_at=case["created_at"],
        due_date=case["due_date"],
        sla_deadline=case["sla_deadline"],
        sla_breached=case["sla_breached"],
        tat_hours=case["tat_hours"],
        resolution=case["resolution"],
        resolution_notes=case["resolution_notes"],
        resolved_by_name=case["resolved_by_name"],
        resolved_at=case["resolved_at"],
        return_count=case["return_count"],
        max_returns=case["max_returns"],
        country_code=case["country_code"],
        branch_code=case["branch_code"],
        screened_name=case["screened_name"],
        highest_match_score=case["highest_match_score"],
    )


@router.get("/dashboard", response_model=APIResponse[WorkflowDashboardStats])
async def get_dashboard_stats(
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get workflow dashboard statistics."""
    cases = list(WORKFLOW_CASES.values())
    
    stats = WorkflowDashboardStats(
        open_cases=len([c for c in cases if c["status"] == CaseStatus.OPEN]),
        in_progress_cases=len([c for c in cases if c["status"] == CaseStatus.IN_PROGRESS]),
        pending_approval=len([c for c in cases if c["status"] == CaseStatus.PENDING_APPROVAL]),
        escalated_cases=len([c for c in cases if c["status"] == CaseStatus.ESCALATED]),
        sla_breached_count=len([c for c in cases if c["sla_breached"]]),
        sla_at_risk_count=2,
        my_assigned_cases=len([c for c in cases if c["assigned_to_id"] == current_user.id]),
        my_pending_decisions=len([c for c in cases if c["assigned_to_id"] == current_user.id and c["status"] in [CaseStatus.OPEN, CaseStatus.IN_PROGRESS]]),
        cases_created_today=len([c for c in cases]),
        cases_closed_today=len([c for c in cases if c["status"] == CaseStatus.CLOSED]),
        avg_tat_hours=6.5,
        urgent_cases=len([c for c in cases if c["priority"] == CasePriority.URGENT]),
        high_priority_cases=len([c for c in cases if c["priority"] == CasePriority.HIGH]),
    )
    
    return APIResponse(success=True, data=stats)


@router.get("/cases", response_model=PaginatedResponse[WorkflowCaseResponse])
async def list_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[CaseStatus] = None,
    priority: Optional[CasePriority] = None,
    assigned_to_me: bool = False,
    sla_breached: Optional[bool] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """List workflow cases with filters."""
    cases = list(WORKFLOW_CASES.values())
    
    # Apply filters
    if status:
        cases = [c for c in cases if c["status"] == status]
    if priority:
        cases = [c for c in cases if c["priority"] == priority]
    if assigned_to_me:
        cases = [c for c in cases if c["assigned_to_id"] == current_user.id]
    if sla_breached is not None:
        cases = [c for c in cases if c["sla_breached"] == sla_breached]
    
    # Sort by created_at descending (newest first)
    cases = sorted(cases, key=lambda x: x["created_at"], reverse=True)
    
    total = len(cases)
    start = (page - 1) * page_size
    end = start + page_size
    
    return PaginatedResponse(
        success=True,
        data=[case_to_response(c) for c in cases[start:end]],
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total_items=total,
            total_pages=(total + page_size - 1) // page_size if total > 0 else 0,
            has_next=end < total,
            has_prev=page > 1,
        )
    )


@router.post("/cases", response_model=APIResponse[WorkflowCaseResponse])
async def create_case(
    request: WorkflowCaseCreate,
    current_user: CurrentUser = Depends(require_permission("workflow:approve"))
):
    """Create a new workflow case."""
    global NEXT_CASE_ID
    
    case = {
        "id": NEXT_CASE_ID,
        "case_number": generate_case_number(),
        "screening_result_id": request.screening_result_id,
        "screening_match_id": request.screening_match_id,
        "reference_id": f"SCR-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}",
        "status": CaseStatus.OPEN,
        "priority": request.priority,
        "assigned_to_id": request.assigned_to_id,
        "assigned_to_name": "Assigned User" if request.assigned_to_id else None,
        "assigned_by_id": current_user.id,
        "assigned_by_name": current_user.full_name,
        "escalation_level": 0,
        "escalated_from_name": None,
        "escalation_reason": None,
        "created_at": datetime.utcnow().isoformat(),
        "due_date": request.due_date,
        "sla_deadline": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
        "sla_breached": False,
        "tat_hours": 0,
        "resolution": None,
        "resolution_notes": None,
        "resolved_by_name": None,
        "resolved_at": None,
        "return_count": 0,
        "max_returns": 3,
        "country_code": current_user.country_code,
        "branch_code": None,
        "screened_name": "New Case Entity",
        "highest_match_score": 0.85,
    }
    
    WORKFLOW_CASES[NEXT_CASE_ID] = case
    CASE_ACTIONS[NEXT_CASE_ID] = [{
        "id": 1,
        "case_id": NEXT_CASE_ID,
        "action_type": "created",
        "performed_by_name": current_user.full_name,
        "performed_at": datetime.utcnow().isoformat(),
        "comment": "Case created manually",
        "previous_status": None,
        "new_status": CaseStatus.OPEN,
    }]
    
    NEXT_CASE_ID += 1
    
    return APIResponse(
        success=True,
        message="Case created successfully",
        data=case_to_response(case),
    )


@router.get("/cases/{case_id}", response_model=APIResponse[WorkflowCaseResponse])
async def get_case(
    case_id: int,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a specific workflow case."""
    case = WORKFLOW_CASES.get(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found"
        )
    
    return APIResponse(success=True, data=case_to_response(case))


@router.put("/cases/{case_id}", response_model=APIResponse[WorkflowCaseResponse])
async def update_case(
    case_id: int,
    request: WorkflowCaseUpdate,
    current_user: CurrentUser = Depends(require_permission("workflow:approve"))
):
    """Update a workflow case."""
    case = WORKFLOW_CASES.get(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found"
        )
    
    # Update fields
    if request.priority:
        case["priority"] = request.priority
    if request.status:
        case["status"] = request.status
    if request.assigned_to_id:
        case["assigned_to_id"] = request.assigned_to_id
    if request.due_date:
        case["due_date"] = request.due_date
    
    WORKFLOW_CASES[case_id] = case
    
    return APIResponse(
        success=True,
        message="Case updated successfully",
        data=case_to_response(case),
    )


@router.post("/cases/{case_id}/action", response_model=APIResponse[WorkflowActionResponse])
async def perform_action(
    case_id: int,
    request: WorkflowActionRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Perform an action on a workflow case."""
    case = WORKFLOW_CASES.get(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found"
        )
    
    # Check permissions based on action type
    permission_map = {
        ActionType.APPROVE: "workflow:approve",
        ActionType.REJECT: "workflow:reject",
        ActionType.ESCALATE: "decision:escalate",
        ActionType.ASSIGN: "workflow:reassign",
        ActionType.RETURN: "workflow:approve",
    }
    
    required_permission = permission_map.get(request.action_type)
    if required_permission and not current_user.is_superuser:
        if required_permission not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{required_permission}' required for this action"
            )
    
    # Determine new status based on action
    previous_status = case["status"]
    new_status = case["status"]
    
    if request.action_type == ActionType.APPROVE:
        new_status = CaseStatus.CLOSED
        case["resolution"] = "approved"
        case["resolution_notes"] = request.comment
        case["resolved_by_name"] = current_user.full_name
        case["resolved_at"] = datetime.utcnow().isoformat()
    elif request.action_type == ActionType.REJECT:
        new_status = CaseStatus.CLOSED
        case["resolution"] = "rejected"
        case["resolution_notes"] = request.comment
        case["resolved_by_name"] = current_user.full_name
        case["resolved_at"] = datetime.utcnow().isoformat()
    elif request.action_type == ActionType.ESCALATE:
        new_status = CaseStatus.ESCALATED
        case["escalation_level"] = case["escalation_level"] + 1
        case["escalated_from_name"] = current_user.full_name
        case["escalation_reason"] = request.escalation_reason or request.comment or "Escalated for review"
    elif request.action_type == ActionType.RETURN:
        new_status = CaseStatus.RETURNED
        case["return_count"] = case["return_count"] + 1
    elif request.action_type == ActionType.ASSIGN:
        new_status = CaseStatus.IN_PROGRESS
        case["assigned_to_id"] = request.assign_to_user_id
        case["assigned_to_name"] = "Assigned User"
        case["assigned_by_name"] = current_user.full_name
    elif request.action_type == ActionType.COMMENT:
        # Comment doesn't change status
        pass
    elif request.action_type == ActionType.REVIEW:
        new_status = CaseStatus.IN_PROGRESS
    
    # Update case status
    case["status"] = new_status
    WORKFLOW_CASES[case_id] = case
    
    # Record action in history
    action_record = {
        "id": len(CASE_ACTIONS.get(case_id, [])) + 1,
        "case_id": case_id,
        "action_type": request.action_type.value,
        "performed_by_name": current_user.full_name,
        "performed_at": datetime.utcnow().isoformat(),
        "comment": request.comment,
        "previous_status": previous_status,
        "new_status": new_status,
    }
    
    if case_id not in CASE_ACTIONS:
        CASE_ACTIONS[case_id] = []
    CASE_ACTIONS[case_id].insert(0, action_record)
    
    response = WorkflowActionResponse(
        id=action_record["id"],
        case_id=case_id,
        case_number=case["case_number"],
        action_type=request.action_type,
        performed_by_name=current_user.full_name,
        performed_at=datetime.utcnow().isoformat(),
        comment=request.comment,
        success=True,
        message=f"Action '{request.action_type.value}' performed successfully",
        previous_status=previous_status,
        new_status=new_status,
    )
    
    return APIResponse(
        success=True,
        message=f"Action performed: {request.action_type.value}",
        data=response,
    )


@router.get("/cases/{case_id}/history", response_model=APIResponse[List[WorkflowActionResponse]])
async def get_case_history(
    case_id: int,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get action history for a workflow case."""
    case = WORKFLOW_CASES.get(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found"
        )
    
    actions = CASE_ACTIONS.get(case_id, [])
    
    history = [
        WorkflowActionResponse(
            id=action["id"],
            case_id=case_id,
            case_number=case["case_number"],
            action_type=ActionType(action["action_type"]) if isinstance(action["action_type"], str) else action["action_type"],
            performed_by_name=action["performed_by_name"],
            performed_at=action["performed_at"],
            comment=action.get("comment"),
            success=True,
            message=None,
            previous_status=action.get("previous_status"),
            new_status=action["new_status"],
        )
        for action in actions
    ]
    
    return APIResponse(success=True, data=history)


# Escalation Rules Endpoints

@router.get("/escalation-rules", response_model=APIResponse[List[EscalationRuleResponse]])
async def list_escalation_rules(
    current_user: CurrentUser = Depends(require_permission("admin:config"))
):
    """List all escalation rules."""
    rules = [
        EscalationRuleResponse(
            id=1,
            name="High Score Auto-Escalate",
            description="Automatically escalate cases with match score >= 95%",
            country_code=None,
            is_global=True,
            trigger_type="score_threshold",
            trigger_config={"min_score": 0.95},
            escalate_to_role_name="Senior Compliance Officer",
            escalate_to_user_name=None,
            is_active=True,
            priority=100,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        ),
        EscalationRuleResponse(
            id=2,
            name="SLA Breach Escalation",
            description="Escalate cases not resolved within 24 hours",
            country_code=None,
            is_global=True,
            trigger_type="sla_breach",
            trigger_config={"hours": 24},
            escalate_to_role_name="Compliance Manager",
            escalate_to_user_name=None,
            is_active=True,
            priority=90,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        ),
    ]
    
    return APIResponse(success=True, data=rules)


@router.post("/escalation-rules", response_model=APIResponse[EscalationRuleResponse])
async def create_escalation_rule(
    request: EscalationRuleCreate,
    current_user: CurrentUser = Depends(require_permission("admin:config"))
):
    """Create a new escalation rule."""
    rule = EscalationRuleResponse(
        id=100,
        name=request.name,
        description=request.description,
        country_code=None,
        is_global=request.is_global,
        trigger_type=request.trigger_type,
        trigger_config=request.trigger_config,
        escalate_to_role_name=None,
        escalate_to_user_name=None,
        is_active=request.is_active,
        priority=request.priority,
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )
    
    return APIResponse(
        success=True,
        message="Escalation rule created",
        data=rule,
    )
