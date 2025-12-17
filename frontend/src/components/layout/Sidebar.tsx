import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Search,
  FileText,
  Users,
  Settings,
  ShieldCheck,
  BarChart3,
  ClipboardList,
  Building2,
  LogOut,
  ChevronLeft,
  Network,
  Radar,

  Calendar,
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Command Center', href: '/command-center', icon: Radar, badge: 'NEW' },
  { name: 'Screening', href: '/screening', icon: Search },
  { name: 'Daily Screening', href: '/daily-screening', icon: Calendar },
  { name: 'Entity Graph', href: '/entity-graph', icon: Network, badge: 'NEW' },
  { name: 'Workflow', href: '/workflow', icon: ClipboardList },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Audit Log', href: '/audit', icon: FileText },
];

const adminNavigation = [
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Sanction Lists', href: '/admin/lists', icon: ShieldCheck },
  { name: 'Countries', href: '/admin/countries', icon: Building2 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      className="fixed left-0 top-0 h-screen bg-surface-900 border-r border-surface-800 flex flex-col z-50"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="font-semibold text-surface-100">ScreenGuard</span>
              <span className="text-xs text-surface-500 block">Compliance Engine</span>
            </motion.div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary-600/10 text-primary-400'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary-400')} />
                {!collapsed && (
                  <span className="font-medium text-sm">{item.name}</span>
                )}
                {!collapsed && 'badge' in item && item.badge && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-violet-500 text-white rounded">
                    {item.badge}
                  </span>
                )}
                {isActive && !collapsed && !('badge' in item) && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400" />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Admin Section */}
        <div className="mt-8">
          {!collapsed && (
            <div className="px-3 mb-2">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Administration
              </span>
            </div>
          )}
          <div className="space-y-1">
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-primary-600/10 text-primary-400'
                      : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="font-medium text-sm">{item.name}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-surface-800">
        <div className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-800 transition-colors cursor-pointer',
          collapsed && 'justify-center px-2'
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium text-sm">
            A
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-200 truncate">Admin User</p>
              <p className="text-xs text-surface-500 truncate">admin@insurance.com</p>
            </div>
          )}
          {!collapsed && (
            <button 
              onClick={handleLogout}
              className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

