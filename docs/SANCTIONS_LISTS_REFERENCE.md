# Comprehensive Sanctions Lists Reference
## Enterprise AML Screening Requirements

This document outlines all major sanctions lists and data sources required for comprehensive AML/CFT compliance screening.

---

## 🇺🇸 UNITED STATES LISTS

### Treasury Department (OFAC)
| List Code | Full Name | Description | Update Frequency |
|-----------|-----------|-------------|------------------|
| `OFAC_SDN` | Specially Designated Nationals | Primary US sanctions list - individuals & entities | Daily |
| `OFAC_CONS` | Consolidated Sanctions List | Combined non-SDN lists | Daily |
| `OFAC_SSI` | Sectoral Sanctions Identifications | Russia/Ukraine related | Daily |
| `OFAC_FSE` | Foreign Sanctions Evaders | Iran sanctions evaders | As needed |
| `OFAC_NS_PLC` | Palestinian Legislative Council | Hamas-related | As needed |
| `OFAC_NS_ISA` | Non-SDN Iran Sanctions Act | Iran-related parties | As needed |
| `OFAC_NS_MBS` | Non-SDN Menu-Based Sanctions | Various programs | As needed |
| `OFAC_CAPTA` | Correspondent Account/Payable-Through | Banking restrictions | As needed |

### Commerce Department (BIS)
| List Code | Full Name | Description | Update Frequency |
|-----------|-----------|-------------|------------------|
| `BIS_EL` | Entity List | Export control restrictions | Weekly |
| `BIS_DPL` | Denied Persons List | Export privilege denied | Monthly |
| `BIS_UVL` | Unverified List | End-use verification issues | Quarterly |

### State Department
| List Code | Full Name | Description | Update Frequency |
|-----------|-----------|-------------|------------------|
| `DDTC_DPL` | ITAR Debarred List | Arms trafficking | Monthly |
| `STATE_NONSDN` | State Department Designations | Terrorism/narcotics | As needed |

### Other US Agencies
| List Code | Full Name | Description | Update Frequency |
|-----------|-----------|-------------|------------------|
| `FBI_MW` | FBI Most Wanted Terrorists | Terrorism | Weekly |
| `DEA_FTO` | DEA Foreign Terrorist Organizations | Drug trafficking | Monthly |
| `OIG_LEIE` | HHS Exclusion List | Healthcare fraud | Monthly |
| `GSA_EPLS` | Excluded Parties List | Government contracts | Daily |

---

## 🇺🇳 UNITED NATIONS

| List Code | Full Name | Description | Update Frequency |
|-----------|-----------|-------------|------------------|
| `UN_CONSOLIDATED` | UN Security Council Consolidated | Global terrorism/proliferation | Daily |
| `UN_TALIBAN` | Taliban Sanctions (1988) | Afghanistan-related | As needed |
| `UN_ALQAEDA` | Al-Qaeda/ISIL (1267/1989/2253) | Terrorism | As needed |
| `UN_1718` | DPRK Sanctions | North Korea | As needed |
| `UN_1737` | Iran Sanctions | Nuclear proliferation | As needed |
| `UN_LIBYA` | Libya Sanctions | Regime-related | As needed |

---

## 🇪🇺 EUROPEAN UNION

| List Code | Full Name | Description | Update Frequency |
|-----------|-----------|-------------|------------------|
| `EU_CONSOLIDATED` | EU Financial Sanctions | All EU restrictive measures | Daily |
| `EU_TERRORIST` | EU Terrorist List | Terrorism designations | Monthly |
| `EU_RUSSIA` | EU Russia Sanctions | Ukraine conflict | Weekly |
| `EU_DUAL_USE` | Dual-Use Export Controls | Strategic goods | Quarterly |

---

## 🇬🇧 UNITED KINGDOM

| List Code | Full Name | Description | Update Frequency |
|-----------|-----------|-------------|------------------|
| `UK_HMT` | HMT Consolidated List | UK financial sanctions | Daily |
| `UK_OFSI` | OFSI Consolidated | UK sanctions enforcement | Daily |
| `UK_RUSSIA` | UK Russia Sanctions | Ukraine conflict | Weekly |

---

## 🌍 OTHER MAJOR JURISDICTIONS

### Australia
| List Code | Full Name |
|-----------|-----------|
| `AU_DFAT` | DFAT Consolidated Sanctions |

### Canada
| List Code | Full Name |
|-----------|-----------|
| `CA_OSFI` | OSFI Consolidated List |
| `CA_SEMA` | Special Economic Measures Act |

### Switzerland
| List Code | Full Name |
|-----------|-----------|
| `CH_SECO` | SECO Sanctions List |

### Singapore
| List Code | Full Name |
|-----------|-----------|
| `SG_MAS` | MAS Sanctions List |

### Japan
| List Code | Full Name |
|-----------|-----------|
| `JP_MOF` | Ministry of Finance Sanctions |

### Hong Kong
| List Code | Full Name |
|-----------|-----------|
| `HK_TFS` | Targeted Financial Sanctions |

---

## 🌐 INTERNATIONAL ORGANIZATIONS

