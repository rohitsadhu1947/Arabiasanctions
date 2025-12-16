"""
Sanctions List Service - Handles fetching, parsing, and managing sanctions data

Supports:
- OFAC SDN List (US Treasury)
- UN Security Council Consolidated List
- EU Consolidated Financial Sanctions List
- Local/Custom Lists per Country
"""
import httpx
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional, Any
from datetime import datetime
from dataclasses import dataclass, field
import csv
import io
import json
import asyncio
from enum import Enum


class ListSource(str, Enum):
    OFAC_SDN = "OFAC_SDN"
    OFAC_CONSOLIDATED = "OFAC_CONSOLIDATED"
    UN_CONSOLIDATED = "UN_CONSOLIDATED"
    EU_CONSOLIDATED = "EU_CONSOLIDATED"
    UK_SANCTIONS = "UK_SANCTIONS"
    LOCAL_CUSTOM = "LOCAL_CUSTOM"


@dataclass
class SanctionEntry:
    """Standardized sanction entry"""
    source_id: str
    list_code: str
    list_name: str
    entry_type: str  # individual, entity, vessel, aircraft
    primary_name: str
    aliases: List[str] = field(default_factory=list)
    date_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    national_id: Optional[str] = None
    passport_number: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    programs: List[str] = field(default_factory=list)
    sanction_date: Optional[str] = None
    remarks: Optional[str] = None
    source_url: Optional[str] = None
    last_updated: Optional[str] = None
    # Corporate fields
    registration_number: Optional[str] = None
    registration_country: Optional[str] = None


# In-memory storage for sanctions data (in production, use database)
SANCTIONS_DATA: Dict[str, List[SanctionEntry]] = {
    # Global lists
    "OFAC_SDN": [],
    "OFAC_CONSOLIDATED": [],
    "BIS_ENTITY": [],
    "UN_CONSOLIDATED": [],
    "EU_CONSOLIDATED": [],
    "EU_TERRORIST": [],
    "UK_HMT": [],
    "UK_OFSI": [],
    "INTERPOL_RN": [],
    "WORLDBANK_DEBARRED": [],
    "FATF_HIGHRISK": [],
    "PEP_GLOBAL": [],
    "ADVERSE_MEDIA": [],
    # GCC Local lists
    "LOCAL_QAT": [],
    "QAT_FIU": [],
    "LOCAL_UAE": [],
    "UAE_NAMLCFTC": [],
    "LOCAL_SAU": [],
    "SAU_SAFIU": [],
    "LOCAL_KWT": [],
    "LOCAL_BHR": [],
    "LOCAL_OMN": [],
}

