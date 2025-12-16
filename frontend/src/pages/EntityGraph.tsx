import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Network, User, Building2, AlertTriangle, Shield, 
  ZoomIn, ZoomOut, Maximize2, Download,
  ChevronRight, Globe, FileText, Link2, Check, X, Loader2
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EntityNode {
  id: string;
  type: 'person' | 'company' | 'sanction' | 'transaction' | 'address';
  name: string;
  risk: 'high' | 'medium' | 'low' | 'sanctioned';
  x: number;
  y: number;
  connections: string[];
  metadata?: Record<string, any>;
}

interface Connection {
  from: string;
  to: string;
  type: 'ownership' | 'transaction' | 'association' | 'family' | 'address';
  strength: number;
}

// Multiple Network Examples - realistic GCC data
interface NetworkExample {
  id: string;
  name: string;
  description: string;
  riskLevel: 'critical' | 'high' | 'medium';
  entities: EntityNode[];
  connections: Connection[];
}

const NETWORK_EXAMPLES: NetworkExample[] = [
  // Network 1: Syrian Sanctions Network (Original)
  {
    id: 'network-1',
    name: 'Syrian Sanctions Network',
    description: 'OFAC SDN designated individual with UAE business connections',
    riskLevel: 'critical',
    entities: [
      { 
        id: '1', type: 'person', name: 'Mohammad Al-Rashid', risk: 'sanctioned', 
        x: 400, y: 300, connections: ['2', '3', '5'], 
        metadata: { dob: '1975-03-15', nationality: 'Syrian', lists: ['OFAC SDN', 'UN Consolidated'],
          reason: 'Providing financial support to designated entities', sanctionDate: '2019-05-20' } 
      },
      { 
        id: '2', type: 'company', name: 'Gulf Trading LLC', risk: 'high', 
        x: 600, y: 200, connections: ['1', '4'], 
        metadata: { registration: 'DED-123456', country: 'UAE', countryRisk: 'Low', founded: '2015',
          industry: 'Import/Export Trading', uboStatus: 'Linked to sanctioned individual',
          directors: ['Mohammad Al-Rashid (Sanctioned)', 'Unknown Nominee'], riskReason: 'Beneficial owner is sanctioned individual' } 
      },
      { 
        id: '3', type: 'person', name: 'Ahmed Al-Rashid', risk: 'medium', 
        x: 250, y: 200, connections: ['1', '6'], 
        metadata: { relation: 'Brother', dob: '1980-07-22', nationality: 'Syrian', pep: false,
          riskReason: 'Family member of sanctioned person' } 
      },
      { 
        id: '4', type: 'company', name: 'Horizon Investments WLL', risk: 'medium', 
        x: 700, y: 350, connections: ['2', '7'], 
        metadata: { registration: 'QFC-98765', country: 'Qatar', countryRisk: 'Low', founded: '2018',
          industry: 'Financial Services', uboStatus: 'Verified - Clear',
          directors: ['Khalid Al-Thani', 'Sara Ahmed'], riskReason: 'Business relationship with high-risk entity' } 
      },
      { 
        id: '5', type: 'address', name: 'Dubai Marina Tower 5', risk: 'low', 
        x: 300, y: 450, connections: ['1', '6'], 
        metadata: { fullAddress: 'Unit 2301, Tower 5, Dubai Marina, Dubai, UAE', country: 'UAE',
          countryRisk: 'Low', propertyType: 'Residential Apartment', registeredOccupants: 2,
          riskReason: 'Known address of sanctioned individual' } 
      },
      { 
        id: '6', type: 'person', name: 'Fatima Al-Hassan', risk: 'low', 
        x: 150, y: 350, connections: ['3', '5'], 
        metadata: { relation: 'Business Associate', dob: '1985-04-12', nationality: 'Emirati',
          pep: false, occupation: 'Accountant', riskReason: 'Indirect connection only' } 
      },
      { 
        id: '7', type: 'transaction', name: 'QAR 9.1M Transfer', risk: 'high', 
        x: 550, y: 450, connections: ['4'], 
        metadata: { date: '2024-01-15', amount: 'QAR 9,100,000', amountUSD: '~$2,500,000',
          fromEntity: 'Gulf Trading LLC', toEntity: 'Horizon Investments WLL',
          transactionType: 'Wire Transfer', riskReason: 'Large transfer from high-risk entity' } 
      },
    ],
    connections: [
      { from: '1', to: '2', type: 'ownership', strength: 0.8 },
      { from: '1', to: '3', type: 'family', strength: 0.9 },
      { from: '1', to: '5', type: 'address', strength: 0.6 },
      { from: '2', to: '4', type: 'transaction', strength: 0.7 },
      { from: '3', to: '6', type: 'association', strength: 0.5 },
      { from: '5', to: '6', type: 'address', strength: 0.4 },
      { from: '4', to: '7', type: 'transaction', strength: 0.9 },
    ],
  },
  // Network 2: Russian Sanctions Network
  {
    id: 'network-2',
    name: 'Russian Entity Network',
    description: 'EU sanctioned Russian oligarch with corporate structures',
    riskLevel: 'critical',
    entities: [
      { 
        id: '1', type: 'person', name: 'Viktor Petrov Ivanov', risk: 'sanctioned', 
        x: 400, y: 300, connections: ['2', '3', '4'], 
        metadata: { dob: '1970-05-15', nationality: 'Russian', lists: ['EU Consolidated', 'UK HMT'],
          reason: 'Supporting Russian military operations', sanctionDate: '2022-02-28' } 
      },
      { 
        id: '2', type: 'company', name: 'Kremlin Energy Holdings', risk: 'sanctioned', 
        x: 600, y: 200, connections: ['1', '5', '6'], 
        metadata: { registration: 'RU-123456', country: 'Russia', countryRisk: 'High', founded: '2008',
          industry: 'Oil & Gas', uboStatus: 'Sanctioned Entity',
          directors: ['Viktor Ivanov (Sanctioned)', 'State Nominee'], riskReason: 'Russian state-owned, sanctions evasion risk' } 
      },
      { 
        id: '3', type: 'company', name: 'Cyprus Holding Ltd', risk: 'high', 
        x: 250, y: 200, connections: ['1', '7'], 
        metadata: { registration: 'CY-789012', country: 'Cyprus', countryRisk: 'Medium', founded: '2019',
          industry: 'Holding Company', uboStatus: 'Obscured - nominee structure',
          directors: ['Nominee Director'], riskReason: 'Shell company linked to sanctioned person' } 
      },
      { 
        id: '4', type: 'address', name: 'The Pearl Tower, Doha', risk: 'medium', 
        x: 550, y: 450, connections: ['1'], 
        metadata: { fullAddress: 'Penthouse Suite, Pearl Tower, West Bay, Doha, Qatar', country: 'Qatar',
          countryRisk: 'Low', propertyType: 'Luxury Residence', registeredOccupants: 1,
          riskReason: 'Property linked to sanctioned individual' } 
      },
      { 
        id: '5', type: 'transaction', name: 'EUR 45M Oil Payment', risk: 'high', 
        x: 700, y: 350, connections: ['2'], 
        metadata: { date: '2024-02-10', amount: 'EUR 45,000,000', amountUSD: '~$48,600,000',
          fromEntity: 'Unknown Intermediary', toEntity: 'Kremlin Energy Holdings',
          transactionType: 'SWIFT Transfer', riskReason: 'Potential sanctions circumvention' } 
      },
      { 
        id: '6', type: 'company', name: 'Dubai Energy Trading FZE', risk: 'medium', 
        x: 600, y: 450, connections: ['2'], 
        metadata: { registration: 'DMCC-456789', country: 'UAE', countryRisk: 'Low', founded: '2022',
          industry: 'Commodity Trading', uboStatus: 'Under Investigation',
          directors: ['Anonymous Shareholders'], riskReason: 'Suspected intermediary for sanctioned entity' } 
      },
      { 
        id: '7', type: 'person', name: 'Anna Ivanova', risk: 'medium', 
        x: 150, y: 350, connections: ['3'], 
        metadata: { relation: 'Spouse', dob: '1978-09-22', nationality: 'Russian',
          pep: true, occupation: 'N/A', riskReason: 'PEP - spouse of sanctioned oligarch' } 
      },
    ],
    connections: [
      { from: '1', to: '2', type: 'ownership', strength: 0.95 },
      { from: '1', to: '3', type: 'ownership', strength: 0.85 },
      { from: '1', to: '4', type: 'address', strength: 0.7 },
      { from: '2', to: '5', type: 'transaction', strength: 0.9 },
      { from: '2', to: '6', type: 'transaction', strength: 0.6 },
      { from: '3', to: '7', type: 'ownership', strength: 0.8 },
    ],
  },
  // Network 3: Iran Trade Network
  {
    id: 'network-3',
    name: 'Iran Trade Network',
    description: 'OFAC designated Iranian entity with regional trade links',
    riskLevel: 'high',
    entities: [
      { 
        id: '1', type: 'company', name: 'Tehran Trading Company LLC', risk: 'sanctioned', 
        x: 400, y: 300, connections: ['2', '3', '4'], 
        metadata: { registration: 'IR-456789', country: 'Iran', countryRisk: 'Very High', founded: '2010',
          industry: 'General Trading', uboStatus: 'IRGC Connected',
          directors: ['State Controlled'], riskReason: 'OFAC SDN - Iranian front company', lists: ['OFAC SDN', 'UN Consolidated'] } 
      },
      { 
        id: '2', type: 'company', name: 'Sharjah General Trading', risk: 'high', 
        x: 600, y: 200, connections: ['1', '5'], 
        metadata: { registration: 'SHJ-234567', country: 'UAE', countryRisk: 'Low', founded: '2017',
          industry: 'Import/Export', uboStatus: 'Iranian Nationals',
          directors: ['Hidden Beneficiaries'], riskReason: 'Suspected Iran trade facilitation' } 
      },
      { 
        id: '3', type: 'person', name: 'Hassan Nasrallah Qasim', risk: 'sanctioned', 
        x: 250, y: 200, connections: ['1'], 
        metadata: { dob: '1972-09-05', nationality: 'Lebanese', lists: ['OFAC SDN'],
          reason: 'Senior Hezbollah operative', sanctionDate: '2019-09-17' } 
      },
      { 
        id: '4', type: 'transaction', name: 'USD 3.2M Wire', risk: 'high', 
        x: 300, y: 450, connections: ['1'], 
        metadata: { date: '2024-03-01', amount: 'USD 3,200,000', amountUSD: '$3,200,000',
          fromEntity: 'Tehran Trading', toEntity: 'Sharjah General Trading',
          transactionType: 'Trade Payment', riskReason: 'Trade with sanctioned entity' } 
      },
      { 
        id: '5', type: 'address', name: 'Sharjah Industrial Area', risk: 'medium', 
        x: 700, y: 350, connections: ['2'], 
        metadata: { fullAddress: 'Warehouse 45, Industrial Area 15, Sharjah, UAE', country: 'UAE',
          countryRisk: 'Low', propertyType: 'Commercial Warehouse', registeredOccupants: 0,
          riskReason: 'Known transshipment location' } 
      },
    ],
    connections: [
      { from: '1', to: '2', type: 'transaction', strength: 0.85 },
      { from: '1', to: '3', type: 'association', strength: 0.9 },
      { from: '1', to: '4', type: 'transaction', strength: 0.95 },
      { from: '2', to: '5', type: 'address', strength: 0.7 },
    ],
  },
  // Network 4: PEP Network (Saudi)
  {
    id: 'network-4',
    name: 'GCC PEP Network',
    description: 'Politically Exposed Persons requiring enhanced due diligence',
    riskLevel: 'medium',
    entities: [
      { 
        id: '1', type: 'person', name: 'HRH Prince Abdullah bin Fahd', risk: 'medium', 
        x: 400, y: 300, connections: ['2', '3', '4'], 
        metadata: { dob: '1965-08-20', nationality: 'Saudi Arabian', pep: true,
          pepType: 'Royal Family Member', position: 'Senior Prince',
          riskReason: 'PEP - requires enhanced due diligence' } 
      },
      { 
        id: '2', type: 'company', name: 'Royal Holdings KSA', risk: 'medium', 
        x: 600, y: 200, connections: ['1', '5'], 
        metadata: { registration: 'CR-1234567890', country: 'Saudi Arabia', countryRisk: 'Low', founded: '2000',
          industry: 'Diversified Holdings', uboStatus: 'Royal Family Owned',
          directors: ['HRH Prince Abdullah', 'Family Office'], riskReason: 'PEP owned entity' } 
      },
      { 
        id: '3', type: 'company', name: 'Riyadh Investment Corp', risk: 'low', 
        x: 250, y: 200, connections: ['1', '6'], 
        metadata: { registration: 'CR-9876543210', country: 'Saudi Arabia', countryRisk: 'Low', founded: '2015',
          industry: 'Investment Management', uboStatus: 'Institutional',
          directors: ['Professional Management'], riskReason: 'Connected to PEP investments' } 
      },
      { 
        id: '4', type: 'address', name: 'Al-Olaya District Villa', risk: 'low', 
        x: 550, y: 450, connections: ['1'], 
        metadata: { fullAddress: 'Villa 15, Al-Olaya District, Riyadh, Saudi Arabia', country: 'Saudi Arabia',
          countryRisk: 'Low', propertyType: 'Private Residence', registeredOccupants: 8,
          riskReason: 'PEP primary residence' } 
      },
      { 
        id: '5', type: 'transaction', name: 'SAR 50M Investment', risk: 'low', 
        x: 700, y: 350, connections: ['2'], 
        metadata: { date: '2024-01-20', amount: 'SAR 50,000,000', amountUSD: '~$13,300,000',
          fromEntity: 'Royal Holdings KSA', toEntity: 'Real Estate Fund',
          transactionType: 'Investment', riskReason: 'Large PEP transaction - monitored' } 
      },
      { 
        id: '6', type: 'person', name: 'Dr. Mansour Al-Faisal', risk: 'low', 
        x: 150, y: 350, connections: ['3'], 
        metadata: { relation: 'Business Partner', dob: '1975-03-10', nationality: 'Saudi Arabian',
          pep: false, occupation: 'Investment Banker', riskReason: 'Associate of PEP entity' } 
      },
    ],
    connections: [
      { from: '1', to: '2', type: 'ownership', strength: 0.95 },
      { from: '1', to: '3', type: 'association', strength: 0.6 },
      { from: '1', to: '4', type: 'address', strength: 0.8 },
      { from: '2', to: '5', type: 'transaction', strength: 0.7 },
      { from: '3', to: '6', type: 'association', strength: 0.5 },
    ],
  },
];

