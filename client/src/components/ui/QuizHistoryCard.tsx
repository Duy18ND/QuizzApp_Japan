import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Eye, History, X, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getAttemptReviewItems } from '../../services/attemptMistakeService';
import { getLiveAllVocabulary, getLiveGrammarBooks } from '../../services/curriculumStore';
import {
  MAX_HISTORY_ITEMS,
  useQuizHistory,
  type QuizAttemptRecord,
} from '../../services/quizHistoryService';
import { cn } from '../../lib/cn';
import { LoginRequiredState } from '../auth/LoginRequiredState';
import { Button, IconButton } from './Button';
import { Badge, Card } from './Layout';
import { Chip } from './Fields';
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
  kanji: 'Quiz Chữ Hán',
  'minigame-shooter': 'Mini-game · Ninja chém từ',
};

const quizTypeLabel = (type: string): string => {
  if (QUIZ_TYPE_LABELS[type]) return QUIZ_TYPE_LABELS[type];
  const stage = type.match(/^roadmap-stage-(\d+)$/);
  if (stage) return `Lộ trình · Màn ${stage[1]}`;
  if (type.startsWith('minigame-')) return 'Mini-game';
  return type;
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
  /** Shows a close button in the card header */
  onClose?: () => void;
}

export function QuizHistoryCard({ limit, showProfileLink = false, className, onClose }: QuizHistoryCardProps) {
  const { user } = useAuth();
  const rawHistory = useQuizHistory();
  const cmsSnapshot = useCurriculumSnapshot();
  const [reviewAttempt, setReviewAttempt] = useState<QuizAttemptRecord | null>(null);

  const history = useMemo(() => rawHistory.slice(0, MAX_HISTORY_ITEMS), [rawHistory]);
  const effectiveLimit =
    typeof limit === 'number' ? Math.min(limit, MAX_HISTORY_ITEMS) : MAX_HISTORY_ITEMS;
  const visibleItems = user ? history.slice(0, effectiveLimit) : [];

  const [onlyWrong, setOnlyWrong] = useState(false);

  const allVocab = useMemo(() => getLiveAllVocabulary(cmsSnapshot), [cmsSnapshot]);
  const liveGrammarBooks = useMemo(() => getLiveGrammarBooks(cmsSnapshot), [cmsSnapshot]);

  const reviewItems = useMemo(
    () =>
      reviewAttempt
        ? getAttemptReviewItems(reviewAttempt, allVocab, liveGrammarBooks)
        : [],
    [reviewAttempt, allVocab, liveGrammarBooks],
  );
  const wrongItems = reviewItems.filter((i) => !i.isCorrect);
  const shownItems = onlyWrong ? wrongItems : reviewItems;
  // attempts saved before correct answers were stored have nothing (or only mistakes) to show
  const isPartial = reviewAttempt !== null && !reviewItems.some((i) => i.isCorrect) && reviewAttempt.score > 0;

  const reviewTotal = reviewAttempt ? Math.max(1, reviewAttempt.totalQuestions) : 1;
  const reviewWrongCount = reviewAttempt
    ? Math.max(0, reviewTotal - reviewAttempt.score)
    : 0;
  const reviewPercent = reviewAttempt
    ? Math.round((reviewAttempt.score / reviewTotal) * 100)
    : 0;
  const reviewTitle = reviewAttempt
    ? `${quizTypeLabel(reviewAttempt.quizType)}${
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
          {onClose && (
            <IconButton aria-label="Đóng lịch sử" title="Đóng" onClick={onClose}>
              <X className="size-4" aria-hidden />
            </IconButton>
          )}
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
              const label = quizTypeLabel(item.quizType);

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
                      onClick={() => {
                        setOnlyWrong(false);
                        setReviewAttempt(item);
                      }}
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

            {reviewWrongCount === 0 && (
              <div className="flex items-center gap-2.5 rounded-xl border border-success-line bg-success-soft px-3 py-2 text-sm text-success-fg">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                <p className="font-medium">Đúng toàn bộ {reviewTotal} câu.</p>
              </div>
            )}

            {wrongItems.length > 0 && wrongItems.length < reviewItems.length && (
              <div className="flex gap-1.5" role="group" aria-label="Lọc câu hỏi">
                <Chip selected={!onlyWrong} onClick={() => setOnlyWrong(false)}>
                  Tất cả ({reviewItems.length})
                </Chip>
                <Chip selected={onlyWrong} onClick={() => setOnlyWrong(true)}>
                  Câu sai ({wrongItems.length})
                </Chip>
              </div>
            )}

            {isPartial && (
              <p className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-muted sm:text-sm">
                Lượt này không lưu chi tiết các câu trả lời đúng (mini-game hoặc lượt làm trước bản cập nhật).
              </p>
            )}

            {shownItems.length > 0 && (
              <ol className="divide-y divide-line rounded-xl border border-line bg-surface">
                {shownItems.map((entry, idx) => {
                  const options = entry.options ?? [];
                  // pick-an-option questions mark the options; typed or ordering answers show text
                  const listed = options.includes(entry.correctAnswer);
                  return (
                    <li key={`${entry.id}-${idx}`} className="space-y-2 p-3 sm:p-4">
                      <div className="flex items-start gap-2">
                        {entry.isCorrect ? (
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-fg" aria-label="Đúng" />
                        ) : (
                          <XCircle className="mt-0.5 size-4 shrink-0 text-danger-fg" aria-label="Sai" />
                        )}
                        <p lang="ja" className="min-w-0 flex-1 text-sm font-medium leading-relaxed text-fg">
                          <span className="tabular mr-1 text-xs text-muted">{idx + 1}.</span>
                          {entry.prompt}
                        </p>
                      </div>

                      {listed ? (
                        <ul className="grid gap-1.5 sm:grid-cols-2">
                          {options.map((option, i) => {
                            const isAnswer = option === entry.correctAnswer;
                            const isWrongPick = !entry.isCorrect && option === entry.userAnswer;
                            return (
                              <li
                                key={`${i}-${option}`}
                                className={cn(
                                  'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-sm',
                                  isAnswer
                                    ? 'border-success-line bg-success-soft text-success-fg'
                                    : isWrongPick
                                      ? 'border-danger-line bg-danger-soft text-danger-fg'
                                      : 'border-line text-fg',
                                )}
                              >
                                <span lang="ja" className="min-w-0">{option}</span>
                                {(isAnswer || isWrongPick) && (
                                  <span className="shrink-0 text-[11px] font-semibold">
                                    {isAnswer ? (entry.isCorrect ? '✓ Bạn chọn' : '✓ Đáp án') : '✕ Bạn chọn'}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="space-y-1 text-sm">
                          {!entry.isCorrect && (
                            <p className="rounded-lg border border-danger-line bg-danger-soft px-2.5 py-1.5 text-danger-fg">
                              Bạn trả lời: <span lang="ja">{entry.userAnswer}</span>
                            </p>
                          )}
                          <p className="rounded-lg border border-success-line bg-success-soft px-2.5 py-1.5 text-success-fg">
                            Đáp án: <span lang="ja">{entry.correctAnswer}</span>
                          </p>
                        </div>
                      )}

                      {entry.explanation && (
                        <p className="text-xs leading-relaxed text-muted">{entry.explanation}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
