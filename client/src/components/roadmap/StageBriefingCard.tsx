import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  Volume2,
  XCircle,
} from 'lucide-react';
import { Badge, Button } from '../ui';
import { cn } from '../../lib/cn';
import type { StageBriefingData } from '../../utils/stageBriefingBuilder';
import { speakJapanese } from '../../utils/tts';

interface StageBriefingCardProps {
  briefing: StageBriefingData;
  isUnderstood: boolean;
  onMarkUnderstood: () => void;
}

export const StageBriefingCard: React.FC<StageBriefingCardProps> = ({
  briefing,
  isUnderstood,
  onMarkUnderstood,
}) => {
  const [expanded, setExpanded] = useState(!isUnderstood);
  const [pickedState, setPickedState] = useState<{
    stageId: string;
    selectedIdx: number | null;
  }>({ stageId: briefing.stageId, selectedIdx: null });

  const selectedIdx = pickedState.stageId === briefing.stageId ? pickedState.selectedIdx : null;
  const quickCheck = briefing.quickCheck;
  const isCheckCorrect =
    quickCheck !== null && selectedIdx !== null && selectedIdx === quickCheck.correctIndex;
  const isCheckWrong =
    quickCheck !== null && selectedIdx !== null && selectedIdx !== quickCheck.correctIndex;

  const hasContent =
    briefing.vocabItems.length > 0 ||
    briefing.grammarItems.length > 0 ||
    briefing.kanjiItems.length > 0;

  if (!hasContent && !quickCheck) return null;

  return (
    <div
      className={cn(
        'rounded-xl border p-3.5 transition-colors',
        isUnderstood
          ? 'border-success-line bg-success-soft/25'
          : 'border-primary/40 bg-primary-soft/15',
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-lg',
              isUnderstood
                ? 'bg-success-soft text-success-fg'
                : 'bg-primary-soft text-primary-fg',
            )}
          >
            {isUnderstood ? (
              <CheckCircle2 className="size-4" aria-hidden />
            ) : (
              <BookOpen className="size-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-xs font-bold tracking-wide text-fg uppercase">
                Khởi động: Đọc &amp; Hiểu nhanh (60 giây)
              </p>
              <Badge tone={isUnderstood ? 'success' : 'primary'}>
                {isUnderstood ? '✓ Đã hiểu bài' : 'Nên đọc trước khi Quiz'}
              </Badge>
            </div>
            <p className="truncate text-[11px] text-muted">
              Nắm trước cốt lõi của {briefing.headline} rồi mở khóa Quiz đạt điểm cao.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          rightIcon={
            expanded ? (
              <ChevronUp className="size-3.5" aria-hidden />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden />
            )
          }
        >
          {expanded ? 'Thu gọn' : 'Xem tóm tắt'}
        </Button>
      </div>

      {/* Collapsible Content */}
      {expanded && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          {/* 1. Core Grammar (if present) */}
          {briefing.grammarItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-wide text-primary-fg uppercase">
                Ngữ pháp cốt lõi hôm nay
              </p>
              <div className="grid gap-2">
                {briefing.grammarItems.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-lg border border-line bg-surface/85 p-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span lang="ja" className="text-sm font-bold text-primary-fg">
                        {g.name}
                      </span>
                      <span className="font-semibold text-fg">{g.meaning}</span>
                    </div>
                    <p className="mt-1 leading-relaxed text-muted">
                      <strong className="text-fg">Dùng khi nào:</strong> {g.whenToUse}
                    </p>
                    {g.memoryTip && (
                      <p className="mt-1 flex items-start gap-1 text-[11px] text-warning-fg">
                        <Lightbulb className="mt-0.5 size-3 shrink-0" aria-hidden />
                        <span>{g.memoryTip}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Core Vocabulary (with 1-click TTS) */}
          {briefing.vocabItems.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold tracking-wide text-primary-fg uppercase">
                Từ vựng trọng tâm (bấm loa để nghe trước)
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {briefing.vocabItems.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface/85 px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span lang="ja" className="text-sm font-bold text-fg">
                          {v.japanese}
                        </span>
                        {v.japanese !== v.hiragana && (
                          <span lang="ja" className="text-xs text-primary-fg">
                            ({v.hiragana})
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted">{v.meaning}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakJapanese(v.japanese || v.hiragana)}
                      aria-label={`Nghe từ ${v.japanese}`}
                      title="Nghe phát âm"
                      className="grid size-7 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-muted transition-colors hover:border-primary/50 hover:text-primary-fg"
                    >
                      <Volume2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Core Kanji */}
          {briefing.kanjiItems.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold tracking-wide text-primary-fg uppercase">
                Chữ Hán nhóm bài này ({briefing.kanjiItems.length} chữ)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {briefing.kanjiItems.map((k) => (
                  <div
                    key={k.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface/85 px-2.5 py-1 text-xs"
                  >
                    <span lang="ja" className="text-base font-bold text-fg">
                      {k.kanji}
                    </span>
                    <span className="text-[11px] font-semibold text-primary-fg uppercase">
                      {k.hanViet || 'Kanji'}
                    </span>
                    <span className="text-muted">· {k.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Quick 10-Second Comprehension Check */}
          {!isUnderstood && (
            <div className="space-y-2 rounded-xl border border-line-strong bg-surface p-3">
              {quickCheck ? (
                <>
                  <p className="flex items-start gap-1.5 text-xs font-semibold text-fg">
                    <HelpCircle className="mt-0.5 size-3.5 shrink-0 text-primary-fg" aria-hidden />
                    <span>Chốt hiểu nhanh (1 câu): {quickCheck.prompt}</span>
                  </p>
                  <div className="grid gap-1.5 sm:grid-cols-3">
                    {quickCheck.options.map((opt, idx) => {
                      const pickedThis = selectedIdx === idx;
                      const isRight = pickedThis && idx === quickCheck.correctIndex;
                      const isWrong = pickedThis && idx !== quickCheck.correctIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPickedState({ stageId: briefing.stageId, selectedIdx: idx });
                            if (idx === quickCheck.correctIndex) {
                              onMarkUnderstood();
                            }
                          }}
                          className={cn(
                            'rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-all',
                            isRight
                              ? 'border-success-line bg-success-soft text-success-fg'
                              : isWrong
                                ? 'border-danger-line bg-danger-soft text-danger-fg'
                                : 'border-line bg-surface-2 text-fg hover:border-primary/50 hover:bg-primary-soft/20',
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {isCheckWrong && (
                    <p className="flex items-center gap-1.5 text-xs text-danger-fg">
                      <XCircle className="size-3.5 shrink-0" aria-hidden />
                      Chưa chính xác — hãy liếc nhanh tóm tắt phía trên rồi chọn lại nhé!
                    </p>
                  )}
                  {isCheckCorrect && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-success-fg">
                      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                      Chuẩn xác! {quickCheck.explanation}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted">
                    Đọc xong tóm tắt mục tiêu bài học bên trên?
                  </span>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckCircle2 className="size-3.5" aria-hidden />}
                    onClick={onMarkUnderstood}
                  >
                    Tôi đã đọc &amp; hiểu bài
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
