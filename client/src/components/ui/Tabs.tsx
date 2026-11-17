import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { tabStyles, type TabVariant } from './styles';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: TabVariant;
  'aria-label': string;
  className?: string;
  /** Prefix for tab/panel ids; pair with `aria-labelledby` / `id` on panels. */
  idPrefix?: string;
}

/** Controlled tabs with roving tabindex and Arrow/Home/End keys. For route-based tabs use `tabStyles` on <NavLink>. */
export function Tabs<T extends string>({ items, value, onChange, variant = 'underline', 'aria-label': ariaLabel, className, idPrefix }: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((item) => !item.disabled);
    const index = enabled.findIndex((item) => item.value === value);
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % enabled.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const target = enabled[next];
    onChange(target.value);
    listRef.current?.querySelector<HTMLElement>(`[data-tab="${target.value}"]`)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        'hide-scrollbar flex overflow-x-auto',
        variant === 'underline' ? 'gap-5 border-b border-line' : 'gap-1',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            data-tab={item.value}
            id={idPrefix ? `${idPrefix}-tab-${item.value}` : undefined}
            aria-selected={active}
            aria-controls={idPrefix ? `${idPrefix}-panel-${item.value}` : undefined}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(tabStyles(active, variant), variant === 'underline' && '-mb-px')}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
