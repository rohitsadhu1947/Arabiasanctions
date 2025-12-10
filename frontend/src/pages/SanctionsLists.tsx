import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { 
  Database, 
  RefreshCw, 
  Globe, 
  MapPin,
  Search,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Clock,
  Download,
  Upload,
  ChevronRight,
  List,
  Users,
  Building,
} from 'lucide-react';
import { cn, formatDateTime } from '../lib/utils';
import { motion } from 'framer-motion';
import { adminApi } from '../lib/api';

interface SanctionsList {
  code: string;
  name: string;
  source?: string;
  url?: string;
  format?: string;
  update_frequency?: string;
  last_updated: string | null;
  total_entries: number;
  is_active: boolean;
  auto_update?: boolean;
  country_code?: string;
  description?: string;
}

interface SanctionEntry {
  source_id: string;
  primary_name: string;
  entry_type: string;
  aliases: string[];
  nationality: string | null;
  date_of_birth: string | null;
  programs: string[];
  sanction_date: string | null;
  remarks: string | null;
}

interface ListStats {
  global_lists: SanctionsList[];
  local_lists: SanctionsList[];
  total_entries: number;
  last_global_update: string | null;
}

export function SanctionsLists() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [stats, setStats] = useState<ListStats | null>(null);
  const [selectedList, setSelectedList] = useState<SanctionsList | null>(null);
  const [entries, setEntries] = useState<SanctionEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    entry_type: 'individual',
    primary_name: '',
    aliases: '',
    nationality: '',
    date_of_birth: '',
    programs: '',
    remarks: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedList) {
      loadEntries(selectedList.code);
    }
  }, [selectedList?.code]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getSanctionsLists();
      if (response.success) {
        setStats(response.data);
        // Select first global list by default
        if (response.data.global_lists.length > 0) {
          setSelectedList(response.data.global_lists[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load sanctions lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async (listCode: string, search?: string) => {
    setEntriesLoading(true);
    try {
      const response = await adminApi.getListEntries(listCode, { 
        page: 1, 
        page_size: 50,
        search: search || undefined,
      });
      if (response.success) {
        setEntries(response.data);
      }
    } catch (error) {
      console.error('Failed to load entries:', error);
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleRefresh = async (listCode: string) => {
    setRefreshing(listCode);
    try {
      await adminApi.refreshList(listCode);
      await loadData();
      if (selectedList?.code === listCode) {
        await loadEntries(listCode);
      }
    } catch (error) {
      console.error('Failed to refresh list:', error);
    } finally {
      setRefreshing(null);
    }
  };

  const handleToggle = async (listCode: string, isActive: boolean) => {
    try {
      await adminApi.toggleList(listCode, !isActive);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle list:', error);
    }
  };

  const handleSearch = () => {
    if (selectedList) {
      loadEntries(selectedList.code, searchTerm);
    }
  };

  const handleAddEntry = async () => {
    if (!selectedList || !selectedList.code.startsWith('LOCAL_')) return;
    
    try {
      await adminApi.addListEntry(selectedList.code, {
        entry_type: newEntry.entry_type,
        primary_name: newEntry.primary_name,
        aliases: newEntry.aliases.split(',').map(a => a.trim()).filter(Boolean),
        nationality: newEntry.nationality || null,
        date_of_birth: newEntry.date_of_birth || null,
        programs: newEntry.programs.split(',').map(p => p.trim()).filter(Boolean),
        remarks: newEntry.remarks || null,
      });
      
      setShowAddEntry(false);
      setNewEntry({
        entry_type: 'individual',
        primary_name: '',
        aliases: '',
        nationality: '',
        date_of_birth: '',
        programs: '',
        remarks: '',
      });
      
      await loadData();
      await loadEntries(selectedList.code);
    } catch (error) {
      console.error('Failed to add entry:', error);
    }
  };

  const handleRemoveEntry = async (sourceId: string) => {
    if (!selectedList || !selectedList.code.startsWith('LOCAL_')) return;
    
    if (confirm('Are you sure you want to remove this entry?')) {
      try {
        await adminApi.removeListEntry(selectedList.code, sourceId);
        await loadData();
        await loadEntries(selectedList.code);
      } catch (error) {
        console.error('Failed to remove entry:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const isLocalList = selectedList?.code.startsWith('LOCAL_');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Sanctions Lists</h1>
          <p className="text-surface-400 mt-1">Manage global and local watchlists for screening</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary">
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <Button variant="secondary">
            <Download className="w-4 h-4" />
            Export All
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Total Entries</p>
                <p className="text-2xl font-bold text-surface-100 mt-0.5">{stats.total_entries.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-primary-400" />
              </div>
            </div>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Global Lists</p>
                <p className="text-2xl font-bold text-surface-100 mt-0.5">{stats.global_lists.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Local Lists</p>
                <p className="text-2xl font-bold text-surface-100 mt-0.5">{stats.local_lists.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-orange-400" />
              </div>
            </div>
          </Card>
          <Card variant="glass" className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Last Updated</p>
                <p className="text-sm font-medium text-surface-100 mt-0.5">
                  {stats.last_global_update ? formatDateTime(stats.last_global_update).split(',')[0] : 'Never'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Lists Panel */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Available Lists</CardTitle>
            <CardDescription>Click to view entries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Global Lists */}
            <div>
              <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Global Lists
              </h4>
              <div className="space-y-2">
                {stats?.global_lists.map((list) => (
                  <div
                    key={list.code}
                    onClick={() => setSelectedList(list)}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer transition-all border',
                      selectedList?.code === list.code
                        ? 'bg-primary-600/10 border-primary-500/30'
                        : 'bg-surface-800/30 border-transparent hover:bg-surface-800/50'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-surface-200 text-sm">{list.name}</span>
                          {list.is_active ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="default">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-xs text-surface-500 mt-0.5">{list.source}</p>
                        <p className="text-xs text-surface-600 mt-1">
                          {list.total_entries.toLocaleString()} entries
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggle(list.code, list.is_active); }}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            list.is_active ? 'text-green-400 hover:bg-green-500/10' : 'text-surface-500 hover:bg-surface-700'
                          )}
                        >
                          {list.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRefresh(list.code); }}
                          className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
                          disabled={refreshing === list.code}
                        >
                          <RefreshCw className={cn('w-4 h-4', refreshing === list.code && 'animate-spin')} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Local Lists */}
            <div>
              <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                Local/Country Lists
              </h4>
              <div className="space-y-2">
                {stats?.local_lists.map((list) => (
                  <div
                    key={list.code}
                    onClick={() => setSelectedList(list)}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer transition-all border',
                      selectedList?.code === list.code
                        ? 'bg-primary-600/10 border-primary-500/30'
                        : 'bg-surface-800/30 border-transparent hover:bg-surface-800/50'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-surface-200 text-sm">{list.name}</span>
                          <Badge variant="purple">{list.country_code}</Badge>
                        </div>
                        <p className="text-xs text-surface-500 mt-0.5">{list.description}</p>
                        <p className="text-xs text-surface-600 mt-1">
                          {list.total_entries.toLocaleString()} entries
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(list.code, list.is_active); }}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          list.is_active ? 'text-green-400 hover:bg-green-500/10' : 'text-surface-500 hover:bg-surface-700'
                        )}
                      >
                        {list.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entries Panel */}
        <Card variant="glass" className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedList?.name || 'Select a List'}</CardTitle>
                <CardDescription>
                  {selectedList ? `${entries.length} entries shown` : 'Choose a list to view entries'}
                </CardDescription>
              </div>
              {isLocalList && (
                <Button onClick={() => setShowAddEntry(true)}>
                  <Plus className="w-4 h-4" />
                  Add Entry
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedList ? (
              <>
                {/* Search */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search entries by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      icon={<Search className="w-4 h-4" />}
                    />
                  </div>
                  <Button onClick={handleSearch}>Search</Button>
                </div>

                {/* Entries List */}
                {entriesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  </div>
                ) : entries.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {entries.map((entry) => (
                      <div
                        key={entry.source_id}
                        className="p-4 rounded-lg bg-surface-800/30 border border-surface-700/50 hover:border-surface-600 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {entry.entry_type === 'individual' ? (
                                <Users className="w-4 h-4 text-blue-400" />
                              ) : (
                                <Building className="w-4 h-4 text-purple-400" />
                              )}
                              <span className="font-medium text-surface-200">{entry.primary_name}</span>
                              <Badge variant={entry.entry_type === 'individual' ? 'info' : 'purple'}>
                                {entry.entry_type}
                              </Badge>
                            </div>
                            {entry.aliases.length > 0 && (
                              <p className="text-xs text-surface-500 mt-1">
                                AKA: {entry.aliases.slice(0, 3).join(', ')}{entry.aliases.length > 3 ? '...' : ''}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
                              {entry.nationality && <span>🌍 {entry.nationality}</span>}
                              {entry.date_of_birth && <span>🎂 {entry.date_of_birth}</span>}
                              {entry.programs.length > 0 && (
                                <span className="text-yellow-400">{entry.programs.join(', ')}</span>
                              )}
                            </div>
                            {entry.remarks && (
                              <p className="text-xs text-surface-600 mt-1 line-clamp-1">{entry.remarks}</p>
                            )}
                          </div>
                          {isLocalList && (
                            <button
                              onClick={() => handleRemoveEntry(entry.source_id)}
                              className="p-2 rounded-lg text-surface-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-surface-500">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No entries found</p>
                    {isLocalList && (
                      <Button variant="secondary" className="mt-4" onClick={() => setShowAddEntry(true)}>
                        <Plus className="w-4 h-4" />
                        Add First Entry
                      </Button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-surface-500">
                <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a list from the left panel to view entries</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Entry Modal */}
      {showAddEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-surface-900 rounded-xl border border-surface-700 shadow-xl"
          >
            <div className="p-6 border-b border-surface-700">
              <h3 className="text-lg font-semibold text-surface-100">Add Entry to {selectedList?.name}</h3>
              <p className="text-sm text-surface-500">Add a new watchlist entry</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Entry Type</label>
                <select
                  value={newEntry.entry_type}
                  onChange={(e) => setNewEntry({ ...newEntry, entry_type: e.target.value })}
                  className="w-full h-10 px-3 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200"
                >
                  <option value="individual">Individual</option>
                  <option value="entity">Entity/Corporate</option>
                </select>
              </div>
              <Input
                label="Primary Name"
                value={newEntry.primary_name}
                onChange={(e) => setNewEntry({ ...newEntry, primary_name: e.target.value })}
                placeholder="Enter full name"
              />
              <Input
                label="Aliases (comma separated)"
                value={newEntry.aliases}
                onChange={(e) => setNewEntry({ ...newEntry, aliases: e.target.value })}
                placeholder="Alias 1, Alias 2, ..."
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nationality"
                  value={newEntry.nationality}
                  onChange={(e) => setNewEntry({ ...newEntry, nationality: e.target.value })}
                  placeholder="e.g., Qatari"
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={newEntry.date_of_birth}
                  onChange={(e) => setNewEntry({ ...newEntry, date_of_birth: e.target.value })}
                />
              </div>
              <Input
                label="Programs (comma separated)"
                value={newEntry.programs}
                onChange={(e) => setNewEntry({ ...newEntry, programs: e.target.value })}
                placeholder="LOCAL_WATCHLIST, PEP, ..."
              />
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Remarks</label>
                <textarea
                  value={newEntry.remarks}
                  onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })}
                  placeholder="Additional notes..."
                  className="w-full h-20 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowAddEntry(false)}>Cancel</Button>
              <Button onClick={handleAddEntry} disabled={!newEntry.primary_name}>Add Entry</Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

