import { useState, type FormEvent } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GoogleSignInButton } from '../components/auth/LoginRequiredState';
import {
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageContainer,
  PageHeader,
  Tabs,
} from '../components/ui';
import { useAuth } from '../context/auth-context';
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

  if (user) {
    return <Navigate to={resolvePostAuthRoute(user.role, redirectState?.from)} replace />;
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFormError(null);
    setInfoNotice(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setInfoNotice(null);

    if (!isSupabaseConfigured) {
      setFormError('Dịch vụ đăng nhập hiện tạm thời chưa sẵn sàng. Bạn có thể tiếp tục xem thử ở chế độ Khách.');
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
        'Đăng ký thành công! Vui lòng kiểm tra hộp thư email để xác nhận tài khoản trước khi đăng nhập.',
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
        description="Lưu tiến độ học tập, lộ trình cá nhân và lịch sử làm bài của bạn."
      />

      <div className="grid gap-4">
        <Card padding="lg" className="space-y-4">
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

            <div className="pt-1">
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
            </div>
          </form>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              <span>hoặc tiếp tục với</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <GoogleSignInButton
              fullWidth
              size="md"
              variant="secondary"
              label="Tiếp tục với Google"
              onErrorMessage={(msg) => setFormError(msg)}
            />

            <Button
              type="button"
              variant="ghost"
              fullWidth
              className="h-auto min-h-10 py-2 whitespace-normal"
              onClick={() => navigate('/')}
            >
              Xem thử với chế độ Khách (không lưu tiến độ)
            </Button>

            <p className="pt-1 text-center text-[11px] leading-relaxed text-muted">
              Bằng việc đăng nhập hoặc đăng ký, bạn đồng ý với{' '}
              <Link to="/terms" className="font-medium text-primary-fg underline underline-offset-2">
                Điều khoản sử dụng
              </Link>{' '}
              và{' '}
              <Link to="/privacy" className="font-medium text-primary-fg underline underline-offset-2">
                Chính sách bảo mật
              </Link>{' '}
              của Nihongo 問.
            </p>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
