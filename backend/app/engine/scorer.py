"""Match Scoring Engine with multiple algorithms"""
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from rapidfuzz import fuzz
from rapidfuzz.distance import Levenshtein, JaroWinkler
import jellyfish
from app.engine.normalizer import NameNormalizer


@dataclass
class MatchScore:
    """Represents a match score with algorithm breakdown"""
    overall_score: float
    jaro_winkler: float
    levenshtein: float
    token_sort: float
    token_set: float
    phonetic: float
    exact_match: bool
    algorithm_used: str
    
    def to_dict(self) -> dict:
        return {
            "overall_score": round(self.overall_score, 4),
            "jaro_winkler": round(self.jaro_winkler, 4),
            "levenshtein": round(self.levenshtein, 4),
            "token_sort": round(self.token_sort, 4),
            "token_set": round(self.token_set, 4),
            "phonetic": round(self.phonetic, 4),
            "exact_match": self.exact_match,
            "algorithm_used": self.algorithm_used,
        }


class MatchScorer:
    """
    Multi-algorithm match scoring engine.
    Combines various fuzzy matching algorithms for robust name matching.
    """
    
    # Algorithm weights for combined scoring
    DEFAULT_WEIGHTS = {
        "jaro_winkler": 0.30,
        "levenshtein": 0.20,
        "token_sort": 0.25,
        "token_set": 0.15,
        "phonetic": 0.10,
    }
    
    def __init__(self, weights: Optional[Dict[str, float]] = None):
        """
        Initialize scorer with custom weights if provided.
        """
        self.weights = weights or self.DEFAULT_WEIGHTS
        self.normalizer = NameNormalizer()
    
    def calculate_jaro_winkler(self, s1: str, s2: str) -> float:
        """
        Jaro-Winkler similarity - good for short strings and typos.
        Returns value between 0 and 1.
        """
        if not s1 or not s2:
            return 0.0
        
        # Use rapidfuzz's implementation
        similarity = JaroWinkler.normalized_similarity(s1, s2)
        return similarity
    
    def calculate_levenshtein(self, s1: str, s2: str) -> float:
        """
        Levenshtein (edit distance) normalized similarity.
        Returns value between 0 and 1.
        """
        if not s1 or not s2:
            return 0.0
        
        similarity = Levenshtein.normalized_similarity(s1, s2)
        return similarity
    
    def calculate_token_sort(self, s1: str, s2: str) -> float:
        """
        Token Sort Ratio - handles word reordering.
        Good for "John Smith" vs "Smith, John"
        """
        if not s1 or not s2:
            return 0.0
        
        return fuzz.token_sort_ratio(s1, s2) / 100.0
    
    def calculate_token_set(self, s1: str, s2: str) -> float:
        """
        Token Set Ratio - handles partial matches and extra words.
        Good for "John Smith" vs "John Michael Smith"
        """
        if not s1 or not s2:
            return 0.0
        
        return fuzz.token_set_ratio(s1, s2) / 100.0
    
    def calculate_phonetic(self, s1: str, s2: str) -> float:
        """
        Phonetic matching using Metaphone.
        Good for names that sound similar but are spelled differently.
        """
        if not s1 or not s2:
            return 0.0
        
        try:
            # Get metaphone codes for each word
            words1 = s1.split()
            words2 = s2.split()
            
            if not words1 or not words2:
                return 0.0
            
            # Compare metaphone codes
            codes1 = [jellyfish.metaphone(w) for w in words1 if w]
            codes2 = [jellyfish.metaphone(w) for w in words2 if w]
            
            if not codes1 or not codes2:
                return 0.0
            
            # Count matching codes
            matches = 0
            for c1 in codes1:
                if c1 in codes2:
                    matches += 1
            
            # Return ratio of matches
            return matches / max(len(codes1), len(codes2))
        except Exception:
            return 0.0
    
    def score(self, query: str, target: str, normalize: bool = True) -> MatchScore:
        """
        Calculate comprehensive match score between two names.
        
        Args:
            query: The name being searched
            target: The name being compared against (from sanction list)
            normalize: Whether to normalize names before comparison
            
        Returns:
            MatchScore object with detailed breakdown
        """
        if normalize:
            query = self.normalizer.normalize(query)
            target = self.normalizer.normalize(target)
        
        # Check for exact match first
        exact_match = query.lower() == target.lower()
        if exact_match:
            return MatchScore(
                overall_score=1.0,
                jaro_winkler=1.0,
                levenshtein=1.0,
                token_sort=1.0,
                token_set=1.0,
                phonetic=1.0,
                exact_match=True,
                algorithm_used="exact"
            )
        
        # Calculate individual algorithm scores
        jw = self.calculate_jaro_winkler(query, target)
        lev = self.calculate_levenshtein(query, target)
        ts = self.calculate_token_sort(query, target)
        tset = self.calculate_token_set(query, target)
        phon = self.calculate_phonetic(query, target)
        
        # Calculate weighted overall score
        overall = (
            self.weights["jaro_winkler"] * jw +
            self.weights["levenshtein"] * lev +
            self.weights["token_sort"] * ts +
            self.weights["token_set"] * tset +
            self.weights["phonetic"] * phon
        )
        
        # Determine which algorithm contributed most
        scores = {
            "jaro_winkler": jw,
            "levenshtein": lev,
            "token_sort": ts,
            "token_set": tset,
            "phonetic": phon,
        }
        algorithm_used = max(scores, key=scores.get)
        
        return MatchScore(
            overall_score=overall,
            jaro_winkler=jw,
            levenshtein=lev,
            token_sort=ts,
            token_set=tset,
            phonetic=phon,
            exact_match=False,
            algorithm_used=algorithm_used
        )
    
    def score_with_variations(self, query: str, target: str) -> MatchScore:
        """
        Score with name variations for better matching.
        """
        query_variations = self.normalizer.generate_variations(query)
        target_variations = self.normalizer.generate_variations(target)
        
        best_score = None
        
        for qv in query_variations:
            for tv in target_variations:
                score = self.score(qv, tv, normalize=False)
                if best_score is None or score.overall_score > best_score.overall_score:
                    best_score = score
        
        return best_score or self.score(query, target)
    
    def quick_filter(self, query: str, target: str, threshold: float = 0.5) -> bool:
        """
        Quick check if two names might match.
        Used to pre-filter before full scoring.
        """
        q = self.normalizer.normalize_for_matching(query)
        t = self.normalizer.normalize_for_matching(target)
        
        # Quick length check
        len_ratio = min(len(q), len(t)) / max(len(q), len(t)) if max(len(q), len(t)) > 0 else 0
        if len_ratio < 0.5:
            return False
        
        # Quick Jaro-Winkler check
        jw = self.calculate_jaro_winkler(q, t)
        return jw >= threshold