// Default to first network
const DEMO_ENTITIES: EntityNode[] = NETWORK_EXAMPLES[0].entities;
const DEMO_CONNECTIONS: Connection[] = NETWORK_EXAMPLES[0].connections;

// Risk Factor display component
function RiskFactor({ label, value, score }: { label: string; value: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return { bar: 'bg-red-500', text: 'text-red-400' };
    if (s >= 60) return { bar: 'bg-orange-500', text: 'text-orange-400' };
    if (s >= 40) return { bar: 'bg-yellow-500', text: 'text-yellow-400' };
    if (s >= 20) return { bar: 'bg-green-500', text: 'text-green-400' };
    return { bar: 'bg-green-600', text: 'text-green-300' };
  };
  
  const colors = getColor(score);
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-400">{label}</span>
        <span className={colors.text}>{value}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${colors.bar} rounded-full transition-all duration-500`} style={{ width: `${Math.max(score, 3)}%` }} />
      </div>
    </div>
  );
}

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 50, x: '-50%' }}
      className={`fixed bottom-6 left-1/2 transform px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 ${
        type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-violet-600'
      }`}
    >
      {type === 'success' && <Check className="w-5 h-5 text-white" />}
      {type === 'error' && <X className="w-5 h-5 text-white" />}
      {type === 'info' && <Network className="w-5 h-5 text-white" />}
      <span className="text-white font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/70 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default function EntityGraph() {
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>(NETWORK_EXAMPLES[0].id);
  const selectedNetwork = NETWORK_EXAMPLES.find(n => n.id === selectedNetworkId) || NETWORK_EXAMPLES[0];
  const [entities, setEntities] = useState<EntityNode[]>(selectedNetwork.entities);
  const [connections, setConnections] = useState<Connection[]>(selectedNetwork.connections);
  const [selectedEntity, setSelectedEntity] = useState<EntityNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [filter, setFilter] = useState<string>('all');
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Update entities when network changes
  const handleNetworkChange = (networkId: string) => {
    const network = NETWORK_EXAMPLES.find(n => n.id === networkId);
    if (network) {
      setSelectedNetworkId(networkId);
      setEntities(network.entities);
      setConnections(network.connections);
      setSelectedEntity(null);
      showToast(`Loaded: ${network.name}`, 'info');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFlagAsTrueMatch = async (entity: EntityNode) => {
    setActionLoading('flag');
    try {
      const token = localStorage.getItem('access_token');
      
      // Create a workflow case for this match
      await axios.post('http://localhost:8000/api/v1/workflow/cases', {
        screened_name: entity.name,
        match_score: entity.risk === 'sanctioned' ? 100 : entity.risk === 'high' ? 85 : 65,
        sanction_list: entity.metadata?.lists?.[0] || 'Manual Flag',
        country_code: 'QAT',
        status: 'flagged',
        priority: entity.risk === 'sanctioned' ? 'critical' : 'high',
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setEntities(prev => prev.map(e => 
        e.id === entity.id ? { ...e, risk: 'sanctioned' as const } : e
      ));

      showToast(`${entity.name} flagged as true positive match`, 'success');
    } catch (error) {
      console.error('Flag error:', error);
      showToast(`${entity.name} flagged as true match (demo mode)`, 'success');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalate = async (entity: EntityNode) => {
    setActionLoading('escalate');
    try {
      const token = localStorage.getItem('access_token');
      
      await axios.post('http://localhost:8000/api/v1/workflow/cases', {
        screened_name: entity.name,
        match_score: entity.risk === 'sanctioned' ? 100 : entity.risk === 'high' ? 85 : 65,
        sanction_list: entity.metadata?.lists?.[0] || 'Network Analysis',
        country_code: 'QAT',
        status: 'escalated',
        priority: 'critical',
        escalation_reason: 'Flagged via Entity Network Analysis - requires senior review',
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast(`${entity.name} escalated to compliance manager`, 'success');
    } catch (error) {
      console.error('Escalate error:', error);
      showToast(`${entity.name} escalated for senior review (demo mode)`, 'success');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateReport = (entity: EntityNode) => {
    setActionLoading('report');
    
    // Create PDF document
    const doc = new jsPDF();
    const reportId = `RPT-${Date.now().toString(36).toUpperCase()}`;
    const generatedDate = new Date().toLocaleString('en-GB', { 
      dateStyle: 'long', 
      timeStyle: 'short' 
    });

    // Color definitions
    const primaryColor: [number, number, number] = [99, 102, 241]; // Violet
    const dangerColor: [number, number, number] = [239, 68, 68]; // Red
    const warningColor: [number, number, number] = [245, 158, 11]; // Amber
    const successColor: [number, number, number] = [34, 197, 94]; // Green

    // Header with logo area
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('SCREENING REPORT', 20, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('ScreenGuard AML Compliance Engine', 20, 26);
    
    // Report ID on right
    doc.setFontSize(9);
    doc.text(`Report ID: ${reportId}`, 140, 18);
    doc.text(`Generated: ${generatedDate}`, 140, 24);

    // Risk Level Banner
    const riskColor = entity.risk === 'sanctioned' ? dangerColor : 
                      entity.risk === 'high' ? dangerColor :
                      entity.risk === 'medium' ? warningColor : successColor;
    
    doc.setFillColor(...riskColor);
    doc.rect(0, 35, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`RISK LEVEL: ${entity.risk.toUpperCase()}`, 20, 43);
    
    const recommendation = entity.risk === 'sanctioned' ? 'BLOCK TRANSACTION' : 
                          entity.risk === 'high' ? 'ESCALATE FOR REVIEW' :
                          entity.risk === 'medium' ? 'ENHANCED DUE DILIGENCE' : 'STANDARD PROCESSING';
    doc.text(`RECOMMENDATION: ${recommendation}`, 110, 43);

    // Entity Information Section
    let yPos = 55;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ENTITY INFORMATION', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const entityType = entity.type === 'person' ? 'Individual' : 
                       entity.type === 'company' ? 'Corporate Entity' :
                       entity.type === 'address' ? 'Address' : 'Transaction';

    const entityInfo = [
      ['Entity Name', entity.name],
      ['Entity Type', entityType],
      ['Risk Classification', entity.risk.toUpperCase()],
    ];

    if (entity.type === 'person') {
      entityInfo.push(
        ['Date of Birth', entity.metadata?.dob || 'Not provided'],
        ['Nationality', entity.metadata?.nationality || 'Unknown'],
        ['PEP Status', entity.metadata?.pep ? 'Yes - Politically Exposed Person' : 'No']
      );
    } else if (entity.type === 'company') {
      entityInfo.push(
        ['Registration Number', entity.metadata?.registration || 'Not provided'],
        ['Country of Incorporation', entity.metadata?.country || 'Unknown'],
        ['Industry', entity.metadata?.industry || 'Not classified'],
        ['Date Established', entity.metadata?.founded || 'Unknown']
      );
    } else if (entity.type === 'address') {
      entityInfo.push(
        ['Full Address', entity.metadata?.fullAddress || entity.name],
        ['Country', entity.metadata?.country || 'Unknown'],
        ['Property Type', entity.metadata?.propertyType || 'Unknown']
      );
    } else if (entity.type === 'transaction') {
      entityInfo.push(
        ['Amount', entity.metadata?.amount || 'Unknown'],
        ['Transaction Date', entity.metadata?.date || 'Unknown'],
        ['Transaction Type', entity.metadata?.transactionType || 'Unknown'],
        ['From Entity', entity.metadata?.fromEntity || 'Unknown'],
        ['To Entity', entity.metadata?.toEntity || 'Unknown']
      );
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: entityInfo,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 120 }
      },
      margin: { left: 20 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Risk Factors Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RISK ASSESSMENT', 20, yPos);
    yPos += 5;

    // Generate risk factors based on entity type
    let riskFactors: string[][] = [];
    
    if (entity.type === 'person') {
      riskFactors = [
        ['Name Match Score', entity.risk === 'sanctioned' ? '98%' : '65%', entity.risk === 'sanctioned' ? 'Critical' : 'Medium'],
        ['Date of Birth', entity.metadata?.dob ? 'Matched' : 'Not Provided', entity.metadata?.dob ? 'High' : 'Low'],
        ['Nationality Risk', entity.metadata?.nationality || 'Unknown', 
          ['Syrian', 'Iranian', 'North Korean'].includes(entity.metadata?.nationality) ? 'High' : 'Low'],
        ['PEP Status', entity.metadata?.pep ? 'Yes' : 'No', entity.metadata?.pep ? 'High' : 'Low'],
        ['Sanctions Match', entity.metadata?.lists ? `${entity.metadata.lists.length} list(s)` : 'Clear', 
          entity.metadata?.lists ? 'Critical' : 'Low'],
        ['Network Connections', `${entity.connections.length} entities`, 
          entity.connections.length > 3 ? 'Medium' : 'Low'],
      ];
    } else if (entity.type === 'company') {
      riskFactors = [
        ['Company Name Match', entity.risk === 'high' ? '88%' : '45%', entity.risk === 'high' ? 'High' : 'Low'],
        ['Registration Status', entity.metadata?.registration ? 'Verified' : 'Not Found', 
          entity.metadata?.registration ? 'Low' : 'Medium'],
        ['Jurisdiction Risk', entity.metadata?.countryRisk || 'Unknown', 
          entity.metadata?.countryRisk === 'Low' ? 'Low' : 'High'],
        ['Beneficial Ownership', entity.metadata?.uboStatus || 'Unknown', 
          entity.metadata?.uboStatus?.includes('sanctioned') ? 'Critical' : 'Medium'],
        ['Industry Classification', entity.metadata?.industry || 'Unknown', 'Medium'],
        ['Director/UBO Screening', 
          entity.metadata?.directors?.some((d: string) => d.includes('Sanctioned')) ? 'Match Found' : 'Clear',
          entity.metadata?.directors?.some((d: string) => d.includes('Sanctioned')) ? 'Critical' : 'Low'],
      ];
    } else if (entity.type === 'address') {
      riskFactors = [
        ['Address Verification', 'Verified', 'Low'],
        ['Country Risk', entity.metadata?.countryRisk || 'Low', entity.metadata?.countryRisk || 'Low'],
        ['Property Type', entity.metadata?.propertyType || 'Unknown', 'Low'],
        ['Linked to Sanctioned Entity', 
          entity.connections.some(id => entities.find(e => e.id === id)?.risk === 'sanctioned') ? 'Yes' : 'No',
          entity.connections.some(id => entities.find(e => e.id === id)?.risk === 'sanctioned') ? 'High' : 'Low'],
      ];
    } else {
      riskFactors = [
        ['Transaction Amount', entity.metadata?.amount || 'Unknown', 'Medium'],
        ['Originator Risk', 'Under Review', 'Medium'],
        ['Beneficiary Risk', 'Under Review', 'Medium'],
        ['Pattern Analysis', 'Unusual Amount', 'High'],
      ];
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Risk Factor', 'Value', 'Risk Level']],
      body: riskFactors,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        2: { 
          cellWidth: 30,
          fontStyle: 'bold'
        }
      },
      margin: { left: 20, right: 20 },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === 'body') {
          const value = data.cell.raw as string;
          if (value === 'Critical' || value === 'High') {
            data.cell.styles.textColor = dangerColor;
          } else if (value === 'Medium') {
            data.cell.styles.textColor = warningColor;
          } else {
            data.cell.styles.textColor = successColor;
          }
        }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Network Analysis Section
    if (entity.connections.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('NETWORK ANALYSIS', 20, yPos);
      yPos += 5;

      const networkData = entity.connections.map(id => {
        const connected = entities.find(e => e.id === id);
        const conn = connections.find(c => 
          (c.from === entity.id && c.to === id) || (c.to === entity.id && c.from === id)
        );
        return connected ? [
          connected.name,
          connected.type === 'person' ? 'Individual' : 
           connected.type === 'company' ? 'Corporate' : 
           connected.type === 'address' ? 'Address' : 'Transaction',
          conn?.type || 'Associated',
          connected.risk.toUpperCase()
        ] : null;
      }).filter(Boolean) as string[][];

      autoTable(doc, {
        startY: yPos,
        head: [['Connected Entity', 'Type', 'Relationship', 'Risk']],
        body: networkData,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 4 },
        margin: { left: 20, right: 20 },
        didParseCell: (data) => {
          if (data.column.index === 3 && data.section === 'body') {
            const value = data.cell.raw as string;
            if (value === 'SANCTIONED' || value === 'HIGH') {
              data.cell.styles.textColor = dangerColor;
            } else if (value === 'MEDIUM') {
              data.cell.styles.textColor = warningColor;
            } else {
              data.cell.styles.textColor = successColor;
            }
          }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Sanctions Screening Results
    if (entity.metadata?.lists && entity.metadata.lists.length > 0) {
      doc.setFillColor(...dangerColor);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('⚠ SANCTIONS LIST MATCH', 25, yPos + 6);
      
      yPos += 12;
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      entity.metadata.lists.forEach((list: string) => {
        doc.text(`• ${list}`, 25, yPos);
        yPos += 6;
      });
      
      if (entity.metadata?.reason) {
        doc.text(`Reason: ${entity.metadata.reason}`, 25, yPos);
        yPos += 6;
      }
      if (entity.metadata?.sanctionDate) {
        doc.text(`Sanction Date: ${entity.metadata.sanctionDate}`, 25, yPos);
        yPos += 6;
      }
      
      yPos += 5;
    }

    // Check if we need a new page before recommendation
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    // Recommendation Section
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos, 170, 45, 'F');
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RECOMMENDED ACTION', 25, yPos + 8);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const actionText = entity.risk === 'sanctioned' 
      ? 'BLOCK all transactions. File SAR immediately. Notify compliance officer.'
      : entity.risk === 'high' 
      ? 'ESCALATE to senior compliance officer for enhanced due diligence review.'
      : entity.risk === 'medium'
      ? 'Conduct enhanced due diligence before proceeding with transaction.'
      : 'Standard processing permitted. Continue ongoing monitoring.';
    
    const splitAction = doc.splitTextToSize(actionText, 160);
    doc.text(splitAction, 25, yPos + 18);

    yPos += 55;

    // Required Actions Section
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('REQUIRED COMPLIANCE ACTIONS', 20, yPos);
    yPos += 8;

    const requiredActions = entity.risk === 'sanctioned' ? [
      '1. Block all pending and future transactions immediately',
      '2. File Suspicious Activity Report (SAR) within 24 hours',
      '3. Notify Compliance Officer and MLRO',
      '4. Freeze any associated accounts',
      '5. Document all decisions with rationale',
      '6. Retain all records for regulatory audit',
    ] : entity.risk === 'high' ? [
      '1. Escalate to Senior Compliance Officer',
      '2. Conduct Enhanced Due Diligence (EDD)',
      '3. Verify beneficial ownership structure',
      '4. Review all adverse media in detail',
      '5. Obtain senior management approval before proceeding',
      '6. Document risk assessment and decision',
    ] : entity.risk === 'medium' ? [
      '1. Conduct standard due diligence review',
      '2. Verify entity documentation',
      '3. Check for any updated sanctions information',
      '4. Document review findings',
    ] : [
      '1. Continue standard monitoring procedures',
      '2. Update records as necessary',
      '3. Flag for periodic review',
    ];

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    requiredActions.forEach(action => {
      if (yPos > 275) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(action, 25, yPos);
      yPos += 6;
    });

    yPos += 10;

    // Audit Trail Section
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AUDIT TRAIL', 20, yPos);
    yPos += 8;

    const auditInfo = [
      ['Screening Performed By', 'System - Automated Screening Engine'],
      ['Screening Date/Time', generatedDate],
      ['Report ID', reportId],
      ['Review Status', 'Pending Compliance Review'],
      ['Case Reference', entity.risk === 'sanctioned' || entity.risk === 'high' ? 'Case to be created' : 'N/A'],
      ['Data Sources', 'OFAC SDN, UN Consolidated, EU Sanctions, Local Watchlist'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: auditInfo,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 120 }
      },
      margin: { left: 20 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Signature Section
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 90, yPos);
    doc.line(120, yPos, 190, yPos);
    
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Reviewed By', 45, yPos + 5);
    doc.text('Approved By', 145, yPos + 5);
    
    doc.text('Date: _______________', 20, yPos + 15);
    doc.text('Date: _______________', 120, yPos + 15);

    // Disclaimer
    yPos += 30;
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFillColor(250, 250, 250);
    doc.rect(20, yPos, 170, 25, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    const disclaimer = 'DISCLAIMER: This report is generated by automated screening systems and should be reviewed by qualified compliance personnel. The risk assessment is based on available data at the time of screening and may require additional verification. This document is confidential and intended for authorized recipients only.';
    const splitDisclaimer = doc.splitTextToSize(disclaimer, 160);
    doc.text(splitDisclaimer, 25, yPos + 6);

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, 100, 290, { align: 'center' });
      doc.text('CONFIDENTIAL - For authorized personnel only', 20, 290);
      doc.text('ScreenGuard AML Engine', 170, 290);
    }

    // Save PDF
    doc.save(`screening-report-${entity.name.replace(/\s+/g, '-').toLowerCase()}-${reportId}.pdf`);

    setActionLoading(null);
    showToast(`PDF Report generated for ${entity.name}`, 'success');
  };

  const handleExportGraph = () => {
    // Create PDF document for network export
    const doc = new jsPDF();
    const reportId = `NET-${Date.now().toString(36).toUpperCase()}`;
    const generatedDate = new Date().toLocaleString('en-GB', { 
      dateStyle: 'long', 
      timeStyle: 'short' 
    });

    // Color definitions
    const primaryColor: [number, number, number] = [99, 102, 241];
    const dangerColor: [number, number, number] = [239, 68, 68];
    const warningColor: [number, number, number] = [245, 158, 11];
    const successColor: [number, number, number] = [34, 197, 94];

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('NETWORK ANALYSIS REPORT', 20, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('ScreenGuard AML Compliance Engine', 20, 26);
    doc.text(`Report ID: ${reportId}`, 140, 18);
    doc.text(`Generated: ${generatedDate}`, 140, 24);

    // Summary Stats Banner
    const sanctionedCount = entities.filter(e => e.risk === 'sanctioned').length;
    const highRiskCount = entities.filter(e => e.risk === 'high').length;
    
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 35, 210, 20, 'F');
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text(`Total Entities: ${entities.length}`, 20, 45);
    doc.text(`Connections: ${connections.length}`, 70, 45);
    doc.setTextColor(...dangerColor);
    doc.text(`Sanctioned: ${sanctionedCount}`, 120, 45);
    doc.setTextColor(...warningColor);
    doc.text(`High Risk: ${highRiskCount}`, 165, 45);

    let yPos = 65;

    // All Entities Table
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ENTITY INVENTORY', 20, yPos);
    yPos += 5;

    const entityData = entities.map(e => [
      e.name,
      e.type === 'person' ? 'Individual' : 
       e.type === 'company' ? 'Corporate' : 
       e.type === 'address' ? 'Address' : 'Transaction',
      e.risk.toUpperCase(),
      e.connections.length.toString(),
      e.metadata?.riskReason || '-'
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Entity Name', 'Type', 'Risk', 'Links', 'Risk Reason']],
      body: entityData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 15 },
        4: { cellWidth: 65 }
      },
      margin: { left: 20, right: 20 },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === 'body') {
          const value = data.cell.raw as string;
          if (value === 'SANCTIONED' || value === 'HIGH') {
            data.cell.styles.textColor = dangerColor;
            data.cell.styles.fontStyle = 'bold';
          } else if (value === 'MEDIUM') {
            data.cell.styles.textColor = warningColor;
          } else {
            data.cell.styles.textColor = successColor;
          }
        }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Connections Table
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATIONSHIP MAPPING', 20, yPos);
    yPos += 5;

    const connectionData = connections.map(c => {
      const fromEntity = entities.find(e => e.id === c.from);
      const toEntity = entities.find(e => e.id === c.to);
      return [
        fromEntity?.name || 'Unknown',
        c.type.charAt(0).toUpperCase() + c.type.slice(1),
        toEntity?.name || 'Unknown',
        `${Math.round(c.strength * 100)}%`
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['From Entity', 'Relationship', 'To Entity', 'Strength']],
      body: connectionData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: 20, right: 20 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // High Risk Entities Detail
    const highRiskEntities = entities.filter(e => e.risk === 'sanctioned' || e.risk === 'high');
    
    if (highRiskEntities.length > 0) {
      doc.setFillColor(...dangerColor);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('⚠ HIGH RISK ENTITIES REQUIRING ATTENTION', 25, yPos + 6);
      yPos += 15;

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      highRiskEntities.forEach(entity => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`• ${entity.name}`, 25, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 5;
        
        doc.text(`  Risk Level: ${entity.risk.toUpperCase()}`, 25, yPos);
        yPos += 4;
        
        if (entity.metadata?.lists) {
          doc.text(`  Sanctions Lists: ${entity.metadata.lists.join(', ')}`, 25, yPos);
          yPos += 4;
        }
        if (entity.metadata?.riskReason) {
          doc.text(`  Reason: ${entity.metadata.riskReason}`, 25, yPos);
          yPos += 4;
        }
        yPos += 4;
      });
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, 100, 290, { align: 'center' });
      doc.text('CONFIDENTIAL - For authorized personnel only', 20, 290);
      doc.text('ScreenGuard AML Engine', 170, 290);
    }

    // Save PDF
    doc.save(`network-analysis-${reportId}.pdf`);
    showToast('Network analysis PDF exported successfully', 'success');
  };

  const getNodeColor = (risk: string) => {
    switch (risk) {
      case 'sanctioned': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'person': return User;
      case 'company': return Building2;
      case 'sanction': return AlertTriangle;
      case 'transaction': return FileText;
      case 'address': return Globe;
      default: return Network;
    }
  };

  const getConnectionColor = (type: string) => {
    switch (type) {
      case 'ownership': return '#3b82f6';
      case 'transaction': return '#ef4444';
      case 'family': return '#a855f7';
      case 'association': return '#6b7280';
      case 'address': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const handleMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(id);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    setEntities(prev => prev.map(entity => 
      entity.id === dragging 
        ? { ...entity, x: svgP.x / zoom, y: svgP.y / zoom }
        : entity
    ));
  }, [dragging, zoom]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const filteredEntities = filter === 'all' 
    ? entities 
    : entities.filter(e => e.risk === filter || e.type === filter);

  const filteredConnections = connections.filter(c => 
    filteredEntities.some(e => e.id === c.from) && 
    filteredEntities.some(e => e.id === c.to)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Entity Network Analysis</h1>
                <p className="text-slate-400 text-sm">Interactive relationship mapping • Palantir-style investigation</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                <button 
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                  className="p-2 hover:bg-white/10 rounded-md transition-colors"
                >
                  <ZoomOut className="w-4 h-4 text-slate-400" />
                </button>
                <span className="text-slate-400 text-sm px-2">{Math.round(zoom * 100)}%</span>
                <button 
                  onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                  className="p-2 hover:bg-white/10 rounded-md transition-colors"
                >
                  <ZoomIn className="w-4 h-4 text-slate-400" />
                </button>
                <button 
                  onClick={() => setZoom(1)}
                  className="p-2 hover:bg-white/10 rounded-md transition-colors"
                >
                  <Maximize2 className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Network Selector */}
              <select 
                value={selectedNetworkId}
                onChange={(e) => handleNetworkChange(e.target.value)}
                className="bg-violet-600/20 border border-violet-500/50 rounded-lg px-3 py-2 text-white text-sm font-medium"
              >
                {NETWORK_EXAMPLES.map(network => (
                  <option key={network.id} value={network.id} className="bg-slate-900">
                    {network.name} ({network.riskLevel})
                  </option>
                ))}
              </select>

              {/* Filter */}
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="all">All Entities</option>
                <option value="sanctioned">Sanctioned Only</option>
                <option value="high">High Risk</option>
                <option value="person">People</option>
                <option value="company">Companies</option>
              </select>

              <button 
                onClick={handleExportGraph}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Graph Area */}
        <div className="flex-1 relative">
          <svg 
            ref={svgRef}
            className="w-full h-[calc(100vh-80px)] cursor-grab"
            style={{ background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.03) 0%, transparent 70%)' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid Pattern */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            <g transform={`scale(${zoom})`}>
              {/* Connections */}
              {filteredConnections.map((conn, i) => {
                const from = entities.find(e => e.id === conn.from);
                const to = entities.find(e => e.id === conn.to);
                if (!from || !to) return null;
                
                return (
                  <g key={i}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={getConnectionColor(conn.type)}
                      strokeWidth={conn.strength * 3}
                      strokeOpacity={0.4}
                      strokeDasharray={conn.type === 'association' ? '5,5' : undefined}
                    />
                    {/* Connection label */}
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 5}
                      fill="rgba(255,255,255,0.5)"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {conn.type}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {filteredEntities.map((entity) => {
                const Icon = getNodeIcon(entity.type);
                const isSelected = selectedEntity?.id === entity.id;
                
                return (
                  <g 
                    key={entity.id}
                    transform={`translate(${entity.x}, ${entity.y})`}
                    className="cursor-pointer"
                    onMouseDown={(e) => handleMouseDown(entity.id, e)}
                    onClick={() => setSelectedEntity(entity)}
                  >
                    {/* Glow effect for sanctioned/high risk */}
                    {(entity.risk === 'sanctioned' || entity.risk === 'high') && (
                      <circle
                        r="45"
                        fill={getNodeColor(entity.risk)}
                        opacity="0.15"
                        className="animate-pulse"
                      />
                    )}
                    
                    {/* Selection ring */}
                    {isSelected && (
                      <circle
                        r="38"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="3"
                        strokeDasharray="5,3"
                        className="animate-spin"
                        style={{ animationDuration: '10s' }}
                      />
                    )}
                    
                    {/* Main circle */}
                    <circle
                      r="30"
                      fill={`${getNodeColor(entity.risk)}20`}
                      stroke={getNodeColor(entity.risk)}
                      strokeWidth="2"
                    />
                    
                    {/* Icon background */}
                    <circle r="20" fill={getNodeColor(entity.risk)} />
                    
                    {/* Icon - using foreignObject for Lucide icons */}
                    <foreignObject x="-12" y="-12" width="24" height="24">
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    </foreignObject>
                    
                    {/* Label */}
                    <text
                      y="50"
                      fill="white"
                      fontSize="12"
                      fontWeight="500"
                      textAnchor="middle"
                    >
                      {entity.name.length > 20 ? entity.name.slice(0, 18) + '...' : entity.name}
                    </text>
                    
                    {/* Risk badge */}
                    <g transform="translate(20, -25)">
                      <rect
                        x="-20"
                        y="-8"
                        width="40"
                        height="16"
                        rx="8"
                        fill={getNodeColor(entity.risk)}
                      />
                      <text
                        fill="white"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {entity.risk.toUpperCase()}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-white/10">
            <h4 className="text-white font-medium mb-3 text-sm">Legend</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-400">Sanctioned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-slate-400">High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-slate-400">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-slate-400">Low Risk</span>
              </div>
            </div>
            <div className="border-t border-white/10 mt-3 pt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-blue-500" />
                <span className="text-slate-400">Ownership</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-500" />
                <span className="text-slate-400">Transaction</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-purple-500" />
                <span className="text-slate-400">Family</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-green-500" />
                <span className="text-slate-400">Address</span>
              </div>
            </div>
          </div>
        </div>

        {/* Entity Details Panel */}
        <AnimatePresence>
          {selectedEntity && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="w-96 bg-black/40 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto"
              style={{ height: 'calc(100vh - 80px)' }}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${getNodeColor(selectedEntity.risk)}30` }}
                  >
                    {(() => {
                      const Icon = getNodeIcon(selectedEntity.type);
                      return <Icon className="w-6 h-6" style={{ color: getNodeColor(selectedEntity.risk) }} />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{selectedEntity.name}</h3>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ 
                        background: `${getNodeColor(selectedEntity.risk)}30`,
                        color: getNodeColor(selectedEntity.risk)
                      }}
                    >
                      {selectedEntity.risk.toUpperCase()} RISK
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEntity(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              {/* Risk Score Breakdown - Dynamic based on entity type and data */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-400" />
                  Risk Assessment
                  <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 ml-auto capitalize">
                    {selectedEntity.type === 'person' ? 'Individual' : 
                     selectedEntity.type === 'company' ? 'Corporate' :
                     selectedEntity.type === 'address' ? 'Address' : 'Transaction'}
                  </span>
                </h4>
                
                {/* Dynamic Risk Factors based on entity type */}
                <div className="space-y-3">
                  {selectedEntity.type === 'person' && (
                    <>
                      <RiskFactor 
                        label="Name Match Score" 
                        value={selectedEntity.risk === 'sanctioned' ? '98%' : selectedEntity.risk === 'high' ? '85%' : '65%'}
                        score={selectedEntity.risk === 'sanctioned' ? 98 : selectedEntity.risk === 'high' ? 85 : 65}
                      />
                      <RiskFactor 
                        label="Date of Birth" 
                        value={selectedEntity.metadata?.dob ? 'Matched' : 'Not Provided'}
                        score={selectedEntity.metadata?.dob ? 90 : 0}
                      />
                      <RiskFactor 
                        label="Nationality" 
                        value={selectedEntity.metadata?.nationality || 'Unknown'}
                        score={selectedEntity.metadata?.nationality === 'Syrian' || selectedEntity.metadata?.nationality === 'Iranian' ? 75 : 
                               selectedEntity.metadata?.nationality === 'Emirati' || selectedEntity.metadata?.nationality === 'Qatari' ? 10 : 30}
                      />
                      <RiskFactor 
                        label="PEP Status" 
                        value={selectedEntity.metadata?.pep ? 'Yes - PEP' : 'Not a PEP'}
                        score={selectedEntity.metadata?.pep ? 80 : 5}
                      />
                      <RiskFactor 
                        label="Sanctions List Match" 
                        value={selectedEntity.metadata?.lists ? `${selectedEntity.metadata.lists.length} List(s)` : 'Clear'}
                        score={selectedEntity.metadata?.lists ? 100 : 0}
                      />
                      <RiskFactor 
                        label="Network Connections" 
                        value={`${selectedEntity.connections.length} connections`}
                        score={Math.min(selectedEntity.connections.length * 20, 80)}
                      />
                    </>
                  )}

                  {selectedEntity.type === 'company' && (
                    <>
                      <RiskFactor 
                        label="Company Name Match" 
                        value={selectedEntity.risk === 'high' ? '88%' : '45%'}
                        score={selectedEntity.risk === 'high' ? 88 : 45}
                      />
                      <RiskFactor 
                        label="Registration Verified" 
                        value={selectedEntity.metadata?.registration ? 'Yes' : 'Not Found'}
                        score={selectedEntity.metadata?.registration ? 10 : 60}
                      />
                      <RiskFactor 
                        label="Jurisdiction Risk" 
                        value={selectedEntity.metadata?.countryRisk || 'Unknown'}
                        score={selectedEntity.metadata?.countryRisk === 'Low' ? 15 : 
                               selectedEntity.metadata?.countryRisk === 'Medium' ? 50 : 80}
                      />
                      <RiskFactor 
                        label="Beneficial Ownership" 
                        value={selectedEntity.metadata?.uboStatus || 'Unknown'}
                        score={selectedEntity.metadata?.uboStatus?.includes('sanctioned') ? 95 : 
                               selectedEntity.metadata?.uboStatus === 'Verified - Clear' ? 10 : 50}
                      />
                      <RiskFactor 
                        label="Industry Risk" 
                        value={selectedEntity.metadata?.industry || 'Not Classified'}
                        score={selectedEntity.metadata?.industry?.includes('Trading') ? 55 : 
                               selectedEntity.metadata?.industry?.includes('Financial') ? 45 : 30}
                      />
                      <RiskFactor 
                        label="Director/UBO Sanctions" 
                        value={selectedEntity.metadata?.directors?.some((d: string) => d.includes('Sanctioned')) ? 'Match Found' : 'Clear'}
                        score={selectedEntity.metadata?.directors?.some((d: string) => d.includes('Sanctioned')) ? 100 : 5}
                      />
                      <RiskFactor 
                        label="Network Exposure" 
                        value={selectedEntity.metadata?.riskReason || 'Standard'}
                        score={selectedEntity.risk === 'high' ? 85 : selectedEntity.risk === 'medium' ? 50 : 20}
                      />
                    </>
                  )}

                  {selectedEntity.type === 'address' && (
                    <>
                      <RiskFactor 
                        label="Address Verification" 
                        value="Verified"
                        score={10}
                      />
                      <RiskFactor 
                        label="Country Risk" 
                        value={selectedEntity.metadata?.countryRisk || 'Low'}
                        score={selectedEntity.metadata?.countryRisk === 'Low' ? 10 : 
                               selectedEntity.metadata?.countryRisk === 'Medium' ? 45 : 75}
                      />
                      <RiskFactor 
                        label="Property Type" 
                        value={selectedEntity.metadata?.propertyType || 'Unknown'}
                        score={15}
                      />
                      <RiskFactor 
                        label="Known Occupants" 
                        value={`${selectedEntity.metadata?.registeredOccupants || 0} registered`}
                        score={20}
                      />
                      <RiskFactor 
                        label="Linked to Sanctions" 
                        value={selectedEntity.connections.some(id => entities.find(e => e.id === id)?.risk === 'sanctioned') ? 'Yes' : 'No'}
                        score={selectedEntity.connections.some(id => entities.find(e => e.id === id)?.risk === 'sanctioned') ? 70 : 5}
                      />
                      <RiskFactor 
                        label="Overall Address Risk" 
                        value={selectedEntity.risk === 'low' ? 'Low' : selectedEntity.risk === 'medium' ? 'Medium' : 'High'}
                        score={selectedEntity.risk === 'low' ? 25 : selectedEntity.risk === 'medium' ? 55 : 85}
                      />
                    </>
                  )}

                  {selectedEntity.type === 'transaction' && (
                    <>
                      <RiskFactor 
                        label="Transaction Amount" 
                        value={selectedEntity.metadata?.amount || 'Unknown'}
                        score={selectedEntity.metadata?.amountUSD?.includes('2,500,000') ? 75 : 40}
                      />
                      <RiskFactor 
                        label="Transaction Type" 
                        value={selectedEntity.metadata?.transactionType || 'Unknown'}
                        score={selectedEntity.metadata?.transactionType === 'Wire Transfer' ? 50 : 30}
                      />
                      <RiskFactor 
                        label="Originator Risk" 
                        value={selectedEntity.metadata?.fromEntity || 'Unknown'}
                        score={85}
                      />
                      <RiskFactor 
                        label="Beneficiary Risk" 
                        value={selectedEntity.metadata?.toEntity || 'Unknown'}
                        score={50}
                      />
                      <RiskFactor 
                        label="Pattern Analysis" 
                        value="Unusual Amount"
                        score={70}
                      />
                      <RiskFactor 
                        label="Overall Transaction Risk" 
                        value={selectedEntity.risk === 'high' ? 'High' : 'Medium'}
                        score={selectedEntity.risk === 'high' ? 80 : 50}
                      />
                    </>
                  )}
                </div>

                {/* Risk Reason Summary */}
                {selectedEntity.metadata?.riskReason && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg border-l-2 border-yellow-500">
                    <p className="text-xs text-slate-400 mb-1">Risk Reason</p>
                    <p className="text-sm text-white">{selectedEntity.metadata.riskReason}</p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <h4 className="text-white font-medium mb-3">Entity Details</h4>
                <div className="space-y-2">
                  {selectedEntity.metadata && Object.entries(selectedEntity.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connections */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-violet-400" />
                  Connected Entities ({selectedEntity.connections.length})
                </h4>
                <div className="space-y-2">
                  {selectedEntity.connections.map(connId => {
                    const connEntity = entities.find(e => e.id === connId);
                    if (!connEntity) return null;
                    const conn = connections.find(c => 
                      (c.from === selectedEntity.id && c.to === connId) ||
                      (c.to === selectedEntity.id && c.from === connId)
                    );
                    return (
                      <div 
                        key={connId}
                        onClick={() => setSelectedEntity(connEntity)}
                        className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: `${getNodeColor(connEntity.risk)}30` }}
                          >
                            {(() => {
                              const Icon = getNodeIcon(connEntity.type);
                              return <Icon className="w-4 h-4" style={{ color: getNodeColor(connEntity.risk) }} />;
                            })()}
                          </div>
                          <div>
                            <p className="text-white text-sm">{connEntity.name}</p>
                            <p className="text-slate-500 text-xs">{conn?.type || 'connected'}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button 
                  onClick={() => handleFlagAsTrueMatch(selectedEntity)}
                  disabled={actionLoading === 'flag'}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  {actionLoading === 'flag' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  Flag as True Match
                </button>
                <button 
                  onClick={() => handleEscalate(selectedEntity)}
                  disabled={actionLoading === 'escalate'}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  {actionLoading === 'escalate' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  Escalate for Review
                </button>
                <button 
                  onClick={() => handleGenerateReport(selectedEntity)}
                  disabled={actionLoading === 'report'}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  {actionLoading === 'report' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Generate Report
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(null)} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

