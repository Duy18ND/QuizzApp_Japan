import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { MultipleChoiceQuestion, PracticeType } from '../../types/grammar';
import {
  resolveQuestionTargetPatterns,
  validateAnswer,
} from '../../utils/grammarEngine/answerValidator';
import { cn } from '../../lib/cn';
import { JapaneseLookupButton } from '../common/JapaneseLookupPopover';

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
      const targetPatterns = resolveQuestionTargetPatterns(question);
      const result = validateAnswer(opt, question.correctAnswer, mode, targetPatterns);
      onSubmit(opt, result.isCorrect, result.feedbackMessage);
    },
    [mode, question, onSubmit],
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

  const isScenario = Boolean(
    (question.metadata as { isScenarioQuestion?: boolean } | undefined)?.isScenarioQuestion,
  );

  return (
    <div className="space-y-6">
      <div className={cn('space-y-2.5', isScenario ? 'text-left' : 'text-center')}>
        {question.instruction && (
          <p className="text-xs font-bold tracking-wider text-primary-fg uppercase">
            {question.instruction}
          </p>
        )}
        <div className={cn('flex items-start gap-2', !isScenario && 'justify-center')}>
          <h3
            lang={isScenario ? 'vi' : 'ja'}
            className={cn(
              'leading-relaxed font-bold text-fg',
              isScenario ? 'text-lg md:text-xl' : 'text-xl md:text-2xl',
            )}
          >
            {question.question}
          </h3>
          {!isScenario && <JapaneseLookupButton text={question.question} className="mt-1" />}
        </div>
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-3',
          !isScenario && 'sm:grid-cols-2',
        )}
      >
        {options.map((opt, idx) => {
          const isSelected = selectedOpt === opt;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(opt)}
              aria-pressed={isSelected}
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 border text-left transition-all duration-150',
                isScenario
                  ? 'min-h-13 rounded-full px-5 py-3.5'
                  : 'min-h-14 rounded-xl p-3.5 md:p-4',
                isSelected
                  ? 'border-primary bg-primary-soft text-primary-fg ring-2 ring-primary/20'
                  : 'border-line-strong bg-surface text-fg hover:border-primary hover:bg-surface-2',
              )}
            >
              {!isScenario && (
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
              )}
              <span lang="ja" className="flex-1 text-base font-semibold md:text-lg">
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
