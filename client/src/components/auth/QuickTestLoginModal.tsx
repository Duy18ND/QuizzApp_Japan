import { useState } from 'react';
import { Check, FlaskConical, KeyRound, LogOut, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  QUICK_TEST_ACCOUNTS,
  useAuth,
  type QuickTestAccountPreset,
} from '../../context/auth-context';
import type { AccountRole } from '../../store/slices/authSlice';
import { Badge, Button, Card, Modal, Notice } from '../ui';

const ROLE_TONE: Record<AccountRole, 'success' | 'primary' | 'sakura'> = {
  USER: 'success',
  ADMIN: 'primary',
  SUPER_ADMIN: 'sakura',
};

interface QuickTestLoginModalProps {
  open: boolean;
  onClose: () => void;
  onFillCredentials?: (preset: QuickTestAccountPreset) => void;
}

export function QuickTestLoginModal({
  open,
  onClose,
  onFillCredentials,
}: QuickTestLoginModalProps) {
  const { user, isSupabaseConfigured, quickLoginAsRole, quickSignInWithPreset, signOut } =
    useAuth();
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState<AccountRole | null>(null);
  const [useCloudAuth, setUseCloudAuth] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleInstantSwitch = async (preset: QuickTestAccountPreset) => {
    setFeedback(null);
    if (useCloudAuth && isSupabaseConfigured) {
      setLoadingRole(preset.role);
      const res = await quickSignInWithPreset(preset.role);
      setLoadingRole(null);
      if (res.ok) {
        onClose();
        navigate(preset.targetRoute);
      } else {
        setFeedback(res.error ?? 'Không thể đăng nhập tự động. Đã chuyển sang phiên Test nhanh.');
      }
      return;
    }

    quickLoginAsRole(preset.role);
    onClose();
    navigate(preset.targetRoute);
  };

  const handleCloudSignIn = async (preset: QuickTestAccountPreset) => {
    setFeedback(null);
    setLoadingRole(preset.role);
    const res = await quickSignInWithPreset(preset.role);
    setLoadingRole(null);
    if (res.ok) {
      onClose();
      navigate(preset.targetRoute);
    } else {
      setFeedback(res.error ?? 'Không thể đăng nhập Supabase.');
    }
  };

  const handleSwitchToGuest = async () => {
    setFeedback(null);
    await signOut();
    onClose();
    navigate('/');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="inline-flex items-center gap-2">
          <FlaskConical className="size-5 text-primary-fg" aria-hidden />
          Đăng nhập nhanh & Chuyển quyền Test (User / Admin)
        </span>
      }
      description="Công cụ tạm thời giúp chuyển nhanh giữa Học viên (USER), Quản trị (ADMIN) và Super Admin (SUPER_ADMIN) hoặc điền sẵn TK/MK."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted">
            Trạng thái hiện tại:{' '}
            <strong className="text-fg">
              {user ? `${user.displayName} (${user.role})` : 'Khách (GUEST)'}
            </strong>
          </span>
          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<LogOut className="size-3.5" aria-hidden />}
                onClick={() => void handleSwitchToGuest()}
              >
                Về chế độ Khách
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {feedback && <Notice tone="warning">{feedback}</Notice>}

        {/* Quick Toggle Bar */}
        <Card padding="md" className="space-y-3 bg-surface-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-fg">
                Toggle chuyển nhanh quyền Test (1-Click)
              </p>
              <p className="text-xs text-muted">
                Bấm vào quyền bên dưới để vào thẳng giao diện tương ứng (`/` hoặc `/admin`).
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={useCloudAuth}
                onChange={(e) => setUseCloudAuth(e.target.checked)}
              />
              <span>Kết hợp đăng nhập/tạo TK Supabase</span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              variant={!user ? 'primary' : 'secondary'}
              size="sm"
              className="justify-center"
              onClick={() => void handleSwitchToGuest()}
            >
              <UserRound className="size-3.5 shrink-0" aria-hidden />
              <span>Chế độ Khách (GUEST)</span>
            </Button>
            {QUICK_TEST_ACCOUNTS.map((preset) => {
              const isActive = user?.role === preset.role;
              return (
                <Button
                  key={preset.role}
                  variant={isActive ? 'primary' : 'secondary'}
                  size="sm"
                  loading={loadingRole === preset.role}
                  className="justify-center"
                  onClick={() => void handleInstantSwitch(preset)}
                >
                  <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                  <span>{preset.label}</span>
                </Button>
              );
            })}
          </div>
        </Card>

        {/* Detailed Preset Account Cards */}
        <div className="grid gap-3">
          {QUICK_TEST_ACCOUNTS.map((preset) => {
            const isCurrent = user?.role === preset.role;
            return (
              <Card
                key={preset.role}
                padding="md"
                className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={ROLE_TONE[preset.role]}>{preset.role}</Badge>
                    <span className="font-semibold text-fg">{preset.label}</span>
                    {isCurrent && (
                      <Badge tone="success">
                        <Check className="mr-1 inline size-3" aria-hidden />
                        Đang dùng
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted">{preset.description}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-fg">
                    <span>
                      Email: <strong>{preset.email}</strong>
                    </span>
                    <span>
                      MK: <strong>{preset.password}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {onFillCredentials && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<KeyRound className="size-3.5" aria-hidden />}
                      onClick={() => {
                        onFillCredentials(preset);
                        onClose();
                      }}
                    >
                      Điền TK/MK
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={loadingRole === preset.role}
                    onClick={() => void handleCloudSignIn(preset)}
                  >
                    Auth Supabase
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Sparkles className="size-3.5" aria-hidden />}
                    onClick={() => {
                      quickLoginAsRole(preset.role);
                      onClose();
                      navigate(preset.targetRoute);
                    }}
                  >
                    Vào ngay {preset.role}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <Notice tone="info" className="text-xs">
          <strong>Mẹo khi test ghi dữ liệu thật lên Supabase (Migrate All / CRUD):</strong> Sau khi
          bấm <em>Auth Supabase</em> cho tài khoản <code>superadmin@nihongo.vn</code>, chạy lệnh SQL
          sau trong Supabase SQL Editor để cấp quyền ghi RLS trên PostgreSQL:{' '}
          <code className="font-mono">
            update public.profiles set role = &apos;SUPER_ADMIN&apos; where email =
            &apos;superadmin@nihongo.vn&apos;;
          </code>
        </Notice>
      </div>
    </Modal>
  );
}
