import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

/* ---------- Card ---------- */

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-2.5',
  md: 'p-3.5 md:p-4',
  lg: 'p-4 md:p-5',
};

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  padding?: CardPadding;
  /** `muted` is a tinted surface for secondary content that must not read as a second card. */
  tone?: 'default' | 'muted';
}

export function Card({ as: Tag = 'div', padding = 'md', tone = 'default', className, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        'animate-fade-up rounded-xl border border-line',
        tone === 'default' ? 'bg-glass shadow-card' : 'bg-glass-soft',
        paddingClasses[padding],
        className,
      )}
      {...rest}
    />
  );
}

const interactiveCard =
  'animate-fade-up block rounded-xl border border-line bg-glass shadow-card ' +
  'transition-[border-color,background-color,transform] duration-150 ease-out-soft ' +
  'hover:-translate-y-0.5 hover:border-primary hover:bg-glass-hover active:scale-[0.99]';

/** A whole card that navigates. Use instead of onClick on a div. */
export function CardLink({ className, padding = 'md', ...rest }: LinkProps & { padding?: CardPadding }) {
  return <Link className={cn(interactiveCard, paddingClasses[padding], className)} {...rest} />;
}

/* ---------- Badge ---------- */

type BadgeTone = 'neutral' | 'primary' | 'sakura' | 'success' | 'warning' | 'danger';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-glass-soft text-muted border-line',
  primary: 'bg-primary-soft text-primary-fg border-transparent',
  sakura: 'bg-sakura-soft text-sakura border-sakura/30',
  success: 'bg-success-soft text-success-fg border-success-line',
  warning: 'bg-warning-soft text-warning-fg border-warning-line',
  danger: 'bg-danger-soft text-danger-fg border-danger-line',
};

export function Badge({
  tone = 'neutral',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        badgeTones[tone],
        className,
      )}
      {...rest}
    />
  );
}

/* ---------- Page structure ---------- */

const containerSizes = { sm: 'max-w-2xl', md: 'max-w-4xl', lg: 'max-w-6xl' } as const;

export function PageContainer({
  size = 'lg',
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { size?: keyof typeof containerSizes }) {
  return <div className={cn('mx-auto w-full', containerSizes[size], className)} {...rest} />;
}

export interface Crumb {
  label: ReactNode;
  to?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('mb-2 sm:mb-3', className)}>
      <ol className="hide-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto text-xs whitespace-nowrap text-muted sm:flex-wrap sm:text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={index} className="flex shrink-0 items-center gap-1">
              {item.to && !last ? (
                <Link to={item.to} className="rounded transition-colors hover:text-fg">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={cn(last && 'font-medium text-fg')}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="size-3.5 text-subtle" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('relative mb-3 md:mb-5', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-2.5 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl md:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-prose text-sm text-muted sm:mt-1.5 sm:text-base">{description}</p>}
          <span aria-hidden className="mt-2 block h-0.5 w-14 rounded-full bg-linear-to-r from-primary via-sakura to-transparent sm:mt-3 sm:w-16" />
        </div>
        {actions && <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/* ---------- Kbd & Stat ---------- */

export function Kbd({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded border border-line-strong bg-glass-soft px-1.5 font-sans text-xs text-muted',
        className,
      )}
      {...rest}
    />
  );
}

export function Stat({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className="tabular text-2xl font-bold tracking-tight text-fg">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
