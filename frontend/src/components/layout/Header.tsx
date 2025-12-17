import { Bell, Search, Globe, Sun, Moon, X, ChevronDown, AlertTriangle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// GCC Countries
const COUNTRIES = [
  { code: 'QAT', name: 'Qatar', flag: '🇶🇦' },
  { code: 'UAE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SAU', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'KWT', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'BHR', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'OMN', name: 'Oman', flag: '🇴🇲' },
  { code: 'ALL', name: 'All Countries', flag: '🌍' },
];

// Mock notifications
const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    type: 'alert',
    title: 'High-Risk Match Found',
    message: 'Mohammad Al-Rashid matched against OFAC SDN with 96% confidence',
    time: '5 minutes ago',
    read: false,
    link: '/workflow',
  },
  {
    id: 2,
    type: 'warning',
    title: 'SLA Breach Warning',
    message: 'Case WF-20241217-ABC123 approaching SLA deadline in 2 hours',
    time: '15 minutes ago',
    read: false,
    link: '/workflow',
  },
  {
    id: 3,
    type: 'info',
    title: 'Sanctions List Updated',
    message: 'OFAC SDN list updated with 23 new entries',
    time: '1 hour ago',
    read: false,
    link: '/admin/lists',
  },
  {
    id: 4,
    type: 'success',
    title: 'Daily Screening Complete',
    message: '45,678 entities screened. 12 new matches requiring review.',
    time: '2 hours ago',
    read: true,
    link: '/daily-screening',
  },
  {
    id: 5,
    type: 'alert',
    title: 'Escalation Required',
    message: 'Case escalated by Sarah Johnson requires your approval',
    time: '3 hours ago',
    read: true,
    link: '/workflow',
  },
];

export function Header() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  
  const [selectedCountry, setSelectedCountry] = useState(() => {
    const saved = localStorage.getItem('selected_country');
    return saved || 'QAT';
  });
  
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const countryRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Theme toggle
  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    // Note: Full light mode would require significant CSS changes
    // For now, we show a toast indicating the preference is saved
  }, [darkMode]);

  // Country selection
  const handleCountrySelect = (code: string) => {
    setSelectedCountry(code);
    localStorage.setItem('selected_country', code);
    setShowCountryDropdown(false);
    // In a real app, this would filter data across the application
  };

  // Mark notification as read
  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Handle notification click
  const handleNotificationClick = (notif: typeof notifications[0]) => {
    markAsRead(notif.id);
    setShowNotifications(false);
    navigate(notif.link);
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      default: return <Bell className="w-4 h-4 text-blue-400" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentCountry = COUNTRIES.find(c => c.code === selectedCountry);

  // Search functionality
  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/screening?q=${encodeURIComponent(searchQuery)}`);
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="h-16 border-b border-surface-800 bg-surface-900/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Search */}
        <div className="relative w-96" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(e.target.value.length > 0);
            }}
            onKeyDown={handleSearch}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            placeholder="Search screenings, cases, entities..."
            className="w-full h-10 pl-10 pr-12 bg-surface-800/50 border border-surface-700 rounded-lg text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-surface-500 bg-surface-700 rounded">
            ⌘K
          </kbd>
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface-800 border border-surface-700 rounded-lg shadow-xl overflow-hidden z-50">
              <div className="p-3 border-b border-surface-700">
                <p className="text-xs text-surface-400">Press Enter to search for "{searchQuery}"</p>
              </div>
              <div className="p-2">
                <button
                  onClick={() => {
                    navigate(`/screening?q=${encodeURIComponent(searchQuery)}`);
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-700 transition-colors text-left"
                >
                  <Search className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-surface-200">Screen "{searchQuery}"</span>
                </button>
                <button
                  onClick={() => {
                    navigate(`/workflow?search=${encodeURIComponent(searchQuery)}`);
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-700 transition-colors text-left"
                >
                  <Search className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-surface-200">Search cases for "{searchQuery}"</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Country Selector */}
          <div className="relative" ref={countryRef}>
            <button
              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              className="flex items-center gap-2 h-9 px-3 bg-surface-800/50 border border-surface-700 rounded-lg text-sm text-surface-300 hover:text-surface-100 hover:border-surface-600 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>{currentCountry?.flag} {currentCountry?.code}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCountryDropdown && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-surface-800 border border-surface-700 rounded-lg shadow-xl overflow-hidden z-50">
                <div className="p-2 border-b border-surface-700">
                  <p className="text-xs text-surface-400 px-2">Select Operating Country</p>
                </div>
                <div className="py-1">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => handleCountrySelect(country.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        selectedCountry === country.code
                          ? 'bg-primary-600/20 text-primary-400'
                          : 'text-surface-300 hover:bg-surface-700'
                      }`}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span>{country.name}</span>
                      {selectedCountry === country.code && (
                        <CheckCircle className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => {
              setDarkMode(!darkMode);
              // Show toast feedback
              const toast = document.createElement('div');
              toast.className = 'fixed bottom-4 right-4 bg-surface-800 border border-surface-700 text-surface-200 px-4 py-2 rounded-lg shadow-xl z-50 animate-fade-in';
              toast.innerHTML = `Theme preference saved: ${!darkMode ? 'Dark' : 'Light'} mode`;
              document.body.appendChild(toast);
              setTimeout(() => toast.remove(), 2000);
            }}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              darkMode 
                ? 'text-yellow-400 hover:bg-yellow-500/20' 
                : 'text-blue-400 hover:bg-blue-500/20'
            }`}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                showNotifications 
                  ? 'bg-primary-600/20 text-primary-400' 
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full px-1">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-96 bg-surface-800 border border-surface-700 rounded-lg shadow-xl overflow-hidden z-50">
                <div className="p-3 border-b border-surface-700 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-surface-200">Notifications</h3>
                    <p className="text-xs text-surface-400">{unreadCount} unread</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-primary-400 hover:text-primary-300"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded hover:bg-surface-700"
                    >
                      <X className="w-4 h-4 text-surface-400" />
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                      <p className="text-sm text-surface-400">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full flex gap-3 p-3 border-b border-surface-700/50 hover:bg-surface-700/50 transition-colors text-left ${
                          !notif.read ? 'bg-surface-700/30' : ''
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium ${!notif.read ? 'text-surface-100' : 'text-surface-300'}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{notif.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-surface-500">{notif.time}</span>
                            <ExternalLink className="w-3 h-3 text-surface-500" />
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-surface-700">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/audit');
                    }}
                    className="w-full py-2 text-xs text-center text-primary-400 hover:text-primary-300 hover:bg-surface-700 rounded transition-colors"
                  >
                    View All Activity
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
