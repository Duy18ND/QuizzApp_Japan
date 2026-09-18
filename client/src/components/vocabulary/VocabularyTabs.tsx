import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { List, BrainCircuit, Layers, FileText } from 'lucide-react';

interface Props {
  onExportPDF?: () => void;
}

export const VocabularyTabs: React.FC<Props> = ({ onExportPDF }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'list', label: 'Danh sách', icon: List, path: '/vocabulary' },
    { id: 'quiz', label: 'Luyện Quiz', icon: BrainCircuit, path: '/vocabulary/quiz' },
    { id: 'flashcards', label: 'Flashcard', icon: Layers, path: '/flashcard' },
    { id: 'pdf', label: 'Xuất PDF', icon: FileText, onClick: onExportPDF },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 -mt-4 md:-mt-8 mb-6 py-4 px-4 sm:px-6 md:px-8 -mx-4 sm:-mx-6 md:-mx-8">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 shadow-sm flex overflow-x-auto hide-scrollbar gap-2 relative max-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.path && location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.onClick) tab.onClick();
                else if (tab.path) navigate(tab.path);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-blue-600 text-gray-900 shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
