import React, { useState } from 'react';
import { CheckCircle2, Compass } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { cn } from '../../lib/cn';
import {
  STUDY_LEVEL_OPTIONS,
  type StudyLevel,
} from '../../services/userLevelService';
import { Button, Modal, useToast } from '../ui';

interface LevelSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onDismissWithoutSelection?: () => void;
}

export const LevelSelectionModal: React.FC<LevelSelectionModalProps> = ({
  open,
  onClose,
  onDismissWithoutSelection,
}) => {
  const { user, studyLevel, updateStudyLevel } = useAuth();
  const { toast } = useToast();
  const [draftSelection, setDraftSelection] = useState<StudyLevel | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const selected = draftSelection ?? studyLevel;

  const handleClose = () => {
    setDraftSelection(null);
    if (!studyLevel) {
      onDismissWithoutSelection?.();
    }
    onClose();
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    await updateStudyLevel(selected);
    setSaving(false);
    setDraftSelection(null);
    toast({
      title: `Đã chọn trình độ JLPT ${selected}`,
      tone: 'success',
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title="Chọn trình độ tiếng Nhật của bạn"
      description="Chọn cấp độ JLPT phù hợp để thiết lập lộ trình học tập dành riêng cho bạn. Bạn có thể thay đổi lại bất cứ lúc nào trong phần Cài đặt."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {studyLevel ? 'Đóng' : 'Để sau'}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!selected}
            loading={saving}
            leftIcon={<Compass className="size-4" aria-hidden />}
            onClick={() => void handleConfirm()}
          >
            {selected ? `Xác nhận trình độ ${selected}` : 'Chọn một trình độ'}
          </Button>
        </>
      }
    >
      <div
        role="radiogroup"
        aria-label="Chọn trình độ JLPT"
        className="grid gap-2.5"
      >
        {STUDY_LEVEL_OPTIONS.map((opt) => {
          const isSelected = selected === opt.level;
          return (
            <button
              key={opt.level}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setDraftSelection(opt.level)}
              className={cn(
                'flex w-full cursor-pointer items-start gap-3.5 rounded-xl border p-3.5 text-left transition-colors duration-150',
                isSelected
                  ? 'border-primary bg-primary-soft/60'
                  : 'border-line bg-surface-2/60 hover:border-primary/60 hover:bg-surface-2',
              )}
            >
              <span
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-xl text-base font-bold transition-colors',
                  isSelected
                    ? 'bg-primary text-on-primary'
                    : 'bg-primary-soft text-primary-fg',
                )}
              >
                {opt.level}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-fg sm:text-base">
                    JLPT {opt.level} · {opt.title}
                  </span>
                  <span
                    lang="ja"
                    className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted ring-1 ring-line"
                  >
                    {opt.japaneseLabel}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted sm:text-sm">
                  {opt.summary}
                </span>
              </span>
              <span
                className={cn(
                  'mt-1 grid size-5 shrink-0 place-items-center rounded-full transition-opacity',
                  isSelected ? 'text-primary-fg opacity-100' : 'opacity-0',
                )}
                aria-hidden
              >
                <CheckCircle2 className="size-5" />
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
