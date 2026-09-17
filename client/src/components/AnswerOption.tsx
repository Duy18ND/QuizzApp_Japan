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
  const baseClasses = "flex items-center w-full min-h-[3rem] p-3 md:p-4 rounded-xl border-2 transition-all duration-200 text-left text-lg md:text-xl font-medium";
  
  const statusClasses = {
    default: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer",
    correct: "border-green-500 bg-green-600 text-white shadow-lg shadow-green-200 dark:shadow-green-900/50",
    wrong: "border-red-500 bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-red-900/50",
    disabled: "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500 opacity-60 cursor-not-allowed",
  };

  return (
    <button
      onClick={onClick}
      disabled={status !== 'default'}
      className={twMerge(clsx(baseClasses, statusClasses[status]))}
    >
      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-black/20 mr-4 text-sm font-bold">
        {label}
      </span>
      <span>{text}</span>
    </button>
  );
};
