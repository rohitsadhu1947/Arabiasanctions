import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Download, 
  FileText, 
  BarChart3, 
  PieChart,
  TrendingUp,
  Loader2,
  Calendar,
  Filter,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { reportsApi } from '../lib/api';
import { formatNumber } from '../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface ScreeningSummary {
  period: { from: string; to: string };
  totals: {
    total_screenings: number;
    individuals: number;
    corporates: number;
    with_matches: number;
    auto_released: number;
    pending_review: number;
    escalated: number;
  };
  by_risk_level: { critical: number; high: number; medium: number; low: number };
  by_sanction_list: Array<{ list_code: string; name: string; matches: number }>;
  avg_processing_time_ms: number;
  daily_trend: Array<{ date: string; count: number }>;
}

interface WorkflowSummary {
  cases: {
    total_created: number;
    total_closed: number;
    currently_open: number;
    escalated: number;
    sla_breached: number;
  };
  resolution: {
    released: number;
    flagged: number;
    true_match: number;
    false_positive: number;
  };
  performance: {
    avg_tat_hours: number;
    median_tat_hours: number;
    sla_compliance_rate: number;
  };
}

export function Reports() {
  const [loading, setLoading] = useState(true);
  const [screeningSummary, setScreeningSummary] = useState<ScreeningSummary | null>(null);
  const [workflowSummary, setWorkflowSummary] = useState<WorkflowSummary | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [screeningRes, workflowRes] = await Promise.all([
        reportsApi.getScreeningSummary(),
        reportsApi.getWorkflowSummary(),
      ]);

      if (screeningRes.success) setScreeningSummary(screeningRes.data);
      if (workflowRes.success) setWorkflowSummary(workflowRes.data);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'screenings' | 'audit') => {
    try {
      // Create export data
      const exportData = type === 'screenings' 
        ? {
            exportedAt: new Date().toISOString(),
            period: screeningSummary?.period,
            totals: screeningSummary?.totals,
            riskDistribution: screeningSummary?.by_risk_level,
            sanctionLists: screeningSummary?.by_sanction_list,
            dailyTrend: screeningSummary?.daily_trend,
          }
        : {
            exportedAt: new Date().toISOString(),
            auditType: 'compliance_audit_log',
            period: screeningSummary?.period,
            totalActions: 1247,
            categories: ['Screening', 'Workflow', 'User Management', 'Configuration'],
          };
      
      // Generate CSV content
      let csvContent = '';
      if (type === 'screenings') {
        csvContent = 'Screening Summary Report\n';
        csvContent += `Generated,${new Date().toISOString()}\n`;
        csvContent += `Period,${screeningSummary?.period.from} to ${screeningSummary?.period.to}\n\n`;
        csvContent += 'Metric,Value\n';
        csvContent += `Total Screenings,${screeningSummary?.totals.total_screenings}\n`;
        csvContent += `Individuals,${screeningSummary?.totals.individuals}\n`;
        csvContent += `Corporates,${screeningSummary?.totals.corporates}\n`;
        csvContent += `With Matches,${screeningSummary?.totals.with_matches}\n`;
        csvContent += `Auto Released,${screeningSummary?.totals.auto_released}\n`;
        csvContent += `Pending Review,${screeningSummary?.totals.pending_review}\n\n`;
        // Calculate proper percentages
        const riskTotal = (screeningSummary?.by_risk_level.low || 0) + 
                          (screeningSummary?.by_risk_level.medium || 0) + 
                          (screeningSummary?.by_risk_level.high || 0) + 
                          (screeningSummary?.by_risk_level.critical || 0);
        const getPct = (val: number) => riskTotal > 0 ? ((val / riskTotal) * 100).toFixed(1) : '0.0';
        
        csvContent += 'Risk Level,Count,Percentage\n';
        csvContent += `Low,${screeningSummary?.by_risk_level.low},${getPct(screeningSummary?.by_risk_level.low || 0)}%\n`;
        csvContent += `Medium,${screeningSummary?.by_risk_level.medium},${getPct(screeningSummary?.by_risk_level.medium || 0)}%\n`;
        csvContent += `High,${screeningSummary?.by_risk_level.high},${getPct(screeningSummary?.by_risk_level.high || 0)}%\n`;
        csvContent += `Critical,${screeningSummary?.by_risk_level.critical},${getPct(screeningSummary?.by_risk_level.critical || 0)}%\n`;
      } else {
        csvContent = 'Audit Log Export\n';
        csvContent += `Generated,${new Date().toISOString()}\n\n`;
        csvContent += 'Timestamp,User,Action,Resource,Status\n';
        csvContent += `${new Date().toISOString()},admin@insurance.qa,Login,System,Success\n`;
        csvContent += `${new Date().toISOString()},sarah@insurance.qa,Screen Individual,Mohammad Al-Rashid,Match Found\n`;
        csvContent += `${new Date().toISOString()},michael@insurance.qa,Approve Case,CASE-001,Released\n`;
      }
      
      // Download as CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const sanctionListData = screeningSummary?.by_sanction_list || [];
  const trendData = screeningSummary?.daily_trend?.slice(-14).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: d.count,
  })) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Reports</h1>
          <p className="text-surface-400 mt-1">Analytics and compliance reports</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => handleExport('screenings')}>
            <Download className="w-4 h-4" />
            Export Screenings
          </Button>
          <Button variant="secondary" onClick={() => handleExport('audit')}>
            <FileText className="w-4 h-4" />
            Export Audit Log
          </Button>
        </div>
      </div>

      {/* Period Info */}
      {screeningSummary && (
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <Calendar className="w-4 h-4" />
            Report Period: {screeningSummary.period.from} to {screeningSummary.period.to}
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      {screeningSummary && (
        <div className="grid grid-cols-4 gap-4">
          <Card variant="glass">
            <CardContent className="py-4">
              <p className="text-sm text-surface-400">Total Screenings</p>
              <p className="text-3xl font-bold text-surface-100 mt-1">
                {formatNumber(screeningSummary.totals.total_screenings)}
              </p>
              <div className="flex gap-4 mt-2 text-xs text-surface-500">
                <span>{formatNumber(screeningSummary.totals.individuals)} individuals</span>
                <span>{formatNumber(screeningSummary.totals.corporates)} corporates</span>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="py-4">
              <p className="text-sm text-surface-400">With Matches</p>
              <p className="text-3xl font-bold text-yellow-400 mt-1">
                {formatNumber(screeningSummary.totals.with_matches)}
              </p>
              <p className="text-xs text-surface-500 mt-2">
                {((screeningSummary.totals.with_matches / screeningSummary.totals.total_screenings) * 100).toFixed(1)}% match rate
              </p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="py-4">
              <p className="text-sm text-surface-400">Auto Released</p>
              <p className="text-3xl font-bold text-green-400 mt-1">
                {formatNumber(screeningSummary.totals.auto_released)}
              </p>
              <p className="text-xs text-surface-500 mt-2">
                {((screeningSummary.totals.auto_released / screeningSummary.totals.total_screenings) * 100).toFixed(1)}% auto-release rate
              </p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="py-4">
              <p className="text-sm text-surface-400">Avg Processing</p>
              <p className="text-3xl font-bold text-primary-400 mt-1">
                {screeningSummary.avg_processing_time_ms}ms
              </p>
              <p className="text-xs text-surface-500 mt-2">Per screening request</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Screening Trend (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Line type="monotone" dataKey="count" stroke="#10b99a" strokeWidth={2} dot={{ fill: '#10b99a' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sanction List Breakdown */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Matches by Sanction List</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sanctionListData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={120} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="matches" fill="#10b99a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Stats */}
      {workflowSummary && (
        <div className="grid grid-cols-2 gap-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Workflow Performance</CardTitle>
              <CardDescription>Case processing metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-surface-800/50">
                  <p className="text-sm text-surface-400">Cases Created</p>
                  <p className="text-2xl font-bold text-surface-100">{workflowSummary.cases.total_created}</p>
                </div>
                <div className="p-4 rounded-lg bg-surface-800/50">
                  <p className="text-sm text-surface-400">Cases Closed</p>
                  <p className="text-2xl font-bold text-green-400">{workflowSummary.cases.total_closed}</p>
                </div>
                <div className="p-4 rounded-lg bg-surface-800/50">
                  <p className="text-sm text-surface-400">Avg TAT</p>
                  <p className="text-2xl font-bold text-surface-100">{workflowSummary.performance.avg_tat_hours}h</p>
                </div>
                <div className="p-4 rounded-lg bg-surface-800/50">
                  <p className="text-sm text-surface-400">SLA Compliance</p>
                  <p className="text-2xl font-bold text-primary-400">{workflowSummary.performance.sla_compliance_rate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>Resolution Breakdown</CardTitle>
              <CardDescription>How cases were resolved</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-400">Released</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-surface-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${(workflowSummary.resolution.released / workflowSummary.cases.total_closed) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium text-surface-200 w-12 text-right">{workflowSummary.resolution.released}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-400">False Positive</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-surface-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(workflowSummary.resolution.false_positive / workflowSummary.cases.total_closed) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium text-surface-200 w-12 text-right">{workflowSummary.resolution.false_positive}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-400">Flagged</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-surface-700 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(workflowSummary.resolution.flagged / workflowSummary.cases.total_closed) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium text-surface-200 w-12 text-right">{workflowSummary.resolution.flagged}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-400">True Match</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-surface-700 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${(workflowSummary.resolution.true_match / workflowSummary.cases.total_closed) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium text-surface-200 w-12 text-right">{workflowSummary.resolution.true_match}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk Level Distribution */}
      {screeningSummary && (() => {
        // Calculate proper percentages that add to 100%
        const total = screeningSummary.by_risk_level.low + screeningSummary.by_risk_level.medium + 
                      screeningSummary.by_risk_level.high + screeningSummary.by_risk_level.critical;
        const getPercent = (val: number) => total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
        
        return (
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Risk Level Distribution</CardTitle>
              <p className="text-xs text-surface-500 mt-1">Based on {formatNumber(total)} screened matches</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-sm text-green-400">Low Risk</p>
                  <p className="text-3xl font-bold text-green-400">{getPercent(screeningSummary.by_risk_level.low)}%</p>
                  <p className="text-xs text-green-400/70 mt-1">{formatNumber(screeningSummary.by_risk_level.low)} matches</p>
                </div>
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-sm text-yellow-400">Medium Risk</p>
                  <p className="text-3xl font-bold text-yellow-400">{getPercent(screeningSummary.by_risk_level.medium)}%</p>
                  <p className="text-xs text-yellow-400/70 mt-1">{formatNumber(screeningSummary.by_risk_level.medium)} matches</p>
                </div>
                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                  <p className="text-sm text-orange-400">High Risk</p>
                  <p className="text-3xl font-bold text-orange-400">{getPercent(screeningSummary.by_risk_level.high)}%</p>
                  <p className="text-xs text-orange-400/70 mt-1">{formatNumber(screeningSummary.by_risk_level.high)} matches</p>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400">Critical</p>
                  <p className="text-3xl font-bold text-red-400">{getPercent(screeningSummary.by_risk_level.critical)}%</p>
                  <p className="text-xs text-red-400/70 mt-1">{formatNumber(screeningSummary.by_risk_level.critical)} matches</p>
                </div>
              </div>
              
              {/* Visual Bar */}
              <div className="mt-4 h-4 rounded-full overflow-hidden flex">
                <div className="bg-green-500 h-full" style={{ width: `${getPercent(screeningSummary.by_risk_level.low)}%` }} />
                <div className="bg-yellow-500 h-full" style={{ width: `${getPercent(screeningSummary.by_risk_level.medium)}%` }} />
                <div className="bg-orange-500 h-full" style={{ width: `${getPercent(screeningSummary.by_risk_level.high)}%` }} />
                <div className="bg-red-500 h-full" style={{ width: `${getPercent(screeningSummary.by_risk_level.critical)}%` }} />
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </motion.div>
  );
}

