import { Bell, Search, Globe, Sun, Moon } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <header className="h-16 border-b border-surface-800 bg-surface-900/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Search */}
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            placeholder="Search screenings, cases, entities..."
            className="w-full h-10 pl-10 pr-4 bg-surface-800/50 border border-surface-700 rounded-lg text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-surface-500 bg-surface-700 rounded">
            ⌘K
          </kbd>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Country Selector */}
          <button className="flex items-center gap-2 h-9 px-3 bg-surface-800/50 border border-surface-700 rounded-lg text-sm text-surface-300 hover:text-surface-100 hover:border-surface-600 transition-colors">
            <Globe className="w-4 h-4" />
            <span>UAE</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}

