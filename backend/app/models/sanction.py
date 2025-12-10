"""Sanction List Models"""
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Text, JSON, Date, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum


class ListSource(str, enum.Enum):
    """Sanction list sources"""
    UN = "un"
    OFAC = "ofac"
    EU = "eu"
    UK = "uk"
    REFINITIV = "refinitiv"
    LOCAL = "local"
    CUSTOM = "custom"


class EntityType(str, enum.Enum):
    """Entity type for sanction entries"""
    INDIVIDUAL = "individual"
    CORPORATE = "corporate"
    VESSEL = "vessel"
    AIRCRAFT = "aircraft"


class SanctionList(Base):
    """Sanction List source configuration"""
    
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    source = Column(SQLEnum(ListSource), nullable=False)
    
    # Update configuration
    update_url = Column(String(500))
    update_frequency_hours = Column(Integer, default=24)
    last_updated = Column(String(50))
    last_update_status = Column(String(50))
    entry_count = Column(Integer, default=0)
    
    # Settings
    is_active = Column(Boolean, default=True)
    is_mandatory = Column(Boolean, default=False)  # Cannot be deselected
    priority = Column(Integer, default=100)  # Higher = more important
    
    # Parser configuration
    parser_config = Column(JSON, default=dict)
    
    # Relationships
    entries = relationship("SanctionEntry", back_populates="sanction_list", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<SanctionList {self.code}: {self.name}>"


class SanctionEntry(Base):
    """Individual entry in a sanction list"""
    
    sanction_list_id = Column(Integer, ForeignKey('sanction_list.id', ondelete='CASCADE'), nullable=False)
    
    # Identification
    external_id = Column(String(100), index=True)  # ID from source list
    entity_type = Column(SQLEnum(EntityType), nullable=False, default=EntityType.INDIVIDUAL)
    
    # Primary name
    primary_name = Column(String(500), nullable=False, index=True)
    normalized_name = Column(String(500), index=True)  # For matching
    
    # Individual-specific
    date_of_birth = Column(Date)
    place_of_birth = Column(String(200))
    nationality = Column(String(100))
    national_id = Column(String(100))
    passport_number = Column(String(100))
    gender = Column(String(20))
    
    # Corporate-specific
    registration_number = Column(String(100))
    registration_country = Column(String(100))
    
    # Sanction details
    sanction_date = Column(Date)
    sanction_reason = Column(Text)
    sanction_programs = Column(JSON, default=list)  # List of programs (e.g., ["SDGT", "IRAN"])
    
    # Address
    addresses = Column(JSON, default=list)
    
    # Status
    is_active = Column(Boolean, default=True)
    removed_date = Column(Date)  # If removed from list
    
    # Additional data
    additional_info = Column(JSON, default=dict)
    
    # Relationships
    sanction_list = relationship("SanctionList", back_populates="entries")
    aliases = relationship("SanctionAlias", back_populates="entry", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<SanctionEntry {self.primary_name}>"


class SanctionAlias(Base):
    """Aliases/AKA for sanction entries"""
    
    entry_id = Column(Integer, ForeignKey('sanction_entry.id', ondelete='CASCADE'), nullable=False)
    
    alias_name = Column(String(500), nullable=False, index=True)
    normalized_name = Column(String(500), index=True)  # For matching
    alias_type = Column(String(50))  # AKA, FKA, spelling variant, etc.
    is_primary = Column(Boolean, default=False)
    quality = Column(String(20))  # high, medium, low
    
    # Relationships
    entry = relationship("SanctionEntry", back_populates="aliases")


class LocalList(Base):
    """Country-specific local watchlist"""
    
    country_id = Column(Integer, ForeignKey('country.id', ondelete='CASCADE'), nullable=False)
    
    code = Column(String(50), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Settings
    is_active = Column(Boolean, default=True)
    is_mandatory = Column(Boolean, default=True)
    priority = Column(Integer, default=50)
    
    # Relationships
    country = relationship("Country", back_populates="local_lists")
    entries = relationship("LocalListEntry", back_populates="local_list", cascade="all, delete-orphan")


class LocalListEntry(Base):
    """Entry in a local watchlist"""
    
    local_list_id = Column(Integer, ForeignKey('local_list.id', ondelete='CASCADE'), nullable=False)
    
    # Same structure as SanctionEntry
    entity_type = Column(SQLEnum(EntityType), nullable=False, default=EntityType.INDIVIDUAL)
    primary_name = Column(String(500), nullable=False, index=True)
    normalized_name = Column(String(500), index=True)
    
    date_of_birth = Column(Date)
    nationality = Column(String(100))
    national_id = Column(String(100))
    
    reason = Column(Text)
    added_by = Column(Integer, ForeignKey('user.id', ondelete='SET NULL'))
    
    is_active = Column(Boolean, default=True)
    expiry_date = Column(Date)
    
    additional_info = Column(JSON, default=dict)
    
    # Relationships
    local_list = relationship("LocalList", back_populates="entries")