# List metadata - Comprehensive global sanctions lists
SANCTIONS_LISTS_CONFIG: Dict[str, Dict] = {
    # === US LISTS (OFAC & Commerce) ===
    "OFAC_SDN": {
        "name": "OFAC Specially Designated Nationals",
        "source": "US Treasury OFAC",
        "url": "https://www.treasury.gov/ofac/downloads/sdn.xml",
        "format": "xml",
        "update_frequency": "daily",
        "last_updated": None,
        "total_entries": 12453,
        "is_active": True,
        "auto_update": True,
        "category": "US",
    },
    "OFAC_CONSOLIDATED": {
        "name": "OFAC Consolidated Sanctions List",
        "source": "US Treasury OFAC",
        "url": "https://www.treasury.gov/ofac/downloads/consolidated/cons_prim.xml",
        "format": "xml",
        "update_frequency": "daily",
        "last_updated": None,
        "total_entries": 3892,
        "is_active": True,
        "auto_update": True,
        "category": "US",
    },
    "BIS_ENTITY": {
        "name": "BIS Entity List",
        "source": "US Commerce Department",
        "url": "https://www.bis.doc.gov/entity_list",
        "format": "csv",
        "update_frequency": "weekly",
        "last_updated": None,
        "total_entries": 1456,
        "is_active": True,
        "auto_update": True,
        "category": "US",
    },
    # === UNITED NATIONS ===
    "UN_CONSOLIDATED": {
        "name": "UN Security Council Consolidated List",
        "source": "United Nations",
        "url": "https://scsanctions.un.org/resources/xml/en/consolidated.xml",
        "format": "xml",
        "update_frequency": "daily",
        "last_updated": None,
        "total_entries": 8234,
        "is_active": True,
        "auto_update": True,
        "category": "UN",
    },
    # === EUROPEAN UNION ===
    "EU_CONSOLIDATED": {
        "name": "EU Consolidated Financial Sanctions",
        "source": "European Union",
        "url": "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList/content",
        "format": "xml",
        "update_frequency": "daily",
        "last_updated": None,
        "total_entries": 6789,
        "is_active": True,
        "auto_update": True,
        "category": "EU",
    },
    "EU_TERRORIST": {
        "name": "EU Terrorist List",
        "source": "European Union",
        "url": "https://webgate.ec.europa.eu/fsd/fsf/terrorist",
        "format": "xml",
        "update_frequency": "monthly",
        "last_updated": None,
        "total_entries": 892,
        "is_active": True,
        "auto_update": True,
        "category": "EU",
    },
    # === UNITED KINGDOM ===
    "UK_HMT": {
        "name": "UK HMT Consolidated List",
        "source": "HM Treasury",
        "url": "https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/consolidated_list.xml",
        "format": "xml",
        "update_frequency": "daily",
        "last_updated": None,
        "total_entries": 4532,
        "is_active": True,
        "auto_update": True,
        "category": "UK",
    },
    "UK_OFSI": {
        "name": "UK OFSI Consolidated List",
        "source": "Office of Financial Sanctions",
        "url": "https://ofsistorage.blob.core.windows.net/sanctions/ConList.xml",
        "format": "xml",
        "update_frequency": "daily",
        "last_updated": None,
        "total_entries": 4201,
        "is_active": True,
        "auto_update": True,
        "category": "UK",
    },
    # === INTERNATIONAL ORGANIZATIONS ===
    "INTERPOL_RN": {
        "name": "Interpol Red Notices",
        "source": "Interpol",
        "url": "https://ws-public.interpol.int/notices/v1/red",
        "format": "json",
        "update_frequency": "real-time",
        "last_updated": None,
        "total_entries": 7823,
        "is_active": True,
        "auto_update": True,
        "category": "Intl",
    },
    "WORLDBANK_DEBARRED": {
        "name": "World Bank Debarred Firms",
        "source": "World Bank",
        "url": "https://www.worldbank.org/debarred",
        "format": "csv",
        "update_frequency": "monthly",
        "last_updated": None,
        "total_entries": 1234,
        "is_active": True,
        "auto_update": True,
        "category": "Intl",
    },
    "FATF_HIGHRISK": {
        "name": "FATF High-Risk Jurisdictions",
        "source": "FATF",
        "url": "https://www.fatf-gafi.org/jurisdictions",
        "format": "json",
        "update_frequency": "quarterly",
        "last_updated": None,
        "total_entries": 23,
        "is_active": True,
        "auto_update": True,
        "category": "Intl",
    },
    # === PEP & ENHANCED DUE DILIGENCE ===
    "PEP_GLOBAL": {
        "name": "Politically Exposed Persons",
        "source": "Multiple Sources",
        "url": None,
        "format": "database",
        "update_frequency": "daily",
        "last_updated": None,
        "total_entries": 45678,
        "is_active": True,
        "auto_update": True,
        "category": "PEP",
    },
    "ADVERSE_MEDIA": {
        "name": "Adverse Media Screening",
        "source": "News Aggregators",
        "url": None,
        "format": "api",
        "update_frequency": "real-time",
        "last_updated": None,
        "total_entries": 125000,
        "is_active": True,
        "auto_update": True,
        "category": "Media",
    },
}

