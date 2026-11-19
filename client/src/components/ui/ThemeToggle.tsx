import { Moon, Sun } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useTheme } from '../../hooks/useTheme';

/** Sun/Moon switch. Symmetrical 30×30 slots around a 24×24 sliding knob, no hover tooltip clutter. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      onClick={toggleTheme}
      className={cn(
        'relative inline-grid h-8 w-[62px] shrink-0 grid-cols-2 items-center rounded-full border border-line-strong bg-glass-soft p-0 shadow-card',
        'transition-colors duration-150 hover:border-primary/50 hover:bg-glass',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-[3px] left-[3px] size-6 rounded-full bg-glass-hover shadow-card ring-1 ring-line-strong',
          'transition-transform duration-200 ease-out-soft',
          dark && 'translate-x-[30px]',
        )}
      />
      <Sun
        className={cn(
          'pointer-events-none relative z-10 mx-auto size-3.5 transition-colors',
          dark ? 'text-subtle' : 'text-primary-fg',
        )}
        aria-hidden
      />
      <Moon
        className={cn(
          'pointer-events-none relative z-10 mx-auto size-3.5 transition-colors',
          dark ? 'text-primary-fg' : 'text-subtle',
        )}
        aria-hidden
      />
    </button>
  );
}
