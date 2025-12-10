"""Database configuration for Neon PostgreSQL"""
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "")

# For Neon, we need to handle the connection string
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine with connection pooling suitable for serverless
if DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
    )
else:
    # Fallback to SQLite for local development
    engine = create_engine("sqlite:///./screening.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============== Database Models ==============

class DBSanctionEntry(Base):
    __tablename__ = "sanction_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String(100), unique=True, index=True)
    list_code = Column(String(50), index=True)
    list_name = Column(String(200))
    entry_type = Column(String(20))  # individual, entity
    primary_name = Column(String(500), index=True)
    aliases = Column(JSON, default=[])
    date_of_birth = Column(String(50), nullable=True)
    place_of_birth = Column(String(200), nullable=True)
    nationality = Column(String(100), nullable=True)
    national_id = Column(String(100), nullable=True)
    passport_number = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    country = Column(String(100), nullable=True)
    programs = Column(JSON, default=[])
    sanction_date = Column(String(50), nullable=True)
    remarks = Column(Text, nullable=True)
    registration_number = Column(String(100), nullable=True)
    registration_country = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DBSanctionList(Base):
    __tablename__ = "sanction_lists"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    name = Column(String(200))
    source = Column(String(200), nullable=True)
    url = Column(String(500), nullable=True)
    format = Column(String(20), default="xml")
    update_frequency = Column(String(50), default="daily")
    list_type = Column(String(20), default="global")  # global, local
    country_code = Column(String(10), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    auto_update = Column(Boolean, default=True)
    last_updated = Column(DateTime, nullable=True)
    total_entries = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class DBUser(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    full_name = Column(String(255))
    hashed_password = Column(String(255))
    country_id = Column(Integer, default=1)
    country_name = Column(String(100), default="Qatar")
    branch_id = Column(Integer, nullable=True)
    branch_name = Column(String(100), nullable=True)
    roles = Column(JSON, default=["Compliance Analyst"])
    permissions = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DBWorkflowCase(Base):
    __tablename__ = "workflow_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, index=True)
    screening_result_id = Column(Integer)
    reference_id = Column(String(100), index=True)
    status = Column(String(50), default="open")
    priority = Column(String(20), default="medium")
    assigned_to_id = Column(Integer, nullable=True)
    assigned_to_name = Column(String(255), nullable=True)
    assigned_by_name = Column(String(255), nullable=True)
    escalation_level = Column(Integer, default=0)
    escalation_reason = Column(Text, nullable=True)
    screened_name = Column(String(500))
    highest_match_score = Column(Float)
    country_code = Column(String(10), nullable=True)
    branch_code = Column(String(20), nullable=True)
    sla_breached = Column(Boolean, default=False)
    resolution = Column(String(50), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_by_name = Column(String(255), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DBCaseAction(Base):
    __tablename__ = "case_actions"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("workflow_cases.id"), index=True)
    action_type = Column(String(50))
    performed_by_id = Column(Integer, nullable=True)
    performed_by_name = Column(String(255))
    comment = Column(Text, nullable=True)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class DBAuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    category = Column(String(50), index=True)
    action = Column(String(50), index=True)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(255), nullable=True)
    user_name = Column(String(255), nullable=True)
    ip_address = Column(String(50), nullable=True)
    country_code = Column(String(10), nullable=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    resource_name = Column(String(255), nullable=True)
    details = Column(JSON, default={})
    status = Column(String(20), default="success")
    error_message = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)


class DBSystemConfig(Base):
    __tablename__ = "system_config"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True)
    value = Column(Text)
    value_type = Column(String(20), default="string")  # string, int, float, bool, json
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Create all tables
def init_db():
    Base.metadata.create_all(bind=engine)


# Initialize demo data
def init_demo_data(db):
    """Initialize database with demo data"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Check if data already exists
    if db.query(DBSanctionList).first():
        return  # Already initialized
    
    # Create sanction lists
    lists = [
        DBSanctionList(code="OFAC_SDN", name="OFAC Specially Designated Nationals", source="US Treasury", 
                       url="https://www.treasury.gov/ofac/downloads/sdn.xml", list_type="global", is_active=True),
        DBSanctionList(code="UN_CONSOLIDATED", name="UN Security Council Consolidated List", source="United Nations",
                       url="https://scsanctions.un.org/resources/xml/en/consolidated.xml", list_type="global", is_active=True),
        DBSanctionList(code="EU_CONSOLIDATED", name="EU Consolidated Financial Sanctions", source="European Union",
                       list_type="global", is_active=True),
        DBSanctionList(code="LOCAL_QAT", name="Qatar Local Watchlist", country_code="QAT", 
                       list_type="local", description="Internal watchlist for Qatar operations", is_active=True),
        DBSanctionList(code="LOCAL_UAE", name="UAE Local Watchlist", country_code="UAE",
                       list_type="local", description="Internal watchlist for UAE operations", is_active=True),
        DBSanctionList(code="LOCAL_SAU", name="Saudi Arabia Local Watchlist", country_code="SAU",
                       list_type="local", description="Internal watchlist for Saudi operations", is_active=True),
    ]
    db.add_all(lists)
    
    # Create demo sanction entries
    entries = [
        DBSanctionEntry(source_id="OFAC-12345", list_code="OFAC_SDN", list_name="OFAC Specially Designated Nationals",
                        entry_type="individual", primary_name="Mohammad Al-Rashid",
                        aliases=["Mohammed Al Rashid", "Abu Ahmed", "M. Rashid"],
                        date_of_birth="1975-03-15", nationality="Syrian",
                        programs=["SYRIA", "SDGT"], sanction_date="2019-05-20",
                        remarks="Providing financial support to designated entities"),
        DBSanctionEntry(source_id="OFAC-12346", list_code="OFAC_SDN", list_name="OFAC Specially Designated Nationals",
                        entry_type="individual", primary_name="Ahmed Hassan Ibrahim",
                        aliases=["Ahmad Hassan", "A.H. Ibrahim"],
                        date_of_birth="1982-11-08", nationality="Iranian",
                        programs=["IRAN", "NPWMD"], sanction_date="2020-01-15",
                        remarks="Proliferation activities"),
        DBSanctionEntry(source_id="UN-QDi.001", list_code="UN_CONSOLIDATED", list_name="UN Security Council Consolidated List",
                        entry_type="individual", primary_name="Khalid bin Abdullah Al-Saud",
                        aliases=["Khaled Abdullah", "K. Al-Saud"],
                        date_of_birth="1968-07-22", nationality="Saudi Arabian",
                        programs=["Al-Qaida", "ISIL"], sanction_date="2021-03-10",
                        remarks="Terrorism financing"),
        DBSanctionEntry(source_id="UN-QDe.001", list_code="UN_CONSOLIDATED", list_name="UN Security Council Consolidated List",
                        entry_type="entity", primary_name="Global Trade Holdings Ltd",
                        aliases=["GTH Limited", "Global Trade Co"],
                        registration_number="12345678", registration_country="Hong Kong",
                        programs=["DPRK"], sanction_date="2018-09-01",
                        remarks="Facilitating prohibited trade with North Korea"),
    ]
    db.add_all(entries)
    
    # Create demo user
    demo_user = DBUser(
        email="admin@insurance.com",
        full_name="Admin User",
        hashed_password=pwd_context.hash("password123"),
        country_id=1,
        country_name="Qatar",
        branch_id=1,
        branch_name="Doha HQ",
        roles=["Super Admin"],
        permissions=["*"],
        is_active=True,
        is_superuser=True,
    )
    db.add(demo_user)
    
    # Create system config
    configs = [
        DBSystemConfig(key="default_match_threshold", value="0.75", value_type="float"),
        DBSystemConfig(key="high_risk_threshold", value="0.85", value_type="float"),
        DBSystemConfig(key="auto_release_threshold", value="0.50", value_type="float"),
        DBSystemConfig(key="sla_hours", value="24", value_type="int"),
        DBSystemConfig(key="max_escalation_levels", value="3", value_type="int"),
    ]
    db.add_all(configs)
    
    db.commit()

