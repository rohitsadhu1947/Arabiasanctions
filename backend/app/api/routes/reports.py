"""Reports API Routes"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, timedelta
import io
from app.api.schemas.common import APIResponse
from app.api.routes.auth import get_current_user, require_permission, CurrentUser

router = APIRouter()


@router.get("/screening-summary", response_model=APIResponse[dict])
async def get_screening_summary(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    country_code: Optional[str] = None,
    current_user: CurrentUser = Depends(require_permission("report:view"))
):
    """Get screening summary statistics.
    
    Data model:
    - Customer database: 48,234 entities across GCC
    - Monthly screenings: ~16,000 (includes new + re-screens)
    - Active matches requiring review: 156
    - Lists monitored: 19 (13 global + 6 GCC local)
    """
    summary = {
        "period": {
            "from": from_date or (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d"),
            "to": to_date or datetime.utcnow().strftime("%Y-%m-%d"),
        },
        "totals": {
            "total_screenings": 15847,
            "individuals": 12456,
            "corporates": 3391,
            "with_matches": 892,          # Total matches found this month
            "auto_released": 14632,       # Auto-cleared (low score)
            "pending_review": 156,        # Active cases needing review
            "escalated": 67,              # Escalated to senior
        },
        "customer_database": {
            "total_entities": 48234,      # Total monitored customers
            "individuals": 38456,
            "corporates": 9778,
            "last_full_screen": datetime.utcnow().strftime("%Y-%m-%d 02:00:00"),
        },
        "by_risk_level": {
            "critical": 23,               # Confirmed sanctions matches
            "high": 67,                   # High score, needs review  
            "medium": 156,                # Medium, standard review
            "low": 646,                   # Low risk, mostly auto-released
        },
        "by_sanction_list": [
            {"list_code": "OFAC_SDN", "name": "OFAC SDN", "matches": 312, "entries": 12453},
            {"list_code": "UN_CONSOLIDATED", "name": "UN Consolidated", "matches": 234, "entries": 8234},
            {"list_code": "EU_CONSOLIDATED", "name": "EU Consolidated", "matches": 156, "entries": 6789},
            {"list_code": "UK_HMT", "name": "UK HMT", "matches": 90, "entries": 4532},
            {"list_code": "PEP_GLOBAL", "name": "PEP Database", "matches": 67, "entries": 45678},
            {"list_code": "LOCAL_GCC", "name": "GCC Local Lists", "matches": 33, "entries": 748},
        ],
        "lists_monitored": 19,            # Total active lists
        "avg_processing_time_ms": 45,
        "daily_trend": [
            {"date": (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d"), "count": 520 + (i * 7) % 80}
            for i in range(30, 0, -1)
        ],
    }
    
    return APIResponse(success=True, data=summary)


@router.get("/workflow-summary", response_model=APIResponse[dict])
async def get_workflow_summary(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: CurrentUser = Depends(require_permission("report:view"))
):
    """Get workflow summary statistics.
    
    Consistent with screening summary:
    - 892 matches found this month
    - 156 currently pending review
    - 15 demo cases currently in system
    """
    summary = {
        "period": {
            "from": from_date or (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d"),
            "to": to_date or datetime.utcnow().strftime("%Y-%m-%d"),
        },
        "cases": {
            "total_created": 892,         # Total matches requiring cases this month
            "total_closed": 736,          # Resolved cases
            "currently_open": 156,        # Active cases (matches pending_review in screening)
            "in_progress": 45,            # Being worked on
            "pending_approval": 32,       # Waiting for senior review
            "escalated": 67,              # Escalated to compliance head
            "sla_breached": 12,           # Overdue cases
            "sla_at_risk": 8,             # Due within 2 hours
        },
        "resolution": {
            "released": 523,              # False positive / cleared
            "flagged": 89,                # True match - flagged for monitoring
            "true_match": 34,             # Confirmed sanctions hit
            "false_positive": 490,        # Cleared after review
            "pending": 156,               # Still under review
        },
        "performance": {
            "avg_tat_hours": 6.5,
            "median_tat_hours": 4.2,
            "sla_compliance_rate": 98.6,
            "first_response_time_mins": 23,
        },
        "by_country": [
            {"country": "UAE", "cases": 312, "avg_tat_hours": 5.8, "sla_compliance": 99.1},
            {"country": "Saudi Arabia", "cases": 267, "avg_tat_hours": 6.2, "sla_compliance": 98.5},
            {"country": "Qatar", "cases": 134, "avg_tat_hours": 5.5, "sla_compliance": 99.3},
            {"country": "Kuwait", "cases": 89, "avg_tat_hours": 7.1, "sla_compliance": 97.8},
            {"country": "Bahrain", "cases": 56, "avg_tat_hours": 6.8, "sla_compliance": 98.2},
            {"country": "Oman", "cases": 34, "avg_tat_hours": 5.9, "sla_compliance": 99.0},
        ],
        "by_user": [
            {"user": "Sarah Johnson", "cases_handled": 245, "avg_tat_hours": 5.2, "accuracy": 98.8},
            {"user": "Michael Chen", "cases_handled": 198, "avg_tat_hours": 6.8, "accuracy": 97.5},
            {"user": "Emma Williams", "cases_handled": 178, "avg_tat_hours": 4.9, "accuracy": 99.1},
            {"user": "Ahmed Al-Thani", "cases_handled": 156, "avg_tat_hours": 5.4, "accuracy": 98.2},
            {"user": "Fatima Al-Saud", "cases_handled": 134, "avg_tat_hours": 6.1, "accuracy": 97.9},
        ],
    }
    
    return APIResponse(success=True, data=summary)


@router.get("/audit-log", response_model=APIResponse[List[dict]])
async def get_audit_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: CurrentUser = Depends(require_permission("report:audit"))
):
    """Get audit log entries."""
    logs = [
        {
            "id": i,
            "timestamp": (datetime.utcnow() - timedelta(minutes=i * 15)).isoformat(),
            "user_email": f"user{(i % 5) + 1}@insurance.com",
            "user_name": f"User {(i % 5) + 1}",
            "action": ["screen_submit", "decision_release", "decision_escalate", "case_assign", "login"][i % 5],
            "target_type": ["screening", "match", "case", "user", "system"][i % 5],
            "target_reference": f"REF-{1000 + i}",
            "ip_address": "192.168.1.100",
            "country_code": "UAE",
            "status": "success",
        }
        for i in range(1, 101)
    ]
    
    if user_id:
        logs = [l for l in logs if str(user_id) in l["user_email"]]
    if action:
        logs = [l for l in logs if l["action"] == action]
    
    start = (page - 1) * page_size
    end = start + page_size
    
    return APIResponse(
        success=True,
        data=logs[start:end],
    )


@router.get("/export/screenings", response_class=StreamingResponse)
async def export_screenings(
    format: str = Query("csv", enum=["csv", "xlsx"]),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: CurrentUser = Depends(require_permission("report:export"))
):
    """Export screening data to CSV or Excel."""
    # Generate CSV data
    csv_content = """reference_id,screened_name,entity_type,timestamp,matches,highest_score,risk_level,status
