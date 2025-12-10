"""
Application Configuration
Centralized settings management with environment variable support
"""
from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings with validation"""
    
    # Application
    APP_NAME: str = "Screening Engine"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # API
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/screening_engine"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = Field(default="super-secret-key-change-in-production-immediately")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    
    # Screening Engine Settings
    DEFAULT_MATCH_THRESHOLD: float = 0.75
    HIGH_RISK_THRESHOLD: float = 0.90
    MAX_BULK_SCREENING_SIZE: int = 1000
    
    # Sanction List Sources
    REFINITIV_API_KEY: Optional[str] = None
    OFAC_UPDATE_URL: str = "https://www.treasury.gov/ofac/downloads/sdn.xml"
    UN_SANCTIONS_URL: str = "https://scsanctions.un.org/resources/xml/en/consolidated.xml"
    
    # Workflow Settings
    DEFAULT_ESCALATION_TIMEOUT_HOURS: int = 24
    MAX_APPROVAL_CYCLES: int = 3
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()

