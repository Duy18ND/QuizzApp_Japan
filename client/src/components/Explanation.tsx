import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/cn';

interface ExplanationProps {
  isCorrect: boolean;
  correctAnswerText?: string;
  title: string;
  kanji: string;
  hanViet?: string;
  hiragana: string;
  meaning: string;
}

export const Explanation: React.FC<ExplanationProps> = ({
  isCorrect,
  correctAnswerText,
  title,
  kanji,
  hanViet,
  hiragana,
  meaning,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'animate-fade-in rounded-xl border p-4 md:p-5',
        isCorrect ? 'border-success-line bg-success-soft' : 'border-danger-line bg-danger-soft',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 text-base font-bold',
          isCorrect ? 'text-success-fg' : 'text-danger-fg',
        )}
      >
        {isCorrect ? (
          <>
            <CheckCircle2 className="size-5 shrink-0" aria-hidden />
            Chính xác
          </>
        ) : (
          <>
            <XCircle className="size-5 shrink-0" aria-hidden />
            Chưa chính xác
          </>
        )}
      </div>

      {!isCorrect && correctAnswerText && (
        <p className="mt-2 text-sm text-fg md:text-base">
          Đáp án đúng:{' '}
          <span lang="ja" className="font-semibold text-success-fg">
            {correctAnswerText}
          </span>
        </p>
      )}

      {isCorrect && title && (
        <p lang="ja" className="mt-2 text-sm font-medium text-fg md:text-base">
          {title}
        </p>
      )}

      {(kanji || hanViet || hiragana || meaning) && (
        <dl className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-line bg-surface p-3.5 text-sm sm:grid-cols-2">
          {kanji && (
            <div className="flex items-baseline gap-2">
              <dt className="w-20 shrink-0 font-medium text-muted">Kanji</dt>
              <dd lang="ja" className="font-semibold text-fg">{kanji}</dd>
            </div>
          )}
          {hanViet && (
            <div className="flex items-baseline gap-2">
              <dt className="w-20 shrink-0 font-medium text-muted">Hán Việt</dt>
              <dd className="font-medium text-fg uppercase">{hanViet}</dd>
            </div>
          )}
          {hiragana && (
            <div className="flex items-baseline gap-2">
              <dt className="w-20 shrink-0 font-medium text-muted">Hiragana</dt>
              <dd lang="ja" className="font-medium text-primary-fg">{hiragana}</dd>
            </div>
          )}
          {meaning && (
            <div className="flex items-baseline gap-2 sm:col-span-2">
              <dt className="w-20 shrink-0 font-medium text-muted">Nghĩa</dt>
              <dd className="font-medium text-fg">{meaning}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
};
