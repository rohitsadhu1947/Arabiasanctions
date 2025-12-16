import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, AlertTriangle, Clock,
  ChevronRight, ArrowUpRight, ArrowDownRight,
  Target, Zap, BarChart3, PieChart, Bell,
  Layers, Check, X, Download, Settings
} from 'lucide-react';

// Toast component
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
      {type === 'info' && <Bell className="w-5 h-5 text-white" />}
      <span className="text-white font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/70 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// Demo metrics
const METRICS = {
  totalScreened: 15847,
  matchesFound: 234,
  pendingReview: 45,
  avgResponseTime: '1.2s',
  truePositiveRate: 94.2,
  falsePositiveRate: 5.8,
  todayScreenings: 892,
  todayMatches: 12,
};

const RISK_DISTRIBUTION = [
  { label: 'Critical', value: 23, color: '#ef4444' },
  { label: 'High', value: 45, color: '#f97316' },
  { label: 'Medium', value: 89, color: '#eab308' },
  { label: 'Low', value: 77, color: '#22c55e' },
];

const RECENT_ALERTS = [
  { id: 1, name: 'Mohammad Al-Rashid', score: 98, list: 'OFAC SDN', time: '2 min ago', status: 'pending' },
  { id: 2, name: 'Gulf Trading LLC', score: 87, list: 'UN Consolidated', time: '15 min ago', status: 'pending' },
  { id: 3, name: 'Ahmed Hassan', score: 76, list: 'EU Sanctions', time: '1 hour ago', status: 'reviewing' },
  { id: 4, name: 'Horizon Investments', score: 65, list: 'Local Watchlist', time: '2 hours ago', status: 'cleared' },
  { id: 5, name: 'Fatima Al-Hassan', score: 45, list: 'OFAC SDN', time: '3 hours ago', status: 'cleared' },
];

const LIST_COVERAGE = [
  // US Lists
  { name: 'OFAC SDN', entries: 12453, coverage: 100, lastUpdate: '2 hours ago', category: 'US' },
  { name: 'OFAC Consolidated', entries: 3892, coverage: 100, lastUpdate: '2 hours ago', category: 'US' },
  { name: 'BIS Entity List', entries: 1456, coverage: 100, lastUpdate: '1 day ago', category: 'US' },
  // UN Lists
  { name: 'UN Consolidated', entries: 8234, coverage: 100, lastUpdate: '4 hours ago', category: 'UN' },
  // EU Lists  
  { name: 'EU Financial', entries: 6789, coverage: 100, lastUpdate: '1 day ago', category: 'EU' },
  { name: 'EU Terrorist List', entries: 892, coverage: 100, lastUpdate: '1 day ago', category: 'EU' },
  // UK Lists
  { name: 'UK HMT', entries: 4532, coverage: 100, lastUpdate: '6 hours ago', category: 'UK' },
  { name: 'UK OFSI', entries: 4201, coverage: 100, lastUpdate: '6 hours ago', category: 'UK' },
  // International
  { name: 'Interpol Red Notices', entries: 7823, coverage: 95, lastUpdate: '1 day ago', category: 'Intl' },
  { name: 'World Bank Debarred', entries: 1234, coverage: 100, lastUpdate: '3 days ago', category: 'Intl' },
  { name: 'FATF High-Risk', entries: 23, coverage: 100, lastUpdate: '1 week ago', category: 'Intl' },
  // PEP & Media
  { name: 'PEP Global', entries: 45678, coverage: 98, lastUpdate: '12 hours ago', category: 'PEP' },
  { name: 'Adverse Media', entries: 125000, coverage: 95, lastUpdate: 'Real-time', category: 'Media' },
  // GCC Local
  { name: 'Qatar FIU', entries: 89, coverage: 100, lastUpdate: '1 hour ago', category: 'GCC' },
  { name: 'UAE NAMLCFTC', entries: 156, coverage: 100, lastUpdate: '2 hours ago', category: 'GCC' },
  { name: 'Saudi SAFIU', entries: 234, coverage: 100, lastUpdate: '3 hours ago', category: 'GCC' },
];

