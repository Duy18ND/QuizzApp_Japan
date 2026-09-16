import React from 'react';

interface QuizNavigationProps {
  onBack: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  canGoNext: boolean;
}

export const QuizNavigation: React.FC<QuizNavigationProps> = ({ 
  onBack, 
  onNext, 
  isFirst, 
  isLast, 
  canGoNext 
}) => {
  return (
    <div className="flex justify-between items-center mt-8 gap-4">
      <button
        onClick={onBack}
        disabled={isFirst}
        className="flex-1 md:flex-none px-6 py-4 md:py-3 rounded-xl md:rounded-lg font-bold transition-colors bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-0 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-center"
      >
        Quay lại
      </button>
      
      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="flex-1 md:flex-none px-8 py-4 md:py-3 rounded-xl md:rounded-lg font-bold transition-colors bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-center shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
      >
        {isLast ? "Hoàn thành" : "Tiếp theo"}
      </button>
    </div>
  );
};
