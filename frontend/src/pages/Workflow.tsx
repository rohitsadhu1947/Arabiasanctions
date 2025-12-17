import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  ArrowUpRight,
  User,


  MessageSquare,
  Send,

  Timer,
  Flag,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn, formatDateTime } from '../lib/utils';
import { motion } from 'framer-motion';
import { workflowApi } from '../lib/api';

interface WorkflowCase {
  id: number;
  case_number: string;
  screening_result_id: number;
  screening_match_id: number | null;
  status: string;
  priority: string;
  assigned_to_id: number | null;
  assigned_to_name: string | null;
  assigned_by_name: string | null;
  escalation_level: number;
  escalation_reason: string | null;
  created_at: string;
  due_date: string | null;
  sla_breached: boolean;
  return_count: number;
  max_returns: number;
  country_code: string | null;
  screened_name: string | null;
  highest_match_score: number | null;
}

interface WorkflowStats {
  open_cases: number;
  in_progress_cases: number;
  pending_approval: number;
  escalated_cases: number;
  sla_breached_count: number;
  sla_at_risk_count: number;
  my_assigned_cases: number;
  avg_tat_hours: number;
  urgent_cases: number;
  high_priority_cases: number;
}

interface CaseAction {
  id: number;
  action_type: string;
  performed_by_name: string;
  performed_at: string;
  comment: string | null;
  previous_status: string | null;
  new_status: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  in_progress: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  pending_approval: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  escalated: 'bg-red-500/10 text-red-400 border-red-500/30',
  returned: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  closed: 'bg-green-500/10 text-green-400 border-green-500/30',
};

const priorityColors: Record<string, string> = {
  low: 'text-surface-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  urgent: 'text-red-400',
};

