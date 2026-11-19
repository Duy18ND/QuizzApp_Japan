import { Clock, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { useQuizHistory } from '../../services/quizHistoryService';
import { LoginRequiredState } from '../auth/LoginRequiredState';
import { Badge, Card } from './Layout';
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
  const history = useQuizHistory();
  const visibleItems = user ? (typeof limit === 'number' ? history.slice(0, limit) : history) : [];

  return (
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
                  ? `${history.length} lượt hoàn thành gần đây`
                  : 'Kết quả Quiz, Ngữ pháp, Luyện gõ và JLPT được lưu theo tài khoản của bạn'}
            </p>
          </div>
        </div>
        {user && showProfileLink && (
          <Link to="/profile" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            Xem tất cả ({history.length})
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
