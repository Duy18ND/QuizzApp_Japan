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
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm min-h-[160px] flex flex-col justify-between">
        {question.instruction && (
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">{question.instruction}</p>
        )}
        {question.question && (
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {question.question}
          </h3>
        )}
        
        <div className="flex flex-wrap gap-2 min-h-[56px] p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700">
          {selectedTokens.map((token, idx) => (
            <button
              key={idx}
              onClick={() => handleDeselect(token, idx)}
              className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg shadow-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors"
            >
              {token}
            </button>
          ))}
          {selectedTokens.length === 0 && (
            <span className="text-gray-400 m-auto text-sm">Nhấp vào các từ bên dưới để ghép câu</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center px-2">
        {availableTokens.map((token, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(token, idx)}
            className="px-5 py-3 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 text-gray-800 dark:text-white rounded-xl shadow-sm font-medium text-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {token}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={availableTokens.length > 0}
        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg shadow-md"
      >
        Kiểm tra
      </button>
    </div>
  );
};
