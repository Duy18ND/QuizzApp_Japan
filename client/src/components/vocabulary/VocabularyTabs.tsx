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
    <div className="sticky top-0 z-50 -mt-4 md:-mt-8 pt-4 md:pt-8 pb-4 mb-6">
      {/* Lớp nền mở rộng full màn hình để che chữ khi cuộn */}
      <div className="absolute inset-y-0 -left-[50vw] w-[200vw] bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 -z-10 transition-colors pointer-events-none"></div>
      
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 shadow-sm flex overflow-x-auto hide-scrollbar gap-2 relative">
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
                  ? 'bg-indigo-600 text-white shadow-md' 
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
