import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  History,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CURRENT_RELEASE_VERSION,
  isLatestReleaseUnread,
  markLatestReleaseSeen,
  WHATS_NEW_RELEASES,
} from '../../data/whatsNewReleases';
import { cn } from '../../lib/cn';
import { Badge, Button, Card, Modal } from '../ui';
import { buttonStyles } from '../ui/styles';

export const WhatsNewBoard: React.FC = () => {
  const [unread, setUnread] = useState<boolean>(() => isLatestReleaseUnread());
  const [expanded, setExpanded] = useState<boolean>(() => isLatestReleaseUnread());
  const [changelogModalOpen, setChangelogModalOpen] = useState(false);

  const latest = WHATS_NEW_RELEASES[0];
  if (!latest) return null;

  const handleDismiss = () => {
    markLatestReleaseSeen();
    setUnread(false);
    setExpanded(false);
  };

  const handleToggleExpand = () => {
    if (expanded) {
      handleDismiss();
    } else {
      setExpanded(true);
    }
  };

  return (
    <>
      <Card
        as="section"
        aria-label="Bảng thông báo chức năng mới"
        padding="sm"
        className={cn(
          'transition-colors',
          unread
            ? 'border-sakura/55 bg-glass-soft shadow-card'
            : 'border-line bg-glass',
        )}
      >
        {/* Compact Header Bar (always visible so users can expand anytime) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-sakura/45 bg-sakura-soft px-2.5 py-0.5 text-xs font-bold text-fg">
              <Sparkles className="size-3.5 text-sakura" aria-hidden />
              <span>Có gì mới · {CURRENT_RELEASE_VERSION}</span>
              {unread && (
                <span
                  aria-label="Bản cập nhật chưa đọc"
                  className="ml-0.5 size-2 rounded-full bg-sakura"
                />
              )}
            </span>
            <span className="text-xs font-semibold text-fg sm:text-sm">
              {latest.title}
            </span>
            <span className="text-xs text-muted">({latest.date})</span>
          </div>

          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<History className="size-3.5" aria-hidden />}
              onClick={() => setChangelogModalOpen(true)}
            >
              Lịch sử cập nhật
            </Button>
            <Button
              type="button"
              variant={unread ? 'soft' : 'secondary'}
              size="sm"
              rightIcon={
                expanded ? (
                  <ChevronUp className="size-3.5" aria-hidden />
                ) : (
                  <ChevronDown className="size-3.5" aria-hidden />
                )
              }
              onClick={handleToggleExpand}
            >
              {expanded ? 'Thu gọn' : `Xem ${latest.highlights.length} tính năng mới`}
            </Button>
            {expanded && unread && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Đóng thông báo bản cập nhật"
                title="Đã hiểu & thu gọn"
                onClick={handleDismiss}
              >
                <X className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>

        {/* Expanded What's New Feature Grid */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t border-line pt-3">
            <p className="text-xs text-muted sm:text-sm">{latest.summary}</p>

            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {latest.highlights.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col justify-between gap-2.5 rounded-xl border border-line bg-surface/75 p-3 transition-colors hover:border-primary/50"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      lang="ja"
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-bold text-primary-fg ring-1 ring-primary/20"
                    >
                      {item.glyph}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={item.tone}>{item.tag}</Badge>
                        <h3 className="text-xs font-bold text-fg sm:text-sm">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-xs leading-relaxed text-muted">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <Link
                      to={item.to}
                      onClick={() => {
                        markLatestReleaseSeen();
                        setUnread(false);
                      }}
                      className={buttonStyles({
                        variant: 'soft',
                        size: 'sm',
                        className: 'h-7 px-2.5 text-xs',
                      })}
                    >
                      <span>{item.ctaLabel}</span>
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Full Release History Modal */}
      <Modal
        open={changelogModalOpen}
        onClose={() => setChangelogModalOpen(false)}
        size="lg"
        title="Nhật ký Cập nhật & Tính năng mới (What's New)"
        description="Theo dõi toàn bộ các tính năng, giáo trình và nâng cấp mới nhất trên Nihongo 問."
        footer={
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              markLatestReleaseSeen();
              setUnread(false);
              setChangelogModalOpen(false);
            }}
          >
            Đã xem ({CURRENT_RELEASE_VERSION})
          </Button>
        }
      >
        <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
          {WHATS_NEW_RELEASES.map((rel, idx) => (
            <div
              key={rel.version}
              className={cn(
                'space-y-3 rounded-xl border p-3.5',
                idx === 0
                  ? 'border-sakura/50 bg-sakura-soft/25'
                  : 'border-line bg-surface-2/45',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={idx === 0 ? 'sakura' : 'primary'}>
                    {rel.version}
                  </Badge>
                  <Badge tone="neutral">{rel.badge}</Badge>
                </div>
                <span className="text-xs font-medium text-muted">
                  Ngày cập nhật: {rel.date}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-fg sm:text-base">
                  {rel.title}
                </h3>
                <p className="mt-1 text-xs text-muted">{rel.summary}</p>
              </div>

              <ul className="space-y-2">
                {rel.highlights.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 rounded-lg border border-line bg-surface/80 p-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        lang="ja"
                        aria-hidden
                        className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary-fg"
                      >
                        {item.glyph}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={item.tone}>{item.tag}</Badge>
                          <span className="text-xs font-bold text-fg">
                            {item.title}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={item.to}
                      onClick={() => {
                        markLatestReleaseSeen();
                        setUnread(false);
                        setChangelogModalOpen(false);
                      }}
                      className={buttonStyles({
                        variant: 'secondary',
                        size: 'sm',
                        className: 'shrink-0 self-end sm:self-center',
                      })}
                    >
                      <span>{item.ctaLabel}</span>
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};