| List Code | Full Name | Description | Update Frequency |
|-----------|-----------|-------------|------------------|
| `INTERPOL_RN` | Interpol Red Notices | Wanted persons | Real-time |
| `WORLDBANK_DB` | World Bank Debarred Firms | Procurement fraud | Monthly |
| `AFDB_DL` | African Development Bank | Debarred list | Monthly |
| `IADB_DL` | Inter-American Dev Bank | Debarred list | Monthly |
| `ADB_DL` | Asian Development Bank | Debarred list | Monthly |
| `EBRD_DL` | European Bank for Reconstruction | Debarred list | Monthly |

---

## 📊 RISK CLASSIFICATION LISTS

### FATF (Financial Action Task Force)
| List Code | Full Name | Description |
|-----------|-----------|-------------|
| `FATF_BLACKLIST` | High-Risk Jurisdictions | Countries with strategic AML deficiencies |
| `FATF_GREYLIST` | Increased Monitoring | Countries under enhanced monitoring |

### Tax Havens & High-Risk Jurisdictions
| List Code | Full Name |
|-----------|-----------|
| `EU_BLACKLIST` | EU Tax Haven Blacklist |
| `OECD_NONCOMP` | OECD Non-Cooperative Jurisdictions |

---

## 👤 PEP & ENHANCED DUE DILIGENCE

| Category | Description | Sources |
|----------|-------------|---------|
| **PEP Level 1** | Heads of State, Ministers, Senior Officials | Multiple vendors |
| **PEP Level 2** | Regional politicians, judges, military | Multiple vendors |
| **PEP Level 3** | Local officials, SOE executives | Multiple vendors |
| **RCA** | Relatives & Close Associates of PEPs | Multiple vendors |
| **SOE** | State-Owned Enterprises | Multiple vendors |

---

## 📰 ADVERSE MEDIA SCREENING

| Category | Sources |
|----------|---------|
| Financial Crime | News APIs, LexisNexis, Dow Jones |
| Corruption | Transparency International, OCCRP |
| Terrorism | Specialized databases |
| Human Trafficking | Various NGO databases |
| Environmental Crime | News aggregators |

---

## 🏢 GCC-SPECIFIC LISTS (For Qatar Insurance Client)

| List Code | Full Name | Jurisdiction |
|-----------|-----------|--------------|
| `QAT_LOCAL` | Qatar Central Bank Watchlist | Qatar |
| `QAT_QFIU` | Qatar FIU List | Qatar |
| `UAE_CBUAE` | Central Bank UAE List | UAE |
| `UAE_NAMLCFTC` | UAE National Committee | UAE |
| `SAU_SAMA` | Saudi Central Bank List | Saudi Arabia |
| `SAU_SAFIU` | Saudi FIU List | Saudi Arabia |
| `KWT_CBK` | Central Bank Kuwait List | Kuwait |
| `BHR_CBB` | Central Bank Bahrain List | Bahrain |
| `OMN_CBO` | Central Bank Oman List | Oman |
| `GCC_CONSOLIDATED` | GCC-wide Watchlist | Regional |

---

## ✅ MINIMUM REQUIRED FOR ENTERPRISE COMPLIANCE

For a comprehensive enterprise solution, you MUST screen against:

### Tier 1 - Mandatory (Legal Requirement)
- [ ] OFAC SDN + Consolidated
- [ ] UN Security Council Consolidated  
- [ ] EU Financial Sanctions
- [ ] UK HMT/OFSI
- [ ] Local jurisdiction (GCC) lists

### Tier 2 - Strongly Recommended
- [ ] BIS Entity List
- [ ] FATF High-Risk Countries
- [ ] Interpol Red Notices
- [ ] World Bank Debarred
- [ ] PEP Lists (All levels)

### Tier 3 - Best Practice
- [ ] Adverse Media Screening
- [ ] SOE (State-Owned Enterprise) screening
- [ ] Dual-use goods lists
- [ ] All secondary US lists

---

## 🔗 DATA SOURCES & APIS

| Provider | Coverage | Notes |
|----------|----------|-------|
| **Refinitiv World-Check** | Comprehensive | Premium, industry standard |
| **Dow Jones Risk & Compliance** | Comprehensive | Premium |
| **LexisNexis WorldCompliance** | Comprehensive | Premium |
| **OFAC Direct Download** | US Only | Free, XML format |
| **UN Direct Download** | UN Only | Free, XML format |
| **EU Direct Download** | EU Only | Free, XML format |
| **OpenSanctions** | Multiple | Open source, good coverage |

---

## 📋 CURRENT COVERAGE STATUS

| List | Status | Notes |
|------|--------|-------|
| OFAC SDN | ✅ Implemented | Demo data |
| UN Consolidated | ✅ Implemented | Demo data |
| EU Financial | ✅ Implemented | Demo data |
| UK HMT | ⚠️ Placeholder | Need to add |
| BIS Entity List | ❌ Missing | Need to add |
| FATF Lists | ❌ Missing | Need to add |
| PEP Screening | ⚠️ Basic | Need enhancement |
| Adverse Media | ⚠️ Basic | Need enhancement |
| GCC Local Lists | ✅ Implemented | Configurable |

---

*Document Version: 1.0*
*Last Updated: December 2024*
*For: Qatar Insurance Client Demo*

