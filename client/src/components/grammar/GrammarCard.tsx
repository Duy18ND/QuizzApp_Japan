import React from 'react';
import { Link } from 'react-router-dom';
import type { GrammarRule } from '../../types/grammar';
import { PlayCircle, BookOpen } from 'lucide-react';

interface GrammarCardProps {
  rule: GrammarRule;
  progress?: number;
}

export const GrammarCard: React.FC<GrammarCardProps> = ({ rule, progress = 0 }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {rule.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {rule.hiragana}
          </p>
        </div>
        <div className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold">
          {rule.level}
        </div>
      </div>

      <div className="flex-1">
        <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-4">
          {rule.meaning}
        </p>

        {/* Progress Bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>Progress</span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-auto">
        <Link 
          to={`/grammar/${rule.id}`}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Study
        </Link>
        <Link 
          to={`/grammar/${rule.id}/practice`}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-indigo-200 dark:shadow-none transition-colors"
        >
          <PlayCircle className="w-4 h-4" />
          Practice
        </Link>
      </div>
    </div>
  );
};
