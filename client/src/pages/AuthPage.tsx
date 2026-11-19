import { useState, type FormEvent } from 'react';
import { FlaskConical, KeyRound, LogIn, ShieldCheck, Sparkles, UserPlus, UserRound } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GoogleSignInButton } from '../components/auth/LoginRequiredState';
import { QuickTestLoginModal } from '../components/auth/QuickTestLoginModal';
import { SupabaseStatusBadge } from '../components/common/SupabaseStatusBadge';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageContainer,
  PageHeader,
  Tabs,
} from '../components/ui';
import {
  isQuickTestAllowed,
  QUICK_TEST_ACCOUNTS,
  useAuth,
  type QuickTestAccountPreset,
} from '../context/auth-context';
import type { AccountRole } from '../store/slices/authSlice';

type AuthMode = 'login' | 'register';

interface AuthPageProps {
  initialMode?: AuthMode;
}

const resolvePostAuthRoute = (role?: AccountRole, requestedFrom?: string): string => {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin';
  if (
    requestedFrom &&
    requestedFrom.startsWith('/') &&
    requestedFrom !== '/login' &&
    requestedFrom !== '/register' &&
    !requestedFrom.startsWith('/admin')
  ) {
    return requestedFrom;
  }
  return '/';
};

export function AuthPage({ initialMode = 'login' }: AuthPageProps) {
  const {
    user,
    error: authError,
    isSupabaseConfigured,
    signInWithEmail,
    signUpWithEmail,
    quickLoginAsRole,
    quickSignInWithPreset,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectState = location.state as { from?: string } | null;

  const derivedMode: AuthMode = location.pathname === '/register' ? 'register' : initialMode;
  const [mode, setMode] = useState<AuthMode>(derivedMode);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Temporary Quick-Test Toggle & Modal state (Strictly restricted to localhost/dev)
  const quickTestAllowed = isQuickTestAllowed();
  const [quickToggleEnabled, setQuickToggleEnabled] = useState(true);
  const [selectedPresetRole, setSelectedPresetRole] = useState<AccountRole>('SUPER_ADMIN');
  const [quickModalOpen, setQuickModalOpen] = useState(false);

  if (user) {
    return <Navigate to={resolvePostAuthRoute(user.role, redirectState?.from)} replace />;
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFormError(null);
    setInfoNotice(null);
  };

  const handleFillPreset = (preset: QuickTestAccountPreset) => {
    setSelectedPresetRole(preset.role);
    setDisplayName(preset.displayName);
    setEmail(preset.email);
    setPassword(preset.password);
    setConfirmPassword(preset.password);
    setFormError(null);
    setInfoNotice(
      `Đã điền sẵn TK/MK ${preset.label}: ${preset.email} / ${preset.password}`,
    );
  };

  const handleQuickPresetAuth = async (role: AccountRole) => {
    setFormError(null);
    setInfoNotice(null);
    setSubmitting(true);
    const res = await quickSignInWithPreset(role);
    setSubmitting(false);
    if (res.ok) {
      const target = resolvePostAuthRoute(res.user?.role ?? role, redirectState?.from);
      navigate(target, { replace: true });
    } else {
      setFormError(res.error ?? 'Đăng nhập nhanh thất bại.');
    }
  };

  const handleInstantTestRole = (role: AccountRole) => {
    const testUser = quickLoginAsRole(role);
    const target = resolvePostAuthRoute(testUser.role, redirectState?.from);
    navigate(target, { replace: true });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setInfoNotice(null);

    if (!isSupabaseConfigured) {
      setFormError('Máy chủ Supabase chưa được cấu hình. Vui lòng dùng nút Vào nhanh quyền Test bên trên hoặc chế độ Khách.');
      return;
    }

    if (mode === 'login') {
      if (!email.trim() || !password) {
        setFormError('Vui lòng nhập đầy đủ email và mật khẩu.');
        return;
      }

      setSubmitting(true);
      const result = await signInWithEmail(email, password);
      setSubmitting(false);

      if (!result.ok) {
        setFormError(result.error ?? 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        return;
      }

      const target = resolvePostAuthRoute(result.user?.role, redirectState?.from);
      navigate(target, { replace: true });
      return;
    }

    if (!displayName.trim() || !email.trim() || !password) {
      setFormError('Vui lòng điền đầy đủ tên hiển thị, email và mật khẩu.');
      return;
    }
    if (password.length < 6) {
      setFormError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setSubmitting(true);
    const result = await signUpWithEmail(email, password, displayName);
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.error ?? 'Đăng ký không thành công. Vui lòng thử lại.');
      return;
    }

    if (result.needsEmailConfirmation) {
      setInfoNotice(
        'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập (hoặc tắt Confirm Email trong Supabase Auth để vào ngay).',
      );
      return;
    }

    const target = resolvePostAuthRoute(result.user?.role, redirectState?.from);
    navigate(target, { replace: true });
  };

  return (
    <PageContainer size="sm" className="py-2">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: mode === 'login' ? 'Đăng nhập' : 'Đăng ký' },
        ]}
        title={mode === 'login' ? 'Đăng nhập tài khoản' : 'Đăng ký tài khoản mới'}
        description="Đồng bộ tiến độ học tập, lịch sử làm bài và quản trị nội dung qua Supabase."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SupabaseStatusBadge />
            {quickTestAllowed && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<FlaskConical className="size-4 text-primary-fg" aria-hidden />}
                onClick={() => setQuickModalOpen(true)}
              >
                Modal Test User / Admin
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4">
        {!isSupabaseConfigured && (
          <Notice tone="info" className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Chế độ Khách (Offline)</Badge>
              <span className="font-medium text-fg">Chưa cấu hình biến môi trường Supabase</span>
            </div>
            <p className="text-sm text-muted">
              Bạn vẫn có thể học toàn bộ từ vựng, Kanji, ngữ pháp và luyện đề JLPT ở chế độ Khách; tiến độ được lưu trên trình duyệt.
            </p>
            <div>
              <Button variant="primary" size="sm" onClick={() => navigate('/')}>
                <UserRound className="size-4" aria-hidden />
                Tiếp tục với chế độ Khách (Offline)
              </Button>
            </div>
          </Notice>
        )}

        <Card padding="lg" className="space-y-4">
          {/* Google OAuth Login (requires Supabase Auth Google Provider enabled) */}
          <div className="space-y-2.5">
            <GoogleSignInButton
              fullWidth
              size="md"
              variant="secondary"
              label="Tiếp tục với Google"
              onErrorMessage={(msg) => setFormError(msg)}
            />
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              <span>hoặc tự tạo tài khoản / đăng nhập bằng Email</span>
              <span className="h-px flex-1 bg-line" />
            </div>
          </div>

          {/* Temporary Quick-Test Credentials Toggle (Dev / Localhost Only) */}
          {quickTestAllowed && (
          <div className="rounded-xl border border-line bg-surface-2 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-primary-fg shrink-0" aria-hidden />
                <span className="text-xs font-semibold text-fg sm:text-sm">
                  Toggle tạm: Điền & Đăng nhập nhanh TK/MK Test
                </span>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-fg">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={quickToggleEnabled}
                  onChange={(e) => setQuickToggleEnabled(e.target.checked)}
                />
                <span>{quickToggleEnabled ? 'Đang bật' : 'Đang tắt'}</span>
              </label>
            </div>

            {quickToggleEnabled && (
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {QUICK_TEST_ACCOUNTS.map((preset) => {
                    const active = selectedPresetRole === preset.role;
                    return (
                      <Button
                        key={preset.role}
                        type="button"
                        variant={active ? 'primary' : 'secondary'}
                        size="sm"
                        className="justify-center"
                        onClick={() => handleFillPreset(preset)}
                      >
                        <span>Điền {preset.shortLabel}</span>
                      </Button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={submitting}
                      leftIcon={<Sparkles className="size-3.5 shrink-0" aria-hidden />}
                      onClick={() => handleInstantTestRole(selectedPresetRole)}
                    >
                      Vào nhanh {selectedPresetRole}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={submitting}
                      onClick={() => void handleQuickPresetAuth(selectedPresetRole)}
                    >
                      Auth Supabase ({selectedPresetRole})
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<FlaskConical className="size-3.5 shrink-0" aria-hidden />}
                    onClick={() => setQuickModalOpen(true)}
                  >
                    Mở Modal chọn quyền
                  </Button>
                </div>
              </div>
            )}
          </div>
          )}

          <Tabs
            items={[
              {
                value: 'login',
                label: 'Đăng nhập',
                icon: <LogIn className="size-4" aria-hidden />,
              },
              {
                value: 'register',
                label: 'Đăng ký',
                icon: <UserPlus className="size-4" aria-hidden />,
              },
            ]}
            value={mode}
            onChange={switchMode}
            aria-label="Chọn đăng nhập hoặc đăng ký"
            idPrefix="auth-mode"
          />

          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            {(formError || authError) && <Notice tone="danger">{formError ?? authError}</Notice>}
            {infoNotice && <Notice tone="success">{infoNotice}</Notice>}

            {mode === 'register' && (
              <Field label="Tên hiển thị" htmlFor="auth-display-name">
                <Input
                  id="auth-display-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isSupabaseConfigured || submitting}
                  required
                />
              </Field>
            )}

            <Field label="Email" htmlFor="auth-email">
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="hocvien@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isSupabaseConfigured || submitting}
                required
              />
            </Field>

            <Field
              label="Mật khẩu"
              htmlFor="auth-password"
              hint={mode === 'register' ? 'Tối thiểu 6 ký tự.' : undefined}
            >
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!isSupabaseConfigured || submitting}
                required
              />
            </Field>

            {mode === 'register' && (
              <Field label="Xác nhận mật khẩu" htmlFor="auth-confirm-password">
                <Input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!isSupabaseConfigured || submitting}
                  required
                />
              </Field>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button
                type="submit"
                fullWidth
                loading={submitting}
                disabled={!isSupabaseConfigured}
                leftIcon={
                  mode === 'login' ? (
                    <LogIn className="size-4" aria-hidden />
                  ) : (
                    <UserPlus className="size-4" aria-hidden />
                  )
                }
              >
                {mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                className="h-auto min-h-10 py-2 whitespace-normal"
                onClick={() => navigate('/')}
              >
                Xem thử với chế độ Khách (không lưu tiến độ)
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-muted">
            <span>
              Phiên đăng nhập được giữ đến khi bạn bấm <strong>Đăng xuất</strong>; dữ liệu làm bài &amp; câu sai lưu trực tiếp trên Supabase theo từng tài khoản.
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-primary-fg" aria-hidden />
              Mã băm PBKDF2-SHA256 + Supabase Auth &amp; RLS
            </span>
          </div>
        </Card>
      </div>

      <QuickTestLoginModal
        open={quickModalOpen}
        onClose={() => setQuickModalOpen(false)}
        onFillCredentials={handleFillPreset}
      />
    </PageContainer>
  );
}
