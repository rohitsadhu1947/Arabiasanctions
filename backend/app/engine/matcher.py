"""Main Screening Matcher Engine"""
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import asyncio
from app.engine.normalizer import NameNormalizer
from app.engine.scorer import MatchScorer, EnhancedScorer, EnhancedMatchResult


@dataclass
class ScreeningCandidate:
    """A candidate entity to screen"""
    name: str
    entity_type: str = "individual"
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    national_id: Optional[str] = None
    passport_number: Optional[str] = None
    # Corporate fields
    registration_number: Optional[str] = None
    registration_country: Optional[str] = None
    
    def __post_init__(self):
        self.normalized_name = NameNormalizer.normalize(self.name)


@dataclass
class SanctionCandidate:
    """A sanction list entry to match against"""
    id: int
    list_code: str
    list_name: str
    primary_name: str
    entity_type: str
    aliases: List[str] = field(default_factory=list)
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    national_id: Optional[str] = None
    sanction_date: Optional[str] = None
    sanction_programs: List[str] = field(default_factory=list)
    sanction_reason: Optional[str] = None
    # Corporate fields
    registration_number: Optional[str] = None
    registration_country: Optional[str] = None
    
    def __post_init__(self):
        self.normalized_name = NameNormalizer.normalize(self.primary_name)
        self.normalized_aliases = [NameNormalizer.normalize(a) for a in self.aliases]


@dataclass
class MatchResult:
    """Result of a screening match"""
    sanction_candidate: SanctionCandidate
    matched_name: str  # Which name matched (primary or alias)
    is_alias_match: bool
    score_details: EnhancedMatchResult
    
    @property
    def score(self) -> float:
        return self.score_details.combined_score
    
    def to_dict(self) -> dict:
        return {
            "sanction_entry_id": self.sanction_candidate.id,
            "list_code": self.sanction_candidate.list_code,
            "list_name": self.sanction_candidate.list_name,
            "matched_name": self.matched_name,
            "primary_name": self.sanction_candidate.primary_name,
            "is_alias_match": self.is_alias_match,
            "entity_type": self.sanction_candidate.entity_type,
            "sanction_date": self.sanction_candidate.sanction_date,
            "sanction_programs": self.sanction_candidate.sanction_programs,
            "sanction_reason": self.sanction_candidate.sanction_reason,
            "score": round(self.score, 4),
            "score_details": self.score_details.to_dict(),
        }


@dataclass
class ScreeningResponse:
    """Complete response from a screening request"""
    reference_id: str
    screened_entity: ScreeningCandidate
    matches: List[MatchResult]
    total_matches: int
    highest_score: float
    risk_level: str
    processing_time_ms: int
    lists_screened: List[str]
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> dict:
        return {
            "reference_id": self.reference_id,
            "screened_name": self.screened_entity.name,
            "entity_type": self.screened_entity.entity_type,
            "total_matches": self.total_matches,
            "highest_score": round(self.highest_score, 4),
            "risk_level": self.risk_level,
            "processing_time_ms": self.processing_time_ms,
            "lists_screened": self.lists_screened,
            "timestamp": self.timestamp,
            "matches": [m.to_dict() for m in self.matches],
        }


