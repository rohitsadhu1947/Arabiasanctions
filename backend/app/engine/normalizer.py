"""Name Normalization Engine for consistent matching"""
import re
from typing import List, Optional, Tuple
from unidecode import unidecode


class NameNormalizer:
    """
    Normalizes names for consistent matching across different formats and scripts.
    Handles Arabic, Latin, and transliterated names common in GCC countries.
    """
    
    # Common prefixes and suffixes to handle
    PREFIXES = {
        # Arabic prefixes
        'al', 'el', 'ul', 'bin', 'ibn', 'bint', 'abu', 'umm',
        # Corporate prefixes
        'the', 'a', 'an',
    }
    
    SUFFIXES = {
        # Individual
        'jr', 'sr', 'ii', 'iii', 'iv', 'phd', 'md', 'esq',
        # Corporate
        'llc', 'ltd', 'inc', 'corp', 'co', 'plc', 'fzc', 'fze', 'fzco',
        'wll', 'saog', 'saoc', 'pjsc', 'psc', 'llp', 'lp',
    }
    
    # Common Arabic name variations
    ARABIC_VARIATIONS = {
        'mohammed': ['mohammad', 'muhammed', 'muhammad', 'mohamed', 'mohamad'],
        'ahmed': ['ahmad', 'ahmet'],
        'abdul': ['abd', 'abdel', 'abdal'],
        'ali': ['aly'],
        'hassan': ['hasan'],
        'hussein': ['hussain', 'husain', 'hossein'],
        'khalid': ['khaled'],
        'omar': ['umar'],
        'osman': ['uthman', 'othman'],
        'saleh': ['salih', 'salah'],
        'yousef': ['yusuf', 'youssef', 'joseph'],
        'ibrahim': ['ebrahim', 'abraham'],
    }
    
    # Build reverse lookup
    _VARIATION_MAP = {}
    for standard, variations in ARABIC_VARIATIONS.items():
        _VARIATION_MAP[standard] = standard
        for var in variations:
            _VARIATION_MAP[var] = standard
    
    @classmethod
    def normalize(cls, name: str, keep_prefixes: bool = False) -> str:
        """
        Normalize a name for matching.
        
        Args:
            name: The name to normalize
            keep_prefixes: Whether to keep Arabic prefixes like 'al-'
            
        Returns:
            Normalized name string
        """
        if not name:
            return ""
        
        # Convert to ASCII (handles Arabic, accented chars, etc.)
        normalized = unidecode(name)
        
        # Convert to lowercase
        normalized = normalized.lower()
        
        # Remove special characters except spaces and hyphens
        normalized = re.sub(r'[^\w\s\-]', '', normalized)
        
        # Normalize whitespace
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        # Handle hyphens (al-rashid -> al rashid)
        normalized = normalized.replace('-', ' ')
        
        # Remove prefixes if requested
        if not keep_prefixes:
            words = normalized.split()
            if words and words[0] in cls.PREFIXES:
                words = words[1:]
            normalized = ' '.join(words)
        
        # Normalize whitespace again
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        return normalized
    
    @classmethod
    def normalize_for_matching(cls, name: str) -> str:
        """
        Aggressive normalization for fuzzy matching.
        Removes all spacing and standardizes common variations.
        """
        normalized = cls.normalize(name, keep_prefixes=False)
        
        # Standardize common Arabic name variations
        words = normalized.split()
        standardized = []
        for word in words:
            if word in cls._VARIATION_MAP:
                standardized.append(cls._VARIATION_MAP[word])
            else:
                standardized.append(word)
        
        # Remove all spaces for aggressive matching
        return ''.join(standardized)
    
    @classmethod
    def get_name_tokens(cls, name: str) -> List[str]:
        """
        Split name into tokens for component matching.
        """
        normalized = cls.normalize(name, keep_prefixes=True)
        tokens = normalized.split()
        
        # Filter out single-character tokens unless they might be initials
        tokens = [t for t in tokens if len(t) > 1 or t.isupper()]
        
        return tokens
    
    @classmethod
    def extract_name_parts(cls, full_name: str) -> Tuple[str, Optional[str], str]:
        """
        Extract first, middle, and last name from a full name.
        Returns: (first_name, middle_name, last_name)
        """
        tokens = cls.get_name_tokens(full_name)
        
        if len(tokens) == 0:
            return ("", None, "")
        elif len(tokens) == 1:
            return (tokens[0], None, "")
        elif len(tokens) == 2:
            return (tokens[0], None, tokens[1])
        else:
            return (tokens[0], ' '.join(tokens[1:-1]), tokens[-1])
    
    @classmethod
    def generate_variations(cls, name: str) -> List[str]:
        """
        Generate possible variations of a name for broader matching.
        """
        variations = set()
        normalized = cls.normalize(name, keep_prefixes=True)
        variations.add(normalized)
        
        # Without prefixes
        variations.add(cls.normalize(name, keep_prefixes=False))
        
        words = normalized.split()
        
        # Try different orderings (first-last vs last-first)
        if len(words) >= 2:
            variations.add(f"{words[-1]} {' '.join(words[:-1])}")
            variations.add(f"{words[0]} {words[-1]}")
        
        # Try Arabic name variations
        for i, word in enumerate(words):
            if word in cls._VARIATION_MAP:
                standard = cls._VARIATION_MAP[word]
                # Add version with standard form
                new_words = words.copy()
                new_words[i] = standard
                variations.add(' '.join(new_words))
                
                # Add versions with all variations
                for variation_name, variations_list in cls.ARABIC_VARIATIONS.items():
                    if standard == variation_name:
                        for var in variations_list:
                            new_words = words.copy()
                            new_words[i] = var
                            variations.add(' '.join(new_words))
        
        return list(variations)
    
    @classmethod
    def is_corporate_name(cls, name: str) -> bool:
        """
        Detect if a name appears to be a corporate entity.
        """
        normalized = cls.normalize(name).lower()
        words = normalized.split()
        
        corporate_indicators = {
            'company', 'corporation', 'corp', 'incorporated', 'inc',
            'limited', 'ltd', 'llc', 'llp', 'plc', 'psc', 'pjsc',
            'group', 'holding', 'holdings', 'enterprise', 'enterprises',
            'trading', 'trading co', 'establishment', 'est',
            'bank', 'insurance', 'investment', 'capital',
            'fzc', 'fze', 'fzco', 'wll', 'saog', 'saoc',
        }
        
        # Check if any corporate indicator is present
        for indicator in corporate_indicators:
            if indicator in words or indicator in normalized:
                return True
        
        return False

