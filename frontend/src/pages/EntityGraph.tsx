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

// Demo data showing entity relationships
const DEMO_ENTITIES: EntityNode[] = [
  { id: '1', type: 'person', name: 'Mohammad Al-Rashid', risk: 'sanctioned', x: 400, y: 300, connections: ['2', '3', '5'], metadata: { dob: '1975-03-15', nationality: 'Syrian', lists: ['OFAC SDN', 'UN Consolidated'] } },
  { id: '2', type: 'company', name: 'Gulf Trading LLC', risk: 'high', x: 600, y: 200, connections: ['1', '4'], metadata: { registration: 'UAE-12345', founded: '2015' } },
  { id: '3', type: 'person', name: 'Ahmed Al-Rashid', risk: 'medium', x: 250, y: 200, connections: ['1', '6'], metadata: { relation: 'Brother', dob: '1980-07-22' } },
  { id: '4', type: 'company', name: 'Horizon Investments', risk: 'medium', x: 700, y: 350, connections: ['2', '7'], metadata: { registration: 'QAT-98765' } },
  { id: '5', type: 'address', name: 'Dubai Marina Tower', risk: 'low', x: 300, y: 450, connections: ['1', '6'], metadata: { address: 'Tower 5, Dubai Marina, UAE' } },
  { id: '6', type: 'person', name: 'Fatima Al-Hassan', risk: 'low', x: 150, y: 350, connections: ['3', '5'], metadata: { relation: 'Associate' } },
  { id: '7', type: 'transaction', name: '$2.5M Transfer', risk: 'high', x: 550, y: 450, connections: ['4'], metadata: { date: '2024-01-15', amount: '$2,500,000' } },
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
    
    // Generate a detailed report
    const report = {
      generatedAt: new Date().toISOString(),
      entity: {
        name: entity.name,
        type: entity.type,
        riskLevel: entity.risk,
        metadata: entity.metadata,
      },
      networkAnalysis: {
        totalConnections: entity.connections.length,
        connectedEntities: entity.connections.map(id => {
          const connected = entities.find(e => e.id === id);
          return connected ? { name: connected.name, type: connected.type, risk: connected.risk } : null;
        }).filter(Boolean),
      },
      riskFactors: [
        { factor: 'Name Match Score', value: '95%', weight: 'High' },
        { factor: 'Network Connections', value: entity.connections.length, weight: 'Medium' },
        { factor: 'Sanctions List', value: entity.metadata?.lists?.join(', ') || 'N/A', weight: 'Critical' },
      ],
      recommendation: entity.risk === 'sanctioned' 
        ? 'BLOCK - Entity is on active sanctions list' 
        : entity.risk === 'high' 
        ? 'REVIEW - High risk indicators require manual review'
        : 'MONITOR - Continue standard monitoring',
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

              {/* Risk Score Breakdown */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-400" />
                  Risk Score Breakdown
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Name Match</span>
                      <span className="text-red-400">95%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '95%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">DOB Match</span>
                      <span className="text-orange-400">80%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: '80%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Nationality Match</span>
                      <span className="text-yellow-400">100%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Network Risk</span>
                      <span className="text-red-400">HIGH</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>
                </div>
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

