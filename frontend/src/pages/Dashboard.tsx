import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Users,
  FileCheck,
  Activity,
  Loader2,
} from 'lucide-react';
import { cn, formatNumber } from '../lib/utils';
import { motion } from 'framer-motion';
import { reportsApi, workflowApi } from '../lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardStats {
  totals: {
    total_screenings: number;
    with_matches: number;
    auto_released: number;
    pending_review: number;
  };
  by_risk_level: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  daily_trend: Array<{ date: string; count: number }>;
}

interface WorkflowStats {
  open_cases: number;
  in_progress_cases: number;
  pending_approval: number;
  escalated_cases: number;
  sla_breached_count: number;
  avg_tat_hours: number;
}

interface CountryData {
  country_code: string;
  country_name: string;
  total_screenings: number;
  with_matches: number;
  pending_cases: number;
}

const countryFlags: Record<string, string> = {
  UAE: '🇦🇪',
  SAU: '🇸🇦',
  KWT: '🇰🇼',
  BHR: '🇧🇭',
  OMN: '🇴🇲',
  QAT: '🇶🇦',
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats | null>(null);
  const [countryData, setCountryData] = useState<CountryData[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [screeningRes, workflowRes, countryRes] = await Promise.all([
        reportsApi.getScreeningSummary(),
        workflowApi.getDashboard(),
        reportsApi.getCountryBreakdown(),
      ]);

      if (screeningRes.success) setStats(screeningRes.data);
      if (workflowRes.success) setWorkflowStats(workflowRes.data);
      if (countryRes.success) setCountryData(countryRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // Calculate percentages from raw counts
  const riskDistribution = stats ? (() => {
    const total = (stats.by_risk_level.low || 0) + 
                  (stats.by_risk_level.medium || 0) + 
                  (stats.by_risk_level.high || 0) + 
                  (stats.by_risk_level.critical || 0);
    
    const getPercent = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;
    
    return [
      { name: 'Low', value: getPercent(stats.by_risk_level.low || 0), count: stats.by_risk_level.low || 0, color: '#10b981' },
      { name: 'Medium', value: getPercent(stats.by_risk_level.medium || 0), count: stats.by_risk_level.medium || 0, color: '#f59e0b' },
      { name: 'High', value: getPercent(stats.by_risk_level.high || 0), count: stats.by_risk_level.high || 0, color: '#ef4444' },
      { name: 'Critical', value: getPercent(stats.by_risk_level.critical || 0), count: stats.by_risk_level.critical || 0, color: '#dc2626' },
    ];
  })() : [];

  const screeningTrend = stats?.daily_trend?.slice(-7).map((d, i) => ({
    date: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i % 7],
    screenings: d.count,
    matches: Math.floor(d.count * 0.05),
  })) || [];

  const statCards = [
    { 
      name: 'Total Screenings', 
      value: stats?.totals.total_screenings || 0, 
      change: 12.5, 
      icon: Search, 
      trend: 'up' as const 
    },
    { 
      name: 'Pending Review', 
      value: stats?.totals.pending_review || 0, 
      change: -8.2, 
      icon: Clock, 
      trend: 'down' as const,
      onClick: () => navigate('/workflow')
    },
    { 
      name: 'Open Cases', 
      value: workflowStats?.open_cases || 0, 
      change: 15.3, 
      icon: AlertTriangle, 
      trend: 'up' as const,
      isAlert: true,
      onClick: () => navigate('/workflow')
    },
    { 
      name: 'Auto Released', 
      value: stats?.totals.auto_released || 0, 
      change: 5.1, 
      icon: CheckCircle, 
      trend: 'up' as const 
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Dashboard</h1>
          <p className="text-surface-400 mt-1">Real-time overview of screening operations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/reports')}>
            <FileCheck className="w-4 h-4" />
            Generate Report
          </Button>
          <Button onClick={() => navigate('/screening')}>
            <Search className="w-4 h-4" />
            New Screening
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card 
            key={stat.name} 
            variant="glass" 
            className={cn("relative overflow-hidden", stat.onClick && "cursor-pointer hover:border-primary-500/50")}
            onClick={stat.onClick}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-surface-400">{stat.name}</p>
                <p className="text-2xl font-bold text-surface-100 mt-1">
                  {formatNumber(stat.value)}
                </p>
                <div className={cn(
                  'flex items-center gap-1 mt-2 text-sm',
                  stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                )}>
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span>{Math.abs(stat.change)}%</span>
                  <span className="text-surface-500">vs last week</span>
                </div>
              </div>
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                stat.isAlert 
                  ? 'bg-red-500/10 text-red-400' 
                  : 'bg-primary-500/10 text-primary-400'
              )}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary-500/10 to-transparent rounded-full blur-2xl" />
          </Card>
        ))}
      </motion.div>

      {/* Workflow Quick Stats */}
      {workflowStats && (
        <motion.div variants={item} className="grid grid-cols-6 gap-4">
          <Card variant="glass" className="py-3 px-4 cursor-pointer hover:border-primary-500/50" onClick={() => navigate('/workflow')}>
            <p className="text-xs text-surface-500 uppercase">In Progress</p>
            <p className="text-xl font-bold text-surface-100">{workflowStats.in_progress_cases}</p>
          </Card>
          <Card variant="glass" className="py-3 px-4 cursor-pointer hover:border-primary-500/50" onClick={() => navigate('/workflow')}>
            <p className="text-xs text-surface-500 uppercase">Pending Approval</p>
            <p className="text-xl font-bold text-surface-100">{workflowStats.pending_approval}</p>
          </Card>
          <Card variant="glass" className="py-3 px-4 cursor-pointer hover:border-primary-500/50" onClick={() => navigate('/workflow')}>
            <p className="text-xs text-surface-500 uppercase">Escalated</p>
            <p className="text-xl font-bold text-orange-400">{workflowStats.escalated_cases}</p>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <p className="text-xs text-surface-500 uppercase">SLA Breached</p>
            <p className="text-xl font-bold text-red-400">{workflowStats.sla_breached_count}</p>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <p className="text-xs text-surface-500 uppercase">Avg TAT</p>
            <p className="text-xl font-bold text-surface-100">{workflowStats.avg_tat_hours}h</p>
          </Card>
          <Card variant="glass" className="py-3 px-4 cursor-pointer hover:border-primary-500/50" onClick={() => navigate('/workflow')}>
            <p className="text-xs text-surface-500 uppercase">View All</p>
            <p className="text-xl font-bold text-primary-400">→</p>
          </Card>
        </motion.div>
      )}

      {/* Charts Row */}
      <motion.div variants={item} className="grid grid-cols-3 gap-6">
        {/* Screening Trend */}
        <Card variant="glass" className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Screening Activity</CardTitle>
                <CardDescription>Daily screenings vs matches over the past week</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                  <span className="text-surface-400">Screenings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-surface-400">Matches</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={screeningTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="screeningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b99a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b99a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="matchesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }} 
                />
                <Area type="monotone" dataKey="screenings" stroke="#10b99a" strokeWidth={2} fill="url(#screeningsGradient)" />
                <Area type="monotone" dataKey="matches" stroke="#f59e0b" strokeWidth={2} fill="url(#matchesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Current screening results by risk level</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} 
                  formatter={(value: number, name: string, props: any) => {
                    const item = riskDistribution.find(d => d.name === props.payload.name);
                    return [`${value}% (${item?.count || 0} matches)`, props.payload.name];
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="grid grid-cols-2 gap-2 mt-2 px-2">
            {riskDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-surface-400">{item.name}</span>
                <span className="text-surface-200 font-medium ml-auto">{item.value}%</span>
                <span className="text-surface-500 text-xs">({item.count})</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Country Breakdown */}
      <motion.div variants={item}>
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>GCC Coverage</CardTitle>
                <CardDescription>Screening activity by country</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>View Report</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {countryData.map((country) => (
                <div key={country.country_code} className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/30">
                  <span className="text-2xl">{countryFlags[country.country_code] || '🏳️'}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-surface-200">{country.country_name}</span>
                      <span className="text-sm text-surface-400">{formatNumber(country.total_screenings)}</span>
                    </div>
                    <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                        style={{ width: `${Math.min((country.total_screenings / 5500) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-surface-500">{country.with_matches} matches</span>
                      <span className="text-xs text-yellow-500">{country.pending_cases} pending</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
