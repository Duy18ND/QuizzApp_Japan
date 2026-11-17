import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from './ui/Layout';

interface QuizHeaderProps {
  current: number;
  total: number;
  score: { correct: number; wrong: number };
}

export const QuizHeader: React.FC<QuizHeaderProps> = ({ current, total, score }) => {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <Badge tone="primary" className="tabular px-3 py-1 text-sm font-semibold">
        Câu {current} / {total}
      </Badge>

      <div className="tabular flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-1.5 text-sm font-semibold shadow-card">
        <span className="inline-flex items-center gap-1.5 text-success-fg" aria-label={`${score.correct} câu đúng`}>
          <CheckCircle2 className="size-4" aria-hidden />
          {score.correct}
        </span>
        <span className="h-4 w-px bg-line" aria-hidden />
        <span className="inline-flex items-center gap-1.5 text-danger-fg" aria-label={`${score.wrong} câu sai`}>
          <XCircle className="size-4" aria-hidden />
          {score.wrong}
        </span>
      </div>
    </div>
  );
};
