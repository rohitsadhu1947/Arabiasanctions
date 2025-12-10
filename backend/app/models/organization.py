"""Organization Models - Country and Branch"""
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base


class Country(Base):
    """Country model for multi-tenant GCC operations"""
    
    code = Column(String(3), unique=True, nullable=False, index=True)  # ISO 3166-1 alpha-3
    name = Column(String(100), nullable=False)
    currency_code = Column(String(3))  # ISO 4217
    timezone = Column(String(50), default="Asia/Dubai")
    
    # Regulatory Settings
    regulatory_body = Column(String(200))
    compliance_email = Column(String(255))
    
    # Configuration
    is_active = Column(Boolean, default=True)
    screening_config = Column(JSON, default=dict)  # Country-specific screening settings
    default_sanction_lists = Column(JSON, default=list)  # Default lists for this country
    
    # Relationships
    branches = relationship("Branch", back_populates="country", cascade="all, delete-orphan")
    users = relationship("User", back_populates="country")
    roles = relationship("Role", back_populates="country")
    local_lists = relationship("LocalList", back_populates="country")
    screening_requests = relationship("ScreeningRequest", back_populates="country")
    
    def __repr__(self):
        return f"<Country {self.code}: {self.name}>"


class Branch(Base):
    """Branch model for granular organizational structure"""
    
    code = Column(String(20), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    
    # Location
    country_id = Column(Integer, ForeignKey('country.id', ondelete='CASCADE'), nullable=False)
    city = Column(String(100))
    address = Column(Text)
    
    # Contact
    phone = Column(String(20))
    email = Column(String(255))
    manager_name = Column(String(200))
    
    # Configuration
    is_active = Column(Boolean, default=True)
    is_headquarters = Column(Boolean, default=False)
    screening_config = Column(JSON, default=dict)  # Branch-specific overrides
    
    # Relationships
    country = relationship("Country", back_populates="branches")
    users = relationship("User", back_populates="branch")
    screening_requests = relationship("ScreeningRequest", back_populates="branch")
    
    def __repr__(self):
        return f"<Branch {self.code}: {self.name}>"

