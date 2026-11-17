import { Moon, Sun } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useTheme } from '../../hooks/useTheme';
import { Tooltip } from './Feedback';

/** Sun/Moon switch. Both icons stay visible so the control reads as a mode toggle at a glance. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <Tooltip content={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Giao diện tối"
        onClick={toggleTheme}
        className={cn(
          'relative inline-grid h-9 w-[4.5rem] grid-cols-2 items-center rounded-full border border-line bg-surface-2 p-0.5',
          'transition-colors duration-150 hover:border-line-strong',
          className,
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 left-0.5 size-7 rounded-full bg-surface shadow-card ring-1 ring-line',
            'transition-transform duration-200 ease-out-soft',
            dark && 'translate-x-9',
          )}
        />
        <Sun className={cn('relative z-10 mx-auto size-4 transition-colors', dark ? 'text-subtle' : 'text-primary-fg')} aria-hidden />
        <Moon className={cn('relative z-10 mx-auto size-4 transition-colors', dark ? 'text-primary-fg' : 'text-subtle')} aria-hidden />
      </button>
    </Tooltip>
  );
}
