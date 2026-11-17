import React, { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '../ui';
import { cn } from '../../lib/cn';

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

interface McqQuestionBlockProps {
  prompt: string;
  options: [string, string, string, string];
  selectedIndex: number | null;
  correctIndex: number;
  revealResult: boolean;
  locked?: boolean;
  explanation?: string;
  mondaiLabel?: string;
  levelLabel?: string;
  enableKeyboard?: boolean;
  onSelect: (index: number) => void;
  compact?: boolean;
}

export const McqQuestionBlock: React.FC<McqQuestionBlockProps> = ({
  prompt,
  options,
  selectedIndex,
  correctIndex,
  revealResult,
  locked = false,
  explanation,
  mondaiLabel,
  levelLabel,
  enableKeyboard = false,
  onSelect,
  compact = false,
}) => {
  useEffect(() => {
    if (!enableKeyboard || locked) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      let idx = -1;
      if (e.key >= '1' && e.key <= '4') idx = parseInt(e.key, 10) - 1;
      else if (['a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) {
        idx = e.key.toLowerCase().charCodeAt(0) - 97;
      }
      if (idx >= 0 && idx < options.length) {
        e.preventDefault();
        onSelect(idx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboard, locked, options.length, onSelect]);

  return (
    <div className="space-y-4">
      {(levelLabel || mondaiLabel) && (
        <div className="flex flex-wrap items-center gap-2">
          {levelLabel && <Badge tone="primary">{levelLabel}</Badge>}
          {mondaiLabel && <Badge tone="neutral">{mondaiLabel}</Badge>}
        </div>
      )}

      <p
        lang="ja"
        className={cn(
          'leading-relaxed font-semibold text-fg',
          compact ? 'text-base md:text-lg' : 'text-xl md:text-2xl',
        )}
      >
        {prompt}
      </p>

      <div className={cn('grid grid-cols-1 gap-3', !compact && 'sm:grid-cols-2')}>
        {options.map((opt, idx) => {
          const isSelected = selectedIndex === idx;
          const isRight = idx === correctIndex;
          const isChosenCorrect = revealResult && isRight;
          const isChosenWrong = revealResult && isSelected && !isRight;
          const isDimmed = revealResult && !isRight && !isSelected;

          return (
            <button
              key={idx}
              type="button"
              disabled={locked}
              aria-pressed={isSelected}
              onClick={() => onSelect(idx)}
              className={cn(
                'flex min-h-14 w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors duration-150',
                'disabled:cursor-default',
                isChosenCorrect
                  ? 'border-success bg-success-soft text-fg'
                  : isChosenWrong
                    ? 'border-danger bg-danger-soft text-fg'
                    : isSelected
                      ? 'border-primary bg-primary-soft text-primary-fg'
                      : 'border-line-strong bg-surface text-fg hover:border-primary hover:bg-surface-2',
                isDimmed && 'opacity-55',
              )}
            >
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold',
                  isChosenCorrect
                    ? 'bg-success text-on-primary'
                    : isChosenWrong
                      ? 'bg-danger text-on-primary'
                      : isSelected
                        ? 'bg-primary text-on-primary'
                        : 'border border-line bg-surface-2 text-muted',
                )}
              >
                {OPTION_LABELS[idx]}
              </span>
              <span lang="ja" className="flex-1 text-base font-medium">
                {opt}
              </span>
              {isChosenCorrect && <CheckCircle2 className="size-5 shrink-0 text-success-fg" aria-hidden />}
              {isChosenWrong && <XCircle className="size-5 shrink-0 text-danger-fg" aria-hidden />}
            </button>
          );
        })}
      </div>

      {revealResult && explanation && (
        <div
          className={cn(
            'rounded-xl border p-4 text-sm leading-relaxed',
            selectedIndex === correctIndex
              ? 'border-success-line bg-success-soft text-fg'
              : 'border-danger-line bg-danger-soft text-fg',
          )}
        >
          <p className="mb-1 flex items-center gap-1.5 font-semibold">
            {selectedIndex === correctIndex ? (
              <>
                <CheckCircle2 className="size-4 text-success-fg" aria-hidden />
                <span className="text-success-fg">Chính xác!</span>
              </>
            ) : (
              <>
                <XCircle className="size-4 text-danger-fg" aria-hidden />
                <span className="text-danger-fg">
                  Chưa đúng — Đáp án đúng là {OPTION_LABELS[correctIndex]}: {options[correctIndex]}
                </span>
              </>
            )}
          </p>
          <p className="text-fg">{explanation}</p>
        </div>
      )}
    </div>
  );
};