SCR-20241210-0001,Mohammad Al-Rashid,individual,2024-12-10T10:30:00,2,0.92,high,pending_review
SCR-20241210-0002,Ahmed Hassan,individual,2024-12-10T10:35:00,0,0,low,released
SCR-20241210-0003,Global Trade Holdings,corporate,2024-12-10T10:40:00,1,0.88,medium,pending_review
SCR-20241210-0004,Sarah Johnson,individual,2024-12-10T10:45:00,0,0,low,released
SCR-20241210-0005,Petrochemical Industries,corporate,2024-12-10T10:50:00,1,0.95,critical,escalated
"""
    
    buffer = io.BytesIO(csv_content.encode())
    
    return StreamingResponse(
        buffer,
        media_type="text/csv" if format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=screenings_export.{format}"
        }
    )


@router.get("/export/audit-log", response_class=StreamingResponse)
async def export_audit_log(
    format: str = Query("csv", enum=["csv", "xlsx"]),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: CurrentUser = Depends(require_permission("report:audit"))
):
    """Export audit log to CSV or Excel."""
    csv_content = """timestamp,user_email,action,target_type,target_reference,ip_address,status
2024-12-10T10:30:00,user1@insurance.com,screen_submit,screening,SCR-20241210-0001,192.168.1.100,success
2024-12-10T10:31:00,user1@insurance.com,decision_release,match,MATCH-001,192.168.1.100,success
2024-12-10T10:35:00,user2@insurance.com,case_assign,case,WF-20241210-ABC123,192.168.1.101,success
2024-12-10T10:40:00,admin@insurance.com,login,user,USER-001,192.168.1.102,success
"""
    
    buffer = io.BytesIO(csv_content.encode())
    
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=audit_log_export.{format}"
        }
    )


@router.get("/match-details", response_model=APIResponse[List[dict]])
async def get_match_details_report(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    sanction_list: Optional[str] = None,
    min_score: Optional[float] = Query(None, ge=0, le=1),
    current_user: CurrentUser = Depends(require_permission("report:view"))
):
    """Get detailed match report."""
    matches = [
        {
            "screening_reference": f"SCR-20241210-{str(i).zfill(4)}",
            "screened_name": f"Entity {i}",
            "matched_name": f"Sanctioned Entity {i}",
            "sanction_list": ["OFAC_SDN", "UN_CONSOLIDATED", "EU_CONSOLIDATED"][i % 3],
            "match_score": 0.75 + (i % 25) / 100,
            "match_algorithm": "jaro_winkler",
            "dob_match": i % 4 == 0,
            "nationality_match": i % 3 == 0,
            "decision": ["pending_review", "released", "flagged", "escalated"][i % 4],
            "decided_by": f"User {(i % 5) + 1}" if i % 4 != 0 else None,
            "timestamp": datetime.utcnow().isoformat(),
        }
        for i in range(1, 51)
    ]
    
    if sanction_list:
        matches = [m for m in matches if m["sanction_list"] == sanction_list]
    if min_score:
        matches = [m for m in matches if m["match_score"] >= min_score]
    
    return APIResponse(success=True, data=matches)


@router.get("/country-breakdown", response_model=APIResponse[List[dict]])
async def get_country_breakdown(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: CurrentUser = Depends(require_permission("report:view"))
):
    """Get screening breakdown by country.
    
    Total: 15,847 screenings, 892 matches, 156 pending
    Customer DB: 48,234 entities across GCC
    """
    breakdown = [
        {
            "country_code": "UAE",
            "country_name": "United Arab Emirates",
            "total_screenings": 5234,
            "customer_count": 15890,    # Largest market
            "with_matches": 312,
            "high_risk": 28,
            "critical": 8,
            "avg_processing_ms": 42,
            "pending_cases": 45,
            "sla_compliance": 99.1,
        },
        {
            "country_code": "SAU",
            "country_name": "Saudi Arabia",
            "total_screenings": 4567,
            "customer_count": 14234,
            "with_matches": 267,
            "high_risk": 21,
            "critical": 6,
            "avg_processing_ms": 48,
            "pending_cases": 38,
            "sla_compliance": 98.5,
        },
        {
            "country_code": "QAT",
            "country_name": "Qatar",
            "total_screenings": 2834,    # Qatar focus for demo
            "customer_count": 8456,
            "with_matches": 134,
            "high_risk": 12,
            "critical": 3,
            "avg_processing_ms": 43,
            "pending_cases": 28,
            "sla_compliance": 99.3,
        },
        {
            "country_code": "KWT",
            "country_name": "Kuwait",
            "total_screenings": 1678,
            "customer_count": 5123,
            "with_matches": 89,
            "high_risk": 8,
            "critical": 2,
            "avg_processing_ms": 45,
            "pending_cases": 22,
            "sla_compliance": 97.8,
        },
        {
            "country_code": "BHR",
            "country_name": "Bahrain",
            "total_screenings": 967,
            "customer_count": 2890,
            "with_matches": 56,
            "high_risk": 5,
            "critical": 1,
            "avg_processing_ms": 44,
            "pending_cases": 15,
            "sla_compliance": 98.2,
        },
        {
            "country_code": "OMN",
            "country_name": "Oman",
            "total_screenings": 567,
            "customer_count": 1641,
            "with_matches": 34,
            "high_risk": 3,
            "critical": 0,
            "avg_processing_ms": 46,
            "pending_cases": 8,
            "sla_compliance": 99.0,
        },
    ]
    
    return APIResponse(success=True, data=breakdown)

