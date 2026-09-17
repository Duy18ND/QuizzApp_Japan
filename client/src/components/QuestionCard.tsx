import React from 'react';

interface QuestionCardProps {
  question: string;
  hanViet?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, hanViet }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-8 mb-6 shadow-lg border border-gray-200 dark:border-gray-700 text-center transition-colors">
      <h2 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight break-words">
        {question}
      </h2>
      {hanViet && (
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-widest">
          {hanViet}
        </p>
      )}
    </div>
  );
};
