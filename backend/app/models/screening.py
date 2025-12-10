"""Screening Request and Result Models"""
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Text, JSON, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.sanction import EntityType
import enum


class ScreeningStatus(str, enum.Enum):
    """Status of a screening request"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class MatchStatus(str, enum.Enum):
    """Status of a screening match"""
    PENDING_REVIEW = "pending_review"
    ESCALATED = "escalated"
    RELEASED = "released"
    FLAGGED = "flagged"
    FALSE_POSITIVE = "false_positive"
    TRUE_MATCH = "true_match"


class RiskLevel(str, enum.Enum):
    """Risk level classification"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ScreeningRequest(Base):
    """Screening request model"""
    
    # Request identification
    reference_id = Column(String(100), unique=True, nullable=False, index=True)
    batch_id = Column(String(100), index=True)  # For bulk screening
    
    # Entity being screened
    entity_type = Column(SQLEnum(EntityType), nullable=False, default=EntityType.INDIVIDUAL)
    
    # Individual fields
    full_name = Column(String(500), nullable=False, index=True)
    normalized_name = Column(String(500), index=True)
    first_name = Column(String(200))
    last_name = Column(String(200))
    middle_name = Column(String(200))
    date_of_birth = Column(String(20))
    place_of_birth = Column(String(200))
    nationality = Column(String(100))
    national_id = Column(String(100))
    passport_number = Column(String(100))
    gender = Column(String(20))
    
    # Corporate fields
    company_name = Column(String(500))
    registration_number = Column(String(100))
    registration_country = Column(String(100))
    
    # Context
    country_id = Column(Integer, ForeignKey('country.id', ondelete='RESTRICT'), nullable=False)
    branch_id = Column(Integer, ForeignKey('branch.id', ondelete='SET NULL'))
    requested_by_id = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'))
    
    # Business context
    business_unit = Column(String(100))
    product_type = Column(String(100))
    customer_id = Column(String(100))  # External customer reference
    policy_number = Column(String(100))
    
    # Screening configuration
    sanction_lists = Column(JSON, default=list)  # List of list codes to screen against
    match_threshold = Column(Float, default=0.75)
    include_aliases = Column(Boolean, default=True)
    
    # Status
    status = Column(SQLEnum(ScreeningStatus), default=ScreeningStatus.PENDING)
    
    # Skip screening flag (for business rules)
    skip_realtime = Column(Boolean, default=False)
    skip_reason = Column(String(500))
    
    # Additional data
    source_system = Column(String(100))
    additional_data = Column(JSON, default=dict)
    
    # Relationships
    country = relationship("Country", back_populates="screening_requests")
    branch = relationship("Branch", back_populates="screening_requests")
    requested_by = relationship("User", back_populates="screening_requests")
    results = relationship("ScreeningResult", back_populates="request", cascade="all, delete-orphan")


class ScreeningResult(Base):
    """Aggregated result of a screening request"""
    
    request_id = Column(Integer, ForeignKey('screening_request.id', ondelete='CASCADE'), nullable=False)
    
    # Results summary
    total_matches = Column(Integer, default=0)
    highest_score = Column(Float, default=0.0)
    risk_level = Column(SQLEnum(RiskLevel), default=RiskLevel.LOW)
    
    # Status
    overall_status = Column(SQLEnum(MatchStatus), default=MatchStatus.PENDING_REVIEW)
    auto_released = Column(Boolean, default=False)  # If released automatically
    
    # Processing metadata
    processing_time_ms = Column(Integer)
    lists_screened = Column(JSON, default=list)
    
    # Final decision
    final_decision = Column(String(50))
    decision_date = Column(String(50))
    decision_by_id = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'))
    decision_notes = Column(Text)
    
    # Relationships
    request = relationship("ScreeningRequest", back_populates="results")
    matches = relationship("ScreeningMatch", back_populates="result", cascade="all, delete-orphan")


class ScreeningMatch(Base):
    """Individual match found during screening"""
    
    result_id = Column(Integer, ForeignKey('screening_result.id', ondelete='CASCADE'), nullable=False)
    
    # Match source
    sanction_list_code = Column(String(50), nullable=False)
    sanction_entry_id = Column(Integer, ForeignKey('sanction_entry.id', ondelete='SET NULL'))
    local_entry_id = Column(Integer, ForeignKey('local_list_entry.id', ondelete='SET NULL'))
    
    # Match details
    matched_name = Column(String(500), nullable=False)
    matched_alias = Column(String(500))
    match_score = Column(Float, nullable=False)
    match_algorithm = Column(String(50))  # jaro_winkler, levenshtein, etc.
    
    # Additional match factors
    dob_match = Column(Boolean, default=False)
    nationality_match = Column(Boolean, default=False)
    id_match = Column(Boolean, default=False)
    
    # Match context (denormalized for reporting)
    entity_type = Column(String(50))
    sanction_programs = Column(JSON, default=list)
    sanction_date = Column(String(20))
    sanction_reason = Column(Text)
    
    # Status
    status = Column(SQLEnum(MatchStatus), default=MatchStatus.PENDING_REVIEW)
    
    # Relationships
    result = relationship("ScreeningResult", back_populates="matches")
    decisions = relationship("ScreeningDecision", back_populates="match", cascade="all, delete-orphan")


class ScreeningDecision(Base):
    """Decision/action taken on a screening match"""
    
    match_id = Column(Integer, ForeignKey('screening_match.id', ondelete='CASCADE'), nullable=False)
    
    # Decision
    decision = Column(String(50), nullable=False)  # release, flag, escalate, etc.
    decided_by_id = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'), nullable=False)
    
    # Rationale
    reason_code = Column(String(50))
    reason_text = Column(Text)
    supporting_documents = Column(JSON, default=list)  # List of document references
    
    # Workflow context
    workflow_case_id = Column(Integer, ForeignKey('workflow_case.id', ondelete='SET NULL'))
    is_final = Column(Boolean, default=False)
    
    # Relationships
    match = relationship("ScreeningMatch", back_populates="decisions")

