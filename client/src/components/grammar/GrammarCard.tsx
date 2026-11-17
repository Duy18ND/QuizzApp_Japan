import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, PlayCircle } from 'lucide-react';
import type { GrammarRule } from '../../types/grammar';
import { Badge, Card, ProgressBar, buttonStyles } from '../ui';

interface GrammarCardProps {
  rule: GrammarRule;
  progress?: number;
}

export const GrammarCard: React.FC<GrammarCardProps> = ({ rule, progress = 0 }) => {
  return (
    <Card padding="md" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 lang="ja" className="text-lg font-bold text-fg">
            {rule.name}
          </h3>
          {rule.hiragana && (
            <p lang="ja" className="mt-0.5 text-sm text-muted">
              {rule.hiragana}
            </p>
          )}
        </div>
        <Badge tone="primary">{rule.level}</Badge>
      </div>

      <p className="flex-1 text-sm font-medium text-fg">{rule.meaning}</p>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted">
          <span>Tiến độ</span>
          <span className="tabular font-semibold">{Math.round(progress)}%</span>
        </div>
        <ProgressBar value={progress} max={100} size="sm" label={`Tiến độ ${rule.name}`} />
      </div>

      <div className="flex gap-2.5 pt-1">
        <Link
          to={`/grammar/${rule.id}`}
          className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'flex-1' })}
        >
          <BookOpen className="size-4" aria-hidden />
          Học bài
        </Link>
        <Link
          to={`/grammar/${rule.id}/practice`}
          className={buttonStyles({ variant: 'primary', size: 'sm', className: 'flex-1' })}
        >
          <PlayCircle className="size-4" aria-hidden />
          Luyện tập
        </Link>
      </div>
    </Card>
  );
};
