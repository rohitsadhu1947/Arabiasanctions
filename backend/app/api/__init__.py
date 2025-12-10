"""API Routes"""
from fastapi import APIRouter
from app.api.routes import screening, workflow, admin, reports, auth

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(screening.router, prefix="/screening", tags=["Screening"])
api_router.include_router(workflow.router, prefix="/workflow", tags=["Workflow"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administration"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])

