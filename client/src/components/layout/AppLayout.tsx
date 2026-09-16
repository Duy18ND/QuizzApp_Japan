import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  Settings,
  Sun,
  Moon
} from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../../hooks/useTheme';

const navItems = [
  { path: '/vocabulary', label: 'Dashboard', icon: Home },
];

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 dark:bg-gray-950 dark:border-gray-800 transition-colors duration-200">
        <Link to="/vocabulary" className="p-6 block hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Nihon<span className="text-indigo-500">Master</span></h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mimi kara Oboeru N3</p>
        </Link>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                             (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 transition-colors duration-200">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Cài đặt
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800 shrink-0 transition-colors duration-200 z-10">
          <div className="flex-1">
            {/* Can add breadcrumbs or title here based on route */}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold text-white shadow-sm">
              N3
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 pb-24 md:p-8 md:pb-8 relative">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-gray-950 dark:border-gray-800 flex justify-around p-2 z-50 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.5)] transition-colors duration-200">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path || 
                           (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              )}
            >
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
