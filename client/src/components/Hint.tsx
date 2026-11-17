import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

interface HintProps {
  kanji?: string;
  hiragana?: string;
  meaning?: string;
}

export const Hint: React.FC<HintProps> = ({ kanji, hiragana, meaning }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!kanji && !hiragana && !meaning) return null;

  return (
    <div className="relative my-2 inline-block">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-warning-line bg-warning-soft px-3 py-1.5 text-sm font-medium text-warning-fg transition-colors hover:border-warning"
      >
        <Lightbulb className="size-4" aria-hidden />
        Gợi ý
        {isOpen ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
      </button>

      {isOpen && (
        <dl className="absolute top-full left-0 z-30 mt-2 w-64 animate-pop-in space-y-1.5 rounded-xl border border-line bg-surface p-4 text-sm shadow-pop">
          {kanji && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-medium text-muted">Kanji</dt>
              <dd lang="ja" className="font-semibold text-fg">{kanji}</dd>
            </div>
          )}
          {hiragana && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-medium text-muted">Hiragana</dt>
              <dd lang="ja" className="font-semibold text-fg">{hiragana}</dd>
            </div>
          )}
          {meaning && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-medium text-muted">Nghĩa</dt>
              <dd className="text-right font-medium text-fg">{meaning}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
};
