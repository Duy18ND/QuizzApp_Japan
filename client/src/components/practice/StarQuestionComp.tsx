import React, { useState } from 'react';
import { GripVertical, Star } from 'lucide-react';
import type { PracticeType, StarQuestion } from '../../types/grammar';
import { Button } from '../ui';
import { cn } from '../../lib/cn';

interface Props {
  mode: PracticeType;
  question: StarQuestion;
  onSubmit: (answer: string, isCorrect: boolean, feedbackMsg?: string) => void;
  submitLabel?: string;
}

const NUMBER_CIRCLES = ['①', '②', '③', '④'];
const EMPTY_SLOTS: Array<string | null> = [null, null, null, null];

export const StarQuestionComp: React.FC<Props> = ({
  question,
  onSubmit,
  submitLabel = 'Kiểm tra',
}) => {
  const [selectedChunkIds, setSelectedChunkIds] = useState<Array<string | null>>(EMPTY_SLOTS);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleSelectChunk = (chunkId: string) => {
    setSelectedChunkIds((prev) => {
      if (prev.includes(chunkId)) return prev;
      const next = [...prev];
      const targetIndex =
        activeSlotIndex !== null && next[activeSlotIndex] === null
          ? activeSlotIndex
          : next.findIndex((id) => id === null);
      if (targetIndex === -1) return prev;
      next[targetIndex] = chunkId;
      return next;
    });
    setActiveSlotIndex(null);
  };

  const handleSlotClick = (slotIndex: number) => {
    const currentId = selectedChunkIds[slotIndex];
    if (currentId) {
      setSelectedChunkIds((prev) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
      setActiveSlotIndex(null);
      return;
    }
    setActiveSlotIndex((prev) => (prev === slotIndex ? null : slotIndex));
  };

  const handleDropOnSlot = (slotIndex: number, rawData: string) => {
    setDragOverIndex(null);
    if (!rawData) return;
    try {
      const payload = JSON.parse(rawData) as {
        source: 'bank' | 'slot';
        chunkId: string;
        fromIndex?: number;
      };
      if (!payload.chunkId) return;

      setSelectedChunkIds((prev) => {
        const next = [...prev];
        if (payload.source === 'slot' && typeof payload.fromIndex === 'number') {
          const fromIdx = payload.fromIndex;
          if (fromIdx === slotIndex || fromIdx < 0 || fromIdx >= 4) return prev;
          const displaced = next[slotIndex];
          next[slotIndex] = payload.chunkId;
          next[fromIdx] = displaced;
          return next;
        }

        const existingIndex = next.indexOf(payload.chunkId);
        if (existingIndex !== -1) {
          next[existingIndex] = null;
        }
        next[slotIndex] = payload.chunkId;
        return next;
      });
      setActiveSlotIndex(null);
    } catch {
      // ignore malformed drag data
    }
  };

  const handleSubmit = () => {
    if (selectedChunkIds.some((id) => id === null)) return;

    const chunkAtStarId = selectedChunkIds[question.starIndex];
    const chunkText = question.chunks.find((c) => c.id === chunkAtStarId)?.text || '';
    const isCorrect = chunkText === question.correctAnswer;

    onSubmit(
      chunkText,
      isCorrect,
      isCorrect ? undefined : 'Sắp xếp chưa chính xác, hãy xem kỹ lại ngữ pháp nhé!',
    );
  };

  const { prefix, suffix } = question.sentenceParts || { prefix: '', suffix: '' };
  const allChunksSelected = selectedChunkIds.every((id) => id !== null);

  return (
    <div className="space-y-6">
      <div className="flex min-h-40 flex-col justify-between rounded-xl border border-line-strong bg-glass-soft p-5 md:p-6">
        <div className="space-y-1.5">
          {question.instruction && (
            <p className="text-sm font-semibold text-primary-fg">{question.instruction}</p>
          )}
          {question.question && (
            <h3 lang="ja" className="text-lg font-medium text-fg">
              {question.question}
            </h3>
          )}
          <p className="text-xs text-muted">
            Nhấn hoặc kéo thả 4 mảnh ghép vào đúng vị trí ___ ___ _★_ ___ để hoàn thành câu.
          </p>
        </div>

        {/* Inline Sentence Context with 4 blanks */}
        <div lang="ja" className="mt-4 pt-2 text-xl leading-[3] font-medium break-words text-fg md:text-2xl">
          <span>{prefix}</span>

          {[0, 1, 2, 3].map((idx) => {
            const isStar = idx === question.starIndex;
            const chunkId = selectedChunkIds[idx];
            const chunkText = chunkId ? question.chunks.find((c) => c.id === chunkId)?.text : '';
            const isTarget = activeSlotIndex === idx;
            const isDragTarget = dragOverIndex === idx;

            return (
              <button
                key={idx}
                type="button"
                draggable={Boolean(chunkId)}
                aria-pressed={isTarget || undefined}
                aria-label={
                  chunkId
                    ? `Vị trí ${idx + 1}: ${chunkText}. Nhấn để bỏ chọn hoặc kéo để đổi chỗ`
                    : `Ô trống số ${idx + 1}${isStar ? ' (ngôi sao ★)' : ''}. Nhấn hoặc thả đáp án vào đây`
                }
                onClick={() => handleSlotClick(idx)}
                onDragStart={(e) => {
                  if (!chunkId) return;
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({ source: 'slot', chunkId, fromIndex: idx }),
                  );
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverIndex !== idx) setDragOverIndex(idx);
                }}
                onDragLeave={() => {
                  if (dragOverIndex === idx) setDragOverIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const raw = e.dataTransfer.getData('application/json');
                  handleDropOnSlot(idx, raw);
                }}
                className={cn(
                  'relative mx-1 inline-flex min-h-11 min-w-[4.25rem] cursor-pointer items-center justify-center rounded-lg border-b-2 px-2.5 py-1 align-baseline transition-colors',
                  isDragTarget
                    ? 'border-primary bg-primary-soft-hover ring-2 ring-focus/40'
                    : isTarget
                      ? 'border-primary bg-primary-soft ring-2 ring-focus/30'
                      : chunkId
                        ? 'border-primary bg-primary-soft/70 text-primary-fg hover:bg-primary-soft'
                        : isStar
                          ? 'border-warning bg-warning-soft/60 hover:bg-warning-soft'
                          : 'border-line-strong bg-glass-soft hover:border-primary',
                )}
              >
                {chunkId ? (
                  <span className="inline-flex items-center gap-1 font-bold text-primary-fg">
                    {chunkText}
                    {isStar && <Star className="size-3.5 fill-current text-warning-fg" aria-hidden />}
                  </span>
                ) : isStar ? (
                  <span className="inline-flex items-center gap-0.5 text-base font-bold text-warning-fg" aria-hidden>
                    <span>_</span>
                    <Star className="size-4 fill-current" />
                    <span>_</span>
                  </span>
                ) : (
                  <span className="text-base font-semibold tracking-widest text-subtle" aria-hidden>
                    ___
                  </span>
                )}
              </button>
            );
          })}

          <span>{suffix}</span>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {question.shuffledChunks.map((chunk, idx) => {
          const isSelected = selectedChunkIds.includes(chunk.id);
          return (
            <button
              key={chunk.id}
              type="button"
              draggable={!isSelected}
              onClick={() => handleSelectChunk(chunk.id)}
              onDragStart={(e) => {
                if (isSelected) return;
                e.dataTransfer.setData(
                  'application/json',
                  JSON.stringify({ source: 'bank', chunkId: chunk.id }),
                );
                e.dataTransfer.effectAllowed = 'move';
              }}
              disabled={isSelected}
              className={cn(
                'flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                isSelected
                  ? 'cursor-not-allowed border-line bg-surface-2 text-subtle opacity-45'
                  : 'cursor-grab border-line-strong bg-glass text-fg hover:border-primary hover:bg-glass-hover active:cursor-grabbing',
              )}
            >
              <span className="flex items-center gap-3.5">
                <span className="text-lg font-bold text-muted">{NUMBER_CIRCLES[idx]}</span>
                <span lang="ja" className="text-base font-semibold md:text-lg">
                  {chunk.text}
                </span>
              </span>
              {!isSelected && <GripVertical className="size-4 shrink-0 text-subtle" aria-hidden />}
            </button>
          );
        })}
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleSubmit}
        disabled={!allChunksSelected}
      >
        {submitLabel}
      </Button>
    </div>
  );
};
