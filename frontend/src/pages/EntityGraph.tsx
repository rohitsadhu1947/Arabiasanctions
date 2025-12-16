import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Network, User, Building2, AlertTriangle, Shield, 
  ZoomIn, ZoomOut, Maximize2, Download,
  ChevronRight, Globe, FileText, Link2, Check, X, Loader2
} from 'lucide-react';
import axios from 'axios';

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

// Demo data showing entity relationships - realistic GCC data
const DEMO_ENTITIES: EntityNode[] = [
  { 
    id: '1', 
    type: 'person', 
    name: 'Mohammad Al-Rashid', 
    risk: 'sanctioned', 
    x: 400, y: 300, 
    connections: ['2', '3', '5'], 
    metadata: { 
      dob: '1975-03-15', 
      nationality: 'Syrian', 
      lists: ['OFAC SDN', 'UN Consolidated'],
      reason: 'Providing financial support to designated entities',
      sanctionDate: '2019-05-20'
    } 
  },
  { 
    id: '2', 
    type: 'company', 
    name: 'Gulf Trading LLC', 
    risk: 'high', 
    x: 600, y: 200, 
    connections: ['1', '4'], 
    metadata: { 
      registration: 'DED-123456',
      country: 'UAE',
      countryRisk: 'Low',
      founded: '2015',
      industry: 'Import/Export Trading',
      uboStatus: 'Linked to sanctioned individual',
      directors: ['Mohammad Al-Rashid (Sanctioned)', 'Unknown Nominee'],
      riskReason: 'Beneficial owner is sanctioned individual'
    } 
  },
  { 
    id: '3', 
    type: 'person', 
    name: 'Ahmed Al-Rashid', 
    risk: 'medium', 
    x: 250, y: 200, 
    connections: ['1', '6'], 
    metadata: { 
      relation: 'Brother of sanctioned individual',
      dob: '1980-07-22',
      nationality: 'Syrian',
      pep: false,
      riskReason: 'Family member of sanctioned person'
    } 
  },
  { 
    id: '4', 
    type: 'company', 
    name: 'Horizon Investments WLL', 
    risk: 'medium', 
    x: 700, y: 350, 
    connections: ['2', '7'], 
    metadata: { 
      registration: 'QFC-98765',
      country: 'Qatar',
      countryRisk: 'Low',
      founded: '2018',
      industry: 'Financial Services',
      uboStatus: 'Verified - Clear',
      directors: ['Khalid Al-Thani', 'Sara Ahmed'],
      riskReason: 'Business relationship with high-risk entity'
    } 
  },
  { 
    id: '5', 
    type: 'address', 
    name: 'Dubai Marina Tower 5', 
    risk: 'low', 
    x: 300, y: 450, 
    connections: ['1', '6'], 
    metadata: { 
      fullAddress: 'Unit 2301, Tower 5, Dubai Marina, Dubai, UAE',
      country: 'UAE',
      countryRisk: 'Low',
      propertyType: 'Residential Apartment',
      registeredOccupants: 2,
      riskReason: 'Known address of sanctioned individual'
    } 
  },
  { 
    id: '6', 
    type: 'person', 
    name: 'Fatima Al-Hassan', 
    risk: 'low', 
    x: 150, y: 350, 
    connections: ['3', '5'], 
    metadata: { 
      relation: 'Business Associate',
      dob: '1985-04-12',
      nationality: 'Emirati',
      pep: false,
      occupation: 'Accountant',
      riskReason: 'Indirect connection only'
    } 
  },
  { 
    id: '7', 
    type: 'transaction', 
    name: 'QAR 9.1M Transfer', 
    risk: 'high', 
    x: 550, y: 450, 
    connections: ['4'], 
    metadata: { 
      date: '2024-01-15',
      amount: 'QAR 9,100,000',
      amountUSD: '~$2,500,000',
      fromEntity: 'Gulf Trading LLC',
      toEntity: 'Horizon Investments WLL',
      transactionType: 'Wire Transfer',
      riskReason: 'Large transfer from high-risk entity'
    } 
  },
];

