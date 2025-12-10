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
    """Get screening summary statistics."""
    summary = {
        "period": {
            "from": from_date or (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d"),
            "to": to_date or datetime.utcnow().strftime("%Y-%m-%d"),
        },
        "totals": {
            "total_screenings": 15847,
            "individuals": 12456,
            "corporates": 3391,
            "with_matches": 892,
            "auto_released": 14632,
            "pending_review": 156,
            "escalated": 67,
        },
        "by_risk_level": {
            "critical": 23,
            "high": 67,
            "medium": 312,
            "low": 490,
        },
        "by_sanction_list": [
            {"list_code": "OFAC_SDN", "name": "OFAC SDN", "matches": 412},
            {"list_code": "UN_CONSOLIDATED", "name": "UN Consolidated", "matches": 234},
            {"list_code": "EU_CONSOLIDATED", "name": "EU Consolidated", "matches": 156},
            {"list_code": "UK_SANCTIONS", "name": "UK Sanctions", "matches": 90},
        ],
        "avg_processing_time_ms": 45,
        "daily_trend": [
            {"date": (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d"), "count": 500 + (i * 10) % 100}
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
    """Get workflow summary statistics."""
    summary = {
        "period": {
            "from": from_date or (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d"),
            "to": to_date or datetime.utcnow().strftime("%Y-%m-%d"),
        },
        "cases": {
            "total_created": 892,
            "total_closed": 784,
            "currently_open": 108,
            "escalated": 67,
            "sla_breached": 12,
        },
        "resolution": {
            "released": 523,
            "flagged": 89,
            "true_match": 34,
            "false_positive": 138,
        },
        "performance": {
            "avg_tat_hours": 6.5,
            "median_tat_hours": 4.2,
            "sla_compliance_rate": 98.6,
        },
        "by_user": [
            {"user": "Sarah Johnson", "cases_handled": 245, "avg_tat_hours": 5.2},
            {"user": "Michael Chen", "cases_handled": 198, "avg_tat_hours": 6.8},
            {"user": "Emma Williams", "cases_handled": 178, "avg_tat_hours": 4.9},
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
    """Get screening breakdown by country."""
    breakdown = [
        {
            "country_code": "UAE",
            "country_name": "United Arab Emirates",
            "total_screenings": 5234,
            "with_matches": 312,
            "high_risk": 28,
            "avg_processing_ms": 42,
            "pending_cases": 45,
        },
        {
            "country_code": "SAU",
            "country_name": "Saudi Arabia",
            "total_screenings": 4567,
            "with_matches": 267,
            "high_risk": 21,
            "avg_processing_ms": 48,
            "pending_cases": 38,
        },
        {
            "country_code": "KWT",
            "country_name": "Kuwait",
            "total_screenings": 2345,
            "with_matches": 134,
            "high_risk": 12,
            "avg_processing_ms": 45,
            "pending_cases": 22,
        },
        {
            "country_code": "BHR",
            "country_name": "Bahrain",
            "total_screenings": 1567,
            "with_matches": 89,
            "high_risk": 8,
            "avg_processing_ms": 44,
            "pending_cases": 15,
        },
        {
            "country_code": "OMN",
            "country_name": "Oman",
            "total_screenings": 1234,
            "with_matches": 67,
            "high_risk": 5,
            "avg_processing_ms": 46,
            "pending_cases": 11,
        },
        {
            "country_code": "QAT",
            "country_name": "Qatar",
            "total_screenings": 900,
            "with_matches": 23,
            "high_risk": 3,
            "avg_processing_ms": 43,
            "pending_cases": 7,
        },
    ]
    
    return APIResponse(success=True, data=breakdown)

