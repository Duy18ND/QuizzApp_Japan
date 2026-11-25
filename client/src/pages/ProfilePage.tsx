import { Link } from 'react-router-dom';
import { LogOut, Settings, UserRound } from 'lucide-react';
import { Badge, Button, Card, PageContainer, PageHeader } from '../components/ui';
import { QuizHistoryCard } from '../components/ui/QuizHistoryCard';
import { buttonStyles } from '../components/ui/styles';
import { useAuth } from '../context/auth-context';
import { MAX_HISTORY_ITEMS } from '../services/quizHistoryService';

export function ProfilePage() {
  const { user, studyLevel, signOut } = useAuth();

  return (
    <PageContainer size="md" className="space-y-4 py-2">
      <PageHeader
        breadcrumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Tài khoản' }]}
        title="Tài khoản"
        description={`Thông tin tài khoản và ${MAX_HISTORY_ITEMS} lượt làm bài gần nhất.`}
      />

      {user && (
        <Card padding="md" className="flex flex-wrap items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-fg">
            <UserRound className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-fg">{user.displayName || user.email}</p>
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
              <span className="truncate">{user.email}</span>
              {studyLevel && <Badge tone="primary">{studyLevel}</Badge>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/settings" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              <Settings className="size-4" aria-hidden />
              Cài đặt
            </Link>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<LogOut className="size-4" aria-hidden />}
              onClick={() => void signOut()}
            >
              Đăng xuất
            </Button>
          </div>
        </Card>
      )}

      <QuizHistoryCard />
    </PageContainer>
  );
}
