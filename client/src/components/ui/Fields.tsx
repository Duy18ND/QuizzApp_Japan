import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { fieldStyles } from './styles';

/* ---------- Field: label + hint + error wrapper ---------- */

interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger-fg">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------- Input ---------- */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ invalid, className, ...rest }: InputProps) {
  return <input aria-invalid={invalid || undefined} className={cn(fieldStyles, 'h-10 px-3', className)} {...rest} />;
}

/* ---------- Textarea ---------- */

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ invalid, className, ...rest }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(fieldStyles, 'min-h-24 resize-y px-3 py-2', className)}
      {...rest}
    />
  );
}

/* ---------- Select (native, so it is accessible and mobile-friendly) ---------- */

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  wrapperClassName?: string;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({ invalid, className, wrapperClassName, children, ...rest }: SelectProps) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        aria-invalid={invalid || undefined}
        className={cn(fieldStyles, 'h-10 appearance-none py-0 pr-9 pl-3', className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
}

/* ---------- SearchInput ---------- */

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'aria-label'?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  'aria-label': ariaLabel = 'Tìm kiếm',
  className,
  autoFocus,
}: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(fieldStyles, 'h-10 pr-9 pl-9 [&::-webkit-search-cancel-button]:appearance-none')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Xóa nội dung tìm kiếm"
          className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

/* ---------- Switch ---------- */

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  const labelId = useId();
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-fg">{label}</p>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'border-primary bg-primary' : 'border-line-strong bg-glass-soft',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 left-0.5 size-4.5 rounded-full shadow-card transition-transform duration-150 ease-out-soft',
            checked ? 'translate-x-5 bg-on-primary' : 'translate-x-0 bg-glass-hover ring-1 ring-line-strong',
          )}
        />
      </button>
    </div>
  );
}

/* ---------- Checkbox ---------- */

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label: ReactNode;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ label, onChange, className, ...rest }: CheckboxProps) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2.5 text-sm text-fg', className)}>
      <input
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 cursor-pointer rounded accent-primary disabled:cursor-not-allowed"
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}

/* ---------- Chip: selectable pill for filters and option groups ---------- */

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Chip({ selected, onClick, children, disabled, className }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        selected
          ? 'border-primary bg-primary-soft text-primary-fg'
          : 'border-line bg-glass text-fg hover:border-line-strong hover:bg-glass-hover',
        className,
      )}
    >
      {children}
    </button>
  );
}
