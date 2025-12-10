"""Common Pydantic Schemas"""
from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime

T = TypeVar("T")


class ResponseMeta(BaseModel):
    """Metadata for API responses"""
    request_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"


class PaginationMeta(BaseModel):
    """Pagination metadata"""
    page: int = 1
    page_size: int = 20
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool


class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper"""
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None
    meta: Optional[ResponseMeta] = None
    errors: Optional[List[dict]] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated API response"""
    success: bool = True
    data: List[T]
    pagination: PaginationMeta
    meta: Optional[ResponseMeta] = None


class ErrorDetail(BaseModel):
    """Error detail"""
    code: str
    message: str
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response"""
    success: bool = False
    message: str
    errors: List[ErrorDetail] = []
    meta: Optional[ResponseMeta] = None

