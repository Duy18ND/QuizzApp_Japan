import { cloneElement, useId, type HTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { CircleAlert, Inbox, LoaderCircle, RotateCw } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

/* ---------- ProgressBar ---------- */

type ProgressTone = 'primary' | 'success' | 'danger';

const progressTones: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  danger: 'bg-danger',
};

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({ value, max = 100, label, tone = 'primary', size = 'md', className }: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(Math.min(Math.max(value, 0), max))}
      className={cn('w-full overflow-hidden rounded-full bg-surface-3', size === 'sm' ? 'h-1.5' : 'h-2.5', className)}
    >
      <div
        className={cn('h-full origin-left rounded-full transition-transform duration-300 ease-out-soft', progressTones[tone])}
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}

/* ---------- Tooltip (CSS-only: hover after a short delay, instantly on keyboard focus) ---------- */

interface TooltipProps {
  content: ReactNode;
  children: ReactElement<{ 'aria-describedby'?: string }>;
  side?: 'top' | 'bottom';
  className?: string;
}

export function Tooltip({ content, children, side = 'bottom', className }: TooltipProps) {
  const id = useId();
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {cloneElement(children, { 'aria-describedby': id })}
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-md bg-fg px-2 py-1 text-xs font-medium whitespace-nowrap text-bg opacity-0 shadow-pop',
          'transition-opacity duration-150 group-hover/tip:opacity-100 group-hover/tip:delay-500 group-focus-within/tip:opacity-100',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {content}
      </span>
    </span>
  );
}

/* ---------- Loading ---------- */

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn('size-5 animate-spin text-primary', className)} aria-hidden />;
}

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('animate-shimmer rounded-md bg-surface-3', className)} {...rest} />;
}

export function LoadingState({ label = 'Đang tải...', className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted', className)}>
      <Spinner className="size-6" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Card-grid placeholder so lists do not jump when data resolves. */
export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Đang tải" className={cn('grid gap-3', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

/* ---------- Empty & Error ---------- */

interface StateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: StateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-12 text-center', className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
        {icon ?? <Inbox className="size-6" aria-hidden />}
      </div>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface ErrorStateProps extends Omit<StateProps, 'action'> {
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Đã xảy ra lỗi',
  description,
  icon,
  onRetry,
  retryLabel = 'Thử lại',
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center rounded-xl border border-danger-line bg-danger-soft px-6 py-12 text-center', className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-surface text-danger-fg">
        {icon ?? <CircleAlert className="size-6" aria-hidden />}
      </div>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {onRetry && (
        <Button variant="secondary" className="mt-5" leftIcon={<RotateCw className="size-4" aria-hidden />} onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/* ---------- Inline notice (banner inside a page/section) ---------- */

type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

const noticeTones: Record<NoticeTone, string> = {
  info: 'border-line bg-primary-soft text-primary-fg',
  success: 'border-success-line bg-success-soft text-success-fg',
  warning: 'border-warning-line bg-warning-soft text-warning-fg',
  danger: 'border-danger-line bg-danger-soft text-danger-fg',
};

export function Notice({
  tone = 'info',
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: NoticeTone }) {
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('rounded-lg border px-4 py-3 text-sm', noticeTones[tone], className)}
      {...rest}
    />
  );
}
