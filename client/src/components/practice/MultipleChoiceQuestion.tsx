import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { MultipleChoiceQuestion, PracticeType } from '../../types/grammar';
import { validateAnswer } from '../../utils/grammarEngine/answerValidator';
import { cn } from '../../lib/cn';

interface Props {
  mode: PracticeType;
  question: MultipleChoiceQuestion;
  onSubmit: (answer: string, isCorrect: boolean, feedbackMsg?: string) => void;
}

export const MultipleChoiceQuestionComp: React.FC<Props> = ({ mode, question, onSubmit }) => {
  const [selectedOpt, setSelectedOpt] = useState<string>('');
  const options = useMemo(() => question.answers || [], [question.answers]);

  const handleSelect = useCallback(
    (opt: string) => {
      setSelectedOpt(opt);
      const result = validateAnswer(opt, question.correctAnswer, mode, question.grammarId);
      onSubmit(opt, result.isCorrect, result.feedbackMessage);
    },
    [mode, question.correctAnswer, question.grammarId, onSubmit],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const numIdx = ['1', '2', '3', '4'].indexOf(key);
      const letterIdx = ['a', 'b', 'c', 'd'].indexOf(key);
      const index = numIdx !== -1 ? numIdx : letterIdx;

      if (index !== -1 && options[index]) {
        event.preventDefault();
        handleSelect(options[index]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [options, handleSelect]);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        {question.instruction && (
          <p className="text-sm font-semibold text-primary-fg">{question.instruction}</p>
        )}
        <h3 lang="ja" className="text-xl leading-relaxed font-semibold text-fg md:text-2xl">
          {question.question}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((opt, idx) => {
          const isSelected = selectedOpt === opt;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(opt)}
              aria-pressed={isSelected}
              className={cn(
                'flex min-h-14 w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors duration-150 md:p-4',
                isSelected
                  ? 'border-primary bg-primary-soft text-primary-fg'
                  : 'border-line-strong bg-surface text-fg hover:border-primary hover:bg-surface-2',
              )}
            >
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold',
                  isSelected
                    ? 'bg-primary text-on-primary'
                    : 'border border-line bg-surface-2 text-muted',
                )}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span lang="ja" className="flex-1 text-base font-medium md:text-lg">
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
