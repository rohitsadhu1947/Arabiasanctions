"""Authentication Routes"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings
from app.api.schemas.auth import (
    LoginRequest, LoginResponse, PasswordChangeRequest,
    UserResponse, CurrentUser, PermissionResponse, RoleResponse
)
from app.api.schemas.common import APIResponse

router = APIRouter()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate a password hash."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    """Get the current user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_sub": False})
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        user_id = int(user_id) if isinstance(user_id, str) else user_id
        
        # In production, fetch user from database
        # For demo, return mock user
        return CurrentUser(
            id=user_id,
            email=payload.get("email", "user@example.com"),
            full_name=payload.get("name", "Demo User"),
            country_id=payload.get("country_id", 1),
            country_code=payload.get("country_code", "UAE"),
            branch_id=payload.get("branch_id"),
            roles=payload.get("roles", ["analyst"]),
            permissions=payload.get("permissions", []),
            is_superuser=payload.get("is_superuser", False),
        )
    except JWTError:
        raise credentials_exception


def require_permission(permission: str):
    """Dependency to require a specific permission."""
    async def check_permission(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.is_superuser:
            return current_user
        if permission not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return current_user
    return check_permission


@router.post("/token", response_model=LoginResponse)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 compatible token endpoint."""
    # In production, validate against database
    # For demo, accept any credentials with password "password123"
    if form_data.password != "password123":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": 1,
            "email": form_data.username,
            "name": "Demo User",
            "country_id": 1,
            "country_code": "UAE",
            "roles": ["admin", "analyst"],
            "permissions": [
                "screen:individual", "screen:corporate", "screen:bulk",
                "decision:release", "decision:flag", "decision:escalate",
                "workflow:approve", "workflow:reject",
                "report:view", "report:export",
            ],
            "is_superuser": True,
        },
        expires_delta=access_token_expires,
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=1,
            email=form_data.username,
            first_name="Demo",
            last_name="User",
            full_name="Demo User",
            employee_id="EMP001",
            phone="+971501234567",
            country_id=1,
            country_name="United Arab Emirates",
            country_code="UAE",
            branch_id=1,
            branch_name="Dubai HQ",
            department="Compliance",
            roles=[
                RoleResponse(
                    id=1,
                    code="admin",
                    name="Administrator",
                    description="Full system access",
                    level=10,
                    is_system=True,
                    country_id=None,
                    country_name=None,
                    permissions=[],
                    created_at=datetime.utcnow().isoformat(),
                    updated_at=datetime.utcnow().isoformat(),
                )
            ],
            permissions=["screen:individual", "screen:corporate", "screen:bulk"],
            is_active=True,
            is_superuser=True,
            last_login=datetime.utcnow().isoformat(),
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        )
    )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """User login endpoint."""
    # Reuse token endpoint logic
    if request.password != "password123":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": 1,
            "email": request.email,
            "name": "Demo User",
            "country_id": 1,
            "country_code": "UAE",
            "roles": ["admin", "analyst"],
            "permissions": [
                "screen:individual", "screen:corporate", "screen:bulk",
                "decision:release", "decision:flag", "decision:escalate",
                "workflow:approve", "workflow:reject",
                "report:view", "report:export",
            ],
            "is_superuser": True,
        },
        expires_delta=access_token_expires,
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=1,
            email=request.email,
            first_name="Demo",
            last_name="User",
            full_name="Demo User",
            employee_id="EMP001",
            phone="+971501234567",
            country_id=1,
            country_name="United Arab Emirates",
            country_code="UAE",
            branch_id=1,
            branch_name="Dubai HQ",
            department="Compliance",
            roles=[],
            permissions=["screen:individual", "screen:corporate", "screen:bulk"],
            is_active=True,
            is_superuser=True,
            last_login=datetime.utcnow().isoformat(),
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        )
    )


@router.get("/me", response_model=APIResponse[UserResponse])
async def get_current_user_info(current_user: CurrentUser = Depends(get_current_user)):
    """Get current user information."""
    return APIResponse(
        success=True,
        data=UserResponse(
            id=current_user.id,
            email=current_user.email,
            first_name=current_user.full_name.split()[0] if current_user.full_name else "User",
            last_name=current_user.full_name.split()[-1] if current_user.full_name and len(current_user.full_name.split()) > 1 else "",
            full_name=current_user.full_name,
            employee_id=None,
            phone=None,
            country_id=current_user.country_id,
            country_name="United Arab Emirates",
            country_code=current_user.country_code,
            branch_id=current_user.branch_id,
            branch_name=None,
            department=None,
            roles=[],
            permissions=current_user.permissions,
            is_active=True,
            is_superuser=current_user.is_superuser,
            last_login=datetime.utcnow().isoformat(),
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        )
    )


@router.post("/logout")
async def logout(current_user: CurrentUser = Depends(get_current_user)):
    """User logout - invalidate token."""
    # In production, add token to blacklist
    return {"message": "Successfully logged out"}


@router.post("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Change user password."""
    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match"
        )
    
    # In production, validate current password and update
    return {"message": "Password changed successfully"}

