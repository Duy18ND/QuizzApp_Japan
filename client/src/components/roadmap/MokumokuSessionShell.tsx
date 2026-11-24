import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Badge, ProgressBar } from '../ui';
import { cn } from '../../lib/cn';

export interface MokumokuSidebarItem {
  id: string;
  label: string;
  sublabel?: string;
  done?: boolean;
  isQuizStep?: boolean;
  locked?: boolean;
  badgeText?: string;
}

interface MokumokuSessionShellProps {
  progressLabel: string;
  completedCount: number;
  totalCount: number;
  items: MokumokuSidebarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const MokumokuSessionShell: React.FC<MokumokuSessionShellProps> = ({
  progressLabel,
  completedCount,
  totalCount,
  items,
  activeId,
  onSelect,
  children,
  footer,
}) => {
  const safeTotal = Math.max(1, totalCount);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
      {/* Desktop Sticky Progress Sidebar (Mokumoku Style) */}
      <aside className="rounded-2xl border border-line bg-surface/90 p-4 backdrop-blur-md lg:sticky lg:top-20">
        <div className="space-y-2 border-b border-line pb-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold tracking-wide text-muted uppercase">
              {progressLabel}
            </span>
            <span className="font-bold text-sakura tabular">
              {Math.min(completedCount, totalCount)}/{totalCount}
            </span>
          </div>
          <ProgressBar
            value={Math.min(completedCount, safeTotal)}
            max={safeTotal}
            size="sm"
            tone={completedCount >= totalCount && totalCount > 0 ? 'success' : 'primary'}
            label={progressLabel}
          />
        </div>

        {/* Mobile Horizontal Pills + Desktop Vertical List */}
        <nav
          aria-label="Tiến độ các mục trong bài"
          className="mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:pb-0"
        >
          {items.map((item, idx) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.locked}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'group flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 lg:w-full',
                  isActive
                    ? item.isQuizStep
                      ? 'bg-sakura text-white shadow-xs'
                      : 'bg-primary text-on-primary shadow-xs'
                    : item.done
                      ? 'bg-success-soft/45 text-success-fg hover:bg-success-soft/70'
                      : 'bg-surface-2/60 text-fg hover:bg-surface-2',
                )}
              >
                <span
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                    isActive
                      ? 'bg-white/20 text-current'
                      : item.done
                        ? 'bg-success-soft text-success-fg'
                        : item.isQuizStep
                          ? 'bg-sakura-soft text-sakura'
                          : 'bg-surface text-muted',
                  )}
                >
                  {item.done ? (
                    <Check className="size-3" aria-hidden />
                  ) : item.isQuizStep ? (
                    <Sparkles className="size-3" aria-hidden />
                  ) : (
                    idx + 1
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate" lang="ja">
                  {item.label}
                </span>
                {item.badgeText && (
                  <Badge
                    tone={isActive ? 'neutral' : 'sakura'}
                    className={cn(
                      'shrink-0 px-1.5 py-0 text-[10px]',
                      isActive && 'border-white/30 bg-white/20 text-white',
                    )}
                  >
                    {item.badgeText}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Focused Right Workspace + Bottom Action Bar */}
      <div className="min-w-0 space-y-4">
        {children}
        {footer && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-line bg-surface/90 px-4 py-3 backdrop-blur-md">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
