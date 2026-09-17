import React, { useState, useEffect } from 'react';
import type { WordOrderQuestion, PracticeType } from '../../types/grammar';
import { validateAnswer } from '../../utils/grammarEngine/answerValidator';

interface Props {
  mode: PracticeType;
  question: WordOrderQuestion;
  onSubmit: (answer: string, isCorrect: boolean, feedbackMsg?: string) => void;
}

export const WordOrderQuestionComp: React.FC<Props> = ({ mode, question, onSubmit }) => {
  const tokens = question.parts || [];
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [availableTokens, setAvailableTokens] = useState<string[]>(tokens);

  useEffect(() => {
    setSelectedTokens([]);
    setAvailableTokens(question.parts || []);
  }, [question]);

  const handleSelect = (token: string, index: number) => {
    setSelectedTokens([...selectedTokens, token]);
    setAvailableTokens(availableTokens.filter((_, i) => i !== index));
  };

  const handleDeselect = (token: string, index: number) => {
    setAvailableTokens([...availableTokens, token]);
    setSelectedTokens(selectedTokens.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const answer = selectedTokens.join('');
    const result = validateAnswer(answer, question.correctAnswer, mode, question.grammarId);
    onSubmit(answer, result.isCorrect, result.feedbackMessage);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm min-h-[160px] flex flex-col justify-between">
        {question.instruction && (
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">{question.instruction}</p>
        )}
        {question.question && (
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {question.question}
          </h3>
        )}
        
        <div className="flex flex-wrap gap-2 min-h-[48px] p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700">
          {selectedTokens.map((token, idx) => (
            <button
              key={idx}
              onClick={() => handleDeselect(token, idx)}
              className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg shadow-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors"
            >
              {token}
            </button>
          ))}
          {selectedTokens.length === 0 && (
            <span className="text-gray-400 m-auto">Nhấp vào các từ bên dưới để ghép câu</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        {availableTokens.map((token, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(token, idx)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-sm font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            {token}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={availableTokens.length > 0}
        className="w-full bg-indigo-600 text-white font-medium py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Kiểm tra
      </button>
    </div>
  );
};