@dataclass
class EnhancedMatchResult:
    """Enhanced match result with additional context"""
    name_score: MatchScore
    dob_match: bool
    nationality_match: bool
    id_match: bool
    combined_score: float
    confidence_factors: Dict[str, float]
    
    def to_dict(self) -> dict:
        return {
            "name_score": self.name_score.to_dict(),
            "dob_match": self.dob_match,
            "nationality_match": self.nationality_match,
            "id_match": self.id_match,
            "combined_score": round(self.combined_score, 4),
            "confidence_factors": self.confidence_factors,
        }


class EnhancedScorer:
    """
    Enhanced scorer that considers additional attributes beyond name matching.
    """
    
    # Weight boosts for additional attribute matches
    DOB_BOOST = 0.15
    NATIONALITY_BOOST = 0.05
    ID_BOOST = 0.20
    
    def __init__(self):
        self.name_scorer = MatchScorer()
    
    def score(
        self,
        query_name: str,
        target_name: str,
        query_dob: Optional[str] = None,
        target_dob: Optional[str] = None,
        query_nationality: Optional[str] = None,
        target_nationality: Optional[str] = None,
        query_id: Optional[str] = None,
        target_id: Optional[str] = None,
    ) -> EnhancedMatchResult:
        """
        Calculate enhanced match score considering multiple attributes.
        """
        # Calculate base name score
        name_score = self.name_scorer.score_with_variations(query_name, target_name)
        
        # Check additional attributes
        dob_match = self._check_dob_match(query_dob, target_dob)
        nationality_match = self._check_nationality_match(query_nationality, target_nationality)
        id_match = self._check_id_match(query_id, target_id)
        
        # Calculate combined score with boosts
        combined = name_score.overall_score
        confidence_factors = {"name": name_score.overall_score}
        
        if dob_match:
            combined = min(1.0, combined + self.DOB_BOOST)
            confidence_factors["dob"] = self.DOB_BOOST
        
        if nationality_match:
            combined = min(1.0, combined + self.NATIONALITY_BOOST)
            confidence_factors["nationality"] = self.NATIONALITY_BOOST
        
        if id_match:
            combined = min(1.0, combined + self.ID_BOOST)
            confidence_factors["id"] = self.ID_BOOST
        
        return EnhancedMatchResult(
            name_score=name_score,
            dob_match=dob_match,
            nationality_match=nationality_match,
            id_match=id_match,
            combined_score=combined,
            confidence_factors=confidence_factors,
        )
    
    def _check_dob_match(self, query: Optional[str], target: Optional[str]) -> bool:
        """Check if dates of birth match."""
        if not query or not target:
            return False
        
        # Normalize date formats
        q = self._normalize_date(query)
        t = self._normalize_date(target)
        
        return q == t if q and t else False
    
    def _normalize_date(self, date_str: str) -> Optional[str]:
        """Normalize date string to YYYY-MM-DD format."""
        import re
        from datetime import datetime
        
        if not date_str:
            return None
        
        # Try common formats
        formats = [
            "%Y-%m-%d", "%d-%m-%Y", "%m-%d-%Y",
            "%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y",
            "%d.%m.%Y", "%Y.%m.%d",
        ]
        
        # Clean the string
        date_str = date_str.strip()
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
        
        return None
    
    def _check_nationality_match(self, query: Optional[str], target: Optional[str]) -> bool:
        """Check if nationalities match."""
        if not query or not target:
            return False
        
        # Normalize and compare
        q = query.strip().lower()
        t = target.strip().lower()
        
        # Direct match
        if q == t:
            return True
        
        # Common variations
        variations = {
            "uae": ["united arab emirates", "emirates"],
            "ksa": ["saudi arabia", "kingdom of saudi arabia", "saudi"],
            "usa": ["united states", "united states of america", "america"],
            "uk": ["united kingdom", "great britain", "britain", "england"],
        }
        
        for canonical, aliases in variations.items():
            all_forms = [canonical] + aliases
            if q in all_forms and t in all_forms:
                return True
        
        return False
    
    def _check_id_match(self, query: Optional[str], target: Optional[str]) -> bool:
        """Check if ID numbers match."""
        if not query or not target:
            return False
        
        # Normalize: remove spaces, dashes, convert to uppercase
        q = re.sub(r'[\s\-]', '', query.strip().upper())
        t = re.sub(r'[\s\-]', '', target.strip().upper())
        
        return q == t


import re  # Add import at module level for _check_id_match

