import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { 
  Calendar,
  Play,
  Pause,
  Clock,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileText,
  Settings,
  Download,
  Loader2,
  Users,
  Shield,
  ChevronRight,
  XCircle,
  X,
  Save,
  Eye,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface BatchJob {
  id: string;
  name: string;
  type: 'daily_all' | 'new_lists' | 'cleared_entries' | 'custom';
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'paused';
  schedule: string;
  lastRun: string;
  nextRun: string;
  entitiesProcessed: number;
  matchesFound: number;
  newMatches: number;
  clearedMatches: number;
  duration: string;
}

interface ListUpdate {
  code: string;
  name: string;
  lastUpdated: string;
  entriesAdded: number;
  entriesRemoved: number;
  totalEntries: number;
}

interface DetectedChange {
  id: string;
  type: 'new_match' | 'cleared' | 'pep_alert';
  title: string;
  description: string;
  entity: string;
  timestamp: string;
}

// Consistent with Reports API: 15,847 total monthly screenings
// Customer database: 48,234 across GCC
// Daily screenings: ~550-650 per day
const DEMO_BATCH_JOBS: BatchJob[] = [
  {
    id: 'BATCH-001',
    name: 'Daily Full Screening',
    type: 'daily_all',
    status: 'completed',
    schedule: '02:00 AM Daily',
    lastRun: '2024-12-16T02:00:00Z',
    nextRun: '2024-12-17T02:00:00Z',
    entitiesProcessed: 48234,  // Full customer database
    matchesFound: 156,         // Active matches requiring review
    newMatches: 8,
    clearedMatches: 3,
    duration: '1h 45m',
  },
  {
    id: 'BATCH-002',
    name: 'New List Updates Check',
    type: 'new_lists',
    status: 'scheduled',
    schedule: '06:00 AM Daily',
    lastRun: '2024-12-16T06:00:00Z',
    nextRun: '2024-12-17T06:00:00Z',
    entitiesProcessed: 48234,  // Re-screen against new list entries only
    matchesFound: 5,
    newMatches: 5,
    clearedMatches: 0,
    duration: '32m',
  },
  {
    id: 'BATCH-003',
    name: 'Cleared Entries Detection',
    type: 'cleared_entries',
    status: 'completed',
    schedule: '04:00 AM Daily',
    lastRun: '2024-12-16T04:00:00Z',
    nextRun: '2024-12-17T04:00:00Z',
    entitiesProcessed: 156,    // Only existing matches
    matchesFound: 0,
    newMatches: 0,
    clearedMatches: 3,
    duration: '8m',
  },
  {
    id: 'BATCH-004',
    name: 'Qatar Custom Watchlist Screening',
    type: 'custom',
    status: 'running',
    schedule: 'Every 4 hours',
    lastRun: '2024-12-16T14:00:00Z',
    nextRun: '2024-12-16T18:00:00Z',
    entitiesProcessed: 2834,   // Qatar customers only
    matchesFound: 23,
    newMatches: 2,
    clearedMatches: 0,
    duration: '18m',
  },
];

const DEMO_LIST_UPDATES: ListUpdate[] = [
  { code: 'OFAC_SDN', name: 'OFAC SDN', lastUpdated: '2024-12-16T08:00:00Z', entriesAdded: 23, entriesRemoved: 5, totalEntries: 12453 },
  { code: 'UN_CONSOLIDATED', name: 'UN Consolidated', lastUpdated: '2024-12-16T06:30:00Z', entriesAdded: 8, entriesRemoved: 2, totalEntries: 8234 },
  { code: 'EU_CONSOLIDATED', name: 'EU Consolidated', lastUpdated: '2024-12-16T07:15:00Z', entriesAdded: 45, entriesRemoved: 0, totalEntries: 6789 },
  { code: 'UK_HMT', name: 'UK HMT', lastUpdated: '2024-12-16T05:00:00Z', entriesAdded: 12, entriesRemoved: 3, totalEntries: 4532 },
];

const DEMO_CHANGES: DetectedChange[] = [
  {
    id: 'CHG-001',
    type: 'new_match',
    title: 'New Match Detected',
    description: 'Now matches UN Consolidated List entry added on Dec 16, 2024',
    entity: 'Global Trade Holdings Ltd',
    timestamp: '2024-12-16T08:30:00Z',
  },
  {
    id: 'CHG-002',
    type: 'cleared',
    title: 'Entry Cleared',
    description: 'Removed from OFAC SDN list on Dec 15, 2024 - Previous match can be reviewed',
    entity: 'Ahmad Ali Hassan',
    timestamp: '2024-12-16T06:00:00Z',
  },
  {
    id: 'CHG-003',
    type: 'pep_alert',
    title: 'New PEP Match',
    description: 'Added to PEP Global list - affects 2 existing customers',
    entity: 'Sheikh Abdullah bin Faisal',
    timestamp: '2024-12-16T07:15:00Z',
  },
];

export function DailyScreening() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<BatchJob[]>(DEMO_BATCH_JOBS);
  const [listUpdates] = useState<ListUpdate[]>(DEMO_LIST_UPDATES);
  const [detectedChanges, setDetectedChanges] = useState<DetectedChange[]>(DEMO_CHANGES);
  const [selectedJob, setSelectedJob] = useState<BatchJob | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showScheduleEdit, setShowScheduleEdit] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showChangeDetail, setShowChangeDetail] = useState<DetectedChange | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Simulate running job progress
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs(prev => prev.map(job => {
        if (job.status === 'running') {
          const newProcessed = Math.min(job.entitiesProcessed + Math.floor(Math.random() * 500), 15000);
          if (newProcessed >= 15000) {
            return {
              ...job,
              status: 'completed' as const,
              entitiesProcessed: 15000,
              lastRun: new Date().toISOString(),
            };
          }
          return { ...job, entitiesProcessed: newProcessed };
        }
        return job;
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRunJob = (jobId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, status: 'running' as const, entitiesProcessed: 0 } : job
    ));
    showToast(`Job started: ${jobs.find(j => j.id === jobId)?.name}`, 'success');
  };

  const handlePauseJob = (jobId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, status: 'paused' as const } : job
    ));
    showToast(`Job paused: ${jobs.find(j => j.id === jobId)?.name}`, 'warning');
  };

  const handleRefresh = () => {
    showToast('Refreshing job status...', 'info');
    setTimeout(() => showToast('Jobs refreshed successfully', 'success'), 1000);
  };

  const handleViewResults = () => {
    setShowResults(true);
  };

  const handleExportReport = () => {
    if (!selectedJob) return;
    
    const reportData = {
      jobId: selectedJob.id,
      jobName: selectedJob.name,
      generatedAt: new Date().toISOString(),
      status: selectedJob.status,
      lastRun: selectedJob.lastRun,
      statistics: {
        entitiesProcessed: selectedJob.entitiesProcessed,
        matchesFound: selectedJob.matchesFound,
        newMatches: selectedJob.newMatches,
        clearedMatches: selectedJob.clearedMatches,
        duration: selectedJob.duration,
      },
      configuration: {
        schedule: selectedJob.schedule,
        type: selectedJob.type,
        nextRun: selectedJob.nextRun,
      },
    };

    // Generate CSV
    let csv = 'Daily Screening Batch Report\n\n';
    csv += `Job ID,${reportData.jobId}\n`;
    csv += `Job Name,${reportData.jobName}\n`;
    csv += `Generated At,${reportData.generatedAt}\n`;
    csv += `Status,${reportData.status}\n`;
    csv += `Last Run,${reportData.lastRun}\n\n`;
    csv += 'Statistics\n';
    csv += `Entities Processed,${reportData.statistics.entitiesProcessed}\n`;
    csv += `Matches Found,${reportData.statistics.matchesFound}\n`;
    csv += `New Matches,${reportData.statistics.newMatches}\n`;
    csv += `Cleared Matches,${reportData.statistics.clearedMatches}\n`;
    csv += `Duration,${reportData.statistics.duration}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-report-${selectedJob.id}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Report exported successfully!', 'success');
  };

  const handleEditSchedule = () => {
    setShowScheduleEdit(true);
  };

  const handleSaveSchedule = () => {
    showToast('Schedule updated successfully!', 'success');
    setShowScheduleEdit(false);
  };

  const handleReviewChange = (change: DetectedChange) => {
    setShowChangeDetail(change);
  };

  const handleNavigateToWorkflow = () => {
    navigate('/workflow');
  };

  const handleDismissChange = (changeId: string) => {
    setDetectedChanges(prev => prev.filter(c => c.id !== changeId));
    showToast('Alert dismissed', 'info');
    setShowChangeDetail(null);
  };

  const getStatusBadge = (status: BatchJob['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'running':
        return <Badge variant="warning" className="animate-pulse">Running</Badge>;
      case 'scheduled':
        return <Badge variant="info">Scheduled</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'paused':
        return <Badge variant="default">Paused</Badge>;
    }
  };

  // Consistent stats: Customer DB = 48,234, Active matches = 156 (from Reports API)
  const totalStats = {
    entitiesMonitored: 48234,  // Customer database across all GCC countries
    activeMatches: 156,        // Matches pending review (from reports.totals.pending_review)
    listsMonitored: 19,        // 13 global + 6 GCC local lists
    lastFullRun: '2024-12-16T02:00:00Z',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2",
          toast.type === 'success' && "bg-green-500/90 text-white",
          toast.type === 'info' && "bg-blue-500/90 text-white",
          toast.type === 'warning' && "bg-yellow-500/90 text-black"
        )}>
          {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {toast.type === 'info' && <RefreshCw className="w-4 h-4" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Daily Screening</h1>
          <p className="text-surface-400 mt-1">Automated batch screening against updated sanction lists</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setShowConfig(true)}>
            <Settings className="w-4 h-4" />
            Configure
          </Button>
          <Button onClick={() => handleRunJob('BATCH-001')}>
            <Play className="w-4 h-4" />
            Run Full Screening
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Entities Monitored</p>
              <p className="text-2xl font-bold text-surface-100 mt-0.5">{totalStats.entitiesMonitored.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-400" />
            </div>
          </div>
        </Card>
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Active Matches</p>
              <p className="text-2xl font-bold text-yellow-400 mt-0.5">{totalStats.activeMatches}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </Card>
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Lists Monitored</p>
              <p className="text-2xl font-bold text-surface-100 mt-0.5">{totalStats.listsMonitored}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </Card>
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Last Full Run</p>
              <p className="text-lg font-bold text-surface-100 mt-0.5">
                {new Date(totalStats.lastFullRun).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Batch Jobs */}
        <Card variant="glass" className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Scheduled Jobs</CardTitle>
                <CardDescription>Automated screening batch jobs</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jobs.map((job) => (
                <div 
                  key={job.id}
                  className={cn(
                    "p-4 rounded-lg border transition-colors cursor-pointer",
                    selectedJob?.id === job.id 
                      ? "bg-primary-500/10 border-primary-500/30" 
                      : "bg-surface-800/30 border-surface-700/50 hover:border-surface-600"
                  )}
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        job.status === 'running' ? 'bg-yellow-500/10' :
                        job.status === 'completed' ? 'bg-green-500/10' :
                        job.status === 'failed' ? 'bg-red-500/10' : 'bg-surface-700/50'
                      )}>
                        {job.status === 'running' ? (
                          <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                        ) : job.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : job.status === 'failed' ? (
                          <XCircle className="w-5 h-5 text-red-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-surface-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-surface-200">{job.name}</h4>
                          {getStatusBadge(job.status)}
                        </div>
                        <p className="text-xs text-surface-500 mt-1">
                          {job.schedule} • Last run: {new Date(job.lastRun).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-surface-400">
                            <span className="text-surface-200 font-medium">{job.entitiesProcessed.toLocaleString()}</span> entities
                          </span>
                          <span className="text-yellow-400">
                            <span className="font-medium">{job.matchesFound}</span> matches
                          </span>
                          <span className="text-green-400">
                            <span className="font-medium">+{job.newMatches}</span> new
                          </span>
                          <span className="text-blue-400">
                            <span className="font-medium">-{job.clearedMatches}</span> cleared
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === 'running' ? (
                        <Button variant="ghost" size="sm" onClick={(e) => handlePauseJob(job.id, e)}>
                          <Pause className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={(e) => handleRunJob(job.id, e)}>
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <ChevronRight className="w-4 h-4 text-surface-500" />
                    </div>
                  </div>
                  
                  {job.status === 'running' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-surface-400 mb-1">
                        <span>Processing...</span>
                        <span>{Math.min(Math.floor((job.entitiesProcessed / (job.type === 'custom' ? 2834 : 48234)) * 100), 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(Math.floor((job.entitiesProcessed / (job.type === 'custom' ? 2834 : 48234)) * 100), 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* List Updates */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>List Updates Today</CardTitle>
            <CardDescription>Changes in sanction lists</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {listUpdates.map((list) => (
                <div 
                  key={list.code} 
                  className="p-3 rounded-lg bg-surface-800/30 cursor-pointer hover:bg-surface-800/50 transition-colors"
                  onClick={() => navigate('/admin/lists')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-surface-200">{list.name}</span>
                    <span className="text-xs text-surface-500">
                      {new Date(list.lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-400">+{list.entriesAdded} added</span>
                    <span className="text-red-400">-{list.entriesRemoved} removed</span>
                    <span className="text-surface-500 ml-auto">{list.totalEntries.toLocaleString()} total</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-surface-700/50">
              <h5 className="text-sm font-medium text-surface-300 mb-3">Screening Configuration</h5>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-surface-400">Match Threshold</span>
                  <span className="text-surface-200 font-medium">75%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-400">Include PEPs</span>
                  <span className="text-green-400">Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-400">Include Adverse Media</span>
                  <span className="text-green-400">Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-400">Alert on New Matches</span>
                  <span className="text-green-400">Enabled</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Details Panel */}
      {selectedJob && (
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Job Details: {selectedJob.name}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)}>
                <X className="w-4 h-4" />
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-surface-800/30">
                <p className="text-xs text-surface-500 uppercase">Job ID</p>
                <p className="text-lg font-mono text-surface-200 mt-1">{selectedJob.id}</p>
              </div>
              <div className="p-4 rounded-lg bg-surface-800/30">
                <p className="text-xs text-surface-500 uppercase">Duration</p>
                <p className="text-lg font-bold text-surface-200 mt-1">{selectedJob.duration}</p>
              </div>
              <div className="p-4 rounded-lg bg-surface-800/30">
                <p className="text-xs text-surface-500 uppercase">Next Run</p>
                <p className="text-lg text-surface-200 mt-1">
                  {new Date(selectedJob.nextRun).toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-surface-800/30">
                <p className="text-xs text-surface-500 uppercase">Type</p>
                <p className="text-lg text-surface-200 mt-1 capitalize">{selectedJob.type.replace('_', ' ')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-4">
              <Button variant="secondary" onClick={handleViewResults}>
                <Eye className="w-4 h-4" />
                View Results
              </Button>
              <Button variant="secondary" onClick={handleExportReport}>
                <Download className="w-4 h-4" />
                Export Report
              </Button>
              <Button variant="secondary" onClick={handleEditSchedule}>
                <Settings className="w-4 h-4" />
                Edit Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detected Changes Section */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Recent Detected Changes</CardTitle>
          <CardDescription>New matches and cleared entries from daily screening</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {detectedChanges.map((change) => (
              <div 
                key={change.id}
                className={cn(
                  "p-4 rounded-lg border",
                  change.type === 'new_match' && "bg-yellow-500/5 border-yellow-500/20",
                  change.type === 'cleared' && "bg-green-500/5 border-green-500/20",
                  change.type === 'pep_alert' && "bg-yellow-500/5 border-yellow-500/20"
                )}
              >
                <div className="flex items-center gap-3">
                  {change.type === 'cleared' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-surface-200">{change.title}</p>
                    <p className="text-sm text-surface-400">
                      "{change.entity}" {change.description}
                    </p>
                  </div>
                  <Badge variant={change.type === 'cleared' ? 'success' : 'warning'}>
                    {change.type === 'new_match' ? 'New Match' : change.type === 'cleared' ? 'Cleared' : 'PEP Alert'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleReviewChange(change)}>
                    {change.type === 'cleared' ? 'View' : 'Review'}
                  </Button>
                </div>
              </div>
            ))}
            
            {detectedChanges.length === 0 && (
              <div className="text-center py-8 text-surface-500">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No pending changes to review</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-surface-900 rounded-xl border border-surface-700 shadow-xl"
          >
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-surface-100">Daily Screening Configuration</h3>
              <button onClick={() => setShowConfig(false)} className="p-2 rounded-lg hover:bg-surface-800 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-surface-400 mb-2 block">Match Threshold (%)</label>
                <Input type="number" defaultValue={75} min={50} max={100} />
              </div>
              <div>
                <label className="text-sm text-surface-400 mb-2 block">Daily Run Time</label>
                <Input type="time" defaultValue="02:00" />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-surface-300">Include PEP Screening</span>
                <div className="w-12 h-6 rounded-full bg-primary-500 relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-surface-300">Include Adverse Media</span>
                <div className="w-12 h-6 rounded-full bg-primary-500 relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-surface-300">Email Alerts for New Matches</span>
                <div className="w-12 h-6 rounded-full bg-primary-500 relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowConfig(false)}>Cancel</Button>
              <Button onClick={() => { setShowConfig(false); showToast('Configuration saved!', 'success'); }}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Schedule Edit Modal */}
      {showScheduleEdit && selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface-900 rounded-xl border border-surface-700 shadow-xl"
          >
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-surface-100">Edit Schedule: {selectedJob.name}</h3>
              <button onClick={() => setShowScheduleEdit(false)} className="p-2 rounded-lg hover:bg-surface-800 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-surface-400 mb-2 block">Schedule Type</label>
                <select className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-200">
                  <option>Daily</option>
                  <option>Every 4 hours</option>
                  <option>Every 12 hours</option>
                  <option>Weekly</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-surface-400 mb-2 block">Run Time</label>
                <Input type="time" defaultValue="02:00" />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-surface-300">Enabled</span>
                <div className="w-12 h-6 rounded-full bg-primary-500 relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowScheduleEdit(false)}>Cancel</Button>
              <Button onClick={handleSaveSchedule}>
                <Save className="w-4 h-4" />
                Save Schedule
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Results Modal */}
      {showResults && selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl bg-surface-900 rounded-xl border border-surface-700 shadow-xl max-h-[80vh] overflow-hidden"
          >
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-surface-100">Results: {selectedJob.name}</h3>
              <button onClick={() => setShowResults(false)} className="p-2 rounded-lg hover:bg-surface-800 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-surface-800/50 text-center">
                  <p className="text-2xl font-bold text-surface-100">{selectedJob.entitiesProcessed.toLocaleString()}</p>
                  <p className="text-xs text-surface-500">Entities Screened</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{selectedJob.matchesFound}</p>
                  <p className="text-xs text-surface-500">Total Matches</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 text-center">
                  <p className="text-2xl font-bold text-green-400">+{selectedJob.newMatches}</p>
                  <p className="text-xs text-surface-500">New Matches</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                  <p className="text-2xl font-bold text-blue-400">-{selectedJob.clearedMatches}</p>
                  <p className="text-xs text-surface-500">Cleared</p>
                </div>
              </div>
              
              <h4 className="font-medium text-surface-200 mb-3">Sample Matches Found</h4>
              <div className="space-y-2">
                {[
                  { name: 'Mohammad Al-Rashid', list: 'OFAC SDN', score: 92 },
                  { name: 'Global Trade Holdings', list: 'UN Consolidated', score: 88 },
                  { name: 'Ahmed Hassan Ibrahim', list: 'OFAC SDN', score: 85 },
                ].map((match, i) => (
                  <div key={i} className="p-3 rounded-lg bg-surface-800/30 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-surface-200">{match.name}</p>
                      <p className="text-xs text-surface-500">{match.list}</p>
                    </div>
                    <Badge variant={match.score >= 90 ? 'destructive' : 'warning'}>{match.score}%</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 flex justify-between">
              <Button variant="secondary" onClick={handleNavigateToWorkflow}>
                View in Workflow
              </Button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowResults(false)}>Close</Button>
                <Button onClick={handleExportReport}>
                  <Download className="w-4 h-4" />
                  Export Full Results
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Change Detail Modal */}
      {showChangeDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface-900 rounded-xl border border-surface-700 shadow-xl"
          >
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-surface-100">{showChangeDetail.title}</h3>
              <button onClick={() => setShowChangeDetail(null)} className="p-2 rounded-lg hover:bg-surface-800 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-surface-500">Entity</p>
                <p className="text-lg font-medium text-surface-200">{showChangeDetail.entity}</p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-surface-500">Description</p>
                <p className="text-surface-300">{showChangeDetail.description}</p>
              </div>
              <div>
                <p className="text-sm text-surface-500">Detected At</p>
                <p className="text-surface-300">{new Date(showChangeDetail.timestamp).toLocaleString()}</p>
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 flex justify-between">
              <Button variant="secondary" onClick={() => handleDismissChange(showChangeDetail.id)}>
                Dismiss
              </Button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowChangeDetail(null)}>Close</Button>
                {showChangeDetail.type !== 'cleared' && (
                  <Button onClick={() => { setShowChangeDetail(null); navigate('/workflow'); }}>
                    <Eye className="w-4 h-4" />
                    Open in Workflow
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
