"""Base Model with common functionality"""
from datetime import datetime
from typing import Any
from sqlalchemy import Column, DateTime, Integer, func
from sqlalchemy.orm import DeclarativeBase, declared_attr


class Base(DeclarativeBase):
    """Base class for all models"""
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    @declared_attr
    def __tablename__(cls) -> str:
        """Generate table name from class name"""
        import re
        name = cls.__name__
        return re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()
    
    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary"""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }

