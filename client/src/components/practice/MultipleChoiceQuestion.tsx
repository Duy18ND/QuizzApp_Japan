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

  const handleSelect = (opt: string) => {
    setSelectedOpt(opt);
    const result = validateAnswer(opt, question.correctAnswer, mode, question.grammarId);
    onSubmit(opt, result.isCorrect, result.feedbackMessage);
  };

  const options = question.answers || [];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm text-center">
        {question.instruction && (
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">{question.instruction}</p>
        )}
        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-8">
          {question.question}
        </h3>
        
        <div className="grid gap-3">
          {options.map((opt: string, idx: number) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`p-4 text-left rounded-lg border-2 transition-all ${
                selectedOpt === opt 
                  ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300' 
                  : 'border-blue-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800'
              }`}
            >
              <span className="font-medium mr-3">{String.fromCharCode(65 + idx)}.</span>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
