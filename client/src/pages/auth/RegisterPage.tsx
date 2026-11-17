import { useState, type FormEvent } from 'react';
import { UserPlus, UserRound } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
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
import { useAuth } from '../../context/auth-context';

export function RegisterPage() {
  const { user, isSupabaseConfigured, signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/profile" replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSuccessNotice(null);

    if (!isSupabaseConfigured) {
      setFormError('Máy chủ Supabase chưa được cấu hình. Vui lòng dùng chế độ Khách.');
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
      setSuccessNotice(
        'Đăng ký thành công! Vui lòng kiểm tra hộp thư email để xác nhận tài khoản trước khi đăng nhập.',
      );
      return;
    }

    navigate('/profile', { replace: true });
  };

  return (
    <PageContainer size="sm" className="py-2">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Đăng nhập', to: '/login' },
          { label: 'Đăng ký' },
        ]}
        title="Tạo tài khoản mới"
        description="Mọi tài khoản mới mặc định có quyền USER và được bảo vệ bởi Row Level Security."
      />

      <div className="grid gap-4">
        {!isSupabaseConfigured && (
          <Notice tone="info" className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Chế độ Khách (Offline)</Badge>
              <span className="font-medium text-fg">Đăng ký tạm thời chưa khả dụng khi Offline</span>
            </div>
            <p className="text-sm text-muted">
              Khi chưa cấu hình biến môi trường Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), bạn có thể học trực tiếp bằng chế độ Khách không cần tài khoản.
            </p>
            <div>
              <Button variant="primary" size="sm" onClick={() => navigate('/')}>
                <UserRound className="size-4" aria-hidden />
                Tiếp tục với chế độ Khách (Offline)
              </Button>
            </div>
          </Notice>
        )}

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            {formError && <Notice tone="danger">{formError}</Notice>}
            {successNotice && <Notice tone="success">{successNotice}</Notice>}

            <Field label="Tên hiển thị" htmlFor="register-name">
              <Input
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder="Nguyễn Văn A"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!isSupabaseConfigured || submitting}
                required
              />
            </Field>

            <Field label="Email" htmlFor="register-email">
              <Input
                id="register-email"
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
              htmlFor="register-password"
              hint="Tối thiểu 6 ký tự."
            >
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!isSupabaseConfigured || submitting}
                required
              />
            </Field>

            <Field label="Xác nhận mật khẩu" htmlFor="register-confirm-password">
              <Input
                id="register-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={!isSupabaseConfigured || submitting}
                required
              />
            </Field>

            <Button
              type="submit"
              fullWidth
              loading={submitting}
              disabled={!isSupabaseConfigured}
              leftIcon={<UserPlus className="size-4" aria-hidden />}
            >
              Đăng ký tài khoản
            </Button>
          </form>

          <div className="mt-5 border-t border-line pt-4 text-sm text-muted">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-medium text-primary-fg hover:underline">
              Đăng nhập ngay
            </Link>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
