import { useState, useEffect } from 'react';
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
  Database,
  Users,
  Building2,
  Shield,
  ChevronRight,
  XCircle,
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

const DEMO_BATCH_JOBS: BatchJob[] = [
  {
    id: 'BATCH-001',
    name: 'Daily Full Screening',
    type: 'daily_all',
    status: 'completed',
    schedule: '02:00 AM Daily',
    lastRun: '2024-12-16T02:00:00Z',
    nextRun: '2024-12-17T02:00:00Z',
    entitiesProcessed: 45678,
    matchesFound: 234,
    newMatches: 12,
    clearedMatches: 3,
    duration: '1h 23m',
  },
  {
    id: 'BATCH-002',
    name: 'New List Updates Check',
    type: 'new_lists',
    status: 'scheduled',
    schedule: '06:00 AM Daily',
    lastRun: '2024-12-16T06:00:00Z',
    nextRun: '2024-12-17T06:00:00Z',
    entitiesProcessed: 45678,
    matchesFound: 5,
    newMatches: 5,
    clearedMatches: 0,
    duration: '45m',
  },
  {
    id: 'BATCH-003',
    name: 'Cleared Entries Detection',
    type: 'cleared_entries',
    status: 'completed',
    schedule: '04:00 AM Daily',
    lastRun: '2024-12-16T04:00:00Z',
    nextRun: '2024-12-17T04:00:00Z',
    entitiesProcessed: 892,
    matchesFound: 0,
    newMatches: 0,
    clearedMatches: 8,
    duration: '12m',
  },
  {
    id: 'BATCH-004',
    name: 'Qatar Custom Watchlist Screening',
    type: 'custom',
    status: 'running',
    schedule: 'Every 4 hours',
    lastRun: '2024-12-16T14:00:00Z',
    nextRun: '2024-12-16T18:00:00Z',
    entitiesProcessed: 12456,
    matchesFound: 45,
    newMatches: 2,
    clearedMatches: 0,
    duration: '23m',
  },
];

const DEMO_LIST_UPDATES: ListUpdate[] = [
  { code: 'OFAC_SDN', name: 'OFAC SDN', lastUpdated: '2024-12-16T08:00:00Z', entriesAdded: 23, entriesRemoved: 5, totalEntries: 12453 },
  { code: 'UN_CONSOLIDATED', name: 'UN Consolidated', lastUpdated: '2024-12-16T06:30:00Z', entriesAdded: 8, entriesRemoved: 2, totalEntries: 8234 },
  { code: 'EU_CONSOLIDATED', name: 'EU Consolidated', lastUpdated: '2024-12-16T07:15:00Z', entriesAdded: 45, entriesRemoved: 0, totalEntries: 6789 },
  { code: 'UK_HMT', name: 'UK HMT', lastUpdated: '2024-12-16T05:00:00Z', entriesAdded: 12, entriesRemoved: 3, totalEntries: 4532 },
];

export function DailyScreening() {
  const [jobs, setJobs] = useState<BatchJob[]>(DEMO_BATCH_JOBS);
  const [listUpdates] = useState<ListUpdate[]>(DEMO_LIST_UPDATES);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BatchJob | null>(null);

  // Simulate running job progress
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs(prev => prev.map(job => {
        if (job.status === 'running') {
          return {
            ...job,
            entitiesProcessed: Math.min(job.entitiesProcessed + Math.floor(Math.random() * 500), 15000),
          };
        }
        return job;
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRunJob = (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, status: 'running' } : job
    ));
    
    // Simulate completion
    setTimeout(() => {
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { 
          ...job, 
          status: 'completed',
          lastRun: new Date().toISOString(),
          matchesFound: job.matchesFound + Math.floor(Math.random() * 10),
        } : job
      ));
    }, 5000);
  };

  const handlePauseJob = (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, status: 'paused' } : job
    ));
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

  const totalStats = {
    entitiesMonitored: 45678,
    activeMatches: 892,
    listsMonitored: 15,
    lastFullRun: '2024-12-16T02:00:00Z',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
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
              <Button variant="ghost" size="sm">
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
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handlePauseJob(job.id); }}>
                          <Pause className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleRunJob(job.id); }}>
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
                        <span>{Math.floor((job.entitiesProcessed / 15000) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.floor((job.entitiesProcessed / 15000) * 100)}%` }}
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
                <div key={list.code} className="p-3 rounded-lg bg-surface-800/30">
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
              <Button variant="secondary">
                <FileText className="w-4 h-4" />
                View Results
              </Button>
              <Button variant="secondary">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
              <Button variant="secondary">
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
            <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <div className="flex-1">
                  <p className="font-medium text-surface-200">New Match Detected</p>
                  <p className="text-sm text-surface-400">
                    "Global Trade Holdings Ltd" now matches UN Consolidated List entry added on Dec 16, 2024
                  </p>
                </div>
                <Badge variant="warning">New Match</Badge>
                <Button variant="ghost" size="sm">Review</Button>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <p className="font-medium text-surface-200">Entry Cleared</p>
                  <p className="text-sm text-surface-400">
                    "Ahmad Ali Hassan" removed from OFAC SDN list on Dec 15, 2024 - Previous match can be reviewed
                  </p>
                </div>
                <Badge variant="success">Cleared</Badge>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <div className="flex-1">
                  <p className="font-medium text-surface-200">New PEP Match</p>
                  <p className="text-sm text-surface-400">
                    "Sheikh Abdullah bin Faisal" added to PEP Global list - affects 2 existing customers
                  </p>
                </div>
                <Badge variant="warning">PEP Alert</Badge>
                <Button variant="ghost" size="sm">Review</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

