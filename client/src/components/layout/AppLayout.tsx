import React from 'react';
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
import logoIcon from '../../assets/icon.png';

const mainNavItems = [
  { id: 'list', path: '/vocabulary', label: 'Danh sách', icon: List },
  { id: 'grammar', path: '/grammar', label: 'Ngữ pháp', icon: BookOpen },
  { id: 'quiz', path: '/vocabulary/quiz', label: 'Luyện Quiz', icon: BrainCircuit },
  { id: 'flashcards', path: '/flashcard', label: 'Flashcard', icon: Layers },
  { id: 'pdf', path: '/pdf', label: 'Xuất PDF', icon: FileText },
];

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden text-gray-900 dark:bg-gray-900 dark:text-gray-100 font-sans transition-colors duration-200" style={{ backgroundColor: 'var(--background)' }}>
      
      {/* Unified Header & Navigation */}
      <header className="flex-none bg-white border-b border-gray-200 dark:bg-[#0f172a] dark:border-gray-800 transition-colors duration-200 z-40 shadow-sm relative">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-14 md:h-16 gap-4">
            
            {/* Logo */}
            <div className="flex-1 flex justify-start">
              <Link to="/" className="flex items-center gap-2 flex-shrink-0 mr-2 md:mr-4">
                <img src={logoIcon} alt="Nihongo 問" className="w-8 h-8 object-contain rounded-md" />
                <span className="font-bold text-lg md:text-xl whitespace-nowrap text-gray-900 dark:text-white hidden sm:block">Nihongo 問</span>
              </Link>
            </div>

            {/* Main Navigation (Center) */}
            <nav className="flex items-center justify-center gap-1 md:gap-2 overflow-x-auto hide-scrollbar flex-shrink-0">
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
                      "flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
                      isActive 
                        ? "bg-blue-100 text-blue-900 shadow-sm ring-1 ring-blue-400" 
                        : "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Side Actions */}
            <div className="flex-1 flex justify-end">
              <div className="flex-shrink-0 flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-gray-200 dark:border-gray-700">
              <button
                onClick={toggleTheme}
                className="p-2 md:px-3 md:py-2 flex items-center gap-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <>
                    <Moon className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden lg:inline font-medium text-sm">Midnight</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden lg:inline font-medium text-sm">Ice Blue</span>
                  </>
                )}
              </button>
              </div>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative flex flex-col">
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8 flex-1 flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
