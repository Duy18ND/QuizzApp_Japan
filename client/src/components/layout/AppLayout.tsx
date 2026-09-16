import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Sun,
  Moon,
  List,
  BookOpen,
  BrainCircuit,
  Layers,
  FileText
} from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../../hooks/useTheme';
import { ExportPDFModal } from '../pdf/ExportPDFModal';

const mainNavItems = [
  { id: 'list', path: '/vocabulary', label: 'Danh sách', icon: List },
  { id: 'grammar', path: '/grammar', label: 'Grammar', icon: BookOpen },
  { id: 'quiz', path: '/vocabulary/quiz', label: 'Luyện Quiz', icon: BrainCircuit },
  { id: 'flashcards', path: '/flashcard', label: 'Flashcard', icon: Layers },
];

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      
      {/* Header */}
      <header className="flex-none bg-white border-b border-gray-200 dark:bg-gray-950 dark:border-gray-800 transition-colors duration-200 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <Link to="/vocabulary" className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Nihon<span className="text-indigo-500">Master</span></h1>
              <span className="ml-3 hidden sm:inline-block text-xs font-medium text-gray-500 dark:text-gray-400">
                Mimi kara Oboeru N3
              </span>
            </Link>

            {/* Right Side Actions */}
            <div className="flex-shrink-0 flex items-center gap-4">
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
          </div>
        </div>
      </header>

      {/* Main Navigation (Centered) */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm z-10 shrink-0">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <nav className="flex items-center md:justify-center gap-2 overflow-x-auto hide-scrollbar">
            {mainNavItems.map((item) => {
              // Exact match or sub-routes match logic
              const isActive = 
                (item.path === '/vocabulary' && (location.pathname === '/vocabulary' || location.pathname.match(/^\/vocabulary\/(N[1-5]|n[1-5])/))) ||
                (item.path !== '/vocabulary' && location.pathname.startsWith(item.path));

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={clsx(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap",
                    isActive 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            
            <button
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <FileText className="w-4 h-4" />
              Xuất PDF
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Export PDF Modal */}
      {isExportOpen && <ExportPDFModal onClose={() => setIsExportOpen(false)} />}
    </div>
  );
};
