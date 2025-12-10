"""
Audit Log Service - Comprehensive activity tracking for compliance

Tracks:
- User authentication events
- Screening operations
- Workflow actions
- Configuration changes
- Data access
- System events
"""
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum
import uuid
import json


class AuditCategory(str, Enum):
    AUTHENTICATION = "authentication"
    SCREENING = "screening"
    WORKFLOW = "workflow"
    DECISION = "decision"
    CONFIGURATION = "configuration"
    DATA_ACCESS = "data_access"
    USER_MANAGEMENT = "user_management"
    SYSTEM = "system"
    EXPORT = "export"
    IMPORT = "import"


class AuditAction(str, Enum):
    # Auth
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGED = "password_changed"
    SESSION_EXPIRED = "session_expired"
    
    # Screening
    SCREEN_SINGLE = "screen_single"
    SCREEN_BULK = "screen_bulk"
    SCREEN_DAILY = "screen_daily"
    MATCH_REVIEWED = "match_reviewed"
    
    # Workflow
    CASE_CREATED = "case_created"
    CASE_ASSIGNED = "case_assigned"
    CASE_ESCALATED = "case_escalated"
    CASE_RETURNED = "case_returned"
    CASE_APPROVED = "case_approved"
    CASE_REJECTED = "case_rejected"
    CASE_CLOSED = "case_closed"
    COMMENT_ADDED = "comment_added"
    
    # Config
    LIST_ENABLED = "list_enabled"
    LIST_DISABLED = "list_disabled"
    LIST_REFRESHED = "list_refreshed"
    THRESHOLD_CHANGED = "threshold_changed"
    RULE_CREATED = "rule_created"
    RULE_UPDATED = "rule_updated"
    RULE_DELETED = "rule_deleted"
    
    # User Management
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DEACTIVATED = "user_deactivated"
    USER_ACTIVATED = "user_activated"
    ROLE_ASSIGNED = "role_assigned"
    PERMISSION_CHANGED = "permission_changed"
    
    # Data
    REPORT_GENERATED = "report_generated"
    DATA_EXPORTED = "data_exported"
    DATA_IMPORTED = "data_imported"
    ENTRY_ADDED = "entry_added"
    ENTRY_REMOVED = "entry_removed"
    
    # System
    SYSTEM_START = "system_start"
    SYSTEM_STOP = "system_stop"
    CONFIG_BACKUP = "config_backup"
    ERROR = "error"


@dataclass
class AuditLogEntry:
    """Single audit log entry"""
    id: str
    timestamp: str
    category: AuditCategory
    action: AuditAction
    user_id: Optional[int]
    user_email: Optional[str]
    user_name: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    country_code: Optional[str]
    branch_code: Optional[str]
    resource_type: Optional[str]
    resource_id: Optional[str]
    resource_name: Optional[str]
    details: Dict[str, Any] = field(default_factory=dict)
    status: str = "success"  # success, failure, warning
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)


# In-memory storage (in production, use database)
AUDIT_LOGS: List[AuditLogEntry] = []


