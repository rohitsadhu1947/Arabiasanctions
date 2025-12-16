import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, AlertTriangle, TrendingUp, Clock, Users, Globe,
  ChevronRight, ArrowUpRight, ArrowDownRight, Activity,
  Target, Zap, BarChart3, PieChart, Bell, CheckCircle2,
  XCircle, Eye, FileSearch, Layers
} from 'lucide-react';

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
  { name: 'OFAC SDN', entries: 12453, coverage: 100, lastUpdate: '2 hours ago' },
  { name: 'UN Consolidated', entries: 8234, coverage: 100, lastUpdate: '4 hours ago' },
  { name: 'EU Financial', entries: 6789, coverage: 100, lastUpdate: '1 day ago' },
  { name: 'UK HMT', entries: 4532, coverage: 95, lastUpdate: '2 days ago' },
  { name: 'Qatar Local', entries: 156, coverage: 100, lastUpdate: '1 hour ago' },
];

export default function InvestigationDashboard() {
  const [timeRange, setTimeRange] = useState('24h');

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
            <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
              <Bell className="w-4 h-4" />
              Configure Alerts
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
              <button className="text-violet-400 text-sm hover:text-violet-300 transition-colors">
                View All →
              </button>
            </div>
            
            <div className="space-y-3">
              {RECENT_ALERTS.map((alert, i) => (
                <motion.div 
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
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
            <h3 className="text-white font-semibold flex items-center gap-2 mb-6">
              <Layers className="w-5 h-5 text-violet-400" />
              Sanctions List Coverage
            </h3>
            
            <div className="space-y-4">
              {LIST_COVERAGE.map((list, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${list.coverage === 100 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="text-white font-medium">{list.name}</span>
                    </div>
                    <span className="text-slate-400 text-sm">{list.entries.toLocaleString()} entries</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${list.coverage === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${list.coverage}%` }}
                      />
                    </div>
                    <span className="text-slate-400 text-xs">Updated {list.lastUpdate}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

