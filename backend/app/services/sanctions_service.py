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
    "OFAC_SDN": [],
    "UN_CONSOLIDATED": [],
    "EU_CONSOLIDATED": [],
    "UK_SANCTIONS": [],
    "LOCAL_UAE": [],
    "LOCAL_QAT": [],
    "LOCAL_SAU": [],
    "LOCAL_KWT": [],
    "LOCAL_BHR": [],
    "LOCAL_OMN": [],
}

# List metadata
SANCTIONS_LISTS_CONFIG: Dict[str, Dict] = {
    "OFAC_SDN": {
        "name": "OFAC Specially Designated Nationals",
        "source": "US Treasury",
        "url": "https://www.treasury.gov/ofac/downloads/sdn.xml",
        "format": "xml",
        "update_frequency": "daily",
        "last_updated": None,
        "total_entries": 0,
        "is_active": True,
        "auto_update": True,
    },
    "OFAC_CONSOLIDATED": {
        "name": "OFAC Consolidated List",
        "source": "US Treasury",
        "url": "https://www.treasury.gov/ofac/downloads/consolidated/consolidated.xml",
        "format": "xml",
        "update_frequency": "daily",
        "last_updated": None,
        "total_entries": 0,
        "is_active": True,
        "auto_update": True,
    },
    "UN_CONSOLIDATED": {
        "name": "UN Security Council Consolidated List",
        "source": "United Nations",
        "url": "https://scsanctions.un.org/resources/xml/en/consolidated.xml",
        "format": "xml",
        "update_frequency": "daily",
        "last_updated": None,
        "total_entries": 0,
        "is_active": True,
        "auto_update": True,
    },
    "EU_CONSOLIDATED": {
        "name": "EU Consolidated Financial Sanctions",
        "source": "European Union",
        "url": "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content",
        "format": "xml",
        "update_frequency": "daily",
        "last_updated": None,
        "total_entries": 0,
        "is_active": True,
        "auto_update": True,
    },
    "UK_SANCTIONS": {
        "name": "UK Consolidated Sanctions List",
        "source": "UK Government",
        "url": "https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/consolidated_list.xml",
        "format": "xml",
        "update_frequency": "daily",
        "last_updated": None,
        "total_entries": 0,
        "is_active": False,
        "auto_update": False,
    },
}

# Country-specific local lists
LOCAL_LISTS_CONFIG: Dict[str, Dict] = {
    "LOCAL_UAE": {
        "name": "UAE Local Watchlist",
        "country_code": "UAE",
        "description": "Internal watchlist for UAE operations",
        "last_updated": None,
        "total_entries": 0,
        "is_active": True,
    },
    "LOCAL_QAT": {
        "name": "Qatar Local Watchlist",
        "country_code": "QAT",
        "description": "Internal watchlist for Qatar operations",
        "last_updated": None,
        "total_entries": 0,
        "is_active": True,
    },
    "LOCAL_SAU": {
        "name": "Saudi Arabia Local Watchlist",
        "country_code": "SAU",
        "description": "Internal watchlist for Saudi operations",
        "last_updated": None,
        "total_entries": 0,
        "is_active": True,
    },
    "LOCAL_KWT": {
        "name": "Kuwait Local Watchlist",
        "country_code": "KWT",
        "description": "Internal watchlist for Kuwait operations",
        "last_updated": None,
        "total_entries": 0,
        "is_active": True,
    },
    "LOCAL_BHR": {
        "name": "Bahrain Local Watchlist",
        "country_code": "BHR",
        "description": "Internal watchlist for Bahrain operations",
        "last_updated": None,
        "total_entries": 0,
        "is_active": True,
    },
    "LOCAL_OMN": {
        "name": "Oman Local Watchlist",
        "country_code": "OMN",
        "description": "Internal watchlist for Oman operations",
        "last_updated": None,
        "total_entries": 0,
        "is_active": True,
    },
}


class SanctionsService:
    """Service for managing sanctions lists"""
    
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=60.0)
        self._initialize_demo_data()
    
    def _initialize_demo_data(self):
        """Load demo sanctions data for testing"""
        demo_entries = [
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
            # Qatar local watchlist entries
            SanctionEntry(
                source_id="QAT-LOCAL-001",
                list_code="LOCAL_QAT",
                list_name="Qatar Local Watchlist",
                entry_type="individual",
                primary_name="Test Watchlist Individual",
                aliases=["TWI", "Test Person"],
                nationality="Unknown",
                programs=["LOCAL_WATCHLIST"],
                remarks="Internal watchlist entry for testing",
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