class ScreeningMatcher:
    """
    Main screening engine that orchestrates the matching process.
    """
    
    RISK_THRESHOLDS = {
        "critical": 0.95,
        "high": 0.85,
        "medium": 0.70,
        "low": 0.0,
    }
    
    def __init__(
        self,
        default_threshold: float = 0.75,
        include_aliases: bool = True,
        max_results: int = 50,
    ):
        """
        Initialize the screening matcher.
        
        Args:
            default_threshold: Minimum score to consider a match
            include_aliases: Whether to match against aliases
            max_results: Maximum number of results to return per screening
        """
        self.default_threshold = default_threshold
        self.include_aliases = include_aliases
        self.max_results = max_results
        self.scorer = EnhancedScorer()
        self.name_scorer = MatchScorer()
    
    def screen(
        self,
        candidate: ScreeningCandidate,
        sanction_entries: List[SanctionCandidate],
        threshold: Optional[float] = None,
        reference_id: Optional[str] = None,
    ) -> ScreeningResponse:
        """
        Screen a candidate against sanction entries.
        
        Args:
            candidate: The entity to screen
            sanction_entries: List of sanction entries to match against
            threshold: Custom threshold (uses default if not provided)
            reference_id: Optional reference ID for tracking
            
        Returns:
            ScreeningResponse with all matches above threshold
        """
        import time
        import uuid
        
        start_time = time.time()
        threshold = threshold or self.default_threshold
        reference_id = reference_id or str(uuid.uuid4())
        
        matches: List[MatchResult] = []
        lists_screened = set()
        
        for entry in sanction_entries:
            lists_screened.add(entry.list_code)
            
            # Quick filter first
            if not self.name_scorer.quick_filter(
                candidate.normalized_name, 
                entry.normalized_name, 
                threshold=threshold * 0.7
            ):
                # Also check aliases with quick filter
                alias_might_match = False
                if self.include_aliases:
                    for alias in entry.normalized_aliases:
                        if self.name_scorer.quick_filter(
                            candidate.normalized_name, alias, threshold=threshold * 0.7
                        ):
                            alias_might_match = True
                            break
                
                if not alias_might_match:
                    continue
            
            # Full scoring against primary name
            primary_score = self.scorer.score(
                query_name=candidate.name,
                target_name=entry.primary_name,
                query_dob=candidate.date_of_birth,
                target_dob=entry.date_of_birth,
                query_nationality=candidate.nationality,
                target_nationality=entry.nationality,
                query_id=candidate.national_id or candidate.passport_number,
                target_id=entry.national_id,
            )
            
            best_score = primary_score
            best_name = entry.primary_name
            is_alias = False
            
            # Score against aliases if enabled
            if self.include_aliases:
                for alias in entry.aliases:
                    alias_score = self.scorer.score(
                        query_name=candidate.name,
                        target_name=alias,
                        query_dob=candidate.date_of_birth,
                        target_dob=entry.date_of_birth,
                        query_nationality=candidate.nationality,
                        target_nationality=entry.nationality,
                        query_id=candidate.national_id or candidate.passport_number,
                        target_id=entry.national_id,
                    )
                    
                    if alias_score.combined_score > best_score.combined_score:
                        best_score = alias_score
                        best_name = alias
                        is_alias = True
            
            # Add match if above threshold
            if best_score.combined_score >= threshold:
                matches.append(MatchResult(
                    sanction_candidate=entry,
                    matched_name=best_name,
                    is_alias_match=is_alias,
                    score_details=best_score,
                ))
        
        # Sort by score descending and limit results
        matches.sort(key=lambda m: m.score, reverse=True)
        matches = matches[:self.max_results]
        
        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Determine risk level
        highest_score = matches[0].score if matches else 0.0
        risk_level = self._determine_risk_level(highest_score)
        
        return ScreeningResponse(
            reference_id=reference_id,
            screened_entity=candidate,
            matches=matches,
            total_matches=len(matches),
            highest_score=highest_score,
            risk_level=risk_level,
            processing_time_ms=processing_time_ms,
            lists_screened=list(lists_screened),
        )
    
    async def screen_async(
        self,
        candidate: ScreeningCandidate,
        sanction_entries: List[SanctionCandidate],
        threshold: Optional[float] = None,
        reference_id: Optional[str] = None,
    ) -> ScreeningResponse:
        """Async version of screen for better concurrency."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.screen,
            candidate,
            sanction_entries,
            threshold,
            reference_id,
        )
    
    async def screen_bulk(
        self,
        candidates: List[ScreeningCandidate],
        sanction_entries: List[SanctionCandidate],
        threshold: Optional[float] = None,
        batch_id: Optional[str] = None,
    ) -> List[ScreeningResponse]:
        """
        Screen multiple candidates concurrently.
        """
        import uuid
        
        batch_id = batch_id or str(uuid.uuid4())
        
        tasks = [
            self.screen_async(
                candidate,
                sanction_entries,
                threshold,
                f"{batch_id}-{i}",
            )
            for i, candidate in enumerate(candidates)
        ]
        
        return await asyncio.gather(*tasks)
    
    def _determine_risk_level(self, score: float) -> str:
        """Determine risk level based on highest match score."""
        for level, min_score in self.RISK_THRESHOLDS.items():
            if score >= min_score:
                return level
        return "low"


class BatchScreeningEngine:
    """
    Engine for handling daily/scheduled batch screening.
    """
    
    def __init__(self, matcher: ScreeningMatcher):
        self.matcher = matcher
    
    async def process_daily_screening(
        self,
        existing_entities: List[ScreeningCandidate],
        sanction_entries: List[SanctionCandidate],
        previous_results: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Process daily screening of existing entities against updated lists.
        
        Args:
            existing_entities: All entities to screen
            sanction_entries: Current sanction list entries
            previous_results: Previous screening results {entity_id: highest_score}
            
        Returns:
            Dictionary with new matches, cleared matches, and statistics
        """
        results = await self.matcher.screen_bulk(existing_entities, sanction_entries)
        
        new_matches = []
        cleared_matches = []
        unchanged = []
        
        previous_results = previous_results or {}
        
        for response in results:
            entity_id = response.reference_id
            prev_score = previous_results.get(entity_id, 0.0)
            
            if response.highest_score > 0 and prev_score == 0:
                # New match found
                new_matches.append(response)
            elif response.highest_score == 0 and prev_score > 0:
                # Previously matched entity now clear
                cleared_matches.append({
                    "entity_id": entity_id,
                    "previous_score": prev_score,
                })
            else:
                unchanged.append(response)
        
        return {
            "new_matches": [r.to_dict() for r in new_matches],
            "cleared_matches": cleared_matches,
            "unchanged_count": len(unchanged),
            "total_screened": len(existing_entities),
            "total_with_matches": sum(1 for r in results if r.total_matches > 0),
        }

