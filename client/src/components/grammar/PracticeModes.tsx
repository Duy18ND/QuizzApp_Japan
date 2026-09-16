import React, { useState } from 'react';
import type { PracticeQuestion, PracticeType } from '../../types/grammar';

interface PracticeModeProps {
  question: PracticeQuestion;
  onSubmit: (answer: string, isCorrect: boolean) => void;
}

export const ConjugationMode: React.FC<PracticeModeProps> = ({ question, onSubmit }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const isCorrect = Array.isArray(question.correctAnswer) 
      ? question.correctAnswer.includes(value.trim())
      : question.correctAnswer === value.trim();
    onSubmit(value.trim(), isCorrect);
    setValue('');
  };

  return (
    <div className="space-y-6">
      <div className="text-xl font-medium text-center mb-8">
        <span className="text-gray-500 mr-4">Chuyển đổi:</span>
        <span className="font-bold">{question.question}</span>
      </div>
      
      <form onSubmit={handleSubmit} className="max-w-md mx-auto">
        <input 
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Nhập kết quả..."
          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          autoFocus
        />
        <button 
          type="submit"
          disabled={!value.trim()}
          className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl font-bold transition-colors"
        >
          Kiểm tra
        </button>
      </form>
    </div>
  );
};

export const FallbackMode: React.FC<PracticeModeProps> = ({ question, onSubmit }) => {
  // Catch all for remaining modes like translation and free writing for now
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    const isCorrect = Array.isArray(question.correctAnswer) 
      ? question.correctAnswer.includes(answer.trim())
      : question.correctAnswer === answer.trim();
    onSubmit(answer.trim(), isCorrect);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
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

export const WordOrderMode: React.FC<PracticeModeProps> = ({ question, onSubmit }) => {
  const tokens = question.metadata?.tokens || [];
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [availableTokens, setAvailableTokens] = useState<string[]>(tokens);

  // Reset when question changes
  React.useEffect(() => {
    setSelectedTokens([]);
    setAvailableTokens(question.metadata?.tokens || []);
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
    const isCorrect = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.includes(answer)
      : question.correctAnswer === answer;
    onSubmit(answer, isCorrect);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm min-h-[160px] flex flex-col justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {question.question}
        </h3>
        
        {/* Selected Area */}
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

      {/* Available Tokens Area */}
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

export const RecognitionMode: React.FC<PracticeModeProps> = ({ question, onSubmit }) => {
  const [selectedOpt, setSelectedOpt] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpt) return;
    
    // Extract actual answer from "A. XXXXX"
    const actualAnswer = selectedOpt.substring(3);
    const isCorrect = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.includes(actualAnswer)
      : question.correctAnswer === actualAnswer;
    onSubmit(actualAnswer, isCorrect);
  };

  const lines = question.question.split('\n');
  const mainQuestion = lines[0];
  const options = lines.slice(2);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm text-center">
        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-8">
          {mainQuestion}
        </h3>
        
        <div className="grid gap-3">
          {options.map((opt, idx) => (
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
              <span className="font-medium">{opt}</span>
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

export const PracticeModeRenderer: React.FC<{ mode: PracticeType } & PracticeModeProps> = (props) => {
  switch (props.mode) {
    case 'conjugation':
      return <ConjugationMode {...props} />;
    case 'word_order':
      return <WordOrderMode {...props} />;
    case 'recognition':
      return <RecognitionMode {...props} />;
    default:
      return <FallbackMode {...props} />;
  }
};
