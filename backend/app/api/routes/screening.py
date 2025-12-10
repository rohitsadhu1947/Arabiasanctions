"""Screening API Routes"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
import uuid
from app.api.schemas.screening import (
    SingleScreeningRequest, BulkScreeningRequest,
    ScreeningResultResponse, BulkScreeningResultResponse,
    ScreeningDecisionRequest, BulkDecisionRequest, ScreeningDecisionResponse,
    ScreeningSearchRequest, MatchDetail, MatchScoreDetail,
    EntityType, RiskLevel, MatchStatus, DecisionAction
)
from app.api.schemas.common import APIResponse, PaginatedResponse, PaginationMeta
from app.api.routes.auth import get_current_user, require_permission, CurrentUser
from app.engine.matcher import ScreeningMatcher, ScreeningCandidate, SanctionCandidate
from app.config import settings
from app.api.routes.workflow import create_workflow_case_from_screening
from app.services.sanctions_service import sanctions_service, SANCTIONS_DATA, SanctionEntry

router = APIRouter()

# Initialize matcher
matcher = ScreeningMatcher(
    default_threshold=settings.DEFAULT_MATCH_THRESHOLD,
    include_aliases=True,
    max_results=50,
)


def get_all_sanction_candidates() -> List[SanctionCandidate]:
    """Get all sanctions entries from all active lists and convert to SanctionCandidate format"""
    candidates = []
    entry_id = 1
    
    # Get all entries from the sanctions service
    all_entries = sanctions_service.get_all_entries()
    
    for entry in all_entries:
        candidate = SanctionCandidate(
            id=entry_id,
            list_code=entry.list_code,
            list_name=entry.list_name,
            primary_name=entry.primary_name,
            entity_type=entry.entry_type,
            aliases=entry.aliases,
            date_of_birth=entry.date_of_birth,
            nationality=entry.nationality,
            national_id=entry.national_id,
            sanction_date=entry.sanction_date,
            sanction_programs=entry.programs,
            sanction_reason=entry.remarks,
            registration_number=entry.registration_number,
            registration_country=entry.registration_country,
        )
        candidates.append(candidate)
        entry_id += 1
    
    return candidates


@router.post("/single", response_model=APIResponse[ScreeningResultResponse])
async def screen_single(
    request: SingleScreeningRequest,
    current_user: CurrentUser = Depends(require_permission("screen:individual"))
):
    """
    Screen a single individual or corporate entity.
    
    This endpoint performs real-time screening against configured sanction lists
    and returns matches with confidence scores.
    """
    reference_id = f"SCR-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    
    # Build candidate based on entity type
    if request.entity_type == EntityType.INDIVIDUAL:
        if not request.individual:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Individual data required for individual screening"
            )
        candidate = ScreeningCandidate(
            name=request.individual.full_name,
            entity_type="individual",
            date_of_birth=request.individual.date_of_birth,
            nationality=request.individual.nationality,
            national_id=request.individual.national_id,
            passport_number=request.individual.passport_number,
        )
    else:
        if not request.corporate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Corporate data required for corporate screening"
            )
        candidate = ScreeningCandidate(
            name=request.corporate.company_name,
            entity_type="corporate",
            registration_number=request.corporate.registration_number,
            registration_country=request.corporate.registration_country,
        )
    
    # Handle skip screening
    if request.skip_realtime:
        return APIResponse(
            success=True,
            message="Screening skipped - will be included in daily batch",
            data=ScreeningResultResponse(
                reference_id=reference_id,
                screened_name=candidate.name,
                entity_type=request.entity_type,
                total_matches=0,
                highest_score=0.0,
                risk_level=RiskLevel.LOW,
                matches=[],
                lists_screened=[],
                processing_time_ms=0,
                timestamp=datetime.utcnow().isoformat(),
                overall_status=MatchStatus.RELEASED,
                auto_released=True,
            )
        )
    
    # Get all sanctions from the service (includes local watchlists)
    all_sanctions = get_all_sanction_candidates()
    
    # Filter by entity type if needed
    if request.entity_type == EntityType.INDIVIDUAL:
        filtered_sanctions = [s for s in all_sanctions if s.entity_type == "individual"]
    else:
        filtered_sanctions = [s for s in all_sanctions if s.entity_type in ["corporate", "entity"]]
    
    # Perform screening
    threshold = request.match_threshold or settings.DEFAULT_MATCH_THRESHOLD
    result = matcher.screen(
        candidate=candidate,
        sanction_entries=filtered_sanctions,
        threshold=threshold,
        reference_id=reference_id,
    )
    
    # Convert to response format
    matches = []
    for match in result.matches:
        matches.append(MatchDetail(
            sanction_entry_id=match.sanction_candidate.id,
            list_code=match.sanction_candidate.list_code,
            list_name=match.sanction_candidate.list_name,
            matched_name=match.matched_name,
            primary_name=match.sanction_candidate.primary_name,
            is_alias_match=match.is_alias_match,
            aliases=match.sanction_candidate.aliases,
            entity_type=match.sanction_candidate.entity_type,
            match_score=match.score,
            score_details=MatchScoreDetail(
                overall_score=match.score_details.name_score.overall_score,
                jaro_winkler=match.score_details.name_score.jaro_winkler,
                levenshtein=match.score_details.name_score.levenshtein,
                token_sort=match.score_details.name_score.token_sort,
                token_set=match.score_details.name_score.token_set,
                phonetic=match.score_details.name_score.phonetic,
                exact_match=match.score_details.name_score.exact_match,
                algorithm_used=match.score_details.name_score.algorithm_used,
            ),
            dob_match=match.score_details.dob_match,
            nationality_match=match.score_details.nationality_match,
            id_match=match.score_details.id_match,
            sanction_date=match.sanction_candidate.sanction_date,
            sanction_programs=match.sanction_candidate.sanction_programs,
            sanction_reason=match.sanction_candidate.sanction_reason,
            status=MatchStatus.PENDING_REVIEW if match.score >= settings.HIGH_RISK_THRESHOLD else MatchStatus.PENDING_REVIEW,
        ))
    
    # Determine overall status
    overall_status = MatchStatus.RELEASED
    auto_released = True
    if result.total_matches > 0:
        if result.highest_score >= settings.HIGH_RISK_THRESHOLD:
            overall_status = MatchStatus.ESCALATED
            auto_released = False
        else:
            overall_status = MatchStatus.PENDING_REVIEW
            auto_released = False
    
    response_data = ScreeningResultResponse(
        reference_id=reference_id,
        screened_name=candidate.name,
        entity_type=request.entity_type,
        total_matches=result.total_matches,
        highest_score=result.highest_score,
        risk_level=RiskLevel(result.risk_level),
        matches=matches,
        lists_screened=result.lists_screened,
        processing_time_ms=result.processing_time_ms,
        timestamp=result.timestamp,
        overall_status=overall_status,
        auto_released=auto_released,
    )
    
    # Create workflow case for matches requiring review
    if result.total_matches > 0 and result.highest_score >= 0.5:
        try:
            create_workflow_case_from_screening(
                screened_name=candidate.name,
                highest_score=result.highest_score,
                reference_id=reference_id,
                country_code=current_user.country_code or "UAE",
            )
        except Exception as e:
            print(f"Failed to create workflow case: {e}")
    
    return APIResponse(
        success=True,
        message="Screening completed" if result.total_matches == 0 else f"Found {result.total_matches} potential match(es)",
        data=response_data,
    )


@router.post("/bulk", response_model=APIResponse[BulkScreeningResultResponse])
async def screen_bulk(
    request: BulkScreeningRequest,
    current_user: CurrentUser = Depends(require_permission("screen:bulk"))
):
    """
    Screen multiple entities in a single request.
    
    Maximum 1000 entities per request. For larger batches,
    use the scheduled batch screening endpoint.
    """
    import time
    start_time = time.time()
    
    batch_id = f"BATCH-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    
    results = []
    failed = 0
    total_with_matches = 0
    high_risk_count = 0
    
    for i, single_request in enumerate(request.requests):
        try:
            # Process each request
            response = await screen_single(single_request, current_user)
            if response.data:
                results.append(response.data)
                if response.data.total_matches > 0:
                    total_with_matches += 1
                if response.data.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                    high_risk_count += 1
        except Exception as e:
            failed += 1
    
    total_time = int((time.time() - start_time) * 1000)
    
    return APIResponse(
        success=True,
        message=f"Batch screening completed: {len(results)} successful, {failed} failed",
        data=BulkScreeningResultResponse(
            batch_id=batch_id,
            total_requests=len(request.requests),
            completed=len(results),
            failed=failed,
            total_with_matches=total_with_matches,
            high_risk_count=high_risk_count,
            results=results,
            total_processing_time_ms=total_time,
            timestamp=datetime.utcnow().isoformat(),
        )
    )


@router.post("/decision", response_model=APIResponse[ScreeningDecisionResponse])
async def make_decision(
    request: ScreeningDecisionRequest,
    current_user: CurrentUser = Depends(require_permission("decision:release"))
):
    """
    Make a decision on a screening match.
    
    Supported decisions:
    - release: Clear the match (no action required)
    - flag: Mark as suspicious
    - escalate: Send to supervisor for review
    - false_positive: Mark as incorrect match
    - true_match: Confirm as actual match
    """
    # In production, save decision to database
    decision_response = ScreeningDecisionResponse(
        match_id=request.match_id,
        decision=request.decision,
        decided_by=current_user.full_name,
        decided_at=datetime.utcnow().isoformat(),
        workflow_case_id=None if request.decision != DecisionAction.ESCALATE else 12345,
        success=True,
        message=f"Match {request.decision.value}d successfully",
    )
    
    return APIResponse(
        success=True,
        message=f"Decision recorded: {request.decision.value}",
        data=decision_response,
    )


@router.post("/decision/bulk", response_model=APIResponse[List[ScreeningDecisionResponse]])
async def make_bulk_decision(
    request: BulkDecisionRequest,
    current_user: CurrentUser = Depends(require_permission("decision:release"))
):
    """Make decisions on multiple screening matches."""
    responses = []
    for decision in request.decisions:
        responses.append(ScreeningDecisionResponse(
            match_id=decision.match_id,
            decision=decision.decision,
            decided_by=current_user.full_name,
            decided_at=datetime.utcnow().isoformat(),
            success=True,
        ))
    
    return APIResponse(
        success=True,
        message=f"Processed {len(responses)} decisions",
        data=responses,
    )


@router.get("/history", response_model=PaginatedResponse[ScreeningResultResponse])
async def get_screening_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    name_contains: Optional[str] = None,
    entity_type: Optional[EntityType] = None,
    risk_level: Optional[RiskLevel] = None,
    status: Optional[MatchStatus] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get screening history with filters."""
    # Demo data - in production, query from database
    demo_results = [
        ScreeningResultResponse(
            reference_id=f"SCR-20241210-{str(i).zfill(4)}",
            screened_name=f"Test Entity {i}",
            entity_type=EntityType.INDIVIDUAL if i % 2 == 0 else EntityType.CORPORATE,
            total_matches=i % 3,
            highest_score=0.85 if i % 3 > 0 else 0.0,
            risk_level=RiskLevel.HIGH if i % 3 > 0 else RiskLevel.LOW,
            matches=[],
            lists_screened=["OFAC_SDN", "UN_CONSOLIDATED"],
            processing_time_ms=50 + i * 10,
            timestamp=datetime.utcnow().isoformat(),
            overall_status=MatchStatus.PENDING_REVIEW if i % 3 > 0 else MatchStatus.RELEASED,
            auto_released=i % 3 == 0,
        )
        for i in range(1, 51)
    ]
    
    # Apply filters
    if name_contains:
        demo_results = [r for r in demo_results if name_contains.lower() in r.screened_name.lower()]
    if entity_type:
        demo_results = [r for r in demo_results if r.entity_type == entity_type]
    if risk_level:
        demo_results = [r for r in demo_results if r.risk_level == risk_level]
    if status:
        demo_results = [r for r in demo_results if r.overall_status == status]
    
    # Paginate
    total = len(demo_results)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = demo_results[start:end]
    
    return PaginatedResponse(
        success=True,
        data=paginated,
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total_items=total,
            total_pages=(total + page_size - 1) // page_size,
            has_next=end < total,
            has_prev=page > 1,
        )
    )


