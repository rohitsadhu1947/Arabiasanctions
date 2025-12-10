import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { 
  Users as UsersIcon, 
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Building,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Key,
  Mail,
  UserPlus,
  X,
  Save,
} from 'lucide-react';
import { cn, formatDateTime } from '../lib/utils';
import { motion } from 'framer-motion';
import { adminApi } from '../lib/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  country_id: number;
  country_name: string;
  branch_id: number | null;
  branch_name: string | null;
  roles: string[];
  permissions: string[];
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  user_count: number;
  created_at: string;
}

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
}

interface Country {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  branches: Array<{ id: number; code: string; name: string }>;
  user_count: number;
}

export function Users() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showEditRole, setShowEditRole] = useState<Role | null>(null);
  
  // Form states
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    password: '',
    country_id: 1,
    branch_id: '',
    role_id: 4,
  });
  
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [page, countryFilter, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, permissionsRes, countriesRes] = await Promise.all([
        adminApi.getUsers({ page: 1, page_size: 20 }),
        adminApi.getRoles(),
        adminApi.getPermissions(),
        adminApi.getCountries(),
      ]);

      if (usersRes.success) {
        setUsers(usersRes.data);
        setTotalPages(usersRes.pagination?.total_pages || 1);
      }
      if (rolesRes.success) setRoles(rolesRes.data);
      if (permissionsRes.success) setPermissions(permissionsRes.data);
      if (countriesRes.success) setCountries(countriesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await adminApi.getUsers({
        page,
        page_size: 20,
        search: search || undefined,
        country_id: countryFilter || undefined,
      });
      if (response.success) {
        setUsers(response.data);
        setTotalPages(response.pagination?.total_pages || 1);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      alert('Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      const response = await adminApi.createUser({
        full_name: newUser.full_name,
        email: newUser.email,
        password: newUser.password,
        country_id: newUser.country_id,
        branch_id: newUser.branch_id ? Number(newUser.branch_id) : null,
        role_ids: [newUser.role_id],
        is_active: true,
      });
      
      if (response.success) {
        setShowAddUser(false);
        setNewUser({ full_name: '', email: '', password: '', country_id: 1, branch_id: '', role_id: 4 });
        await loadUsers();
        alert('User created successfully!');
      }
    } catch (error: any) {
      console.error('Failed to create user:', error);
      alert(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name || !newRole.description) {
      alert('Please fill in role name and description');
      return;
    }
    
    setSaving(true);
    try {
      const response = await adminApi.createRole({
        name: newRole.name,
        description: newRole.description,
        permission_ids: [],
      });
      
      if (response.success) {
        setShowAddRole(false);
        setNewRole({ name: '', description: '', permissions: [] });
        await loadData();
        alert('Role created successfully!');
      }
    } catch (error: any) {
      console.error('Failed to create role:', error);
      alert(error.response?.data?.detail || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      await adminApi.updateUser(user.id, { is_active: !user.is_active });
      await loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  // Get branches for selected country
  const selectedCountryBranches = countries.find(c => c.id === newUser.country_id)?.branches || [];

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

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
          <h1 className="text-2xl font-bold text-surface-100">User Management</h1>
          <p className="text-surface-400 mt-1">Manage users, roles, and permissions</p>
        </div>
        {activeTab === 'users' && (
          <Button onClick={() => setShowAddUser(true)}>
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
        )}
        {activeTab === 'roles' && (
          <Button onClick={() => setShowAddRole(true)}>
            <Plus className="w-4 h-4" />
            Add Role
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Total Users</p>
              <p className="text-2xl font-bold text-surface-100 mt-0.5">{users.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-primary-400" />
            </div>
          </div>
        </Card>
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Active Users</p>
              <p className="text-2xl font-bold text-green-400 mt-0.5">{users.filter(u => u.is_active).length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </Card>
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Roles</p>
              <p className="text-2xl font-bold text-surface-100 mt-0.5">{roles.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </Card>
        <Card variant="glass" className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Countries</p>
              <p className="text-2xl font-bold text-surface-100 mt-0.5">{countries.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-surface-800">
        {(['users', 'roles', 'permissions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize',
              activeTab === tab
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-surface-500 hover:text-surface-300'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-3 gap-6">
          <Card variant="glass" className="col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>Manage system users and access</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    icon={<Search className="w-4 h-4" />}
                  />
                </div>
                <select
                  value={countryFilter}
                  onChange={(e) => { setCountryFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
                  className="h-10 px-3 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200"
                >
                  <option value="">All Countries</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Button onClick={handleSearch}>Search</Button>
              </div>

              {/* Users List */}
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={cn(
                      'p-4 rounded-lg cursor-pointer transition-all border',
                      selectedUser?.id === user.id
                        ? 'bg-primary-600/10 border-primary-500/30'
                        : 'bg-surface-800/30 border-transparent hover:bg-surface-800/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-medium">
                          {user.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-surface-200">{user.full_name}</span>
                            {user.is_active ? (
                              <Badge variant="success">Active</Badge>
                            ) : (
                              <Badge variant="default">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-surface-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="purple">{role}</Badge>
                          ))}
                        </div>
                        <p className="text-xs text-surface-500 mt-1">
                          {user.country_name} • {user.branch_name || 'All Branches'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-800">
                  <span className="text-sm text-surface-500">Page {page} of {totalPages}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Detail */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>User Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedUser ? (
                <div className="space-y-4">
                  <div className="text-center pb-4 border-b border-surface-800">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-medium">
                      {selectedUser.full_name.charAt(0)}
                    </div>
                    <h3 className="text-lg font-medium text-surface-100 mt-3">{selectedUser.full_name}</h3>
                    <p className="text-sm text-surface-500">{selectedUser.email}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-surface-500">Status</span>
                      {selectedUser.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-surface-500">Country</span>
                      <span className="text-sm text-surface-200">{selectedUser.country_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-surface-500">Branch</span>
                      <span className="text-sm text-surface-200">{selectedUser.branch_name || 'All Branches'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-surface-500">Last Login</span>
                      <span className="text-sm text-surface-200">
                        {selectedUser.last_login ? formatDateTime(selectedUser.last_login) : 'Never'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-surface-500">Created</span>
                      <span className="text-sm text-surface-200">{formatDateTime(selectedUser.created_at)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-surface-800">
                    <h4 className="text-sm font-medium text-surface-300 mb-2">Roles</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.roles.map((role) => (
                        <Badge key={role} variant="purple">{role}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-surface-800">
                    <h4 className="text-sm font-medium text-surface-300 mb-2">Permissions</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedUser.permissions.slice(0, 8).map((perm) => (
                        <span key={perm} className="text-xs px-2 py-1 bg-surface-800 rounded text-surface-400">
                          {perm}
                        </span>
                      ))}
                      {selectedUser.permissions.length > 8 && (
                        <span className="text-xs px-2 py-1 bg-surface-800 rounded text-surface-500">
                          +{selectedUser.permissions.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <Button 
                      variant="secondary" 
                      className="flex-1"
                      onClick={() => handleToggleUserStatus(selectedUser)}
                    >
                      {selectedUser.is_active ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button variant="secondary" className="flex-1">
                      <Key className="w-4 h-4" />
                      Reset Password
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-surface-500">
                  Select a user to view details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-2 gap-6">
          {roles.map((role) => (
            <Card key={role.id} variant="glass">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-400" />
                      <h3 className="font-medium text-surface-200">{role.name}</h3>
                    </div>
                    <p className="text-sm text-surface-500 mt-1">{role.description}</p>
                    <p className="text-xs text-surface-600 mt-2">{role.user_count} users assigned</p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => setShowEditRole(role)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t border-surface-800">
                  <h4 className="text-xs font-medium text-surface-500 uppercase mb-2">Permissions</h4>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 6).map((perm) => (
                      <span key={perm} className="text-xs px-2 py-1 bg-surface-800/50 rounded text-surface-400">
                        {perm}
                      </span>
                    ))}
                    {role.permissions.length > 6 && (
                      <span className="text-xs px-2 py-1 bg-surface-800/50 rounded text-surface-500">
                        +{role.permissions.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {Object.entries(permissionsByCategory).map(([category, perms]) => (
            <Card key={category} variant="glass">
              <CardHeader>
                <CardTitle className="capitalize">{category}</CardTitle>
                <CardDescription>{perms.length} permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {perms.map((perm) => (
                    <div key={perm.id} className="p-3 rounded-lg bg-surface-800/30 border border-surface-700/50">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-primary-400" />
                        <span className="font-mono text-sm text-surface-300">{perm.code}</span>
                      </div>
                      <p className="text-xs text-surface-500 mt-1">{perm.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-surface-900 rounded-xl border border-surface-700 shadow-xl"
          >
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-surface-100">Add New User</h3>
                <p className="text-sm text-surface-500">Create a new user account</p>
              </div>
              <button onClick={() => setShowAddUser(false)} className="p-2 rounded-lg hover:bg-surface-800 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Input 
                label="Full Name *" 
                placeholder="Enter full name"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              />
              <Input 
                label="Email Address *" 
                type="email" 
                placeholder="user@company.qa"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
              <Input 
                label="Password *" 
                type="password" 
                placeholder="Enter password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Country *</label>
                  <select 
                    value={newUser.country_id}
                    onChange={(e) => setNewUser({ ...newUser, country_id: Number(e.target.value), branch_id: '' })}
                    className="w-full h-10 px-3 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200"
                  >
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Branch</label>
                  <select 
                    value={newUser.branch_id}
                    onChange={(e) => setNewUser({ ...newUser, branch_id: e.target.value })}
                    className="w-full h-10 px-3 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200"
                  >
                    <option value="">All Branches</option>
                    {selectedCountryBranches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Role *</label>
                <select 
                  value={newUser.role_id}
                  onChange={(e) => setNewUser({ ...newUser, role_id: Number(e.target.value) })}
                  className="w-full h-10 px-3 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowAddUser(false)}>Cancel</Button>
              <Button onClick={handleCreateUser} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Create User
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-surface-900 rounded-xl border border-surface-700 shadow-xl"
          >
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-surface-100">Add New Role</h3>
                <p className="text-sm text-surface-500">Create a new role with permissions</p>
              </div>
              <button onClick={() => setShowAddRole(false)} className="p-2 rounded-lg hover:bg-surface-800 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Input 
                label="Role Name *" 
                placeholder="e.g., Senior Analyst"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Description *</label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Describe the role's responsibilities..."
                  className="w-full h-20 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Permissions</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category} className="p-3 rounded-lg bg-surface-800/30">
                      <p className="text-xs font-medium text-surface-500 uppercase mb-2">{category}</p>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((perm) => (
                          <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newRole.permissions.includes(perm.code)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewRole({ ...newRole, permissions: [...newRole.permissions, perm.code] });
                                } else {
                                  setNewRole({ ...newRole, permissions: newRole.permissions.filter(p => p !== perm.code) });
                                }
                              }}
                              className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500"
                            />
                            <span className="text-xs text-surface-400">{perm.code}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowAddRole(false)}>Cancel</Button>
              <Button onClick={handleCreateRole} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Create Role
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-surface-900 rounded-xl border border-surface-700 shadow-xl"
          >
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-surface-100">Edit Role: {showEditRole.name}</h3>
                <p className="text-sm text-surface-500">Modify role permissions</p>
              </div>
              <button onClick={() => setShowEditRole(null)} className="p-2 rounded-lg hover:bg-surface-800 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Input 
                label="Role Name" 
                defaultValue={showEditRole.name}
              />
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Description</label>
                <textarea
                  defaultValue={showEditRole.description}
                  className="w-full h-20 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Current Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {showEditRole.permissions.map((perm) => (
                    <span key={perm} className="text-xs px-2 py-1 bg-primary-500/20 text-primary-400 rounded">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowEditRole(null)}>Cancel</Button>
              <Button onClick={() => { setShowEditRole(null); alert('Role updated successfully!'); }}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
