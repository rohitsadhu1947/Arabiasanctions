"""Admin API Routes - User Management, Configuration, Sanctions Lists, Audit Logs"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from app.api.schemas.common import APIResponse, PaginatedResponse, PaginationMeta
from app.api.routes.auth import get_current_user, require_permission, CurrentUser
from app.services.sanctions_service import (
    sanctions_service, SANCTIONS_LISTS_CONFIG, LOCAL_LISTS_CONFIG, 
    SANCTIONS_DATA, SanctionEntry
)
from app.services.audit_service import (
    audit_service, AuditCategory, AuditAction
)

router = APIRouter()


# ============== Schemas ==============

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    country_id: int
    branch_id: Optional[int] = None
    role_ids: List[int] = []
    is_active: bool = True


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    country_id: Optional[int] = None
    branch_id: Optional[int] = None
    role_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    country_id: int
    country_name: str
    branch_id: Optional[int]
    branch_name: Optional[str]
    roles: List[str]
    permissions: List[str]
    is_active: bool
    last_login: Optional[str]
    created_at: str


class RoleCreate(BaseModel):
    name: str
    description: str
    permission_ids: List[int] = []


class RoleResponse(BaseModel):
    id: int
    name: str
    description: str
    permissions: List[str]
    user_count: int
    created_at: str


class PermissionResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str
    category: str


class CountryResponse(BaseModel):
    id: int
    code: str
    name: str
    is_active: bool
    branches: List[dict]
    user_count: int


class BranchResponse(BaseModel):
    id: int
    code: str
    name: str
    country_id: int
    country_code: str
    is_active: bool


class SanctionsListResponse(BaseModel):
    code: str
    name: str
    source: str
    url: Optional[str]
    format: str
    update_frequency: str
    last_updated: Optional[str]
    total_entries: int
    is_active: bool
    auto_update: bool


class LocalListResponse(BaseModel):
    code: str
    name: str
    country_code: str
    description: str
    last_updated: Optional[str]
    total_entries: int
    is_active: bool


class SanctionEntryCreate(BaseModel):
    entry_type: str
    primary_name: str
    aliases: List[str] = []
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    national_id: Optional[str] = None
    programs: List[str] = []
    remarks: Optional[str] = None


class SystemConfigResponse(BaseModel):
    default_match_threshold: float
    high_risk_threshold: float
    auto_release_threshold: float
    max_bulk_requests: int
    sla_hours: int
    max_escalation_levels: int
    password_expiry_days: int
    session_timeout_minutes: int


class SystemConfigUpdate(BaseModel):
    default_match_threshold: Optional[float] = None
    high_risk_threshold: Optional[float] = None
    auto_release_threshold: Optional[float] = None
    sla_hours: Optional[int] = None
    max_escalation_levels: Optional[int] = None


# ============== Demo Data ==============

DEMO_USERS = [
    UserResponse(
        id=1,
        email="admin@insurance.qa",
        full_name="Admin User",
        country_id=1,
        country_name="Qatar",
        branch_id=1,
        branch_name="Doha HQ",
        roles=["Super Admin"],
        permissions=["*"],
        is_active=True,
        last_login=datetime.utcnow().isoformat(),
        created_at=(datetime.utcnow() - timedelta(days=365)).isoformat(),
    ),
    UserResponse(
        id=2,
        email="sarah@insurance.qa",
        full_name="Sarah Johnson",
        country_id=1,
        country_name="Qatar",
        branch_id=1,
        branch_name="Doha HQ",
        roles=["Compliance Analyst"],
        permissions=["screen:individual", "screen:bulk", "workflow:view", "workflow:approve"],
        is_active=True,
        last_login=(datetime.utcnow() - timedelta(hours=2)).isoformat(),
        created_at=(datetime.utcnow() - timedelta(days=180)).isoformat(),
    ),
    UserResponse(
        id=3,
        email="michael@insurance.qa",
        full_name="Michael Chen",
        country_id=1,
        country_name="Qatar",
        branch_id=1,
        branch_name="Doha HQ",
        roles=["Senior Compliance Officer"],
        permissions=["screen:individual", "screen:bulk", "workflow:view", "workflow:approve", "decision:escalate", "reports:view"],
        is_active=True,
        last_login=(datetime.utcnow() - timedelta(hours=1)).isoformat(),
        created_at=(datetime.utcnow() - timedelta(days=120)).isoformat(),
    ),
    UserResponse(
        id=4,
        email="ahmed@insurance.qa",
        full_name="Ahmed Al-Thani",
        country_id=1,
        country_name="Qatar",
        branch_id=2,
        branch_name="Al Wakra Branch",
        roles=["Branch Analyst"],
        permissions=["screen:individual", "workflow:view"],
        is_active=True,
        last_login=(datetime.utcnow() - timedelta(days=1)).isoformat(),
        created_at=(datetime.utcnow() - timedelta(days=90)).isoformat(),
    ),
    UserResponse(
        id=5,
        email="fatima@insurance.qa",
        full_name="Fatima Hassan",
        country_id=2,
        country_name="UAE",
        branch_id=3,
        branch_name="Dubai HQ",
        roles=["Country Manager"],
        permissions=["screen:individual", "screen:bulk", "workflow:view", "workflow:approve", "reports:view", "admin:users"],
        is_active=True,
        last_login=(datetime.utcnow() - timedelta(hours=5)).isoformat(),
        created_at=(datetime.utcnow() - timedelta(days=200)).isoformat(),
    ),
]

DEMO_ROLES = [
    RoleResponse(
        id=1,
        name="Super Admin",
        description="Full system access with all permissions",
        permissions=["*"],
        user_count=1,
        created_at=(datetime.utcnow() - timedelta(days=365)).isoformat(),
    ),
    RoleResponse(
        id=2,
        name="Compliance Manager",
        description="Manage compliance operations and team",
        permissions=["screen:individual", "screen:bulk", "workflow:view", "workflow:approve", "workflow:reassign", "decision:escalate", "reports:view", "reports:export", "admin:users"],
        user_count=2,
        created_at=(datetime.utcnow() - timedelta(days=365)).isoformat(),
    ),
    RoleResponse(
        id=3,
        name="Senior Compliance Officer",
        description="Handle escalated cases and approvals",
        permissions=["screen:individual", "screen:bulk", "workflow:view", "workflow:approve", "decision:escalate", "reports:view"],
        user_count=3,
        created_at=(datetime.utcnow() - timedelta(days=365)).isoformat(),
    ),
    RoleResponse(
        id=4,
        name="Compliance Analyst",
        description="Perform screenings and initial reviews",
        permissions=["screen:individual", "workflow:view", "workflow:approve"],
        user_count=8,
        created_at=(datetime.utcnow() - timedelta(days=365)).isoformat(),
    ),
    RoleResponse(
        id=5,
        name="Branch Analyst",
        description="Branch-level screening access",
        permissions=["screen:individual", "workflow:view"],
        user_count=12,
        created_at=(datetime.utcnow() - timedelta(days=180)).isoformat(),
    ),
    RoleResponse(
        id=6,
        name="Auditor",
        description="Read-only access to all data and audit logs",
        permissions=["workflow:view", "reports:view", "audit:view"],
        user_count=2,
        created_at=(datetime.utcnow() - timedelta(days=90)).isoformat(),
    ),
]

DEMO_PERMISSIONS = [
    PermissionResponse(id=1, code="screen:individual", name="Screen Individual", description="Screen individual entities", category="Screening"),
    PermissionResponse(id=2, code="screen:bulk", name="Screen Bulk", description="Perform bulk screening", category="Screening"),
    PermissionResponse(id=3, code="screen:corporate", name="Screen Corporate", description="Screen corporate entities", category="Screening"),
    PermissionResponse(id=4, code="workflow:view", name="View Workflow", description="View workflow cases", category="Workflow"),
    PermissionResponse(id=5, code="workflow:approve", name="Approve Cases", description="Approve/reject workflow cases", category="Workflow"),
    PermissionResponse(id=6, code="workflow:reassign", name="Reassign Cases", description="Reassign cases to other users", category="Workflow"),
    PermissionResponse(id=7, code="decision:release", name="Release Matches", description="Release screened matches", category="Decision"),
    PermissionResponse(id=8, code="decision:escalate", name="Escalate Matches", description="Escalate matches for review", category="Decision"),
    PermissionResponse(id=9, code="reports:view", name="View Reports", description="View reports and analytics", category="Reports"),
    PermissionResponse(id=10, code="reports:export", name="Export Reports", description="Export reports and data", category="Reports"),
    PermissionResponse(id=11, code="audit:view", name="View Audit Logs", description="View audit trail", category="Audit"),
    PermissionResponse(id=12, code="admin:users", name="Manage Users", description="Create and manage users", category="Admin"),
    PermissionResponse(id=13, code="admin:roles", name="Manage Roles", description="Create and manage roles", category="Admin"),
    PermissionResponse(id=14, code="admin:config", name="System Config", description="Configure system settings", category="Admin"),
    PermissionResponse(id=15, code="admin:lists", name="Manage Lists", description="Manage sanctions lists", category="Admin"),
]

DEMO_COUNTRIES = [
    CountryResponse(
        id=1,
        code="QAT",
        name="Qatar",
        is_active=True,
        branches=[
            {"id": 1, "code": "DOH001", "name": "Doha HQ"},
            {"id": 2, "code": "WAK001", "name": "Al Wakra Branch"},
        ],
        user_count=4,
    ),
    CountryResponse(
        id=2,
        code="UAE",
        name="United Arab Emirates",
        is_active=True,
        branches=[
            {"id": 3, "code": "DXB001", "name": "Dubai HQ"},
            {"id": 4, "code": "AUH001", "name": "Abu Dhabi Branch"},
            {"id": 5, "code": "SHJ001", "name": "Sharjah Branch"},
        ],
        user_count=8,
    ),
    CountryResponse(
        id=3,
        code="SAU",
        name="Saudi Arabia",
        is_active=True,
        branches=[
            {"id": 6, "code": "RUH001", "name": "Riyadh HQ"},
            {"id": 7, "code": "JED001", "name": "Jeddah Branch"},
        ],
        user_count=6,
    ),
    CountryResponse(
        id=4,
        code="KWT",
        name="Kuwait",
        is_active=True,
        branches=[
            {"id": 8, "code": "KWI001", "name": "Kuwait City HQ"},
        ],
        user_count=3,
    ),
    CountryResponse(
        id=5,
        code="BHR",
        name="Bahrain",
        is_active=True,
        branches=[
            {"id": 9, "code": "BAH001", "name": "Manama HQ"},
        ],
        user_count=2,
    ),
    CountryResponse(
        id=6,
        code="OMN",
        name="Oman",
        is_active=True,
        branches=[
            {"id": 10, "code": "MCT001", "name": "Muscat HQ"},
        ],
        user_count=2,
    ),
]

SYSTEM_CONFIG = {
    "default_match_threshold": 0.75,
    "high_risk_threshold": 0.85,
    "auto_release_threshold": 0.50,
    "max_bulk_requests": 1000,
    "sla_hours": 24,
    "max_escalation_levels": 3,
    "password_expiry_days": 90,
    "session_timeout_minutes": 30,
}


# ============== User Management ==============

@router.get("/users", response_model=PaginatedResponse[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    country_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    current_user: CurrentUser = Depends(require_permission("admin:users"))
):
    """List all users with filters."""
    users = DEMO_USERS.copy()
    
    if search:
        search_lower = search.lower()
        users = [u for u in users if search_lower in u.email.lower() or search_lower in u.full_name.lower()]
    if country_id:
        users = [u for u in users if u.country_id == country_id]
    if is_active is not None:
        users = [u for u in users if u.is_active == is_active]
    
    total = len(users)
    start = (page - 1) * page_size
    end = start + page_size
    
    return PaginatedResponse(
        success=True,
        data=users[start:end],
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total_items=total,
            total_pages=(total + page_size - 1) // page_size if total > 0 else 0,
            has_next=end < total,
            has_prev=page > 1,
        )
    )


@router.post("/users", response_model=APIResponse[UserResponse])
async def create_user(
    request: UserCreate,
    current_user: CurrentUser = Depends(require_permission("admin:users"))
):
    """Create a new user."""
    # Get country name
    country = next((c for c in DEMO_COUNTRIES if c.id == request.country_id), None)
    country_name = country.name if country else "Unknown"
    
    # Get branch name
    branch_name = None
    if request.branch_id and country:
        branch = next((b for b in country.branches if b["id"] == request.branch_id), None)
        branch_name = branch["name"] if branch else None
    
    # Find the role
    role = next((r for r in DEMO_ROLES if r.id in request.role_ids), None) if request.role_ids else None
    role_name = role.name if role else "Compliance Analyst"
    role_permissions = role.permissions if role else ["screen:individual", "workflow:view"]
    
    new_user = UserResponse(
        id=len(DEMO_USERS) + 1,
        email=request.email,
        full_name=request.full_name,
        country_id=request.country_id,
        country_name=country_name,
        branch_id=request.branch_id,
        branch_name=branch_name,
        roles=[role_name],
        permissions=role_permissions,
        is_active=request.is_active,
        last_login=None,
        created_at=datetime.utcnow().isoformat(),
    )
    
    # Add to DEMO_USERS list so it persists in session
    DEMO_USERS.append(new_user)
    
    # Log audit
    audit_service.log(
        category=AuditCategory.USER_MANAGEMENT,
        action=AuditAction.USER_CREATED,
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        resource_type="user",
        resource_id=str(new_user.id),
        resource_name=new_user.email,
        details={"roles": new_user.roles},
    )
    
    return APIResponse(success=True, message="User created successfully", data=new_user)


@router.get("/users/{user_id}", response_model=APIResponse[UserResponse])
async def get_user(
    user_id: int,
    current_user: CurrentUser = Depends(require_permission("admin:users"))
):
    """Get a specific user."""
    user = next((u for u in DEMO_USERS if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return APIResponse(success=True, data=user)


@router.put("/users/{user_id}", response_model=APIResponse[UserResponse])
async def update_user(
    user_id: int,
    request: UserUpdate,
    current_user: CurrentUser = Depends(require_permission("admin:users"))
):
    """Update a user."""
    user = next((u for u in DEMO_USERS if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Log audit
    audit_service.log(
        category=AuditCategory.USER_MANAGEMENT,
        action=AuditAction.USER_UPDATED,
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        resource_type="user",
        resource_id=str(user_id),
        resource_name=user.email,
        details={"changes": request.dict(exclude_none=True)},
    )
    
    return APIResponse(success=True, message="User updated successfully", data=user)


# ============== Roles ==============

@router.get("/roles", response_model=APIResponse[List[RoleResponse]])
async def list_roles(
    current_user: CurrentUser = Depends(require_permission("admin:roles"))
):
    """List all roles."""
    return APIResponse(success=True, data=DEMO_ROLES)


@router.post("/roles", response_model=APIResponse[RoleResponse])
async def create_role(
    request: RoleCreate,
    current_user: CurrentUser = Depends(require_permission("admin:roles"))
):
    """Create a new role."""
    new_role = RoleResponse(
        id=len(DEMO_ROLES) + 1,
        name=request.name,
        description=request.description,
        permissions=[],
        user_count=0,
        created_at=datetime.utcnow().isoformat(),
    )
    return APIResponse(success=True, message="Role created successfully", data=new_role)


# ============== Permissions ==============

@router.get("/permissions", response_model=APIResponse[List[PermissionResponse]])
async def list_permissions(
    current_user: CurrentUser = Depends(get_current_user)
):
    """List all available permissions."""
    return APIResponse(success=True, data=DEMO_PERMISSIONS)


# ============== Countries & Branches ==============

@router.get("/countries", response_model=APIResponse[List[CountryResponse]])
async def list_countries(
    current_user: CurrentUser = Depends(get_current_user)
):
    """List all countries."""
    return APIResponse(success=True, data=DEMO_COUNTRIES)


@router.get("/branches", response_model=APIResponse[List[BranchResponse]])
async def list_branches(
    country_id: Optional[int] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """List all branches."""
    branches = []
    for country in DEMO_COUNTRIES:
        if country_id and country.id != country_id:
            continue
        for branch in country.branches:
            branches.append(BranchResponse(
                id=branch["id"],
                code=branch["code"],
                name=branch["name"],
                country_id=country.id,
                country_code=country.code,
                is_active=True,
            ))
    return APIResponse(success=True, data=branches)


# ============== Sanctions Lists ==============

@router.get("/sanctions-lists", response_model=APIResponse[dict])
async def get_sanctions_lists(
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get all sanctions lists configuration and stats."""
    stats = sanctions_service.get_list_stats()
    return APIResponse(success=True, data=stats)