const DEMO_CONNECTIONS: Connection[] = [
  { from: '1', to: '2', type: 'ownership', strength: 0.8 },
  { from: '1', to: '3', type: 'family', strength: 0.9 },
  { from: '1', to: '5', type: 'address', strength: 0.6 },
  { from: '2', to: '4', type: 'transaction', strength: 0.7 },
  { from: '3', to: '6', type: 'association', strength: 0.5 },
  { from: '5', to: '6', type: 'address', strength: 0.4 },
  { from: '4', to: '7', type: 'transaction', strength: 0.9 },
];

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
  const [entities, setEntities] = useState<EntityNode[]>(DEMO_ENTITIES);
  const [connections] = useState<Connection[]>(DEMO_CONNECTIONS);
  const [selectedEntity, setSelectedEntity] = useState<EntityNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [filter, setFilter] = useState<string>('all');
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    
    // Generate entity-type specific risk factors
    const individualRiskFactors = [
      { factor: 'Full Name Match', value: '95%', weight: 'Critical', score: 95 },
      { factor: 'Date of Birth Match', value: '80%', weight: 'High', score: 80 },
      { factor: 'Nationality Match', value: '100%', weight: 'High', score: 100 },
      { factor: 'Passport/ID Match', value: 'N/A', weight: 'Medium', score: 0 },
      { factor: 'PEP Status', value: 'Under Review', weight: 'High', score: 50 },
      { factor: 'Adverse Media', value: '2 Articles Found', weight: 'Medium', score: 70 },
      { factor: 'Network Risk', value: 'HIGH', weight: 'Critical', score: 85 },
    ];

    const corporateRiskFactors = [
      { factor: 'Company Name Match', value: '92%', weight: 'Critical', score: 92 },
      { factor: 'Registration Number', value: 'Verified', weight: 'High', score: 100 },
      { factor: 'Country of Incorporation', value: 'High Risk Jurisdiction', weight: 'Critical', score: 75 },
      { factor: 'Beneficial Ownership', value: 'Opaque Structure', weight: 'Critical', score: 80 },
      { factor: 'Shell Company Indicators', value: 'Detected', weight: 'Critical', score: 85 },
      { factor: 'Industry Risk (NAICS)', value: 'Medium - Financial Services', weight: 'Medium', score: 55 },
      { factor: 'Sanctioned Directors/UBOs', value: '1 Match Found', weight: 'Critical', score: 90 },
      { factor: 'Adverse Media', value: '3 Negative Articles', weight: 'High', score: 65 },
      { factor: 'Regulatory Actions', value: 'None Found', weight: 'Medium', score: 0 },
      { factor: 'Network Risk', value: 'HIGH', weight: 'Critical', score: 88 },
    ];

    // Generate a detailed report
    const report = {
      reportId: `RPT-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      generatedBy: 'ScreenGuard AML Engine v1.0',
      
      entity: {
        name: entity.name,
        type: entity.type === 'person' ? 'Individual' : 'Corporate Entity',
        riskLevel: entity.risk.toUpperCase(),
        overallScore: entity.risk === 'sanctioned' ? 100 : entity.risk === 'high' ? 85 : entity.risk === 'medium' ? 60 : 30,
        metadata: entity.metadata,
      },
      
      screeningDetails: entity.type === 'person' ? {
        fullName: entity.name,
        dateOfBirth: entity.metadata?.dob || 'Not provided',
        nationality: entity.metadata?.nationality || 'Unknown',
        passportNumber: 'Not provided',
        nationalId: 'Not provided',
        addressCountry: entity.metadata?.address || 'Unknown',
      } : {
        companyName: entity.name,
        registrationNumber: entity.metadata?.registration || 'Not provided',
        countryOfIncorporation: entity.metadata?.country || 'Unknown',
        incorporationDate: entity.metadata?.founded || 'Unknown',
        registeredAddress: entity.metadata?.address || 'Not provided',
        businessType: entity.metadata?.industry || 'Not classified',
        ultimateBeneficialOwners: entity.metadata?.ubos || ['Information not available'],
        directors: entity.metadata?.directors || ['Information not available'],
      },
      
      sanctionsScreening: {
        listsChecked: ['OFAC SDN', 'UN Consolidated', 'EU Financial Sanctions', 'UK HMT', 'Local Watchlist'],
        matchesFound: entity.risk === 'sanctioned' ? 1 : 0,
        matchedLists: entity.metadata?.lists || [],
        sanctionPrograms: entity.metadata?.programs || [],
      },
      
      riskFactors: entity.type === 'person' ? individualRiskFactors : corporateRiskFactors,
      
      networkAnalysis: {
        totalConnections: entity.connections.length,
        highRiskConnections: entity.connections.filter(id => {
          const conn = entities.find(e => e.id === id);
          return conn && (conn.risk === 'high' || conn.risk === 'sanctioned');
        }).length,
        connectedEntities: entity.connections.map(id => {
          const connected = entities.find(e => e.id === id);
          return connected ? { 
            name: connected.name, 
            type: connected.type === 'person' ? 'Individual' : 'Corporate',
            riskLevel: connected.risk.toUpperCase(),
            relationship: connections.find(c => 
              (c.from === entity.id && c.to === id) || (c.to === entity.id && c.from === id)
            )?.type || 'Associated'
          } : null;
        }).filter(Boolean),
      },
      
      recommendation: {
        action: entity.risk === 'sanctioned' 
          ? 'BLOCK' 
          : entity.risk === 'high' 
          ? 'ESCALATE'
          : entity.risk === 'medium'
          ? 'REVIEW'
          : 'APPROVE',
        description: entity.risk === 'sanctioned' 
          ? 'Entity is on active sanctions list. Transaction must be blocked and reported to compliance.'
          : entity.risk === 'high' 
          ? 'High risk indicators detected. Escalate to senior compliance officer for review.'
          : entity.risk === 'medium'
          ? 'Medium risk indicators present. Enhanced due diligence recommended.'
          : 'Low risk profile. Standard monitoring procedures apply.',
        requiredActions: entity.risk === 'sanctioned' ? [
          'Block all transactions immediately',
          'File Suspicious Activity Report (SAR)',
          'Notify compliance officer',
          'Document decision and rationale',
        ] : entity.risk === 'high' ? [
          'Conduct enhanced due diligence',
          'Verify beneficial ownership',
          'Review adverse media in detail',
          'Escalate to senior reviewer',
        ] : [
          'Continue standard monitoring',
          'Update records as needed',
        ],
      },
      
      auditTrail: {
        screenedBy: 'System - Automated Screening',
        screenedAt: new Date().toISOString(),
        reviewStatus: 'Pending Review',
        caseId: null,
      },
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entity-report-${entity.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setActionLoading(null);
    showToast(`Report generated for ${entity.name}`, 'success');
  };

  const handleExportGraph = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      entities: entities.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        riskLevel: e.risk,
        metadata: e.metadata,
        connectionCount: e.connections.length,
      })),
      connections: connections.map(c => ({
        from: entities.find(e => e.id === c.from)?.name,
        to: entities.find(e => e.id === c.to)?.name,
        type: c.type,
        strength: c.strength,
      })),
      summary: {
        totalEntities: entities.length,
        sanctionedEntities: entities.filter(e => e.risk === 'sanctioned').length,
        highRiskEntities: entities.filter(e => e.risk === 'high').length,
        totalConnections: connections.length,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entity-network-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Network graph exported successfully', 'success');
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