def _generate_demo_logs():
    """Generate demo audit logs for testing"""
    now = datetime.utcnow()
    
    demo_logs = [
        # Auth events
        AuditLogEntry(
            id=str(uuid.uuid4()),
            timestamp=(now - timedelta(hours=5)).isoformat(),
            category=AuditCategory.AUTHENTICATION,
            action=AuditAction.LOGIN,
            user_id=1,
            user_email="admin@insurance.qa",
            user_name="Admin User",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
            country_code="QAT",
            branch_code="DOH001",
            resource_type=None,
            resource_id=None,
            resource_name=None,
            details={"method": "password"},
            status="success",
        ),
        AuditLogEntry(
            id=str(uuid.uuid4()),
            timestamp=(now - timedelta(hours=4, minutes=30)).isoformat(),
            category=AuditCategory.SCREENING,
            action=AuditAction.SCREEN_SINGLE,
            user_id=1,
            user_email="admin@insurance.qa",
            user_name="Admin User",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
            country_code="QAT",
            branch_code="DOH001",
            resource_type="screening",
            resource_id="SCR-20241210-001",
            resource_name="Mohammad Al-Rashid",
            details={
                "entity_type": "individual",
                "matches_found": 1,
                "highest_score": 1.0,
                "lists_screened": ["OFAC_SDN", "UN_CONSOLIDATED"],
            },
            status="success",
            duration_ms=45,
        ),
        AuditLogEntry(
            id=str(uuid.uuid4()),
            timestamp=(now - timedelta(hours=4)).isoformat(),
            category=AuditCategory.WORKFLOW,
            action=AuditAction.CASE_CREATED,
            user_id=1,
            user_email="admin@insurance.qa",
            user_name="Admin User",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
            country_code="QAT",
            branch_code="DOH001",
            resource_type="workflow_case",
            resource_id="WF-20241210-ABC123",
            resource_name="Mohammad Al-Rashid",
            details={
                "priority": "high",
                "assigned_to": "Sarah Johnson",
                "match_score": 1.0,
            },
            status="success",
        ),
        AuditLogEntry(
            id=str(uuid.uuid4()),
            timestamp=(now - timedelta(hours=3)).isoformat(),
            category=AuditCategory.WORKFLOW,
            action=AuditAction.CASE_ESCALATED,
            user_id=2,
            user_email="sarah@insurance.qa",
            user_name="Sarah Johnson",
            ip_address="192.168.1.101",
            user_agent="Mozilla/5.0",
            country_code="QAT",
            branch_code="DOH001",
            resource_type="workflow_case",
            resource_id="WF-20241210-ABC123",
            resource_name="Mohammad Al-Rashid",
            details={
                "reason": "Score above 95%, requires senior review",
                "escalated_to": "Michael Chen",
                "previous_status": "open",
                "new_status": "escalated",
            },
            status="success",
        ),
        AuditLogEntry(
            id=str(uuid.uuid4()),
            timestamp=(now - timedelta(hours=2)).isoformat(),
            category=AuditCategory.CONFIGURATION,
            action=AuditAction.LIST_REFRESHED,
            user_id=1,
            user_email="admin@insurance.qa",
            user_name="Admin User",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
            country_code="QAT",
            branch_code=None,
            resource_type="sanctions_list",
            resource_id="OFAC_SDN",
            resource_name="OFAC Specially Designated Nationals",
            details={
                "entries_before": 12500,
                "entries_after": 12523,
                "new_entries": 23,
            },
            status="success",
            duration_ms=3500,
        ),
        AuditLogEntry(
            id=str(uuid.uuid4()),
            timestamp=(now - timedelta(hours=1)).isoformat(),
            category=AuditCategory.DECISION,
            action=AuditAction.CASE_APPROVED,
            user_id=3,
            user_email="michael@insurance.qa",
            user_name="Michael Chen",
            ip_address="192.168.1.102",
            user_agent="Mozilla/5.0",
            country_code="QAT",
            branch_code="DOH001",
            resource_type="workflow_case",
            resource_id="WF-20241210-DEF456",
            resource_name="Ahmed Hassan Ibrahim",
            details={
                "decision": "approved",
                "reason": "False positive - different person",
                "previous_status": "escalated",
                "new_status": "closed",
            },
            status="success",
        ),
        AuditLogEntry(
            id=str(uuid.uuid4()),
            timestamp=(now - timedelta(minutes=30)).isoformat(),
            category=AuditCategory.EXPORT,
            action=AuditAction.REPORT_GENERATED,
            user_id=1,
            user_email="admin@insurance.qa",
            user_name="Admin User",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
            country_code="QAT",
            branch_code=None,
            resource_type="report",
            resource_id="RPT-20241210-001",
            resource_name="Daily Screening Summary",
            details={
                "report_type": "screening_summary",
                "date_range": "2024-12-10",
                "format": "xlsx",
                "total_records": 156,
            },
            status="success",
            duration_ms=1200,
        ),
        AuditLogEntry(
            id=str(uuid.uuid4()),
            timestamp=(now - timedelta(minutes=15)).isoformat(),
            category=AuditCategory.AUTHENTICATION,
            action=AuditAction.LOGIN_FAILED,
            user_id=None,
            user_email="unknown@test.com",
            user_name=None,
            ip_address="203.45.67.89",
            user_agent="Mozilla/5.0",
            country_code=None,
            branch_code=None,
            resource_type=None,
            resource_id=None,
            resource_name=None,
            details={"reason": "Invalid credentials", "attempts": 3},
            status="failure",
            error_message="Authentication failed",
        ),
    ]
    
    return demo_logs


# Initialize with demo data
AUDIT_LOGS = _generate_demo_logs()


