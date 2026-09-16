import React from 'react';
import { RefreshCw, Play } from 'lucide-react';

interface QuizResultProps {
  score: { correct: number; wrong: number };
  total: number;
  onRetry: () => void;
  onNewQuiz: () => void;
}

export const QuizResult: React.FC<QuizResultProps> = ({ score, total, onRetry, onNewQuiz }) => {
  const percentage = Math.round((score.correct / total) * 100);

  return (
    <div className="max-w-2xl mx-auto text-center mt-12">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Quiz hoàn thành!</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-8 shadow-xl border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="text-6xl font-extrabold text-blue-600 dark:text-blue-500 mb-4">
          {score.correct} <span className="text-3xl text-gray-400">/ {total}</span>
        </div>
        
        <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-8">
          {percentage}%
        </div>
        
        <div className="flex justify-center space-x-12">
          <div className="text-center">
            <div className="text-green-600 dark:text-green-400 font-bold text-2xl mb-1">✓ Đúng: {score.correct}</div>
          </div>
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 font-bold text-2xl mb-1">✕ Sai: {score.wrong}</div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
        <button
          onClick={onRetry}
          className="flex items-center justify-center px-8 py-4 rounded-xl font-bold transition-all bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Làm lại
        </button>
        <button
          onClick={onNewQuiz}
          className="flex items-center justify-center px-8 py-4 rounded-xl font-bold transition-all bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/50"
        >
          <Play className="w-5 h-5 mr-2" />
          Quiz mới
        </button>
      </div>
    </div>
  );
};
