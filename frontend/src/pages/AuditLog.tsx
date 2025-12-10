import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { 
  Shield, 
  Search, 
  Download, 
  Filter, 
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  FileText,
  Settings,
  LogIn,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn, formatDateTime } from '../lib/utils';
import { motion } from 'framer-motion';
import { adminApi } from '../lib/api';

interface AuditLog {
  id: string;
  timestamp: string;
  category: string;
  action: string;
  user_id: number | null;
  user_email: string | null;
  user_name: string | null;
  ip_address: string | null;
  country_code: string | null;
  resource_type: string | null;
  resource_id: string | null;
  resource_name: string | null;
  details: Record<string, any>;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
}

interface AuditStats {
  total_events: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  success_rate: number;
  top_users: Array<{ email: string; count: number }>;
}

const categoryIcons: Record<string, any> = {
  authentication: LogIn,
  screening: Search,
  workflow: Activity,
  decision: CheckCircle,
  configuration: Settings,
  user_management: User,
  export: Download,
  import: FileText,
  system: Shield,
};

const categoryColors: Record<string, string> = {
  authentication: 'bg-blue-500/10 text-blue-400',
  screening: 'bg-primary-500/10 text-primary-400',
  workflow: 'bg-purple-500/10 text-purple-400',
  decision: 'bg-green-500/10 text-green-400',
  configuration: 'bg-yellow-500/10 text-yellow-400',
  user_management: 'bg-orange-500/10 text-orange-400',
  export: 'bg-cyan-500/10 text-cyan-400',
  import: 'bg-indigo-500/10 text-indigo-400',
  system: 'bg-surface-500/10 text-surface-400',
};

const statusColors: Record<string, string> = {
  success: 'bg-green-500/10 text-green-400 border-green-500/30',
  failure: 'bg-red-500/10 text-red-400 border-red-500/30',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
};

export function AuditLog() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, [page, categoryFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        adminApi.getAuditLogs({
          page,
          page_size: 20,
          category: categoryFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        adminApi.getAuditStats(),
      ]);

      if (logsRes.success) {
        setLogs(logsRes.data);
        setTotalPages(logsRes.pagination.total_pages);
        setTotalItems(logsRes.pagination.total_items);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const blob = await adminApi.exportAuditLogs(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !logs.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Audit Log</h1>
          <p className="text-surface-400 mt-1">Complete activity trail for compliance and security</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => handleExport('csv')} disabled={exporting}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => handleExport('json')} disabled={exporting}>
            <Download className="w-4 h-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Total Events</p>
                <p className="text-2xl font-bold text-surface-100 mt-0.5">{stats.total_events.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-400" />
              </div>
            </div>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Success Rate</p>
                <p className="text-2xl font-bold text-green-400 mt-0.5">{stats.success_rate}%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Screenings</p>
                <p className="text-2xl font-bold text-surface-100 mt-0.5">{stats.by_category.screening || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Workflow Actions</p>
                <p className="text-2xl font-bold text-surface-100 mt-0.5">{stats.by_category.workflow || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Failed Events</p>
                <p className="text-2xl font-bold text-red-400 mt-0.5">{stats.by_status.failure || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card variant="glass">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by user, resource, or action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              <option value="authentication">Authentication</option>
              <option value="screening">Screening</option>
              <option value="workflow">Workflow</option>
              <option value="decision">Decision</option>
              <option value="configuration">Configuration</option>
              <option value="user_management">User Management</option>
              <option value="export">Export</option>
              <option value="import">Import</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="warning">Warning</option>
            </select>
            <Button onClick={handleSearch}>
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Logs List */}
        <Card variant="glass" className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>{totalItems.toLocaleString()} total events</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.map((log) => {
                const IconComponent = categoryIcons[log.category] || Activity;
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={cn(
                      'p-4 rounded-lg cursor-pointer transition-all border',
                      selectedLog?.id === log.id
                        ? 'bg-primary-600/10 border-primary-500/30'
                        : 'bg-surface-800/30 border-transparent hover:bg-surface-800/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', categoryColors[log.category] || categoryColors.system)}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-surface-200 capitalize">{log.action.replace(/_/g, ' ')}</span>
                          <span className={cn(
                            'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border',
                            statusColors[log.status] || statusColors.success
                          )}>
                            {log.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-surface-500">
                          {log.user_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {log.user_name}
                            </span>
                          )}
                          {log.resource_name && (
                            <span className="truncate">{log.resource_name}</span>
                          )}
                          {log.duration_ms && (
                            <span>{log.duration_ms}ms</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-surface-500">{formatDateTime(log.timestamp)}</span>
                        {log.country_code && (
                          <div className="text-xs text-surface-600 mt-0.5">{log.country_code}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {logs.length === 0 && (
                <div className="text-center py-12 text-surface-500">
                  No audit logs found
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-800">
                <span className="text-sm text-surface-500">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedLog ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-surface-500 uppercase tracking-wide">Event ID</label>
                    <p className="text-sm font-mono text-surface-300 mt-0.5">{selectedLog.id}</p>
                  </div>
                  <div>
                    <label className="text-xs text-surface-500 uppercase tracking-wide">Timestamp</label>
                    <p className="text-sm text-surface-300 mt-0.5">{formatDateTime(selectedLog.timestamp)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-surface-500 uppercase tracking-wide">Category</label>
                    <p className="text-sm text-surface-300 mt-0.5 capitalize">{selectedLog.category}</p>
                  </div>
                  <div>
                    <label className="text-xs text-surface-500 uppercase tracking-wide">Action</label>
                    <p className="text-sm text-surface-300 mt-0.5 capitalize">{selectedLog.action.replace(/_/g, ' ')}</p>
                  </div>
                  {selectedLog.user_email && (
                    <div>
                      <label className="text-xs text-surface-500 uppercase tracking-wide">User</label>
                      <p className="text-sm text-surface-300 mt-0.5">{selectedLog.user_name}</p>
                      <p className="text-xs text-surface-500">{selectedLog.user_email}</p>
                    </div>
                  )}
                  {selectedLog.ip_address && (
                    <div>
                      <label className="text-xs text-surface-500 uppercase tracking-wide">IP Address</label>
                      <p className="text-sm font-mono text-surface-300 mt-0.5">{selectedLog.ip_address}</p>
                    </div>
                  )}
                  {selectedLog.resource_type && (
                    <div>
                      <label className="text-xs text-surface-500 uppercase tracking-wide">Resource</label>
                      <p className="text-sm text-surface-300 mt-0.5">{selectedLog.resource_type}: {selectedLog.resource_id}</p>
                      {selectedLog.resource_name && (
                        <p className="text-xs text-surface-500">{selectedLog.resource_name}</p>
                      )}
                    </div>
                  )}
                  {selectedLog.error_message && (
                    <div>
                      <label className="text-xs text-surface-500 uppercase tracking-wide">Error</label>
                      <p className="text-sm text-red-400 mt-0.5">{selectedLog.error_message}</p>
                    </div>
                  )}
                </div>

                {Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <label className="text-xs text-surface-500 uppercase tracking-wide">Details</label>
                    <pre className="mt-1 p-3 bg-surface-900/50 rounded-lg text-xs text-surface-400 overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-surface-500">
                Select an event to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

