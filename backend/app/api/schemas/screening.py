"""Screening API Schemas"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import date
from enum import Enum


class EntityType(str, Enum):
    INDIVIDUAL = "individual"
    CORPORATE = "corporate"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MatchStatus(str, Enum):
    PENDING_REVIEW = "pending_review"
    ESCALATED = "escalated"
    RELEASED = "released"
    FLAGGED = "flagged"
    FALSE_POSITIVE = "false_positive"
    TRUE_MATCH = "true_match"


class DecisionAction(str, Enum):
    RELEASE = "release"
    FLAG = "flag"
    ESCALATE = "escalate"
    FALSE_POSITIVE = "false_positive"
    TRUE_MATCH = "true_match"


# ==================== Screening Request ====================

class IndividualScreeningRequest(BaseModel):
    """Request to screen an individual"""
    full_name: str = Field(..., min_length=2, max_length=500, description="Full name of the individual")
    first_name: Optional[str] = Field(None, max_length=200)
    last_name: Optional[str] = Field(None, max_length=200)
    middle_name: Optional[str] = Field(None, max_length=200)
    date_of_birth: Optional[str] = Field(None, description="Date of birth (YYYY-MM-DD)")
    place_of_birth: Optional[str] = Field(None, max_length=200)
    nationality: Optional[str] = Field(None, max_length=100)
    national_id: Optional[str] = Field(None, max_length=100)
    passport_number: Optional[str] = Field(None, max_length=100)
    gender: Optional[str] = Field(None, max_length=20)
    
    @field_validator('date_of_birth')
    @classmethod
    def validate_dob(cls, v):
        if v:
            try:
                date.fromisoformat(v)
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v


class CorporateScreeningRequest(BaseModel):
    """Request to screen a corporate entity"""
    company_name: str = Field(..., min_length=2, max_length=500, description="Company name")
    registration_number: Optional[str] = Field(None, max_length=100)
    registration_country: Optional[str] = Field(None, max_length=100)


class ScreeningRequestBase(BaseModel):
    """Base screening request with common fields"""
    # Context
    country_code: str = Field(..., min_length=2, max_length=3, description="Country code (ISO)")
    branch_code: Optional[str] = Field(None, max_length=20)
    
    # Business context
    business_unit: Optional[str] = Field(None, max_length=100)
    product_type: Optional[str] = Field(None, max_length=100)
    customer_id: Optional[str] = Field(None, max_length=100)
    policy_number: Optional[str] = Field(None, max_length=100)
    
    # Screening configuration
    sanction_lists: Optional[List[str]] = Field(None, description="Specific lists to screen against")
    match_threshold: Optional[float] = Field(None, ge=0.5, le=1.0, description="Match threshold (0.5-1.0)")
    include_aliases: bool = Field(True, description="Include alias matching")
    
    # Skip flag
    skip_realtime: bool = Field(False, description="Skip realtime screening (include in daily batch)")
    skip_reason: Optional[str] = Field(None, max_length=500)
    
    # Source
    source_system: Optional[str] = Field(None, max_length=100)
    additional_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class SingleScreeningRequest(ScreeningRequestBase):
    """Single screening request"""
    entity_type: EntityType = EntityType.INDIVIDUAL
    individual: Optional[IndividualScreeningRequest] = None
    corporate: Optional[CorporateScreeningRequest] = None
    
    @field_validator('individual', 'corporate')
    @classmethod
    def validate_entity_data(cls, v, info):
        return v


class BulkScreeningRequest(BaseModel):
    """Bulk screening request"""
    requests: List[SingleScreeningRequest] = Field(..., min_length=1, max_length=1000)
    batch_reference: Optional[str] = Field(None, max_length=100)
    
    @field_validator('requests')
    @classmethod
    def validate_requests_count(cls, v):
        if len(v) > 1000:
            raise ValueError('Maximum 1000 requests per batch')
        return v


# ==================== Screening Response ====================

class MatchScoreDetail(BaseModel):
    """Detailed match score breakdown"""
    overall_score: float
    jaro_winkler: float
    levenshtein: float
    token_sort: float
    token_set: float
    phonetic: float
    exact_match: bool
    algorithm_used: str


class MatchDetail(BaseModel):
    """Details of a single match"""
    sanction_entry_id: int
    list_code: str
    list_name: str
    matched_name: str
    primary_name: str
    is_alias_match: bool
    aliases: List[str] = []
    entity_type: str
    
    # Match scores
    match_score: float
    score_details: MatchScoreDetail
    
    # Additional match factors
    dob_match: bool = False
    nationality_match: bool = False
    id_match: bool = False
    
    # Sanction details
    sanction_date: Optional[str] = None
    sanction_programs: List[str] = []
    sanction_reason: Optional[str] = None
    
    # Status
    status: MatchStatus = MatchStatus.PENDING_REVIEW


class ScreeningResultResponse(BaseModel):
    """Response for a single screening"""
    reference_id: str
    screened_name: str
    entity_type: EntityType
    
    # Results
    total_matches: int
    highest_score: float
    risk_level: RiskLevel
    
    # Matches
    matches: List[MatchDetail]
    
    # Metadata
    lists_screened: List[str]
    processing_time_ms: int
    timestamp: str
    
    # Status
    overall_status: MatchStatus
    auto_released: bool = False


class BulkScreeningResultResponse(BaseModel):
    """Response for bulk screening"""
    batch_id: str
    total_requests: int
    completed: int
    failed: int
    
    # Summary
    total_with_matches: int
    high_risk_count: int
    
    # Results
    results: List[ScreeningResultResponse]
    
    # Timing
    total_processing_time_ms: int
    timestamp: str


# ==================== Decision/Action ====================

class ScreeningDecisionRequest(BaseModel):
    """Request to make a decision on a screening match"""
    match_id: int
    decision: DecisionAction
    reason_code: Optional[str] = Field(None, max_length=50)
    reason_text: Optional[str] = Field(None, max_length=2000)
    supporting_documents: Optional[List[str]] = Field(default_factory=list)


class BulkDecisionRequest(BaseModel):
    """Bulk decision request"""
    decisions: List[ScreeningDecisionRequest] = Field(..., min_length=1, max_length=100)


class ScreeningDecisionResponse(BaseModel):
    """Response after making a decision"""
    match_id: int
    decision: DecisionAction
    decided_by: str
    decided_at: str
    workflow_case_id: Optional[int] = None
    success: bool = True
    message: Optional[str] = None


# ==================== Search/Query ====================

class ScreeningSearchRequest(BaseModel):
    """Search for screening records"""
    # Filters
    reference_id: Optional[str] = None
    name_contains: Optional[str] = None
    entity_type: Optional[EntityType] = None
    risk_level: Optional[RiskLevel] = None
    status: Optional[MatchStatus] = None
    
    # Context filters
    country_code: Optional[str] = None
    branch_code: Optional[str] = None
    customer_id: Optional[str] = None
    
    # Date range
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    
    # Pagination
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    
    # Sorting
    sort_by: str = "created_at"
    sort_order: str = "desc"