export function Workflow() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cases, setCases] = useState<WorkflowCase[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [selectedCase, setSelectedCase] = useState<WorkflowCase | null>(null);
  const [caseHistory, setCaseHistory] = useState<CaseAction[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'escalated'>('all');
  const [comment, setComment] = useState('');
  const [localHistory, setLocalHistory] = useState<CaseAction[]>([]);

  const loadCases = useCallback(async () => {
    try {
      const response = await workflowApi.getCases({ 
        assigned_to_me: activeTab === 'my',
        status: activeTab === 'escalated' ? 'escalated' : undefined,
      });
      if (response.success) {
        setCases(response.data);
        // Update selected case if it exists in new data
        if (selectedCase) {
          const updated = response.data.find((c: WorkflowCase) => c.id === selectedCase.id);
          if (updated) {
            setSelectedCase(updated);
          }
        } else if (response.data.length > 0) {
          setSelectedCase(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load cases:', error);
    }
  }, [activeTab, selectedCase?.id]);

  const loadStats = useCallback(async () => {
    try {
      const response = await workflowApi.getDashboard();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const loadCaseHistory = useCallback(async (caseId: number) => {
    try {
      const response = await workflowApi.getCaseHistory(caseId);
      if (response.success) {
        setCaseHistory(response.data);
      }
    } catch (error) {
      console.error('Failed to load case history:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadCases(), loadStats()]);
      setLoading(false);
    };
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (selectedCase) {
      loadCaseHistory(selectedCase.id);
      setLocalHistory([]);
    }
  }, [selectedCase?.id]);

  const performAction = async (actionType: string, extraData?: any) => {
    if (!selectedCase) return;
    
    setActionLoading(true);
    try {
      const response = await workflowApi.performAction(selectedCase.id, {
        action_type: actionType as any,
        comment: comment || undefined,
        ...extraData,
      });

      if (response.success && response.data) {
        // Add to local history immediately for instant feedback
        const newAction: CaseAction = {
          id: Date.now(),
          action_type: actionType,
          performed_by_name: 'You',
          performed_at: new Date().toISOString(),
          comment: comment || null,
          previous_status: selectedCase.status,
          new_status: response.data.new_status,
        };
        
        setLocalHistory(prev => [newAction, ...prev]);
        
        // Update selected case status locally
        setSelectedCase(prev => prev ? {
          ...prev,
          status: response.data.new_status,
        } : null);
        
        // Update the case in the list
        setCases(prev => prev.map(c => 
          c.id === selectedCase.id 
            ? { ...c, status: response.data.new_status }
            : c
        ));
        
        setComment('');
        
        // Refresh stats
        loadStats();
      }
    } catch (error: any) {
      console.error('Action failed:', error);
      alert(error.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const addComment = async () => {
    if (!selectedCase || !comment.trim()) return;
    
    setActionLoading(true);
    try {
      const response = await workflowApi.performAction(selectedCase.id, {
        action_type: 'comment' as any,
        comment: comment,
      });

      if (response.success) {
        // Add to local history immediately
        const newAction: CaseAction = {
          id: Date.now(),
          action_type: 'comment',
          performed_by_name: 'You',
          performed_at: new Date().toISOString(),
          comment: comment,
          previous_status: selectedCase.status,
          new_status: selectedCase.status,
        };
        
        setLocalHistory(prev => [newAction, ...prev]);
        setComment('');
      }
    } catch (error: any) {
      console.error('Comment failed:', error);
      alert('Failed to add comment');
    } finally {
      setActionLoading(false);
    }
  };

  // Combine server history with local actions
  const combinedHistory = [...localHistory, ...caseHistory];

  if (loading) {
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Workflow</h1>
          <p className="text-surface-400 mt-1">Manage cases and review decisions</p>
        </div>
        <Button variant="secondary" onClick={() => { loadCases(); loadStats(); }}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-6 gap-4">
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Open</p>
                <p className="text-xl font-bold text-surface-100 mt-0.5">{stats.open_cases}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">In Progress</p>
                <p className="text-xl font-bold text-surface-100 mt-0.5">{stats.in_progress_cases}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Pending Approval</p>
                <p className="text-xl font-bold text-surface-100 mt-0.5">{stats.pending_approval}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Escalated</p>
                <p className="text-xl font-bold text-surface-100 mt-0.5">{stats.escalated_cases}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-orange-400" />
              </div>
            </div>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">SLA Breached</p>
                <p className="text-xl font-bold text-red-400 mt-0.5">{stats.sla_breached_count}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
            </div>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Avg TAT</p>
                <p className="text-xl font-bold text-surface-100 mt-0.5">{stats.avg_tat_hours}h</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-primary-400" />
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Cases List */}
        <Card variant="glass" className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cases Queue</CardTitle>
                <CardDescription>Review and process workflow cases</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-surface-800 rounded-lg p-1">
                  {(['all', 'my', 'escalated'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                        activeTab === tab
                          ? 'bg-primary-600 text-white'
                          : 'text-surface-400 hover:text-surface-200'
                      )}
                    >
                      {tab === 'all' ? 'All Cases' : tab === 'my' ? 'My Cases' : 'Escalated'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {cases.length === 0 ? (
              <div className="text-center py-8 text-surface-500">
                No cases found
              </div>
            ) : (
              <div className="space-y-2">
                {cases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    onClick={() => setSelectedCase(caseItem)}
                    className={cn(
                      'p-4 rounded-lg cursor-pointer transition-all border',
                      selectedCase?.id === caseItem.id
                        ? 'bg-primary-600/10 border-primary-500/30'
                        : 'bg-surface-800/30 border-transparent hover:bg-surface-800/50 hover:border-surface-700'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-primary-400">{caseItem.case_number}</span>
                          {caseItem.sla_breached && (
                            <Badge variant="danger">SLA Breached</Badge>
                          )}
                          {caseItem.escalation_level > 0 && (
                            <Badge variant="purple">L{caseItem.escalation_level} Escalation</Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-surface-200 mt-1">{caseItem.screened_name || 'Unknown Entity'}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-surface-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {caseItem.assigned_to_name || 'Unassigned'}
                          </span>
                          {caseItem.highest_match_score && (
                            <span>Score: {(caseItem.highest_match_score * 100).toFixed(0)}%</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                          statusColors[caseItem.status] || statusColors.open
                        )}>
                          {caseItem.status.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-1 mt-2 text-sm">
                          <Flag className={cn('w-3.5 h-3.5', priorityColors[caseItem.priority] || priorityColors.medium)} />
                          <span className={cn('capitalize', priorityColors[caseItem.priority] || priorityColors.medium)}>
                            {caseItem.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Case Detail */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Case Details</CardTitle>
              {selectedCase && (
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                  statusColors[selectedCase.status] || statusColors.open
                )}>
                  {selectedCase.status.replace('_', ' ')}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedCase ? (
              <>
                {/* Case Info */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-surface-500">Case Number</span>
                    <span className="text-sm font-mono text-primary-400">{selectedCase.case_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-surface-500">Entity</span>
                    <span className="text-sm text-surface-200">{selectedCase.screened_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-surface-500">Match Score</span>
                    <span className="text-sm font-medium text-yellow-400">
                      {selectedCase.highest_match_score ? `${(selectedCase.highest_match_score * 100).toFixed(0)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-surface-500">Assigned To</span>
                    <span className="text-sm text-surface-200">{selectedCase.assigned_to_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-surface-500">Created</span>
                    <span className="text-sm text-surface-400">{formatDateTime(selectedCase.created_at)}</span>
                  </div>
                  {selectedCase.due_date && (
                    <div className="flex justify-between">
                      <span className="text-sm text-surface-500">Due Date</span>
                      <span className={cn('text-sm', selectedCase.sla_breached ? 'text-red-400' : 'text-surface-400')}>
                        {formatDateTime(selectedCase.due_date)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-surface-300">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="justify-start"
                      onClick={() => performAction('approve')}
                      disabled={actionLoading || selectedCase.status === 'closed'}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
                      Approve
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="justify-start"
                      onClick={() => performAction('reject')}
                      disabled={actionLoading || selectedCase.status === 'closed'}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 text-red-400" />}
                      Reject
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="justify-start"
                      onClick={() => performAction('escalate', { escalation_reason: 'Requires senior review' })}
                      disabled={actionLoading || selectedCase.status === 'closed' || selectedCase.status === 'escalated'}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4 text-purple-400" />}
                      Escalate
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="justify-start"
                      onClick={() => performAction('return')}
                      disabled={actionLoading || selectedCase.status === 'closed'}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4 text-blue-400" />}
                      Return
                    </Button>
                  </div>
                </div>

                {/* History */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-surface-300">Activity History</h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {combinedHistory.length === 0 ? (
                      <p className="text-sm text-surface-500">No activity yet</p>
                    ) : (
                      combinedHistory.map((item, index) => (
                        <div key={item.id} className="relative pl-4">
                          {index !== combinedHistory.length - 1 && (
                            <div className="absolute left-[5px] top-5 w-px h-full bg-surface-700" />
                          )}
                          <div className={cn(
                            "absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-surface-800",
                            item.action_type === 'approve' ? 'bg-green-500' :
                            item.action_type === 'reject' ? 'bg-red-500' :
                            item.action_type === 'escalate' ? 'bg-purple-500' :
                            item.action_type === 'comment' ? 'bg-blue-500' :
                            'bg-surface-600'
                          )} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-surface-200 capitalize">{item.action_type}</span>
                              <span className="text-xs text-surface-500">by {item.performed_by_name}</span>
                            </div>
                            {item.comment && (
                              <p className="text-xs text-surface-400 mt-0.5 bg-surface-800/50 p-2 rounded">
                                "{item.comment}"
                              </p>
                            )}
                            <span className="text-xs text-surface-600">{formatDateTime(item.performed_at)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add Comment */}
                <div className="pt-3 border-t border-surface-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addComment()}
                      className="flex-1 h-9 px-3 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Button 
                      size="sm" 
                      className="h-9 w-9 p-0"
                      onClick={addComment}
                      disabled={!comment.trim() || actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-surface-500">
                Select a case to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
