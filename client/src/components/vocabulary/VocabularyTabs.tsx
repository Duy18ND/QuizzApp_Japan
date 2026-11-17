import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BrainCircuit, FileText, Layers, List } from 'lucide-react';
import { cn } from '../../lib/cn';
import { tabStyles } from '../ui';

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
    <div
      role="navigation"
      aria-label="Phân mục từ vựng"
      className="hide-scrollbar mb-6 flex gap-1.5 overflow-x-auto border-b border-line pb-3"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = Boolean(tab.path && location.pathname.startsWith(tab.path));
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (tab.onClick) tab.onClick();
              else if (tab.path) navigate(tab.path);
            }}
            aria-current={isActive ? 'page' : undefined}
            className={cn(tabStyles(isActive, 'pill'), 'shrink-0')}
          >
            <Icon className="size-4" aria-hidden />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
