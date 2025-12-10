"""Authentication and User Schemas"""
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


# ==================== Authentication ====================

class LoginRequest(BaseModel):
    """Login request"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    remember_me: bool = False


class LoginResponse(BaseModel):
    """Login response with token"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: "UserResponse"


class TokenRefreshRequest(BaseModel):
    """Token refresh request"""
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    """Password change request"""
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)


# ==================== User ====================

class UserCreate(BaseModel):
    """Create a new user"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    employee_id: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    
    country_id: int
    branch_id: Optional[int] = None
    department: Optional[str] = Field(None, max_length=100)
    
    role_ids: List[int] = Field(default_factory=list)
    is_active: bool = True


class UserUpdate(BaseModel):
    """Update a user"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=100)
    
    country_id: Optional[int] = None
    branch_id: Optional[int] = None
    
    role_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """User response"""
    id: int
    email: str
    first_name: str
    last_name: str
    full_name: str
    employee_id: Optional[str]
    phone: Optional[str]
    
    # Organization
    country_id: int
    country_name: str
    country_code: str
    branch_id: Optional[int]
    branch_name: Optional[str]
    department: Optional[str]
    
    # Roles
    roles: List["RoleResponse"]
    permissions: List[str]
    
    # Status
    is_active: bool
    is_superuser: bool
    last_login: Optional[str]
    
    created_at: str
    updated_at: str


# ==================== Role ====================

class RoleCreate(BaseModel):
    """Create a new role"""
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    level: int = Field(1, ge=1, le=10)
    
    country_id: Optional[int] = None  # Null = global role
    permission_ids: List[int] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    """Update a role"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    level: Optional[int] = Field(None, ge=1, le=10)
    permission_ids: Optional[List[int]] = None


class RoleResponse(BaseModel):
    """Role response"""
    id: int
    code: str
    name: str
    description: Optional[str]
    level: int
    is_system: bool
    
    country_id: Optional[int]
    country_name: Optional[str]
    
    permissions: List["PermissionResponse"]
    
    created_at: str
    updated_at: str


# ==================== Permission ====================

class PermissionResponse(BaseModel):
    """Permission response"""
    id: int
    code: str
    name: str
    description: Optional[str]
    category: Optional[str]


# ==================== Current User ====================

class CurrentUser(BaseModel):
    """Current logged-in user context"""
    id: int
    email: str
    full_name: str
    
    country_id: int
    country_code: str
    branch_id: Optional[int]
    
    roles: List[str]  # Role codes
    permissions: List[str]  # Permission codes
    
    is_superuser: bool


# Fix forward references
LoginResponse.model_rebuild()
UserResponse.model_rebuild()
RoleResponse.model_rebuild()

