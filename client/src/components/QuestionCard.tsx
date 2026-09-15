import React from 'react';

interface QuestionCardProps {
  question: string;
  hanViet?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, hanViet }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 md:p-10 mb-6 shadow-lg border border-gray-700 text-center">
      <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight break-words">
        {question}
      </h2>
      {hanViet && (
        <p className="text-sm md:text-base text-gray-400 mt-2 uppercase tracking-widest">
          {hanViet}
        </p>
      )}
    </div>
  );
};