@router.get("/sanctions-lists/global", response_model=APIResponse[List[SanctionsListResponse]])
async def get_global_sanctions_lists(
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get global sanctions lists."""
    lists = [
        SanctionsListResponse(code=code, **config)
        for code, config in SANCTIONS_LISTS_CONFIG.items()
    ]
    return APIResponse(success=True, data=lists)


@router.get("/sanctions-lists/local", response_model=APIResponse[List[LocalListResponse]])
async def get_local_sanctions_lists(
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get local/country-specific sanctions lists."""
    lists = [
        LocalListResponse(code=code, **config)
        for code, config in LOCAL_LISTS_CONFIG.items()
    ]
    return APIResponse(success=True, data=lists)


@router.post("/sanctions-lists/{list_code}/refresh")
async def refresh_sanctions_list(
    list_code: str,
    current_user: CurrentUser = Depends(require_permission("admin:lists"))
):
    """Refresh a sanctions list from its source."""
    result = await sanctions_service.refresh_list(list_code)
    
    # Log audit
    audit_service.log(
        category=AuditCategory.CONFIGURATION,
        action=AuditAction.LIST_REFRESHED,
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        resource_type="sanctions_list",
        resource_id=list_code,
        resource_name=SANCTIONS_LISTS_CONFIG.get(list_code, {}).get("name", list_code),
        details=result,
    )
    
    return APIResponse(success=True, data=result)


@router.put("/sanctions-lists/{list_code}/toggle")
async def toggle_sanctions_list(
    list_code: str,
    is_active: bool,
    current_user: CurrentUser = Depends(require_permission("admin:lists"))
):
    """Enable or disable a sanctions list."""
    if list_code in SANCTIONS_LISTS_CONFIG:
        SANCTIONS_LISTS_CONFIG[list_code]["is_active"] = is_active
    elif list_code in LOCAL_LISTS_CONFIG:
        LOCAL_LISTS_CONFIG[list_code]["is_active"] = is_active
    else:
        raise HTTPException(status_code=404, detail="List not found")
    
    # Log audit
    audit_service.log(
        category=AuditCategory.CONFIGURATION,
        action=AuditAction.LIST_ENABLED if is_active else AuditAction.LIST_DISABLED,
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        resource_type="sanctions_list",
        resource_id=list_code,
    )
    
    return APIResponse(success=True, message=f"List {'enabled' if is_active else 'disabled'}")


@router.get("/sanctions-lists/{list_code}/entries")
async def get_list_entries(
    list_code: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get entries from a specific sanctions list."""
    if list_code not in SANCTIONS_DATA:
        raise HTTPException(status_code=404, detail="List not found")
    
    entries = SANCTIONS_DATA[list_code]
    
    if search:
        search_lower = search.lower()
        entries = [
            e for e in entries
            if search_lower in e.primary_name.lower()
            or any(search_lower in a.lower() for a in e.aliases)
        ]
    
    total = len(entries)
    start = (page - 1) * page_size
    end = start + page_size
    
    return PaginatedResponse(
        success=True,
        data=[{
            "source_id": e.source_id,
            "primary_name": e.primary_name,
            "entry_type": e.entry_type,
            "aliases": e.aliases,
            "nationality": e.nationality,
            "date_of_birth": e.date_of_birth,
            "programs": e.programs,
            "sanction_date": e.sanction_date,
            "remarks": e.remarks,
        } for e in entries[start:end]],
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total_items=total,
            total_pages=(total + page_size - 1) // page_size if total > 0 else 0,
            has_next=end < total,
            has_prev=page > 1,
        )
    )


@router.post("/sanctions-lists/{list_code}/entries")
async def add_local_entry(
    list_code: str,
    request: SanctionEntryCreate,
    current_user: CurrentUser = Depends(require_permission("admin:lists"))
):
    """Add an entry to a local watchlist."""
    if list_code not in LOCAL_LISTS_CONFIG:
        raise HTTPException(status_code=400, detail="Can only add entries to local lists")
    
    import uuid
    entry = SanctionEntry(
        source_id=f"{list_code}-{uuid.uuid4().hex[:8].upper()}",
        list_code=list_code,
        list_name=LOCAL_LISTS_CONFIG[list_code]["name"],
        entry_type=request.entry_type,
        primary_name=request.primary_name,
        aliases=request.aliases,
        date_of_birth=request.date_of_birth,
        nationality=request.nationality,
        national_id=request.national_id,
        programs=request.programs,
        remarks=request.remarks,
    )
    
    success = sanctions_service.add_local_entry(list_code, entry)
    
    if success:
        # Log audit
        audit_service.log(
            category=AuditCategory.IMPORT,
            action=AuditAction.ENTRY_ADDED,
            user_id=current_user.id,
            user_email=current_user.email,
            user_name=current_user.full_name,
            resource_type="sanctions_entry",
            resource_id=entry.source_id,
            resource_name=entry.primary_name,
            details={"list_code": list_code},
        )
    
    return APIResponse(success=success, message="Entry added successfully" if success else "Failed to add entry")


@router.delete("/sanctions-lists/{list_code}/entries/{source_id}")
async def remove_local_entry(
    list_code: str,
    source_id: str,
    current_user: CurrentUser = Depends(require_permission("admin:lists"))
):
    """Remove an entry from a local watchlist."""
    if list_code not in LOCAL_LISTS_CONFIG:
        raise HTTPException(status_code=400, detail="Can only remove entries from local lists")
    
    success = sanctions_service.remove_local_entry(list_code, source_id)
    
    if success:
        audit_service.log(
            category=AuditCategory.IMPORT,
            action=AuditAction.ENTRY_REMOVED,
            user_id=current_user.id,
            user_email=current_user.email,
            user_name=current_user.full_name,
            resource_type="sanctions_entry",
            resource_id=source_id,
            details={"list_code": list_code},
        )
    
    return APIResponse(success=success, message="Entry removed" if success else "Entry not found")


@router.post("/sanctions-lists/{list_code}/import")
async def import_list_csv(
    list_code: str,
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_permission("admin:lists"))
):
    """Import entries to a local list from CSV file."""
    if list_code not in LOCAL_LISTS_CONFIG:
        raise HTTPException(status_code=400, detail="Can only import to local lists")
    
    content = await file.read()
    result = sanctions_service.import_csv(list_code, content.decode('utf-8'))
    
    if result["success"]:
        audit_service.log(
            category=AuditCategory.IMPORT,
            action=AuditAction.DATA_IMPORTED,
            user_id=current_user.id,
            user_email=current_user.email,
            user_name=current_user.full_name,
            resource_type="sanctions_list",
            resource_id=list_code,
            details={"imported": result["imported"], "errors": len(result.get("errors", []))},
        )
    
    return APIResponse(success=result["success"], data=result)


# ============== Audit Logs ==============

@router.get("/audit-logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    category: Optional[str] = None,
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    country_code: Optional[str] = None,
    resource_type: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    search: Optional[str] = None,
    current_user: CurrentUser = Depends(require_permission("audit:view"))
):
    """Get audit logs with filters."""
    result = audit_service.get_logs(
        category=AuditCategory(category) if category else None,
        action=AuditAction(action) if action else None,
        user_email=user_email,
        country_code=country_code,
        resource_type=resource_type,
        status=status,
        from_date=from_date,
        to_date=to_date,
        search=search,
        page=page,
        page_size=page_size,
    )
    
    return PaginatedResponse(
        success=True,
        data=result["logs"],
        pagination=PaginationMeta(
            page=result["page"],
            page_size=result["page_size"],
            total_items=result["total"],
            total_pages=result["total_pages"],
            has_next=page * page_size < result["total"],
            has_prev=page > 1,
        )
    )


@router.get("/audit-logs/stats")
async def get_audit_stats(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: CurrentUser = Depends(require_permission("audit:view"))
):
    """Get audit log statistics."""
    stats = audit_service.get_stats(from_date=from_date, to_date=to_date)
    return APIResponse(success=True, data=stats)


@router.get("/audit-logs/export")
async def export_audit_logs(
    format: str = Query("csv", regex="^(csv|json)$"),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: CurrentUser = Depends(require_permission("audit:view"))
):
    """Export audit logs."""
    from fastapi.responses import Response
    
    content = audit_service.export_logs(
        format=format,
        from_date=from_date,
        to_date=to_date,
    )
    
    # Log the export
    audit_service.log(
        category=AuditCategory.EXPORT,
        action=AuditAction.DATA_EXPORTED,
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        resource_type="audit_logs",
        details={"format": format},
    )
    
    media_type = "text/csv" if format == "csv" else "application/json"
    filename = f"audit_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{format}"
    
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============== System Configuration ==============

@router.get("/config", response_model=APIResponse[SystemConfigResponse])
async def get_system_config(
    current_user: CurrentUser = Depends(require_permission("admin:config"))
):
    """Get system configuration."""
    return APIResponse(success=True, data=SystemConfigResponse(**SYSTEM_CONFIG))


@router.put("/config", response_model=APIResponse[SystemConfigResponse])
async def update_system_config(
    request: SystemConfigUpdate,
    current_user: CurrentUser = Depends(require_permission("admin:config"))
):
    """Update system configuration."""
    changes = request.dict(exclude_none=True)
    
    for key, value in changes.items():
        if key in SYSTEM_CONFIG:
            SYSTEM_CONFIG[key] = value
    
    # Log audit
    audit_service.log(
        category=AuditCategory.CONFIGURATION,
        action=AuditAction.THRESHOLD_CHANGED,
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        resource_type="system_config",
        details={"changes": changes},
    )
    
    return APIResponse(success=True, message="Configuration updated", data=SystemConfigResponse(**SYSTEM_CONFIG))


# ============== Dashboard Stats ==============

@router.get("/dashboard/stats")
async def get_admin_dashboard_stats(
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get admin dashboard statistics."""
    return APIResponse(success=True, data={
        "total_users": len(DEMO_USERS),
        "active_users": len([u for u in DEMO_USERS if u.is_active]),
        "total_countries": len(DEMO_COUNTRIES),
        "total_branches": sum(len(c.branches) for c in DEMO_COUNTRIES),
        "total_roles": len(DEMO_ROLES),
        "sanctions_lists": len(SANCTIONS_LISTS_CONFIG),
        "local_lists": len(LOCAL_LISTS_CONFIG),
        "total_sanctions_entries": sum(len(entries) for entries in SANCTIONS_DATA.values()),
    })
