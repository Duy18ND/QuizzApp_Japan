import React, { useState } from 'react';
import { Lock, LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button, Notice } from '../ui';
import { buttonStyles } from '../ui/styles';

export const GoogleLogoMark: React.FC<{ className?: string }> = ({ className = 'size-4 shrink-0' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" />
  </svg>
);

interface GoogleSignInButtonProps {
  label?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'soft';
  onErrorMessage?: (message: string) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  label = 'Đăng nhập bằng Google',
  fullWidth = false,
  size = 'sm',
  variant = 'secondary',
  onErrorMessage,
}) => {
  const { isSupabaseConfigured, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleClick = async () => {
    setLocalError(null);
    if (!isSupabaseConfigured) {
      const msg = 'Đăng nhập bằng Google hiện tạm thời chưa khả dụng.';
      setLocalError(msg);
      onErrorMessage?.(msg);
      return;
    }
    setLoading(true);
    const res = await signInWithGoogle();
    setLoading(false);
    if (!res.ok && res.error) {
      setLocalError(res.error);
      onErrorMessage?.(res.error);
    }
  };

  return (
    <div className={fullWidth ? 'w-full space-y-2' : 'inline-flex flex-col gap-1.5'}>
      <Button
        type="button"
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        loading={loading}
        leftIcon={<GoogleLogoMark className="size-4 shrink-0" />}
        onClick={() => void handleClick()}
      >
        {label}
      </Button>
      {localError && !onErrorMessage && <Notice tone="warning">{localError}</Notice>}
    </div>
  );
};

interface LoginRequiredStateProps {
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

export const LoginRequiredState: React.FC<LoginRequiredStateProps> = ({
  title = 'Đăng nhập để lưu & xem tiến độ học tập',
  description = 'Người chưa đăng nhập sẽ không lưu tiến độ, câu làm sai và chuỗi ngày học. Đăng nhập bằng Google hoặc tự tạo tài khoản để bắt đầu.',
  compact = false,
  className = '',
}) => {
  const [googleErr, setGoogleErr] = useState<string | null>(null);

  return (
    <div
      className={`rounded-xl border border-dashed border-line-strong bg-surface-2 ${
        compact
          ? 'flex flex-col gap-3 px-3.5 py-3 text-center md:flex-row md:items-center md:justify-between md:px-4 md:py-3 md:text-left'
          : 'px-4 py-7 text-center sm:px-6 sm:py-9'
      } ${className}`}
    >
      <div className={compact ? 'min-w-0 md:flex md:items-center md:gap-3' : undefined}>
        <div
          className={
            compact
              ? 'mx-auto mb-2 grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-fg md:mx-0 md:mb-0'
              : 'mx-auto mb-2.5 grid size-10 place-items-center rounded-full bg-primary-soft text-primary-fg'
          }
        >
          <Lock className={compact ? 'size-4.5' : 'size-5'} aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg sm:text-base">{title}</h3>
          <p className={compact ? 'mt-0.5 text-xs text-muted' : 'mx-auto mt-1 max-w-lg text-xs text-muted sm:text-sm'}>
            {description}
          </p>
        </div>
      </div>

      {googleErr && !compact && (
        <Notice tone="warning" className="mx-auto mt-3 max-w-lg text-left">
          {googleErr}
        </Notice>
      )}

      <div
        className={
          compact
            ? 'flex flex-col justify-center gap-2 shrink-0 sm:flex-row sm:flex-wrap sm:items-center md:justify-end'
            : 'mt-4 flex flex-col justify-center gap-2 sm:flex-row sm:flex-wrap sm:items-center'
        }
      >
        <GoogleSignInButton
          variant="primary"
          size="sm"
          label="Đăng nhập bằng Google"
          onErrorMessage={(msg) => setGoogleErr(msg)}
        />
        <Link
          to="/login"
          className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'justify-center' })}
        >
          <LogIn className="size-4 shrink-0" aria-hidden />
          Đăng nhập tài khoản
        </Link>
        <Link
          to="/register"
          className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'justify-center' })}
        >
          <UserPlus className="size-4 shrink-0" aria-hidden />
          Tự tạo tài khoản
        </Link>
      </div>

      {googleErr && compact && (
        <Notice tone="warning" className="w-full text-left md:hidden">
          {googleErr}
        </Notice>
      )}
    </div>
  );
};
