import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface QuizHeaderProps {
  current: number;
  total: number;
  score: { correct: number; wrong: number };
}

export const QuizHeader: React.FC<QuizHeaderProps> = ({ current, total, score }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Câu hỏi {current} / {total}</h1>
      <div className="flex items-center space-x-4 bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="flex items-center text-red-600 dark:text-red-400 font-semibold">
          <XCircle className="w-5 h-5 mr-1.5" />
          <span>{score.wrong}</span>
        </div>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 transition-colors"></div>
        <div className="flex items-center text-green-600 dark:text-green-400 font-semibold">
          <CheckCircle2 className="w-5 h-5 mr-1.5" />
          <span>{score.correct}</span>
        </div>
      </div>
    </div>
  );
};