# GCC Country-specific lists (Local + FIU)
LOCAL_LISTS_CONFIG: Dict[str, Dict] = {
    # === QATAR ===
    "LOCAL_QAT": {
        "name": "Qatar Local Watchlist",
        "country_code": "QAT",
        "description": "Internal watchlist for Qatar operations",
        "last_updated": None,
        "total_entries": 45,
        "is_active": True,
        "category": "GCC",
    },
    "QAT_FIU": {
        "name": "Qatar FIU List",
        "country_code": "QAT",
        "description": "Qatar Financial Intelligence Unit designations",
        "last_updated": None,
        "total_entries": 89,
        "is_active": True,
        "category": "GCC",
    },
    # === UAE ===
    "LOCAL_UAE": {
        "name": "UAE Local Watchlist",
        "country_code": "UAE",
        "description": "Internal watchlist for UAE operations",
        "last_updated": None,
        "total_entries": 67,
        "is_active": True,
        "category": "GCC",
    },
    "UAE_NAMLCFTC": {
        "name": "UAE National AML Committee List",
        "country_code": "UAE",
        "description": "UAE National AML/CFT Committee designations",
        "last_updated": None,
        "total_entries": 156,
        "is_active": True,
        "category": "GCC",
    },
    # === SAUDI ARABIA ===
    "LOCAL_SAU": {
        "name": "Saudi Arabia Local Watchlist",
        "country_code": "SAU",
        "description": "Internal watchlist for Saudi operations",
        "last_updated": None,
        "total_entries": 78,
        "is_active": True,
        "category": "GCC",
    },
    "SAU_SAFIU": {
        "name": "Saudi FIU List",
        "country_code": "SAU",
        "description": "Saudi Financial Intelligence Unit designations",
        "last_updated": None,
        "total_entries": 234,
        "is_active": True,
        "category": "GCC",
    },
    # === KUWAIT ===
    "LOCAL_KWT": {
        "name": "Kuwait Local Watchlist",
        "country_code": "KWT",
        "description": "Internal watchlist for Kuwait operations",
        "last_updated": None,
        "total_entries": 32,
        "is_active": True,
        "category": "GCC",
    },
    # === BAHRAIN ===
    "LOCAL_BHR": {
        "name": "Bahrain Local Watchlist",
        "country_code": "BHR",
        "description": "Internal watchlist for Bahrain operations",
        "last_updated": None,
        "total_entries": 28,
        "is_active": True,
        "category": "GCC",
    },
    # === OMAN ===
    "LOCAL_OMN": {
        "name": "Oman Local Watchlist",
        "country_code": "OMN",
        "description": "Internal watchlist for Oman operations",
        "last_updated": None,
        "total_entries": 19,
        "is_active": True,
        "category": "GCC",
    },
}


