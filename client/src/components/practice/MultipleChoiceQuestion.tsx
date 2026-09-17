import React, { useState } from 'react';
import type { MultipleChoiceQuestion, PracticeType } from '../../types/grammar';
import { validateAnswer } from '../../utils/grammarEngine/answerValidator';

interface Props {
  mode: PracticeType;
  question: MultipleChoiceQuestion;
  onSubmit: (answer: string, isCorrect: boolean, feedbackMsg?: string) => void;
}

export const MultipleChoiceQuestionComp: React.FC<Props> = ({ mode, question, onSubmit }) => {
  const [selectedOpt, setSelectedOpt] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpt) return;
    const result = validateAnswer(selectedOpt, question.correctAnswer, mode, question.grammarId);
    onSubmit(selectedOpt, result.isCorrect, result.feedbackMessage);
  };

  const options = question.answers || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm text-center">
        {question.instruction && (
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">{question.instruction}</p>
        )}
        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-8">
          {question.question}
        </h3>
        
        <div className="grid gap-3">
          {options.map((opt: string, idx: number) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedOpt(opt)}
              className={`p-4 text-left rounded-lg border-2 transition-all ${
                selectedOpt === opt 
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' 
                  : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800'
              }`}
            >
              <span className="font-medium mr-3">{String.fromCharCode(65 + idx)}.</span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!selectedOpt}
        className="w-full bg-indigo-600 text-white font-medium py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Kiểm tra
      </button>
    </form>
  );
};