class AuditService:
    """Service for audit logging"""
    
    def log(
        self,
        category: AuditCategory,
        action: AuditAction,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        user_name: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        country_code: Optional[str] = None,
        branch_code: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        status: str = "success",
        error_message: Optional[str] = None,
        duration_ms: Optional[int] = None,
    ) -> AuditLogEntry:
        """Create a new audit log entry"""
        entry = AuditLogEntry(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow().isoformat(),
            category=category,
            action=action,
            user_id=user_id,
            user_email=user_email,
            user_name=user_name,
            ip_address=ip_address,
            user_agent=user_agent,
            country_code=country_code,
            branch_code=branch_code,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            details=details or {},
            status=status,
            error_message=error_message,
            duration_ms=duration_ms,
        )
        
        AUDIT_LOGS.insert(0, entry)  # Add to beginning for newest first
        
        # Keep only last 10000 entries in memory
        if len(AUDIT_LOGS) > 10000:
            AUDIT_LOGS.pop()
        
        return entry
    
    def get_logs(
        self,
        category: Optional[AuditCategory] = None,
        action: Optional[AuditAction] = None,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        country_code: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        status: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """Get audit logs with filters"""
        filtered = AUDIT_LOGS.copy()
        
        if category:
            filtered = [l for l in filtered if l.category == category]
        if action:
            filtered = [l for l in filtered if l.action == action]
        if user_id:
            filtered = [l for l in filtered if l.user_id == user_id]
        if user_email:
            filtered = [l for l in filtered if l.user_email and user_email.lower() in l.user_email.lower()]
        if country_code:
            filtered = [l for l in filtered if l.country_code == country_code]
        if resource_type:
            filtered = [l for l in filtered if l.resource_type == resource_type]
        if resource_id:
            filtered = [l for l in filtered if l.resource_id == resource_id]
        if status:
            filtered = [l for l in filtered if l.status == status]
        if from_date:
            filtered = [l for l in filtered if l.timestamp >= from_date]
        if to_date:
            filtered = [l for l in filtered if l.timestamp <= to_date]
        if search:
            search_lower = search.lower()
            filtered = [
                l for l in filtered 
                if (l.resource_name and search_lower in l.resource_name.lower())
                or (l.user_name and search_lower in l.user_name.lower())
                or (l.user_email and search_lower in l.user_email.lower())
            ]
        
        total = len(filtered)
        start = (page - 1) * page_size
        end = start + page_size
        
        return {
            "logs": [l.to_dict() for l in filtered[start:end]],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        }
    
    def get_stats(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get audit log statistics"""
        logs = AUDIT_LOGS.copy()
        
        if from_date:
            logs = [l for l in logs if l.timestamp >= from_date]
        if to_date:
            logs = [l for l in logs if l.timestamp <= to_date]
        
        # Category breakdown
        by_category = {}
        for log in logs:
            cat = log.category.value
            by_category[cat] = by_category.get(cat, 0) + 1
        
        # Action breakdown
        by_action = {}
        for log in logs:
            act = log.action.value
            by_action[act] = by_action.get(act, 0) + 1
        
        # Status breakdown
        by_status = {"success": 0, "failure": 0, "warning": 0}
        for log in logs:
            by_status[log.status] = by_status.get(log.status, 0) + 1
        
        # User activity
        by_user = {}
        for log in logs:
            if log.user_email:
                by_user[log.user_email] = by_user.get(log.user_email, 0) + 1
        
        # Top 5 active users
        top_users = sorted(by_user.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_events": len(logs),
            "by_category": by_category,
            "by_action": by_action,
            "by_status": by_status,
            "top_users": [{"email": u[0], "count": u[1]} for u in top_users],
            "success_rate": round(by_status["success"] / len(logs) * 100, 1) if logs else 0,
        }
    
    def export_logs(
        self,
        format: str = "json",
        **filters,
    ) -> str:
        """Export audit logs to specified format"""
        result = self.get_logs(**filters, page_size=10000)
        logs = result["logs"]
        
        if format == "json":
            return json.dumps(logs, indent=2)
        elif format == "csv":
            import csv
            import io
            
            output = io.StringIO()
            if logs:
                writer = csv.DictWriter(output, fieldnames=logs[0].keys())
                writer.writeheader()
                for log in logs:
                    # Flatten details dict
                    row = {**log, "details": json.dumps(log.get("details", {}))}
                    writer.writerow(row)
            
            return output.getvalue()
        
        return json.dumps(logs)


# Singleton instance
audit_service = AuditService()

