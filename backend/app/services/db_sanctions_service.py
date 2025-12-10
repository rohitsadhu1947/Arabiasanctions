"""
Database-backed Sanctions List Service for Neon PostgreSQL
"""
from typing import List, Dict, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import DBSanctionEntry, DBSanctionList, SessionLocal
import uuid


class DBSanctionsService:
    """Database-backed service for managing sanctions lists"""
    
    def get_db(self):
        return SessionLocal()
    
    def get_all_entries(self, list_codes: Optional[List[str]] = None) -> List[DBSanctionEntry]:
        """Get all active sanctions entries"""
        db = self.get_db()
        try:
            query = db.query(DBSanctionEntry).filter(DBSanctionEntry.is_active == True)
            
            if list_codes:
                query = query.filter(DBSanctionEntry.list_code.in_(list_codes))
            else:
                # Get entries from active lists only
                active_lists = db.query(DBSanctionList.code).filter(DBSanctionList.is_active == True).all()
                active_codes = [l[0] for l in active_lists]
                query = query.filter(DBSanctionEntry.list_code.in_(active_codes))
            
            return query.all()
        finally:
            db.close()
    
    def get_list_stats(self) -> Dict[str, Any]:
        """Get statistics for all lists"""
        db = self.get_db()
        try:
            global_lists = db.query(DBSanctionList).filter(DBSanctionList.list_type == "global").all()
            local_lists = db.query(DBSanctionList).filter(DBSanctionList.list_type == "local").all()
            
            # Count entries per list
            for lst in global_lists + local_lists:
                lst.total_entries = db.query(DBSanctionEntry).filter(
                    DBSanctionEntry.list_code == lst.code,
                    DBSanctionEntry.is_active == True
                ).count()
            
            total_entries = db.query(DBSanctionEntry).filter(DBSanctionEntry.is_active == True).count()
            
            return {
                "global_lists": [{
                    "code": l.code,
                    "name": l.name,
                    "source": l.source,
                    "url": l.url,
                    "format": l.format,
                    "update_frequency": l.update_frequency,
                    "last_updated": l.last_updated.isoformat() if l.last_updated else None,
                    "total_entries": l.total_entries,
                    "is_active": l.is_active,
                    "auto_update": l.auto_update,
                } for l in global_lists],
                "local_lists": [{
                    "code": l.code,
                    "name": l.name,
                    "country_code": l.country_code,
                    "description": l.description,
                    "last_updated": l.last_updated.isoformat() if l.last_updated else None,
                    "total_entries": l.total_entries,
                    "is_active": l.is_active,
                } for l in local_lists],
                "total_entries": total_entries,
                "last_global_update": None,
            }
        finally:
            db.close()
    
    def get_list_entries(self, list_code: str, search: Optional[str] = None, 
                         page: int = 1, page_size: int = 50) -> Dict[str, Any]:
        """Get entries from a specific list"""
        db = self.get_db()
        try:
            query = db.query(DBSanctionEntry).filter(
                DBSanctionEntry.list_code == list_code,
                DBSanctionEntry.is_active == True
            )
            
            if search:
                search_term = f"%{search.lower()}%"
                query = query.filter(DBSanctionEntry.primary_name.ilike(search_term))
            
            total = query.count()
            entries = query.offset((page - 1) * page_size).limit(page_size).all()
            
            return {
                "entries": [{
                    "source_id": e.source_id,
                    "primary_name": e.primary_name,
                    "entry_type": e.entry_type,
                    "aliases": e.aliases or [],
                    "nationality": e.nationality,
                    "date_of_birth": e.date_of_birth,
                    "programs": e.programs or [],
                    "sanction_date": e.sanction_date,
                    "remarks": e.remarks,
                } for e in entries],
                "total": total,
                "page": page,
                "page_size": page_size,
            }
        finally:
            db.close()
    
    def add_entry(self, list_code: str, entry_data: Dict) -> DBSanctionEntry:
        """Add an entry to a list"""
        db = self.get_db()
        try:
            # Get list info
            lst = db.query(DBSanctionList).filter(DBSanctionList.code == list_code).first()
            if not lst:
                raise ValueError(f"List {list_code} not found")
            
            entry = DBSanctionEntry(
                source_id=f"{list_code}-{uuid.uuid4().hex[:8].upper()}",
                list_code=list_code,
                list_name=lst.name,
                entry_type=entry_data.get("entry_type", "individual"),
                primary_name=entry_data["primary_name"],
                aliases=entry_data.get("aliases", []),
                date_of_birth=entry_data.get("date_of_birth"),
                nationality=entry_data.get("nationality"),
                national_id=entry_data.get("national_id"),
                programs=entry_data.get("programs", []),
                remarks=entry_data.get("remarks"),
                is_active=True,
            )
            
            db.add(entry)
            
            # Update list stats
            lst.total_entries = db.query(DBSanctionEntry).filter(
                DBSanctionEntry.list_code == list_code,
                DBSanctionEntry.is_active == True
            ).count() + 1
            lst.last_updated = datetime.utcnow()
            
            db.commit()
            db.refresh(entry)
            return entry
        finally:
            db.close()
    
    def remove_entry(self, list_code: str, source_id: str) -> bool:
        """Remove (deactivate) an entry from a list"""
        db = self.get_db()
        try:
            entry = db.query(DBSanctionEntry).filter(
                DBSanctionEntry.list_code == list_code,
                DBSanctionEntry.source_id == source_id
            ).first()
            
            if not entry:
                return False
            
            entry.is_active = False
            entry.updated_at = datetime.utcnow()
            
            # Update list stats
            lst = db.query(DBSanctionList).filter(DBSanctionList.code == list_code).first()
            if lst:
                lst.total_entries = db.query(DBSanctionEntry).filter(
                    DBSanctionEntry.list_code == list_code,
                    DBSanctionEntry.is_active == True
                ).count() - 1
                lst.last_updated = datetime.utcnow()
            
            db.commit()
            return True
        finally:
            db.close()
    
    def toggle_list(self, list_code: str, is_active: bool) -> bool:
        """Enable or disable a list"""
        db = self.get_db()
        try:
            lst = db.query(DBSanctionList).filter(DBSanctionList.code == list_code).first()
            if not lst:
                return False
            
            lst.is_active = is_active
            lst.last_updated = datetime.utcnow()
            db.commit()
            return True
        finally:
            db.close()


# Singleton instance
db_sanctions_service = DBSanctionsService()

