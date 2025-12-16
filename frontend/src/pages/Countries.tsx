import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { 
  Globe, 
  Building, 
  MapPin,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Save,
  X,
  Users,
  Flag,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { adminApi } from '../lib/api';

interface Country {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  branches: Array<{ id: number; code: string; name: string }>;
  user_count: number;
}

export function Countries() {
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [showAddCountry, setShowAddCountry] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', code: '' });
  const [newCountry, setNewCountry] = useState({ name: '', code: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getCountries();
      if (response.success) {
        setCountries(response.data);
        if (response.data.length > 0 && !selectedCountry) {
          setSelectedCountry(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load countries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = () => {
    if (!selectedCountry || !newBranch.name || !newBranch.code) return;
    
    const branchData = {
      id: Date.now(),
      name: newBranch.name,
      code: newBranch.code,
    };
    
    setCountries(prev => prev.map(c => 
      c.id === selectedCountry.id 
        ? { ...c, branches: [...c.branches, branchData] }
        : c
    ));
    
    setSelectedCountry(prev => prev ? {
      ...prev,
      branches: [...prev.branches, branchData]
    } : null);
    
    setShowAddBranch(false);
    setNewBranch({ name: '', code: '' });
  };

  const handleAddCountry = () => {
    if (!newCountry.name || !newCountry.code) return;
    
    const countryData: Country = {
      id: Date.now(),
      name: newCountry.name,
      code: newCountry.code.toUpperCase(),
      is_active: true,
      branches: [],
      user_count: 0,
    };
    
    setCountries(prev => [...prev, countryData]);
    setSelectedCountry(countryData);
    setShowAddCountry(false);
    setNewCountry({ name: '', code: '' });
  };

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-surface-100">Countries & Branches</h1>
          <p className="text-surface-400 mt-1">Manage GCC countries and their branch offices</p>
        </div>
        <Button onClick={() => setShowAddCountry(true)}>
          <Plus className="w-4 h-4" />
          Add Country
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Total Countries</p>
              <p className="text-2xl font-bold text-surface-100 mt-0.5">{countries.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary-400" />
            </div>
          </div>
        </Card>
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Total Branches</p>
              <p className="text-2xl font-bold text-surface-100 mt-0.5">
                {countries.reduce((sum, c) => sum + c.branches.length, 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </Card>
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Active Countries</p>
              <p className="text-2xl font-bold text-green-400 mt-0.5">
                {countries.filter(c => c.is_active).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </Card>
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Total Users</p>
              <p className="text-2xl font-bold text-surface-100 mt-0.5">
                {countries.reduce((sum, c) => sum + c.user_count, 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Country List */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>GCC Countries</CardTitle>
            <CardDescription>Select a country to manage</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <Input 
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            
            <div className="space-y-2">
              {filteredCountries.map((country) => (
                <div
                  key={country.id}
                  onClick={() => setSelectedCountry(country)}
                  className={cn(
                    'p-4 rounded-lg cursor-pointer transition-all border',
                    selectedCountry?.id === country.id
                      ? 'bg-primary-600/10 border-primary-500/30'
                      : 'bg-surface-800/30 border-transparent hover:bg-surface-800/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold">
                      {country.code.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-surface-200">{country.name}</span>
                        {country.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {country.branches.length} branches • {country.user_count} users
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredCountries.length === 0 && (
                <div className="text-center py-8 text-surface-500">
                  <Globe className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No countries found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Country Details */}
        <Card variant="glass" className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedCountry?.name || 'Select a Country'}</CardTitle>
                <CardDescription>
                  {selectedCountry ? `Code: ${selectedCountry.code}` : 'Choose a country to view details'}
                </CardDescription>
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
                    <p className={`text-lg font-bold mt-1 ${selectedCountry.is_active ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedCountry.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>

                {/* Branches */}
                <div>
                  <h4 className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Branches ({selectedCountry.branches.length})
                  </h4>
                  
                  {selectedCountry.branches.length > 0 ? (
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
                  ) : (
                    <div className="text-center py-8 text-surface-500 bg-surface-800/20 rounded-lg">
                      <Building className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No branches configured</p>
                      <Button 
                        variant="secondary" 
                        className="mt-3"
                        onClick={() => setShowAddBranch(true)}
                      >
                        <Plus className="w-4 h-4" />
                        Add First Branch
                      </Button>
                    </div>
                  )}
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
                        <p className="text-xs text-surface-500">Require additional verification</p>
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
                <p>Select a country from the list to view and manage branches</p>
              </div>
            )}
          </CardContent>
        </Card>
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
              <Input 
                label="Branch Name *" 
                placeholder="e.g., Al Wakra Branch"
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
              />
              <Input 
                label="Branch Code *" 
                placeholder="e.g., WAK001"
                value={newBranch.code}
                onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
              />
            </div>
            <div className="p-6 border-t border-surface-700 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowAddBranch(false); setNewBranch({ name: '', code: '' }); }}>
                Cancel
              </Button>
              <Button onClick={handleAddBranch} disabled={!newBranch.name || !newBranch.code}>
                <Save className="w-4 h-4" />
                Add Branch
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Country Modal */}
      {showAddCountry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface-900 rounded-xl border border-surface-700 shadow-xl"
          >
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-surface-100">Add Country</h3>
                <p className="text-sm text-surface-500">Add a new country to the system</p>
              </div>
              <button onClick={() => setShowAddCountry(false)} className="p-2 rounded-lg hover:bg-surface-800 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Input 
                label="Country Name *" 
                placeholder="e.g., United Arab Emirates"
                value={newCountry.name}
                onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
              />
              <Input 
                label="Country Code (3 letters) *" 
                placeholder="e.g., UAE"
                value={newCountry.code}
                onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value.toUpperCase().slice(0, 3) })}
                maxLength={3}
              />
            </div>
            <div className="p-6 border-t border-surface-700 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowAddCountry(false); setNewCountry({ name: '', code: '' }); }}>
                Cancel
              </Button>
              <Button onClick={handleAddCountry} disabled={!newCountry.name || !newCountry.code}>
                <Save className="w-4 h-4" />
                Add Country
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

