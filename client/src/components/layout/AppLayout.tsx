import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  Settings
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/vocabulary', label: 'Từ vựng', icon: BookOpen },
];

export const AppLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-950 border-r border-gray-800">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white tracking-tight">Nihon<span className="text-indigo-500">Master</span></h1>
          <p className="text-xs text-gray-400 mt-1">Mimi kara Oboeru N3</p>
        </div>

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
                    ? "bg-indigo-500/10 text-indigo-400" 
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Cài đặt
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-gray-900 border-b border-gray-800 shrink-0">
          <div className="flex-1">
            {/* Can add breadcrumbs or title here based on route */}
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold shadow-sm">
              N3
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 flex justify-around p-2 z-50 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.5)]">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path || 
                           (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                isActive ? "text-indigo-400" : "text-gray-500"
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
