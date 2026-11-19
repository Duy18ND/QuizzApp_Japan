import {
  CheckCircle2,
  GraduationCap,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { GoogleSignInButton } from '../components/auth/LoginRequiredState';
import {
  Badge,
  Button,
  Card,
  PageContainer,
  PageHeader,
} from '../components/ui';
import { QuizHistoryCard } from '../components/ui/QuizHistoryCard';
import { buttonStyles } from '../components/ui/styles';
import { useAuth } from '../context/auth-context';
import { getStudyLevelMeta, requestOpenLevelModal } from '../services/userLevelService';
import type { AccountRole } from '../store/slices/authSlice';

const ROLE_META: Record<
  AccountRole,
  { label: string; tone: 'sakura' | 'primary' | 'success' }
> = {
  SUPER_ADMIN: { label: 'Quản trị tối cao', tone: 'sakura' },
  ADMIN: { label: 'Quản trị viên', tone: 'primary' },
  USER: { label: 'Học viên', tone: 'success' },
};

const SYNC_STATUS_LABEL = {
  idle: 'Sẵn sàng cập nhật',
  syncing: 'Đang cập nhật...',
  synced: 'Tiến độ đã được lưu',
  error: 'Không thể cập nhật lúc này',
} as const;

export function ProfilePage() {
  const { user, studyLevel, syncStatus, lastSyncedAt, signOut, syncNow } = useAuth();

  const roleMeta = user ? ROLE_META[user.role] : null;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const levelMeta = getStudyLevelMeta(studyLevel);

  return (
    <PageContainer size="md" className="py-2">
      <PageHeader
        breadcrumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Hồ sơ & Lịch sử' }]}
        title="Hồ sơ học viên"
        description="Quản lý thông tin tài khoản, trình độ mục tiêu và lịch sử làm bài của bạn."
      />

      <div className="grid gap-4">
        <Card padding="lg">
          {user && roleMeta ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary-fg"
                  >
                    <UserRound className="size-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-fg">{user.displayName}</h2>
                      <Badge tone={roleMeta.tone}>{roleMeta.label}</Badge>
                      {studyLevel && <Badge tone="primary">JLPT {studyLevel}</Badge>}
                    </div>
                    <p className="text-sm text-muted">{user.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className={buttonStyles({ variant: 'primary', size: 'sm' })}
                    >
                      <ShieldCheck className="size-4" aria-hidden />
                      Bảng quản trị
                    </Link>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void signOut()}
                    leftIcon={<LogOut className="size-4" aria-hidden />}
                  >
                    Đăng xuất
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-glass-soft px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <GraduationCap className="size-4 text-primary-fg" aria-hidden />
                  <span className="font-medium text-fg">
                    {studyLevel
                      ? `Trình độ đang học: JLPT ${studyLevel}${levelMeta ? ` (${levelMeta.title})` : ''}`
                      : 'Chưa chọn trình độ tiếng Nhật'}
                  </span>
                </div>
                <Button variant="secondary" size="sm" onClick={requestOpenLevelModal}>
                  {studyLevel ? 'Đổi trình độ' : 'Chọn trình độ'}
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-glass-soft px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-primary-fg" aria-hidden />
                  <span className="font-medium text-fg">{SYNC_STATUS_LABEL[syncStatus]}</span>
                  {lastSyncedAt && (
                    <span className="text-xs text-muted">
                      ({new Date(lastSyncedAt).toLocaleString('vi-VN')})
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={syncStatus === 'syncing'}
                  onClick={() => void syncNow()}
                  leftIcon={<RefreshCw className="size-3.5" aria-hidden />}
                >
                  Cập nhật ngay
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid size-11 place-items-center rounded-xl bg-glass-soft text-muted"
                  >
                    <UserRound className="size-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-fg">Chế độ Khách</h2>
                      <Badge tone="neutral">Chưa đăng nhập</Badge>
                    </div>
                    <p className="text-sm text-muted">
                      Người chưa đăng nhập sẽ không lưu tiến độ học tập. Hãy đăng nhập bằng Google hoặc tự tạo tài khoản để lưu tiến độ cá nhân.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <GoogleSignInButton variant="primary" size="sm" label="Đăng nhập Google" />
                  <Link to="/login" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                    <LogIn className="size-4" aria-hidden />
                    Đăng nhập
                  </Link>
                  <Link to="/register" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
                    <UserPlus className="size-4" aria-hidden />
                    Tự tạo tài khoản
                  </Link>
                </div>
              </div>
            </div>
          )}
        </Card>

        <QuizHistoryCard />
      </div>
    </PageContainer>
  );
}
