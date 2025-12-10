import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { 
  Settings as SettingsIcon, 
  Save,
  Sliders,
  Clock,
  Shield,
  Bell,
  Globe,
  Building,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info,
  Lock,
  Mail,
  Server,
  Search,
  Plus,
  Edit,
  X,
  MapPin,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { adminApi } from '../lib/api';

interface SystemConfig {
  default_match_threshold: number;
  high_risk_threshold: number;
  auto_release_threshold: number;
  max_bulk_requests: number;
  sla_hours: number;
  max_escalation_levels: number;
  password_expiry_days: number;
  session_timeout_minutes: number;
}

interface Country {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  branches: Array<{ id: number; code: string; name: string }>;
  user_count: number;
}

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'screening' | 'workflow' | 'security' | 'countries'>('screening');
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    ipWhitelisting: false,
    sessionBinding: true,
    auditAllActions: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configRes, countriesRes] = await Promise.all([
        adminApi.getConfig(),
        adminApi.getCountries(),
      ]);

      if (configRes.success) setConfig(configRes.data);
      if (countriesRes.success) {
        setCountries(countriesRes.data);
        if (countriesRes.data.length > 0) {
          setSelectedCountry(countriesRes.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: keyof SystemConfig, value: number) => {
    if (config) {
      setConfig({ ...config, [key]: value });
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const response = await adminApi.updateConfig(config);
      if (response.success) {
        setHasChanges(false);
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSecuritySetting = (key: keyof typeof securitySettings) => {
    setSecuritySettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Settings</h1>
          <p className="text-surface-400 mt-1">Configure system behavior and thresholds</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="warning">Unsaved Changes</Badge>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <Card variant="glass">
          <CardContent className="py-2">
            <nav className="space-y-1">
              {[
                { id: 'screening', label: 'Screening', icon: Search },
                { id: 'workflow', label: 'Workflow', icon: RefreshCw },
                { id: 'security', label: 'Security', icon: Shield },
                { id: 'countries', label: 'Countries & Branches', icon: Globe },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                      activeTab === item.id
                        ? 'bg-primary-600/10 text-primary-400'
                        : 'text-surface-400 hover:bg-surface-800/50 hover:text-surface-200'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Settings Content */}
        <div className="col-span-3 space-y-6">
          {/* Screening Settings */}
          {activeTab === 'screening' && config && (
            <>
              <Card variant="glass">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-primary-400" />
                    <CardTitle>Match Thresholds</CardTitle>
                  </div>
                  <CardDescription>Configure matching sensitivity and risk classification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-2">
                        Default Match Threshold
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={config.default_match_threshold * 100}
                          onChange={(e) => handleConfigChange('default_match_threshold', Number(e.target.value) / 100)}
                          className="flex-1 h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                        <span className="text-lg font-bold text-surface-200 w-16 text-right">
                          {Math.round(config.default_match_threshold * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-surface-500 mt-1">Minimum score to flag as potential match</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-2">
                        High Risk Threshold
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={config.high_risk_threshold * 100}
                          onChange={(e) => handleConfigChange('high_risk_threshold', Number(e.target.value) / 100)}
                          className="flex-1 h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                        />
                        <span className="text-lg font-bold text-red-400 w-16 text-right">
                          {Math.round(config.high_risk_threshold * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-surface-500 mt-1">Score to classify as high risk</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-2">
                        Auto-Release Threshold
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={config.auto_release_threshold * 100}
                          onChange={(e) => handleConfigChange('auto_release_threshold', Number(e.target.value) / 100)}
                          className="flex-1 h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                        <span className="text-lg font-bold text-green-400 w-16 text-right">
                          {Math.round(config.auto_release_threshold * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-surface-500 mt-1">Matches below this are auto-released</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-300">Threshold Guide</p>
                        <p className="text-xs text-blue-400/80 mt-1">
                          Below {Math.round(config.auto_release_threshold * 100)}% = Auto-released • 
                          {Math.round(config.auto_release_threshold * 100)}%-{Math.round(config.high_risk_threshold * 100)}% = Manual Review • 
                          Above {Math.round(config.high_risk_threshold * 100)}% = High Risk (Auto-escalate)
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary-400" />
                    <CardTitle>Bulk Processing</CardTitle>
                  </div>
                  <CardDescription>Configure batch screening limits</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-2">
                        Max Bulk Requests
                      </label>
                      <Input
                        type="number"
                        value={config.max_bulk_requests}
                        onChange={(e) => handleConfigChange('max_bulk_requests', Number(e.target.value))}
                      />
                      <p className="text-xs text-surface-500 mt-1">Maximum entities per bulk screening request</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Workflow Settings */}
          {activeTab === 'workflow' && config && (
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-400" />
                  <CardTitle>Workflow Configuration</CardTitle>
                </div>
                <CardDescription>Configure SLA and escalation rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                      SLA Hours
                    </label>
                    <Input
                      type="number"
                      value={config.sla_hours}
                      onChange={(e) => handleConfigChange('sla_hours', Number(e.target.value))}
                    />
                    <p className="text-xs text-surface-500 mt-1">Hours before case is marked SLA breached</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                      Max Escalation Levels
                    </label>
                    <Input
                      type="number"
                      value={config.max_escalation_levels}
                      onChange={(e) => handleConfigChange('max_escalation_levels', Number(e.target.value))}
                    />
                    <p className="text-xs text-surface-500 mt-1">Maximum times a case can be escalated</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-surface-800/50 border border-surface-700">
                  <h4 className="text-sm font-medium text-surface-300 mb-3">Escalation Flow</h4>
                  <div className="flex items-center gap-3">
                    {['Analyst', 'Senior Officer', 'Manager', 'Director'].slice(0, config.max_escalation_levels + 1).map((role, i) => (
                      <>
                        {i > 0 && <span className="text-surface-600">→</span>}
                        <div key={role} className="flex-1 p-3 rounded-lg bg-surface-900/50 text-center">
                          <p className="text-xs text-surface-500">Level {i}</p>
                          <p className="text-sm font-medium text-surface-300">{role}</p>
                        </div>
                      </>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && config && (
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary-400" />
                  <CardTitle>Security Settings</CardTitle>
                </div>
                <CardDescription>Configure authentication and session policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                      Password Expiry (Days)
                    </label>
                    <Input
                      type="number"
                      value={config.password_expiry_days}
                      onChange={(e) => handleConfigChange('password_expiry_days', Number(e.target.value))}
                    />
                    <p className="text-xs text-surface-500 mt-1">Days before password must be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                      Session Timeout (Minutes)
                    </label>
                    <Input
                      type="number"
                      value={config.session_timeout_minutes}
                      onChange={(e) => handleConfigChange('session_timeout_minutes', Number(e.target.value))}
                    />
                    <p className="text-xs text-surface-500 mt-1">Inactive session timeout duration</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-surface-300">Security Features</h4>
                  <div className="space-y-2">
                    {[
                      { key: 'twoFactorAuth', label: 'Two-Factor Authentication', description: 'Require 2FA for all users' },
                      { key: 'ipWhitelisting', label: 'IP Whitelisting', description: 'Restrict access to specific IPs' },
                      { key: 'sessionBinding', label: 'Session Binding', description: 'Bind sessions to IP and device' },
                      { key: 'auditAllActions', label: 'Audit All Actions', description: 'Log all user activities' },
                    ].map((feature) => (
                      <div key={feature.key} className="flex items-center justify-between p-3 rounded-lg bg-surface-800/30">
                        <div>
                          <p className="text-sm font-medium text-surface-300">{feature.label}</p>
                          <p className="text-xs text-surface-500">{feature.description}</p>
                        </div>
                        <button
                          onClick={() => toggleSecuritySetting(feature.key as keyof typeof securitySettings)}
                          className={cn(
                            'w-12 h-6 rounded-full relative cursor-pointer transition-colors',
                            securitySettings[feature.key as keyof typeof securitySettings] ? 'bg-primary-500' : 'bg-surface-700'
                          )}
                        >
                          <div className={cn(
                            'w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow',
                            securitySettings[feature.key as keyof typeof securitySettings] ? 'right-0.5' : 'left-0.5'
                          )} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Countries Settings */}
          {activeTab === 'countries' && (
            <div className="grid grid-cols-3 gap-6">
              {/* Country List */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>GCC Countries</CardTitle>
                  <CardDescription>{countries.length} countries configured</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {countries.map((country) => (
                      <div
                        key={country.id}
                        onClick={() => setSelectedCountry(country)}
                        className={cn(
                          'p-3 rounded-lg cursor-pointer transition-all border',
                          selectedCountry?.id === country.id
                            ? 'bg-primary-600/10 border-primary-500/30'
                            : 'bg-surface-800/30 border-transparent hover:bg-surface-800/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold">
                            {country.code.slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-surface-200 text-sm">{country.name}</span>
                              {country.is_active ? (
                                <Badge variant="success">Active</Badge>
                              ) : (
                                <Badge variant="default">Inactive</Badge>
                              )}
                            </div>
                            <p className="text-xs text-surface-500">
                              {country.branches.length} branches • {country.user_count} users
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Country Details */}
              <Card variant="glass" className="col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedCountry?.name || 'Select a Country'}</CardTitle>
                      <CardDescription>Manage branches and configuration</CardDescription>
                    </div>
                    {selectedCountry && (
                      <Button onClick={() => setShowAddBranch(true)}>
                        <Plus className="w-4 h-4" />
                        Add Branch
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedCountry ? (
                    <div className="space-y-6">
                      {/* Country Info */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-surface-800/30">
                          <p className="text-xs text-surface-500 uppercase">Country Code</p>
                          <p className="text-lg font-bold text-surface-200 mt-1">{selectedCountry.code}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-surface-800/30">
                          <p className="text-xs text-surface-500 uppercase">Total Users</p>
                          <p className="text-lg font-bold text-surface-200 mt-1">{selectedCountry.user_count}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-surface-800/30">
                          <p className="text-xs text-surface-500 uppercase">Status</p>
                          <p className="text-lg font-bold text-green-400 mt-1">Active</p>
                        </div>
                      </div>

                      {/* Branches */}
                      <div>
                        <h4 className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Branches ({selectedCountry.branches.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedCountry.branches.map((branch) => (
                            <div
                              key={branch.id}
                              className="p-4 rounded-lg bg-surface-800/30 border border-surface-700/50 hover:border-surface-600 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary-400" />
                                    <span className="font-medium text-surface-200">{branch.name}</span>
                                  </div>
                                  <p className="text-xs font-mono text-surface-500 mt-1">{branch.code}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Country Settings */}
                      <div>
                        <h4 className="text-sm font-medium text-surface-300 mb-3">Country Settings</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-800/30">
                            <div>
                              <p className="text-sm font-medium text-surface-300">Local Watchlist</p>
                              <p className="text-xs text-surface-500">Enable country-specific watchlist</p>
                            </div>
                            <div className="w-12 h-6 rounded-full bg-primary-500 relative cursor-pointer">
                              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-800/30">
                            <div>
                              <p className="text-sm font-medium text-surface-300">Enhanced Due Diligence</p>
                              <p className="text-xs text-surface-500">Require additional verification steps</p>
                            </div>
                            <div className="w-12 h-6 rounded-full bg-surface-700 relative cursor-pointer">
                              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-800/30">
                            <div>
                              <p className="text-sm font-medium text-surface-300">Auto-Escalate High Risk</p>
                              <p className="text-xs text-surface-500">Automatically escalate high-risk matches</p>
                            </div>
                            <div className="w-12 h-6 rounded-full bg-primary-500 relative cursor-pointer">
                              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-surface-500">
                      <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Select a country to view details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Add Branch Modal */}
      {showAddBranch && selectedCountry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface-900 rounded-xl border border-surface-700 shadow-xl"
          >
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-surface-100">Add Branch</h3>
                <p className="text-sm text-surface-500">Add new branch to {selectedCountry.name}</p>
              </div>
              <button onClick={() => setShowAddBranch(false)} className="p-2 rounded-lg hover:bg-surface-800 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Input label="Branch Name *" placeholder="e.g., Al Wakra Branch" />
              <Input label="Branch Code *" placeholder="e.g., WAK001" />
              <Input label="Address" placeholder="Branch address..." />
            </div>
            <div className="p-6 border-t border-surface-700 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowAddBranch(false)}>Cancel</Button>
              <Button onClick={() => { setShowAddBranch(false); alert('Branch added successfully!'); }}>
                <Save className="w-4 h-4" />
                Add Branch
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
