import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/cn';

export type AnswerStatus = 'default' | 'correct' | 'wrong' | 'disabled';

interface AnswerOptionProps {
  label: string;
  text: string;
  status: AnswerStatus;
  onClick: () => void;
}

const statusClasses: Record<AnswerStatus, string> = {
  default: 'border-line-strong bg-surface text-fg hover:border-primary hover:bg-surface-2',
  correct: 'border-success bg-success-soft text-fg',
  wrong: 'border-danger bg-danger-soft text-fg',
  disabled: 'border-line bg-surface text-muted opacity-60 cursor-not-allowed',
};

const labelClasses: Record<AnswerStatus, string> = {
  default: 'bg-surface-2 text-muted border border-line',
  correct: 'bg-success text-on-primary',
  wrong: 'bg-danger text-on-primary',
  disabled: 'bg-surface-2 text-subtle',
};

export const AnswerOption: React.FC<AnswerOptionProps> = ({ label, text, status, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={status !== 'default'}
      aria-pressed={status === 'correct' || status === 'wrong' ? true : undefined}
      className={cn(
        'flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors duration-150 md:p-4',
        'active:scale-[0.99] disabled:active:scale-100',
        statusClasses[status],
      )}
    >
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold',
          labelClasses[status],
        )}
      >
        {label}
      </span>

      <span lang="ja" className="flex-1 text-base leading-snug font-medium md:text-lg">
        {text}
      </span>

      {status === 'correct' && <CheckCircle2 className="size-5 shrink-0 text-success-fg" aria-hidden />}
      {status === 'wrong' && <XCircle className="size-5 shrink-0 text-danger-fg" aria-hidden />}
    </button>
  );
};
