"""
Screening Engine - Main Application Entry Point
Insurance Compliance Screening Solution for GCC Markets
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import structlog
import time
import uuid

from app.config import settings
from app.api import api_router

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    import os
    
    # Startup
    logger.info("Starting Screening Engine", version=settings.APP_VERSION)
    logger.info("Environment", env=settings.ENVIRONMENT, debug=settings.DEBUG)
    
    # Initialize database if DATABASE_URL is set (Neon PostgreSQL)
    if os.getenv("DATABASE_URL"):
        try:
            from app.database import init_db, SessionLocal, init_demo_data
            init_db()
            db = SessionLocal()
            init_demo_data(db)
            db.close()
            logger.info("Database initialized successfully (Neon PostgreSQL)")
        except Exception as e:
            logger.error("Database initialization error", error=str(e))
    else:
        logger.info("Running with in-memory storage (no DATABASE_URL)")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Screening Engine")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="""
    ## Insurance Compliance Screening Engine
    
    A comprehensive sanctions screening solution for insurance operations across GCC markets.
    
    ### Key Features:
    - **Smart Name Matching**: Multi-algorithm fuzzy matching with configurable thresholds
    - **Multi-tenant Support**: Country and branch-level segregation
    - **Workflow Engine**: Built-in escalation, approvals, and TAT tracking
    - **Comprehensive API**: Single and bulk screening endpoints
    - **Full Audit Trail**: Complete history of all actions and decisions
    
    ### Sanction Lists Supported:
    - OFAC SDN (Specially Designated Nationals)
    - UN Security Council Consolidated List
    - EU Consolidated Financial Sanctions
    - UK Sanctions List
    - Custom/Local Lists per Country
    
    ### Contact
    For support, contact: compliance-tech@insurance.com
    """,
    version=settings.APP_VERSION,
    openapi_tags=[
        {"name": "Authentication", "description": "Login, logout, and token management"},
        {"name": "Screening", "description": "Single and bulk screening operations"},
        {"name": "Workflow", "description": "Case management and approvals"},
        {"name": "Administration", "description": "User, role, and system configuration"},
        {"name": "Reports", "description": "Analytics, exports, and audit logs"},
    ],
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request ID middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID to each request."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    
    # Log request
    logger.info(
        "Request completed",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        process_time=f"{process_time:.4f}s",
    )
    
    return response


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation error",
            "errors": errors,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.error(
        "Unexpected error",
        request_id=request_id,
        error=str(exc),
        path=request.url.path,
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An unexpected error occurred",
            "request_id": request_id,
        },
    )


# Include API routes
app.include_router(api_router, prefix=settings.API_PREFIX)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "Insurance Compliance Screening Engine for GCC Markets",
        "documentation": "/docs",
        "openapi": "/openapi.json",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )

