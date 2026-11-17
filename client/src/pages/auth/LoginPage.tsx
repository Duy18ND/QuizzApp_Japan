import { useState, type FormEvent } from 'react';
import { LogIn, ShieldCheck, UserRound } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageContainer,
  PageHeader,
} from '../../components/ui';
import { buttonStyles } from '../../components/ui/styles';
import { useAuth } from '../../context/auth-context';

export function LoginPage() {
  const { user, isSupabaseConfigured, signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectState = location.state as { from?: string } | null;
  const redirectTo =
    redirectState?.from && redirectState.from.startsWith('/') ? redirectState.from : '/profile';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!isSupabaseConfigured) {
      setFormError('Máy chủ Supabase chưa được cấu hình. Vui lòng tiếp tục ở chế độ Khách.');
      return;
    }

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

    navigate(redirectTo, { replace: true });
  };

  return (
    <PageContainer size="sm" className="py-2">
      <PageHeader
        breadcrumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Đăng nhập' }]}
        title="Đăng nhập tài khoản"
        description="Đồng bộ tiến độ học tập, lịch sử làm bài và phân quyền quản trị."
      />

      <div className="grid gap-4">
        {!isSupabaseConfigured && (
          <Notice tone="info" className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Chế độ Khách (Offline)</Badge>
              <span className="font-medium text-fg">Supabase chưa được cấu hình trên môi trường này</span>
            </div>
            <p className="text-sm text-muted">
              Ứng dụng tự động hoạt động ở chế độ Local/Guest: toàn bộ tiến độ Kanji, Ngữ pháp, Từ vựng và lịch sử làm bài vẫn được lưu an toàn ngay trên trình duyệt.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={() => navigate('/')}>
                <UserRound className="size-4" aria-hidden />
                Tiếp tục với chế độ Khách (Offline)
              </Button>
              <Link to="/profile" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                Xem hồ sơ &amp; lịch sử
              </Link>
            </div>
          </Notice>
        )}

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            {formError && <Notice tone="danger">{formError}</Notice>}

            <Field label="Email" htmlFor="login-email">
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="hocvien@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isSupabaseConfigured || submitting}
                required
              />
            </Field>

            <Field label="Mật khẩu" htmlFor="login-password">
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!isSupabaseConfigured || submitting}
                required
              />
            </Field>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                type="submit"
                fullWidth
                loading={submitting}
                disabled={!isSupabaseConfigured}
                leftIcon={<LogIn className="size-4" aria-hidden />}
              >
                Đăng nhập
              </Button>
              {isSupabaseConfigured && (
                <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
                  Tiếp tục với chế độ Khách (Offline)
                </Button>
              )}
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm text-muted">
            <span>
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-medium text-primary-fg hover:underline">
                Đăng ký ngay
              </Link>
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <ShieldCheck className="size-3.5 text-primary-fg" aria-hidden />
              Supabase Auth + RLS
            </span>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
