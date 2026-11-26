import React from 'react';
import { Check } from 'lucide-react';
import { Button, Modal } from '../ui';
import { cn } from '../../lib/cn';
import type { LessonDetail } from '../../utils/lessonDetails';

interface LessonDetailModalProps {
  detail: LessonDetail | null;
  onClose: () => void;
}

/** Read-only preview of a lesson: what is inside before adding it to a session. */
export const LessonDetailModal: React.FC<LessonDetailModalProps> = ({ detail, onClose }) => (
  <Modal
    open={Boolean(detail)}
    onClose={onClose}
    size="md"
    title={detail?.title ?? ''}
    footer={
      <Button type="button" variant="secondary" onClick={onClose}>
        Đóng
      </Button>
    }
  >
    {detail && (
      <div className="space-y-2">
        <p className="text-xs text-muted">{detail.summary}</p>
        {detail.rows.length > 0 && (
          <ol className="divide-y divide-line rounded-xl border border-line">
            {detail.rows.map((row, idx) => (
              <li key={`${idx}-${row.main}`} className="space-y-1 px-3 py-2">
                <p className="text-sm font-semibold text-fg" lang="ja">
                  <span className="mr-1.5 text-xs font-normal text-muted tabular">{idx + 1}.</span>
                  {row.main}
                </p>
                {row.sub && <p className="text-xs text-muted">{row.sub}</p>}
                {row.options && (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {row.options.map((option, i) => (
                      <li
                        key={`${i}-${option}`}
                        className={cn(
                          'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
                          i === row.correctIndex
                            ? 'border-success-line bg-success-soft text-success-fg'
                            : 'border-line text-fg',
                        )}
                      >
                        <span className="font-bold">{String.fromCharCode(65 + i)}</span>
                        <span lang="ja" className="min-w-0 flex-1">
                          {option}
                        </span>
                        {i === row.correctIndex && <Check className="size-3.5 shrink-0" aria-label="Đáp án đúng" />}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
        {detail.more > 0 && <p className="text-xs text-muted">… và {detail.more} mục nữa.</p>}
      </div>
    )}
  </Modal>
);
