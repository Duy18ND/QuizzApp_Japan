import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Eye, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getAttemptReviewMistakes } from '../../services/attemptMistakeService';
import { getLiveAllVocabulary, getLiveGrammarBooks } from '../../services/curriculumStore';
import {
  MAX_HISTORY_ITEMS,
  useQuizHistory,
  type QuizAttemptRecord,
} from '../../services/quizHistoryService';
import { LoginRequiredState } from '../auth/LoginRequiredState';
import { Button } from './Button';
import { Badge, Card } from './Layout';
import { Modal } from './Overlays';
import { buttonStyles } from './styles';

const QUIZ_TYPE_LABELS: Record<string, string> = {
  vocabulary: 'Quiz Từ vựng',
  writing: 'Luyện gõ Từ vựng',
  grammar: 'Luyện Ngữ pháp',
  'jlpt-full': 'Thi thử JLPT',
  'jlpt-full-test': 'Thi thử JLPT',
  'jlpt-kanji': 'JLPT Chữ Hán',
  'jlpt-vocab': 'JLPT Từ vựng',
  'jlpt-grammar': 'JLPT Ngữ pháp',
  'jlpt-star': 'JLPT Hái sao (★)',
  'jlpt-sentence-order': 'JLPT Sắp xếp câu',
  'jlpt-listening': 'JLPT Nghe hiểu',
  'jlpt-reading-short': 'JLPT Đọc hiểu ngắn',
  'jlpt-reading-medium': 'JLPT Đọc hiểu trung',
  'jlpt-reading-long': 'JLPT Đọc hiểu dài',
};