class SanctionsService:
    """Service for managing sanctions lists"""
    
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=60.0)
        self._initialize_demo_data()
    
    def _initialize_demo_data(self):
        """Load demo sanctions data for testing - Comprehensive realistic dataset"""
        demo_entries = [
            # === OFAC SDN List - Individuals ===
            SanctionEntry(
                source_id="OFAC-12345",
                list_code="OFAC_SDN",
                list_name="OFAC Specially Designated Nationals",
                entry_type="individual",
                primary_name="Mohammad Al-Rashid",
                aliases=["Mohammed Al Rashid", "Abu Ahmed", "M. Rashid", "محمد الرشيد"],
                date_of_birth="1975-03-15",
                place_of_birth="Damascus, Syria",
                nationality="Syrian",
                programs=["SYRIA", "SDGT"],
                sanction_date="2019-05-20",
                remarks="Providing financial support to designated entities",
            ),
            SanctionEntry(
                source_id="OFAC-12346",
                list_code="OFAC_SDN",
                list_name="OFAC Specially Designated Nationals",
                entry_type="individual",
                primary_name="Ahmed Hassan Ibrahim",
                aliases=["Ahmad Hassan", "A.H. Ibrahim", "احمد حسن"],
                date_of_birth="1982-11-08",
                nationality="Iranian",
                programs=["IRAN", "NPWMD"],
                sanction_date="2020-01-15",
                remarks="Proliferation activities",
            ),
            SanctionEntry(
                source_id="OFAC-23456",
                list_code="OFAC_SDN",
                list_name="OFAC Specially Designated Nationals",
                entry_type="individual",
                primary_name="Faisal Al-Ahmadi",
                aliases=["Faisal Ahmadi", "F. Al-Ahmadi"],
                date_of_birth="1980-06-22",
                nationality="Yemeni",
                programs=["YEMEN", "SDGT"],
                sanction_date="2021-08-15",
                remarks="Associated with Houthi militant group",
            ),
            SanctionEntry(
                source_id="OFAC-23457",
                list_code="OFAC_SDN",
                list_name="OFAC Specially Designated Nationals",
                entry_type="individual",
                primary_name="Ali Mahmoud Saleh",
                aliases=["Ali Saleh", "A.M. Saleh", "علي محمود"],
                date_of_birth="1978-03-12",
                nationality="Iraqi",
                programs=["IRAQ", "SDGT"],
                sanction_date="2020-05-20",
                remarks="Financial facilitator for militia groups",
            ),
            SanctionEntry(
                source_id="OFAC-23458",
                list_code="OFAC_SDN",
                list_name="OFAC Specially Designated Nationals",
                entry_type="individual",
                primary_name="Hassan Nasrallah Qasim",
                aliases=["H. Qasim", "Hassan Q."],
                date_of_birth="1972-09-05",
                nationality="Lebanese",
                programs=["LEBANON", "HIZBALLAH"],
                sanction_date="2019-09-17",
                remarks="Senior Hezbollah operative",
            ),
            
            # === OFAC SDN List - Entities ===
            SanctionEntry(
                source_id="OFAC-12347",
                list_code="OFAC_SDN",
                list_name="OFAC Specially Designated Nationals",
                entry_type="entity",
                primary_name="Petrochemical Industries Corp",
                aliases=["PIC", "Petrochem Industries", "PIC Iran"],
                registration_number="IR-98765",
                registration_country="Iran",
                programs=["IRAN"],
                sanction_date="2019-11-04",
                remarks="Iranian oil sector",
            ),
            SanctionEntry(
                source_id="OFAC-34567",
                list_code="OFAC_SDN",
                list_name="OFAC Specially Designated Nationals",
                entry_type="entity",
                primary_name="Tehran Trading Company LLC",
                aliases=["TTC", "Tehran Traders"],
                registration_number="IR-456789",
                registration_country="Iran",
                programs=["IRAN", "IFSR"],
                sanction_date="2022-01-10",
                remarks="Front company for sanctioned activities",
            ),
            SanctionEntry(
                source_id="OFAC-34568",
                list_code="OFAC_SDN",
                list_name="OFAC Specially Designated Nationals",
                entry_type="entity",
                primary_name="Al-Quds Shipping Lines",
                aliases=["AQSL", "Quds Maritime"],
                registration_number="SY-112233",
                registration_country="Syria",
                programs=["SYRIA", "SDGT"],
                sanction_date="2020-07-22",
                remarks="Shipping entity supporting sanctioned trade",
            ),
            
            # === UN Consolidated List - Individuals ===
            SanctionEntry(
                source_id="UN-QDi.001",
                list_code="UN_CONSOLIDATED",
                list_name="UN Security Council Consolidated List",
                entry_type="individual",
                primary_name="Khalid bin Abdullah Al-Saud",
                aliases=["Khaled Abdullah", "K. Al-Saud", "خالد عبدالله"],
                date_of_birth="1968-07-22",
                nationality="Saudi Arabian",
                programs=["Al-Qaida", "ISIL"],
                sanction_date="2021-03-10",
                remarks="Terrorism financing",
            ),
            SanctionEntry(
                source_id="UN-QDi.002",
                list_code="UN_CONSOLIDATED",
                list_name="UN Security Council Consolidated List",
                entry_type="individual",
                primary_name="Omar Abdul Rahman",
                aliases=["Omar Rahman", "Abu Omar"],
                date_of_birth="1965-12-18",
                nationality="Egyptian",
                programs=["Al-Qaida"],
                sanction_date="2018-06-12",
                remarks="Al-Qaeda affiliated financier",
            ),
            SanctionEntry(
                source_id="UN-QDi.003",
                list_code="UN_CONSOLIDATED",
                list_name="UN Security Council Consolidated List",
                entry_type="individual",
                primary_name="Ibrahim Yusuf Bakri",
                aliases=["Ibrahim Bakri", "Abu Yusuf"],
                date_of_birth="1979-04-30",
                nationality="Somali",
                programs=["Al-Shabaab", "ISIL"],
                sanction_date="2022-02-14",
                remarks="East Africa terrorism network",
            ),
            
            # === UN Consolidated List - Entities ===
            SanctionEntry(
                source_id="UN-QDe.001",
                list_code="UN_CONSOLIDATED",
                list_name="UN Security Council Consolidated List",
                entry_type="entity",
                primary_name="Global Trade Holdings Ltd",
                aliases=["GTH Limited", "Global Trade Co", "GTH International"],
                registration_number="12345678",
                registration_country="Hong Kong",
                programs=["DPRK"],
                sanction_date="2018-09-01",
                remarks="Facilitating prohibited trade with North Korea",
            ),
            SanctionEntry(
                source_id="UN-QDe.002",
                list_code="UN_CONSOLIDATED",
                list_name="UN Security Council Consolidated List",
                entry_type="entity",
                primary_name="Pyongyang Finance Group",
                aliases=["PFG", "Pyongyang Financial"],
                registration_number="KP-998877",
                registration_country="North Korea",
                programs=["DPRK", "UNSCR"],
                sanction_date="2019-12-05",
                remarks="DPRK state financial entity",
            ),
            
            # === EU Consolidated List - Individuals ===
            SanctionEntry(
                source_id="EU-2021-001",
                list_code="EU_CONSOLIDATED",
                list_name="EU Consolidated Financial Sanctions",
                entry_type="individual",
                primary_name="Viktor Petrov Ivanov",
                aliases=["V. Ivanov", "Viktor P. Ivanov"],
                date_of_birth="1970-05-15",
                nationality="Russian",
                programs=["RUSSIA", "UKRAINE"],
                sanction_date="2022-02-28",
                remarks="Supporting Russian military operations",
            ),
            SanctionEntry(
                source_id="EU-2021-003",
                list_code="EU_CONSOLIDATED",
                list_name="EU Consolidated Financial Sanctions",
                entry_type="individual",
                primary_name="Sergei Alexandrovich Volkov",
                aliases=["S. Volkov", "Sergei A. Volkov"],
                date_of_birth="1968-11-23",
                nationality="Russian",
                programs=["RUSSIA"],
                sanction_date="2022-03-02",
                remarks="Russian oligarch with Kremlin ties",
            ),
            SanctionEntry(
                source_id="EU-2021-004",
                list_code="EU_CONSOLIDATED",
                list_name="EU Consolidated Financial Sanctions",
                entry_type="individual",
                primary_name="Alexander Lukashenko Junior",
                aliases=["A. Lukashenko Jr"],
                date_of_birth="1975-08-10",
                nationality="Belarusian",
                programs=["BELARUS"],
                sanction_date="2021-06-21",
                remarks="Belarusian regime family member",
            ),
            
            # === EU Consolidated List - Entities ===
            SanctionEntry(
                source_id="EU-2021-002",
                list_code="EU_CONSOLIDATED",
                list_name="EU Consolidated Financial Sanctions",
                entry_type="entity",
                primary_name="Kremlin Energy Holdings",
                aliases=["KEH", "Kremlin Energy", "KE Holdings"],
                registration_number="RU-123456",
                registration_country="Russia",
                programs=["RUSSIA"],
                sanction_date="2022-03-15",
                remarks="Russian state-owned energy company",
            ),
            SanctionEntry(
                source_id="EU-2021-005",
                list_code="EU_CONSOLIDATED",
                list_name="EU Consolidated Financial Sanctions",
                entry_type="entity",
                primary_name="Moscow Defense Industries JSC",
                aliases=["MDI", "Moscow Defense"],
                registration_number="RU-789012",
                registration_country="Russia",
                programs=["RUSSIA", "ARMS"],
                sanction_date="2022-04-08",
                remarks="Russian military equipment manufacturer",
            ),
            
            # === UK HMT List ===
            SanctionEntry(
                source_id="UK-HMT-001",
                list_code="UK_HMT",
                list_name="UK HMT Consolidated List",
                entry_type="individual",
                primary_name="Dmitry Olegovich Medvedev",
                aliases=["D. Medvedev"],
                date_of_birth="1965-09-14",
                nationality="Russian",
                programs=["RUSSIA"],
                sanction_date="2022-02-28",
                remarks="Russian political figure",
            ),
            SanctionEntry(
                source_id="UK-HMT-002",
                list_code="UK_HMT",
                list_name="UK HMT Consolidated List",
                entry_type="entity",
                primary_name="St. Petersburg Shipping Group",
                aliases=["SPSG", "SPB Shipping"],
                registration_number="RU-SPSG001",
                registration_country="Russia",
                programs=["RUSSIA"],
                sanction_date="2022-05-10",
                remarks="Russian maritime entity",
            ),
            
            # === GCC Local Watchlists ===
            # Qatar
            SanctionEntry(
                source_id="QAT-LOCAL-001",
                list_code="LOCAL_QAT",
                list_name="Qatar Local Watchlist",
                entry_type="individual",
                primary_name="Suspected Fraud Individual QA",
                aliases=["SFI-QA"],
                nationality="Unknown",
                programs=["LOCAL_WATCHLIST"],
                remarks="Internal watchlist entry - suspected fraud",
            ),
            SanctionEntry(
                source_id="QAT-FIU-001",
                list_code="QAT_FIU",
                list_name="Qatar FIU List",
                entry_type="individual",
                primary_name="High Risk Customer Qatar",
                aliases=["HRC-QA"],
                nationality="Qatari",
                programs=["FIU_DESIGNATION"],
                remarks="FIU designated high-risk individual",
            ),
            
            # UAE
            SanctionEntry(
                source_id="UAE-LOCAL-001",
                list_code="LOCAL_UAE",
                list_name="UAE Local Watchlist",
                entry_type="individual",
                primary_name="AML Alert Individual UAE",
                aliases=["AAI-UAE"],
                nationality="Unknown",
                programs=["LOCAL_WATCHLIST"],
                remarks="Internal AML flagged individual",
            ),
            SanctionEntry(
                source_id="UAE-NAML-001",
                list_code="UAE_NAMLCFTC",
                list_name="UAE National AML Committee List",
                entry_type="entity",
                primary_name="Suspicious Trading Company FZE",
                aliases=["STC FZE"],
                registration_number="DXB-FZE-12345",
                registration_country="UAE",
                programs=["UAE_LOCAL"],
                remarks="UAE national AML designated entity",
            ),
            
            # Saudi Arabia
            SanctionEntry(
                source_id="SAU-LOCAL-001",
                list_code="LOCAL_SAU",
                list_name="Saudi Arabia Local Watchlist",
                entry_type="individual",
                primary_name="Flagged Individual KSA",
                aliases=["FI-KSA"],
                nationality="Unknown",
                programs=["LOCAL_WATCHLIST"],
                remarks="Internal compliance flag",
            ),
            SanctionEntry(
                source_id="SAU-FIU-001",
                list_code="SAU_SAFIU",
                list_name="Saudi FIU List",
                entry_type="individual",
                primary_name="SAFIU Designated Person",
                aliases=["SDP-KSA"],
                nationality="Saudi Arabian",
                programs=["SAFIU"],
                remarks="Saudi FIU designation",
            ),
            
            # === PEP Entries ===
            SanctionEntry(
                source_id="PEP-GCC-001",
                list_code="PEP_GLOBAL",
                list_name="Politically Exposed Persons",
                entry_type="individual",
                primary_name="HRH Prince Abdullah bin Fahd",
                aliases=["Prince Abdullah", "Sheikh Abdullah"],
                nationality="Saudi Arabian",
                programs=["PEP"],
                remarks="Saudi royal family member - PEP status",
            ),
            SanctionEntry(
                source_id="PEP-GCC-002",
                list_code="PEP_GLOBAL",
                list_name="Politically Exposed Persons",
                entry_type="individual",
                primary_name="Sheikh Mohammed bin Rashid Al Maktoum",
                aliases=["MBR", "Sheikh Mohammed"],
                nationality="Emirati",
                programs=["PEP"],
                remarks="UAE leadership - PEP status",
            ),
            SanctionEntry(
                source_id="PEP-GCC-003",
                list_code="PEP_GLOBAL",
                list_name="Politically Exposed Persons",
                entry_type="individual",
                primary_name="Sheikh Tamim bin Hamad Al Thani",
                aliases=["Emir of Qatar", "Sheikh Tamim"],
                nationality="Qatari",
                programs=["PEP"],
                remarks="Qatar leadership - PEP status",
            ),
            
            # === Interpol Red Notices ===
            SanctionEntry(
                source_id="INTERPOL-RN-001",
                list_code="INTERPOL_RN",
                list_name="Interpol Red Notices",
                entry_type="individual",
                primary_name="Fugitive Financial Criminal",
                aliases=["FFC"],
                date_of_birth="1985-02-20",
                nationality="Unknown",
                programs=["INTERPOL_WANTED"],
                remarks="Wanted for international financial crimes",
            ),
        ]
        
        # Distribute to lists
        for entry in demo_entries:
            if entry.list_code in SANCTIONS_DATA:
                SANCTIONS_DATA[entry.list_code].append(entry)
        
        # Update counts
        for list_code, entries in SANCTIONS_DATA.items():
            if list_code in SANCTIONS_LISTS_CONFIG:
                SANCTIONS_LISTS_CONFIG[list_code]["total_entries"] = len(entries)
                SANCTIONS_LISTS_CONFIG[list_code]["last_updated"] = datetime.utcnow().isoformat()
            elif list_code in LOCAL_LISTS_CONFIG:
                LOCAL_LISTS_CONFIG[list_code]["total_entries"] = len(entries)
                LOCAL_LISTS_CONFIG[list_code]["last_updated"] = datetime.utcnow().isoformat()
    
    async def fetch_ofac_sdn(self) -> List[SanctionEntry]:
        """Fetch OFAC SDN list from US Treasury"""
        url = SANCTIONS_LISTS_CONFIG["OFAC_SDN"]["url"]
        entries = []
        
        try:
            response = await self.http_client.get(url)
            response.raise_for_status()
            
            # Parse XML
            root = ET.fromstring(response.content)
            ns = {'sdn': 'http://www.un.org/sanctions/1.0'}
            
            for entry in root.findall('.//sdnEntry', ns):
                # Extract data (simplified - real implementation would be more thorough)
                entry_id = entry.find('uid', ns)
                name = entry.find('firstName', ns)
                # ... more parsing
                
            SANCTIONS_LISTS_CONFIG["OFAC_SDN"]["last_updated"] = datetime.utcnow().isoformat()
            SANCTIONS_LISTS_CONFIG["OFAC_SDN"]["total_entries"] = len(entries)
            
        except Exception as e:
            print(f"Error fetching OFAC SDN: {e}")
            # Keep existing demo data
        
        return entries
    
    async def fetch_un_consolidated(self) -> List[SanctionEntry]:
        """Fetch UN Security Council Consolidated List"""
        url = SANCTIONS_LISTS_CONFIG["UN_CONSOLIDATED"]["url"]
        entries = []
        
        try:
            response = await self.http_client.get(url)
            response.raise_for_status()
            
            # Parse XML - UN format
            root = ET.fromstring(response.content)
            
            # Process individuals
            for individual in root.findall('.//INDIVIDUAL'):
                first_name = individual.findtext('FIRST_NAME', '')
                second_name = individual.findtext('SECOND_NAME', '')
                third_name = individual.findtext('THIRD_NAME', '')
                
                full_name = ' '.join(filter(None, [first_name, second_name, third_name]))
                
                if full_name:
                    entry = SanctionEntry(
                        source_id=individual.findtext('DATAID', ''),
                        list_code="UN_CONSOLIDATED",
                        list_name="UN Security Council Consolidated List",
                        entry_type="individual",
                        primary_name=full_name,
                        nationality=individual.findtext('NATIONALITY/VALUE', None),
                        date_of_birth=individual.findtext('INDIVIDUAL_DATE_OF_BIRTH/DATE', None),
                        sanction_date=individual.findtext('LISTED_ON', None),
                        remarks=individual.findtext('COMMENTS1', None),
                    )
                    entries.append(entry)
            
            # Process entities
            for entity in root.findall('.//ENTITY'):
                name = entity.findtext('FIRST_NAME', '')
                
                if name:
                    entry = SanctionEntry(
                        source_id=entity.findtext('DATAID', ''),
                        list_code="UN_CONSOLIDATED",
                        list_name="UN Security Council Consolidated List",
                        entry_type="entity",
                        primary_name=name,
                        sanction_date=entity.findtext('LISTED_ON', None),
                        remarks=entity.findtext('COMMENTS1', None),
                    )
                    entries.append(entry)
            
            if entries:
                SANCTIONS_DATA["UN_CONSOLIDATED"] = entries
                SANCTIONS_LISTS_CONFIG["UN_CONSOLIDATED"]["last_updated"] = datetime.utcnow().isoformat()
                SANCTIONS_LISTS_CONFIG["UN_CONSOLIDATED"]["total_entries"] = len(entries)
            
        except Exception as e:
            print(f"Error fetching UN list: {e}")
        
        return entries
    
    async def refresh_list(self, list_code: str) -> Dict[str, Any]:
        """Refresh a specific sanctions list"""
        if list_code == "OFAC_SDN":
            entries = await self.fetch_ofac_sdn()
        elif list_code == "UN_CONSOLIDATED":
            entries = await self.fetch_un_consolidated()
        else:
            return {"success": False, "message": f"Unknown list: {list_code}"}
        
        return {
            "success": True,
            "list_code": list_code,
            "entries_loaded": len(entries),
            "updated_at": datetime.utcnow().isoformat(),
        }
    
    async def refresh_all_lists(self) -> Dict[str, Any]:
        """Refresh all active sanctions lists"""
        results = {}
        for list_code, config in SANCTIONS_LISTS_CONFIG.items():
            if config["is_active"] and config["auto_update"]:
                result = await self.refresh_list(list_code)
                results[list_code] = result
        return results
    
    def get_all_entries(self, list_codes: Optional[List[str]] = None) -> List[SanctionEntry]:
        """Get all sanctions entries from specified lists"""
        entries = []
        
        if list_codes:
            for code in list_codes:
                if code in SANCTIONS_DATA:
                    entries.extend(SANCTIONS_DATA[code])
        else:
            for code, data in SANCTIONS_DATA.items():
                if code in SANCTIONS_LISTS_CONFIG and SANCTIONS_LISTS_CONFIG[code]["is_active"]:
                    entries.extend(data)
                elif code in LOCAL_LISTS_CONFIG and LOCAL_LISTS_CONFIG[code]["is_active"]:
                    entries.extend(data)
        
        return entries
    
    def add_local_entry(self, list_code: str, entry: SanctionEntry) -> bool:
        """Add an entry to a local watchlist"""
        if list_code not in LOCAL_LISTS_CONFIG:
            return False
        
        entry.list_code = list_code
        entry.list_name = LOCAL_LISTS_CONFIG[list_code]["name"]
        
        SANCTIONS_DATA[list_code].append(entry)
        LOCAL_LISTS_CONFIG[list_code]["total_entries"] = len(SANCTIONS_DATA[list_code])
        LOCAL_LISTS_CONFIG[list_code]["last_updated"] = datetime.utcnow().isoformat()
        
        return True
    
    def remove_local_entry(self, list_code: str, source_id: str) -> bool:
        """Remove an entry from a local watchlist"""
        if list_code not in LOCAL_LISTS_CONFIG:
            return False
        
        SANCTIONS_DATA[list_code] = [
            e for e in SANCTIONS_DATA[list_code] 
            if e.source_id != source_id
        ]
        LOCAL_LISTS_CONFIG[list_code]["total_entries"] = len(SANCTIONS_DATA[list_code])
        LOCAL_LISTS_CONFIG[list_code]["last_updated"] = datetime.utcnow().isoformat()
        
        return True
    
    def import_csv(self, list_code: str, csv_content: str) -> Dict[str, Any]:
        """Import entries from CSV file"""
        if list_code not in LOCAL_LISTS_CONFIG:
            return {"success": False, "message": "Can only import to local lists"}
        
        imported = 0
        errors = []
        
        reader = csv.DictReader(io.StringIO(csv_content))
        for row in reader:
            try:
                entry = SanctionEntry(
                    source_id=row.get('source_id', f"IMPORT-{imported}"),
                    list_code=list_code,
                    list_name=LOCAL_LISTS_CONFIG[list_code]["name"],
                    entry_type=row.get('entry_type', 'individual'),
                    primary_name=row['name'],
                    aliases=row.get('aliases', '').split(';') if row.get('aliases') else [],
                    date_of_birth=row.get('date_of_birth'),
                    nationality=row.get('nationality'),
                    national_id=row.get('national_id'),
                    programs=row.get('programs', '').split(';') if row.get('programs') else [],
                    remarks=row.get('remarks'),
                )
                SANCTIONS_DATA[list_code].append(entry)
                imported += 1
            except Exception as e:
                errors.append(f"Row {imported + 1}: {str(e)}")
        
        LOCAL_LISTS_CONFIG[list_code]["total_entries"] = len(SANCTIONS_DATA[list_code])
        LOCAL_LISTS_CONFIG[list_code]["last_updated"] = datetime.utcnow().isoformat()
        
        return {
            "success": True,
            "imported": imported,
            "errors": errors,
        }
    
    def get_list_stats(self) -> Dict[str, Any]:
        """Get statistics for all lists"""
        stats = {
            "global_lists": [],
            "local_lists": [],
            "total_entries": 0,
            "last_global_update": None,
        }
        
        for code, config in SANCTIONS_LISTS_CONFIG.items():
            stats["global_lists"].append({
                "code": code,
                **config,
            })
            stats["total_entries"] += config["total_entries"]
            if config["last_updated"]:
                if not stats["last_global_update"] or config["last_updated"] > stats["last_global_update"]:
                    stats["last_global_update"] = config["last_updated"]
        
        for code, config in LOCAL_LISTS_CONFIG.items():
            stats["local_lists"].append({
                "code": code,
                **config,
            })
            stats["total_entries"] += config["total_entries"]
        
        return stats


# Singleton instance
sanctions_service = SanctionsService()

