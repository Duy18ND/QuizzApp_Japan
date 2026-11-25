import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { IconButton } from './Button';
import { buttonStyles, type ButtonSize, type ButtonVariant } from './styles';

/* ---------- Modal (native <dialog>: focus trap, Esc and top-layer for free) ---------- */

const modalSizes = { sm: 'max-w-sm', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' } as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof modalSizes;
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && open) onClose();
      }}
      className={cn(
        'mt-auto mb-0 max-h-[90dvh] w-full max-w-full overflow-hidden rounded-t-2xl rounded-b-none border border-b-0 border-line bg-surface p-0 pb-[env(safe-area-inset-bottom)] text-fg shadow-pop sm:m-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2.5rem)] sm:rounded-2xl sm:border-b sm:pb-0',
        'backdrop:bg-scrim open:animate-slide-up sm:open:animate-pop-in',
        modalSizes[size],
      )}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col sm:max-h-[calc(100dvh-2rem)]">
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong sm:hidden" />
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-fg sm:text-lg">{title}</h2>
              {description && <p className="mt-0.5 text-xs text-muted sm:text-sm">{description}</p>}
            </div>
            <IconButton aria-label="Đóng" size="sm" onClick={onClose} className="-mr-1 shrink-0 sm:-mr-1.5">
              <X className="size-4" aria-hidden />
            </IconButton>
          </div>
          {children && <div className="overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">{children}</div>}
          {footer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-3 [&>button]:flex-1 sm:px-5 sm:py-3 sm:[&>button]:flex-initial">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

/* ---------- Dropdown (menu button with arrow-key navigation) ---------- */

export interface DropdownItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

interface DropdownProps {
  /** Content of the trigger button. */
  label: ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'end';
  variant?: ButtonVariant;
  size?: ButtonSize;
  'aria-label'?: string;
  className?: string;
}

export function Dropdown({ label, items, align = 'start', variant = 'secondary', size = 'md', 'aria-label': ariaLabel, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const computeCoords = () => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const rect = trigger.getBoundingClientRect();
    const menuRect = menuRef.current?.getBoundingClientRect();
    const menuW = menuRect?.width || 224;
    const menuH = menuRect?.height || 260;
    const gap = 8;
    const pad = 8;

    let left = align === 'end' ? rect.right - menuW : rect.left;
    left = Math.max(pad, Math.min(left, window.innerWidth - menuW - pad));

    let top = rect.bottom + gap;
    if (top + menuH > window.innerHeight - pad && rect.top - gap - menuH >= pad) {
      top = rect.top - gap - menuH;
    } else {
      top = Math.max(pad, Math.min(top, window.innerHeight - menuH - pad));
    }
    return { top, left };
  };

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const next = computeCoords();
      if (next) setCoords(next);
    };
    updatePosition();
    const raf = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [align, open, items.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onViewportChange = (event: Event) => {
      if (event.type === 'scroll' && menuRef.current?.contains(event.target as Node)) {
        return;
      }
      const next = computeCoords();
      if (next) setCoords(next);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      nodes[(index + 1) % nodes.length]?.focus({ preventScroll: true });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      nodes[(index - 1 + nodes.length) % nodes.length]?.focus({ preventScroll: true });
    } else if (event.key === 'Escape') {
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          if (!open) {
            const next = computeCoords();
            if (next) setCoords(next);
          }
          setOpen((value) => !value);
        }}
        className={buttonStyles({ variant, size })}
      >
        {label}
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            onKeyDown={onMenuKeyDown}
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className="fixed z-[70] max-h-[calc(100dvh-24px)] min-w-56 max-w-[calc(100vw-16px)] overflow-y-auto animate-pop-in rounded-xl border border-line-strong bg-surface p-1.5 shadow-pop"
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                  item.onSelect();
                }}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-100',
                  'focus-visible:bg-surface-2 focus-visible:outline-none hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-50',
                  item.tone === 'danger' ? 'text-danger-fg' : 'text-fg',
                )}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
