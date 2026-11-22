import { cn } from '../../lib/cn';

/* Shared class recipes. Use these to style non-<button> elements (e.g. react-router <Link>)
   so they stay pixel-identical to the matching primitive. */

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap select-none touch-manipulation ' +
  'transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-out-soft ' +
  'active:scale-[0.98] disabled:pointer-events-none aria-disabled:pointer-events-none';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'border border-transparent bg-primary text-on-primary ' +
    'hover:bg-primary-hover active:bg-primary-active ' +
    'disabled:border-line disabled:bg-glass-soft disabled:text-subtle ' +
    'aria-disabled:border-line aria-disabled:bg-glass-soft aria-disabled:text-subtle',
  secondary:
    'border border-line-strong bg-glass text-fg ' +
    'hover:border-primary/50 hover:bg-glass-hover disabled:opacity-45 aria-disabled:opacity-45',
  soft:
    'border border-primary/25 bg-primary-soft text-primary-fg ' +
    'hover:border-primary/45 hover:bg-primary-soft-hover disabled:opacity-45 aria-disabled:opacity-45',
  ghost: 'text-muted hover:bg-glass-soft hover:text-fg disabled:opacity-45 aria-disabled:opacity-45',
  danger:
    'border border-danger-line bg-danger-soft text-danger-fg ' +
    'hover:border-danger disabled:opacity-45 aria-disabled:opacity-45',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function buttonStyles(
  options: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {},
): string {
  const { variant = 'primary', size = 'md', fullWidth, className } = options;
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], fullWidth && 'w-full', className);
}

export const iconButtonSizes: Record<ButtonSize, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
};

/** Text-field surface shared by Input, Select, Textarea and SearchInput. */
export const fieldStyles =
  'w-full rounded-lg border border-line-strong bg-glass text-base text-fg md:text-sm ' +
  'placeholder:text-subtle transition-[border-color,background-color] duration-150 ' +
  'hover:border-subtle hover:bg-glass-hover focus-visible:border-primary focus-visible:bg-glass-hover focus-visible:outline-2 focus-visible:-outline-offset-1 ' +
  'disabled:cursor-not-allowed disabled:bg-glass-soft disabled:opacity-60 aria-invalid:border-danger';

export type TabVariant = 'underline' | 'pill';

export function tabStyles(active: boolean, variant: TabVariant = 'underline', className?: string): string {
  const base =
    'inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors duration-150 ' +
    'disabled:pointer-events-none disabled:opacity-50';
  const byVariant =
    variant === 'underline'
      ? cn(
          'h-11 border-b-2 px-1',
          active ? 'border-primary text-fg' : 'border-transparent text-muted hover:text-fg',
        )
      : cn(
          'h-9 rounded-lg px-3',
          active ? 'bg-primary-soft text-primary-fg' : 'text-muted hover:bg-glass-hover hover:text-fg',
        );
  return cn(base, byVariant, className);
}