const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}p ${secs}s`;
};

const formatAttemptDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Vừa xong';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface QuizHistoryCardProps {
  limit?: number;
  showProfileLink?: boolean;
  className?: string;
}

export function QuizHistoryCard({ limit, showProfileLink = false, className }: QuizHistoryCardProps) {
  const { user } = useAuth();
  const rawHistory = useQuizHistory();
  const cmsSnapshot = useCurriculumSnapshot();
  const [reviewAttempt, setReviewAttempt] = useState<QuizAttemptRecord | null>(null);

  const history = useMemo(() => rawHistory.slice(0, MAX_HISTORY_ITEMS), [rawHistory]);
  const effectiveLimit =
    typeof limit === 'number' ? Math.min(limit, MAX_HISTORY_ITEMS) : MAX_HISTORY_ITEMS;
  const visibleItems = user ? history.slice(0, effectiveLimit) : [];

  const allVocab = useMemo(() => getLiveAllVocabulary(cmsSnapshot), [cmsSnapshot]);
  const liveGrammarBooks = useMemo(() => getLiveGrammarBooks(cmsSnapshot), [cmsSnapshot]);

  const reviewMistakes = useMemo(
    () =>
      reviewAttempt
        ? getAttemptReviewMistakes(reviewAttempt, allVocab, liveGrammarBooks)
        : [],
    [reviewAttempt, allVocab, liveGrammarBooks],
  );

  const reviewTotal = reviewAttempt ? Math.max(1, reviewAttempt.totalQuestions) : 1;
  const reviewWrongCount = reviewAttempt
    ? Math.max(0, reviewTotal - reviewAttempt.score)
    : 0;
  const reviewPercent = reviewAttempt
    ? Math.round((reviewAttempt.score / reviewTotal) * 100)
    : 0;
  const reviewTitle = reviewAttempt
    ? `${QUIZ_TYPE_LABELS[reviewAttempt.quizType] ?? reviewAttempt.quizType}${
        reviewAttempt.level && reviewAttempt.level !== 'ALL' ? ` · ${reviewAttempt.level}` : ''
      }`
    : '';

  return (
    <>
      <Card padding="lg" className={className}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="grid size-7 place-items-center rounded-lg bg-primary-soft text-primary-fg"
            >
              <History className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-fg">Lịch sử làm bài</h2>
              <p className="text-xs text-muted">
                {!user
                  ? 'Chỉ lưu và hiển thị lịch sử làm bài khi bạn đã đăng nhập'
                  : history.length > 0
                    ? `${history.length} lượt hoàn thành gần nhất (lưu tối đa ${MAX_HISTORY_ITEMS} lượt)`
                    : `Lưu tối đa ${MAX_HISTORY_ITEMS} lượt hoàn thành gần nhất theo tài khoản của bạn`}
              </p>
            </div>
          </div>
          {user && showProfileLink && (
            <Link to="/history" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              Xem tất cả ({history.length}/{MAX_HISTORY_ITEMS})
            </Link>
          )}
        </div>

        {!user ? (
          <LoginRequiredState
            compact
            title="Đăng nhập để xem lịch sử làm bài"
            description="Phiên Khách không lưu điểm số hay lịch sử làm bài. Hãy đăng nhập Google hoặc tự tạo tài khoản."
          />
        ) : visibleItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-strong bg-glass-soft px-4 py-6 text-center text-sm text-muted">
            Chưa có lịch sử làm bài. Hãy hoàn thành một bài Quiz hoặc Luyện tập để ghi nhận kết quả đầu tiên.
          </div>
        ) : (
          <ul className="grid gap-2">
            {visibleItems.map((item) => {
              const total = Math.max(1, item.totalQuestions);
              const percent = Math.round((item.score / total) * 100);
              const scoreTone = percent >= 80 ? 'success' : percent >= 50 ? 'warning' : 'danger';
              const label = QUIZ_TYPE_LABELS[item.quizType] ?? item.quizType;

              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-glass-soft px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-fg">{label}</span>
                      {item.level && <Badge tone="primary">{item.level}</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span>{formatAttemptDate(item.createdAt)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" aria-hidden />
                        {formatDuration(item.durationSeconds)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular text-sm font-semibold text-fg">
                      {item.score}/{total}
                    </span>
                    <Badge tone={scoreTone}>{percent}%</Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Eye className="size-3.5" aria-hidden />}
                      onClick={() => setReviewAttempt(item)}
                    >
                      Xem lại
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(reviewAttempt)}
        onClose={() => setReviewAttempt(null)}
        size="lg"
        title={reviewTitle ? `Xem lại · ${reviewTitle}` : 'Xem lại lượt làm bài'}
        description={
          reviewAttempt
            ? `${formatAttemptDate(reviewAttempt.createdAt)} · Thời gian: ${formatDuration(reviewAttempt.durationSeconds)}`
            : undefined
        }
        footer={
          <Button variant="primary" size="sm" onClick={() => setReviewAttempt(null)}>
            Đóng
          </Button>
        }
      >
        {reviewAttempt && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface-2 p-2.5 text-center sm:gap-3 sm:p-3.5">
              <div>
                <p className="text-xs font-medium text-success-fg">Đúng</p>
                <p className="tabular mt-0.5 text-xl font-bold text-fg">{reviewAttempt.score}</p>
              </div>
              <div className="border-x border-line">
                <p className="text-xs font-medium text-danger-fg">Sai</p>
                <p className="tabular mt-0.5 text-xl font-bold text-fg">{reviewWrongCount}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Chính xác</p>
                <p className="tabular mt-0.5 text-xl font-bold text-primary-fg">{reviewPercent}%</p>
              </div>
            </div>

            {reviewWrongCount === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-success-line bg-success-soft p-4 text-sm text-success-fg">
                <CheckCircle2 className="size-5 shrink-0" aria-hidden />
                <p className="font-medium">
                  Tuyệt vời! Bạn đã trả lời đúng toàn bộ {reviewTotal} câu trong lượt làm bài này.
                </p>
              </div>
            ) : reviewMistakes.length === 0 ? (
              <div className="rounded-xl border border-line bg-surface-2 p-4 text-sm text-muted">
                Lượt làm bài này có {reviewWrongCount} câu sai nhưng không có chi tiết câu hỏi được lưu.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                  Các câu trả lời sai ({reviewMistakes.length})
                </p>
                <div className="divide-y divide-line rounded-xl border border-line bg-surface">
                  {reviewMistakes.map((mistake, idx) => (
                    <div key={`${mistake.id}-${idx}`} className="space-y-2.5 p-3.5 sm:p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral" className="tabular">
                          #{idx + 1}
                        </Badge>
                        {mistake.level && <Badge tone="primary">{mistake.level}</Badge>}
                      </div>
                      <p lang="ja" className="text-sm font-medium leading-relaxed text-fg">
                        {mistake.prompt}
                      </p>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <div className="rounded-lg border border-danger-line bg-danger-soft p-2.5">
                          <p className="text-[11px] font-semibold text-danger-fg uppercase">
                            Bạn trả lời
                          </p>
                          <p lang="ja" className="mt-0.5 text-sm font-medium text-fg line-through">
                            {mistake.userAnswer}
                          </p>
                        </div>
                        <div className="rounded-lg border border-success-line bg-success-soft p-2.5">
                          <p className="text-[11px] font-semibold text-success-fg uppercase">
                            Đáp án đúng
                          </p>
                          <p lang="ja" className="mt-0.5 text-sm font-semibold text-fg">
                            {mistake.correctAnswer}
                          </p>
                        </div>
                      </div>
                      {mistake.explanation && (
                        <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted sm:text-sm">
                          {mistake.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
