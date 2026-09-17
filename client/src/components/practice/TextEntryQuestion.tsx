import React, { useState } from 'react';
import type { PracticeType } from '../../types/grammar';
import { validateAnswer } from '../../utils/grammarEngine/answerValidator';

interface TextEntryProps {
  mode: PracticeType;
  question: any; // Using any internally for reusable base props to avoid union overload
  onSubmit: (answer: string, isCorrect: boolean, feedbackMsg?: string) => void;
}

export const TextEntryQuestion: React.FC<TextEntryProps> = ({ mode, question, onSubmit }) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    const result = validateAnswer(answer.trim(), question.correctAnswer, mode, question.grammarId);
    onSubmit(answer.trim(), result.isCorrect, result.feedbackMessage);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
        {question.instruction && (
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">{question.instruction}</p>
        )}
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 whitespace-pre-wrap leading-relaxed">
          {question.question}
        </h3>
        
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg p-4 text-lg focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-colors"
          rows={3}
          placeholder="Nhập câu trả lời của bạn..."
          autoFocus
        />
      </div>

      <button
        type="submit"
        disabled={!answer.trim()}
        className="w-full bg-indigo-600 text-white font-medium py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Kiểm tra
      </button>
    </form>
  );
};