export default function InvestigationDashboard() {
  const [timeRange, setTimeRange] = useState('24h');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [alerts, setAlerts] = useState(RECENT_ALERTS);
  const navigate = useNavigate();

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleConfigureAlerts = () => {
    showToast('Opening alert configuration...', 'info');
    navigate('/admin/settings');
  };

  const handleViewAllAlerts = () => {
    navigate('/workflow');
  };

  const handleAlertClick = (alert: typeof RECENT_ALERTS[0]) => {
    if (alert.status === 'pending') {
      // Mark as reviewing
      setAlerts(prev => prev.map(a => 
        a.id === alert.id ? { ...a, status: 'reviewing' } : a
      ));
      showToast(`Now reviewing: ${alert.name}`, 'info');
    } else {
      navigate('/workflow');
    }
  };

  const handleExportMetrics = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      timeRange,
      metrics: METRICS,
      riskDistribution: RISK_DISTRIBUTION,
      listCoverage: LIST_COVERAGE,
      alerts: alerts,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aml-metrics-${timeRange}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Metrics exported successfully', 'success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Investigation Command Center</h1>
            <p className="text-slate-400">Real-time AML monitoring • Powered by AI-driven analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button 
              onClick={handleExportMetrics}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button 
              onClick={handleConfigureAlerts}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-violet-400" />
              </div>
              <span className="text-green-400 text-sm flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" /> +12.5%
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{METRICS.totalScreened.toLocaleString()}</p>
            <p className="text-slate-400 text-sm">Total Screenings</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <span className="text-red-400 text-sm flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" /> +3.2%
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{METRICS.matchesFound}</p>
            <p className="text-slate-400 text-sm">Matches Found</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-yellow-400 text-sm">Requires attention</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{METRICS.pendingReview}</p>
            <p className="text-slate-400 text-sm">Pending Review</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-green-400 text-sm flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4" /> -0.3s
              </span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{METRICS.avgResponseTime}</p>
            <p className="text-slate-400 text-sm">Avg Response Time</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Risk Distribution */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <PieChart className="w-5 h-5 text-violet-400" />
                Risk Distribution
              </h3>
            </div>
            
            {/* Visual Pie Chart */}
            <div className="relative w-48 h-48 mx-auto mb-6">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {(() => {
                  const total = RISK_DISTRIBUTION.reduce((sum, item) => sum + item.value, 0);
                  let currentAngle = 0;
                  return RISK_DISTRIBUTION.map((item, i) => {
                    const angle = (item.value / total) * 360;
                    const startAngle = currentAngle;
                    currentAngle += angle;
                    
                    const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                    const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                    const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
                    const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
                    const largeArc = angle > 180 ? 1 : 0;
                    
                    return (
                      <path
                        key={i}
                        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={item.color}
                        opacity={0.8}
                        className="hover:opacity-100 transition-opacity cursor-pointer"
                      />
                    );
                  });
                })()}
                <circle cx="50" cy="50" r="25" fill="#0f172a" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{RISK_DISTRIBUTION.reduce((s, i) => s + i.value, 0)}</p>
                  <p className="text-slate-400 text-xs">Total Matches</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {RISK_DISTRIBUTION.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 text-sm">{item.label}</span>
                  </div>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Alerts */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-violet-400" />
                Recent Alerts
              </h3>
              <button 
                onClick={handleViewAllAlerts}
                className="text-violet-400 text-sm hover:text-violet-300 transition-colors"
              >
                View All →
              </button>
            </div>
            
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <motion.div 
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  onClick={() => handleAlertClick(alert)}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      alert.score >= 90 ? 'bg-red-500/20' :
                      alert.score >= 70 ? 'bg-orange-500/20' :
                      alert.score >= 50 ? 'bg-yellow-500/20' : 'bg-green-500/20'
                    }`}>
                      <span className={`text-lg font-bold ${
                        alert.score >= 90 ? 'text-red-400' :
                        alert.score >= 70 ? 'text-orange-400' :
                        alert.score >= 50 ? 'text-yellow-400' : 'text-green-400'
                      }`}>{alert.score}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{alert.name}</p>
                      <p className="text-slate-400 text-sm">{alert.list} • {alert.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      alert.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      alert.status === 'reviewing' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {alert.status}
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-2 gap-6">
          {/* Accuracy Metrics */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-white font-semibold flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-violet-400" />
              Model Performance
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle 
                      cx="50" cy="50" r="40" fill="none" 
                      stroke="#22c55e" strokeWidth="8"
                      strokeDasharray={`${METRICS.truePositiveRate * 2.51} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{METRICS.truePositiveRate}%</p>
                    </div>
                  </div>
                </div>
                <p className="text-white font-medium">True Positive Rate</p>
                <p className="text-slate-400 text-sm">Correctly identified matches</p>
              </div>
              
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle 
                      cx="50" cy="50" r="40" fill="none" 
                      stroke="#ef4444" strokeWidth="8"
                      strokeDasharray={`${METRICS.falsePositiveRate * 2.51} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">{METRICS.falsePositiveRate}%</p>
                    </div>
                  </div>
                </div>
                <p className="text-white font-medium">False Positive Rate</p>
                <p className="text-slate-400 text-sm">Incorrectly flagged entries</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Model Confidence</span>
                <span className="text-green-400 font-medium">High (97.2%)</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-400">Last Retrained</span>
                <span className="text-white">Dec 15, 2024</span>
              </div>
            </div>
          </motion.div>

          {/* List Coverage */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-violet-400" />
                Sanctions List Coverage
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                  {LIST_COVERAGE.length} Lists Active
                </span>
                <button
                  onClick={() => navigate('/admin/lists')}
                  className="text-violet-400 text-sm hover:text-violet-300 transition-colors flex items-center gap-1"
                >
                  Manage <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-white">{LIST_COVERAGE.filter(l => l.category === 'US').length}</p>
                <p className="text-xs text-slate-400">US Lists</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-white">{LIST_COVERAGE.filter(l => ['UN', 'EU', 'UK'].includes(l.category)).length}</p>
                <p className="text-xs text-slate-400">Intl Lists</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-white">{LIST_COVERAGE.filter(l => l.category === 'GCC').length}</p>
                <p className="text-xs text-slate-400">GCC Lists</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-white">{LIST_COVERAGE.reduce((sum, l) => sum + l.entries, 0).toLocaleString()}</p>
                <p className="text-xs text-slate-400">Total Records</p>
              </div>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {LIST_COVERAGE.map((list, i) => (
                <div 
                  key={i} 
                  onClick={() => {
                    showToast(`Opening ${list.name}...`, 'info');
                    navigate('/admin/lists');
                  }}
                  className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${list.coverage === 100 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="text-white text-sm font-medium group-hover:text-violet-300 transition-colors">{list.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        list.category === 'US' ? 'bg-blue-500/20 text-blue-400' :
                        list.category === 'UN' ? 'bg-cyan-500/20 text-cyan-400' :
                        list.category === 'EU' ? 'bg-indigo-500/20 text-indigo-400' :
                        list.category === 'UK' ? 'bg-purple-500/20 text-purple-400' :
                        list.category === 'GCC' ? 'bg-emerald-500/20 text-emerald-400' :
                        list.category === 'PEP' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>{list.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">{list.entries.toLocaleString()}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${list.coverage === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${list.coverage}%` }}
                      />
                    </div>
                    <span className="text-slate-500 text-[10px] w-16 text-right">{list.lastUpdate}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

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
  );
}

