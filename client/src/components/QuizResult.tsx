import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Play, RefreshCw, XCircle } from 'lucide-react';
import { Button, Card, Notice, PageContainer, ProgressBar, buttonStyles } from './ui';

interface QuizResultProps {
  score: { correct: number; wrong: number };
  total: number;
  onRetry: () => void;
  onNewQuiz: () => void;
}

export const QuizResult: React.FC<QuizResultProps> = ({ score, total, onRetry, onNewQuiz }) => {
  const percentage = total > 0 ? Math.round((score.correct / total) * 100) : 0;

  return (
    <PageContainer size="sm" className="py-6 md:py-10">
      <Card padding="lg" className="space-y-6 text-center">
        <div>
          <p className="text-sm font-medium text-muted">Kết quả</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg md:text-3xl">
            Quiz hoàn thành!
          </h1>
        </div>

        <div className="space-y-3">
          <div className="tabular text-5xl font-bold tracking-tight text-primary-fg md:text-6xl">
            {score.correct} <span className="text-2xl font-medium text-muted md:text-3xl">/ {total}</span>
          </div>
          <p className="tabular text-lg font-semibold text-fg">{percentage}% chính xác</p>
          <ProgressBar
            value={score.correct}
            max={total}
            label="Tỷ lệ chính xác"
            tone={percentage >= 80 ? 'success' : 'primary'}
            className="mx-auto max-w-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface-2 p-4">
          <div className="flex flex-col items-center gap-1">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-fg">
              <CheckCircle2 className="size-4" aria-hidden />
              Đúng
            </span>
            <span className="tabular text-2xl font-bold text-fg">{score.correct}</span>
          </div>
          <div className="flex flex-col items-center gap-1 border-l border-line">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-danger-fg">
              <XCircle className="size-4" aria-hidden />
              Sai
            </span>
            <span className="tabular text-2xl font-bold text-fg">{score.wrong}</span>
          </div>
        </div>

        {score.wrong > 0 && (
          <Notice tone="info" title="Câu sai đã được tự động lưu lại">
            {score.wrong} câu làm sai đã được lưu vào mục <strong>Ôn tập lỗi sai</strong> để bạn xem và làm lại bất cứ lúc nào.
          </Notice>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button
            variant="secondary"
            size="lg"
            onClick={onRetry}
            leftIcon={<RefreshCw className="size-4" aria-hidden />}
            className="sm:min-w-40"
          >
            Làm lại
          </Button>
          {score.wrong > 0 && (
            <Link
              to="/grammar/mistakes"
              className={buttonStyles({ variant: 'soft', size: 'lg', className: 'sm:min-w-40' })}
            >
              <BookOpen className="size-4" aria-hidden />
              Ôn câu sai ({score.wrong})
            </Link>
          )}
          <Button
            variant="primary"
            size="lg"
            onClick={onNewQuiz}
            leftIcon={<Play className="size-4" aria-hidden />}
            className="sm:min-w-40"
          >
            Quiz mới
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
};