@router.get("/{reference_id}", response_model=APIResponse[ScreeningResultResponse])
async def get_screening_result(
    reference_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a specific screening result by reference ID."""
    # Demo data
    return APIResponse(
        success=True,
        data=ScreeningResultResponse(
            reference_id=reference_id,
            screened_name="Demo Entity",
            entity_type=EntityType.INDIVIDUAL,
            total_matches=1,
            highest_score=0.87,
            risk_level=RiskLevel.HIGH,
            matches=[
                MatchDetail(
                    sanction_entry_id=1,
                    list_code="OFAC_SDN",
                    list_name="OFAC Specially Designated Nationals",
                    matched_name="Demo Entity",
                    primary_name="Demo Sanctioned Entity",
                    is_alias_match=False,
                    entity_type="individual",
                    match_score=0.87,
                    score_details=MatchScoreDetail(
                        overall_score=0.87,
                        jaro_winkler=0.92,
                        levenshtein=0.85,
                        token_sort=0.88,
                        token_set=0.90,
                        phonetic=0.80,
                        exact_match=False,
                        algorithm_used="jaro_winkler",
                    ),
                    sanction_programs=["SDGT"],
                    status=MatchStatus.PENDING_REVIEW,
                )
            ],
            lists_screened=["OFAC_SDN", "UN_CONSOLIDATED"],
            processing_time_ms=45,
            timestamp=datetime.utcnow().isoformat(),
            overall_status=MatchStatus.PENDING_REVIEW,
            auto_released=False,
        )
    )
