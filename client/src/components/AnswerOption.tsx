import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type AnswerStatus = 'default' | 'correct' | 'wrong' | 'disabled';

interface AnswerOptionProps {
  label: string;
  text: string;
  status: AnswerStatus;
  onClick: () => void;
}

export const AnswerOption: React.FC<AnswerOptionProps> = ({ label, text, status, onClick }) => {
  const baseClasses = "flex items-center w-full min-h-[60px] p-4 md:p-6 rounded-xl border-2 transition-all duration-200 text-left text-lg md:text-xl font-medium";
  
  const statusClasses = {
    default: "border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-750 hover:border-blue-500 cursor-pointer",
    correct: "border-green-500 bg-green-600 text-white shadow-lg shadow-green-900/50",
    wrong: "border-red-500 bg-red-600 text-white shadow-lg shadow-red-900/50",
    disabled: "border-gray-700 bg-gray-800 text-gray-400 opacity-60 cursor-not-allowed",
  };

  return (
    <button
      onClick={onClick}
      disabled={status !== 'default'}
      className={twMerge(clsx(baseClasses, statusClasses[status]))}
    >
      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-black/20 mr-4 text-sm font-bold">
        {label}
      </span>
      <span>{text}</span>
    </button>
  );
};
