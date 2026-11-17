import React, { useState } from 'react';
import type { PracticeType, WordOrderQuestion } from '../../types/grammar';
import { validateAnswer } from '../../utils/grammarEngine/answerValidator';
import { Button } from '../ui';

interface Props {
  mode: PracticeType;
  question: WordOrderQuestion;
  onSubmit: (answer: string, isCorrect: boolean, feedbackMsg?: string) => void;
}

export const WordOrderQuestionComp: React.FC<Props> = ({ mode, question, onSubmit }) => {
  const tokens = question.parts || [];
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [availableTokens, setAvailableTokens] = useState<string[]>(tokens);

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
      <div className="space-y-4">
        <div className="space-y-2">
          {question.instruction && (
            <p className="text-sm font-semibold text-primary-fg">{question.instruction}</p>
          )}
          {question.question && (
            <h3 lang="ja" className="text-lg font-medium text-fg">
              {question.question}
            </h3>
          )}
        </div>

        <div className="flex min-h-16 flex-wrap gap-2 rounded-xl border border-dashed border-line-strong bg-surface-2 p-4">
          {selectedTokens.map((token, idx) => (
            <button
              key={idx}
              type="button"
              lang="ja"
              onClick={() => handleDeselect(token, idx)}
              className="min-h-10 rounded-lg border border-primary bg-primary-soft px-3.5 py-2 text-base font-medium text-primary-fg transition-colors hover:bg-primary-soft-hover"
            >
              {token}
            </button>
          ))}
          {selectedTokens.length === 0 && (
            <span className="m-auto text-sm text-muted">
              Nhấp vào các từ bên dưới để ghép câu
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2.5">
        {availableTokens.map((token, idx) => (
          <button
            key={idx}
            type="button"
            lang="ja"
            onClick={() => handleSelect(token, idx)}
            className="min-h-11 rounded-lg border border-line-strong bg-surface px-4 py-2 text-base font-medium text-fg transition-colors hover:border-primary hover:bg-surface-2"
          >
            {token}
          </button>
        ))}
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleSubmit}
        disabled={availableTokens.length > 0}
      >
        Kiểm tra
      </Button>
    </div>
  );
};
