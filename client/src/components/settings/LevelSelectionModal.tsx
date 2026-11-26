import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Compass, Users } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import {
  getPreferredVocabLevel,
  getUnitsForVocabTextbook,
  getVocabTextbooksForLevel,
  resolveActiveVocabTextbook,
  savePreferredVocabLevel,
  savePreferredVocabTextbookId,
} from '../../data/vocabTextbooks';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { cn } from '../../lib/cn';
import {
  fetchRoadmapLevelCounts,
  STUDY_LEVEL_OPTIONS,
  type RoadmapLevelCounts,
  type StudyLevel,
} from '../../services/userLevelService';
import { Badge, Button, Modal, useToast } from '../ui';

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
  const { user, studyLevel, studyTextbookId, updateStudyLevel } = useAuth();
  const { toast } = useToast();
  const cmsSnapshot = useCurriculumSnapshot();
  const [draftLevel, setDraftLevel] = useState<StudyLevel | null>(null);
  const [draftBookChoice, setDraftBookChoice] = useState<{
    level: StudyLevel;
    bookId: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [levelCounts, setLevelCounts] = useState<RoadmapLevelCounts | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchRoadmapLevelCounts().then((counts) => {
      if (!cancelled) setLevelCounts(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const effectiveCurrentLevel = studyLevel ?? getPreferredVocabLevel(user?.id);
  const selectedLevel = draftLevel ?? effectiveCurrentLevel;

  const levelTextbooks = useMemo(
    () => (selectedLevel ? getVocabTextbooksForLevel(selectedLevel) : []),
    [selectedLevel],
  );

  const selectedBook = useMemo(() => {
    if (!selectedLevel) return null;
    const explicitBookId =
      draftBookChoice?.level === selectedLevel
        ? draftBookChoice.bookId
        : selectedLevel === studyLevel
          ? studyTextbookId
          : null;
    return resolveActiveVocabTextbook(selectedLevel, user?.id, explicitBookId);
  }, [draftBookChoice, selectedLevel, studyLevel, studyTextbookId, user?.id]);

  const textbookWordCounts = useMemo(() => {
    if (!selectedLevel) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const book of levelTextbooks) {
      const units = getUnitsForVocabTextbook(cmsSnapshot, selectedLevel, book);
      map.set(
        book.id,
        units.reduce((sum, u) => sum + u.totalWords, 0),
      );
    }
    return map;
  }, [cmsSnapshot, levelTextbooks, selectedLevel]);

  const handleClose = () => {
    setDraftLevel(null);
    setDraftBookChoice(null);
    if (!effectiveCurrentLevel) {
      onDismissWithoutSelection?.();
    }
    onClose();
  };

  const handleSelectLevel = (level: StudyLevel) => {
    setDraftLevel(level);
    const defaultBook = resolveActiveVocabTextbook(
      level,
      user?.id,
      level === studyLevel ? studyTextbookId : null,
    );
    setDraftBookChoice({ level, bookId: defaultBook.id });
  };

  const handleConfirm = async () => {
    if (!selectedLevel) return;
    setSaving(true);
    const targetBookId = selectedBook?.id ?? null;
    if (user) {
      await updateStudyLevel(selectedLevel, targetBookId);
    } else {
      savePreferredVocabLevel(selectedLevel, null);
      if (targetBookId) {
        savePreferredVocabTextbookId(selectedLevel, targetBookId, null);
      }
    }
    setSaving(false);
    setDraftLevel(null);
    setDraftBookChoice(null);
    toast({
      title: selectedBook
        ? `Đã chọn JLPT ${selectedLevel} · ${selectedBook.shortTitle}`
        : `Đã chọn trình độ JLPT ${selectedLevel}`,
      tone: 'success',
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title="Chọn trình độ & giáo trình học của bạn"
      description="Chọn một lần để tự động đồng bộ Từ vựng, Ngữ pháp, Kanji, Quiz và Flashcard trên toàn bộ ứng dụng."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {effectiveCurrentLevel ? 'Đóng' : 'Để sau'}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!selectedLevel}
            loading={saving}
            leftIcon={<Compass className="size-4" aria-hidden />}
            onClick={() => void handleConfirm()}
          >
            {selectedLevel && selectedBook
              ? `Xác nhận ${selectedLevel} · ${selectedBook.shortTitle}`
              : selectedLevel
                ? `Xác nhận trình độ ${selectedLevel}`
                : 'Chọn một trình độ'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            1. Trình độ mục tiêu (JLPT)
          </p>
          <div
            role="radiogroup"
            aria-label="Chọn trình độ JLPT"
            className="grid gap-2"
          >
            {STUDY_LEVEL_OPTIONS.map((opt) => {
              const isSelected = selectedLevel === opt.level;
              const defaultBook = getVocabTextbooksForLevel(opt.level)[0];
              const learnerCount = levelCounts?.[opt.level] ?? 0;
              return (
                <button
                  key={opt.level}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectLevel(opt.level)}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-colors duration-150',
                    isSelected
                      ? 'border-primary bg-primary-soft/60'
                      : 'border-line bg-surface-2/60 hover:border-primary/60 hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold transition-colors',
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
                      {learnerCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted ring-1 ring-line tabular-nums">
                          <Users className="size-3 text-primary-fg" aria-hidden />
                          {learnerCount.toLocaleString('vi-VN')} người đang học
                        </span>
                      )}
                      {defaultBook && (
                        <span className="text-[11px] font-medium text-primary-fg">
                          Gợi ý: {defaultBook.shortTitle}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
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
        </div>

        {selectedLevel && levelTextbooks.length > 1 && (
          <div className="space-y-2.5 border-t border-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
                <BookOpen className="size-3.5 text-primary-fg" aria-hidden />
                2. Giáo trình chính ({selectedLevel})
              </p>
              <span className="text-xs text-muted">
                Bấm Từ vựng / Flashcard sẽ mở thẳng bài học của sách này
              </span>
            </div>
            <div
              role="radiogroup"
              aria-label={`Chọn giáo trình từ vựng ${selectedLevel}`}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {levelTextbooks.map((book, index) => {
                const isBookSelected = selectedBook?.id === book.id;
                const wordCount = textbookWordCounts.get(book.id) ?? 0;
                return (
                  <button
                    key={book.id}
                    type="button"
                    role="radio"
                    aria-checked={isBookSelected}
                    onClick={() =>
                      setDraftBookChoice({ level: selectedLevel, bookId: book.id })
                    }
                    className={cn(
                      'flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors duration-150',
                      isBookSelected
                        ? 'border-primary bg-primary-soft/60'
                        : 'border-line bg-surface-2/50 hover:border-primary/60 hover:bg-surface-2',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-fg">{book.title}</span>
                      {wordCount > 0 ? (
                        <Badge tone="success" className="shrink-0 tabular">
                          {wordCount} từ
                        </Badge>
                      ) : index === 0 ? (
                        <Badge tone="primary" className="shrink-0">
                          Mặc định
                        </Badge>
                      ) : (
                        <Badge tone="neutral" className="shrink-0">
                          Đang cập nhật
                        </Badge>
                      )}
                    </div>
                    <span lang="ja" className="text-xs text-primary-fg">
                      {book.japaneseTitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
