import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Chip } from '../ui';
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
  const [activeTab, setActiveTab] = useState<'tips' | 'vocab_kanji'>('tips');
  const [answersByStage, setAnswersByStage] = useState<{
    stageId: string;
    picks: Record<string, number>;
  }>({ stageId: briefing.stageId, picks: {} });

  const picks = answersByStage.stageId === briefing.stageId ? answersByStage.picks : {};
  const checks = briefing.quickChecks;
  const requiredCorrect = Math.min(2, checks.length);

  const answeredCount = checks.filter((c) => picks[c.id] !== undefined).length;
  const correctCount = checks.filter((c) => picks[c.id] === c.correctIndex).length;
  const allAnswered = checks.length > 0 && answeredCount === checks.length;
  const passedChecks = checks.length > 0 && correctCount >= requiredCorrect;

  const hasContent =
    briefing.vocabItems.length > 0 ||
    briefing.grammarItems.length > 0 ||
    briefing.kanjiItems.length > 0;

  if (!hasContent && checks.length === 0) return null;

  const handlePickOption = (checkId: string, optionIdx: number) => {
    const nextPicks = { ...picks, [checkId]: optionIdx };
    setAnswersByStage({ stageId: briefing.stageId, picks: nextPicks });

    const nextCorrect = checks.filter((c) => nextPicks[c.id] === c.correctIndex).length;
    if (!isUnderstood && nextCorrect >= requiredCorrect) {
      onMarkUnderstood();
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-3.5 transition-colors',
        isUnderstood
          ? 'border-success-line bg-success-soft/20'
          : 'border-primary/45 bg-primary-soft/15',
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-lg',
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
                Chặng 2 · Đọc hiểu Tips, Dấu hiệu nhận biết &amp; Chốt hiểu (~7p)
              </p>
              <Badge tone={isUnderstood ? 'success' : 'primary'}>
                {isUnderstood
                  ? '✓ Đã nắm Tips & Dấu hiệu'
                  : `Cần đúng ≥ ${requiredCorrect}/${checks.length} câu`}
              </Badge>
            </div>
            <p className="truncate text-[11px] text-muted">
              Đọc kỹ Dấu hiệu nhận biết, Bẫy ○/× và So sánh cặp dễ nhầm của {briefing.headline} trước khi làm bài tập.
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
          {expanded ? 'Thu gọn' : 'Mở Tips & Dấu hiệu'}
        </Button>
      </div>

      {/* Collapsible Deep Briefing Body */}
      {expanded && (
        <div className="mt-3 space-y-3.5 border-t border-line pt-3">
          {/* Sub-tabs inside Briefing */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip
              selected={activeTab === 'tips'}
              onClick={() => setActiveTab('tips')}
            >
              📌 Tips, Dấu hiệu &amp; Bẫy ○/× ({briefing.grammarItems.length})
            </Chip>
            <Chip
              selected={activeTab === 'vocab_kanji'}
              onClick={() => setActiveTab('vocab_kanji')}
            >
              📖 Từ vựng ({briefing.vocabItems.length}) &amp; Kanji ({briefing.kanjiItems.length})
            </Chip>
          </div>

          {/* Tab 1: Grammar Tips, Trigger Words, Right vs Wrong & Confusable Pairs */}
          {activeTab === 'tips' && (
            <div className="space-y-2.5">
              {briefing.grammarItems.length > 0 ? (
                briefing.grammarItems.map((g) => (
                  <div
                    key={g.id}
                    className="space-y-2.5 rounded-xl border border-line bg-surface/90 p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                      <span lang="ja" className="text-sm font-bold text-primary-fg">
                        {g.name}
                      </span>
                      <span className="font-semibold text-fg">{g.meaning}</span>
                    </div>

                    {/* When to use */}
                    <div className="space-y-1">
                      <p className="font-semibold text-fg">1. Dùng khi nào:</p>
                      <ul className="list-disc space-y-0.5 pl-4 text-muted">
                        {g.whenToUse.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Trigger Words / Signs */}
                    {g.triggerWords.length > 0 && (
                      <div className="space-y-1">
                        <p className="font-semibold text-fg">
                          2. Dấu hiệu nhận biết trong đề (Trigger words):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {g.triggerWords.map((tw) => (
                            <span
                              key={tw}
                              lang="ja"
                              className="rounded-md border border-primary/35 bg-primary-soft/60 px-2 py-0.5 text-[11px] font-bold text-primary-fg"
                            >
                              {tw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3-Second Memory Tip */}
                    {g.memoryTip && (
                      <div className="flex items-start gap-1.5 rounded-lg border border-warning-line bg-warning-soft/35 p-2 text-warning-fg">
                        <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        <span>
                          <strong>Mẹo nhớ 3 giây:</strong> {g.memoryTip}
                        </span>
                      </div>
                    )}

                    {/* Right vs Wrong Trap */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-success-line bg-success-soft/25 p-2">
                        <p className="font-bold text-success-fg">○ Câu chuẩn tự nhiên</p>
                        <p lang="ja" className="mt-0.5 font-semibold text-fg">
                          {g.rightVsWrong.rightSentence}
                        </p>
                        <p className="text-[11px] text-muted">{g.rightVsWrong.rightMeaning}</p>
                      </div>
                      <div className="rounded-lg border border-danger-line bg-danger-soft/25 p-2">
                        <p className="flex items-center gap-1 font-bold text-danger-fg">
                          <AlertTriangle className="size-3" aria-hidden />× Bẫy hay sai
                        </p>
                        <p lang="ja" className="mt-0.5 font-semibold text-fg">
                          {g.rightVsWrong.wrongSentence}
                        </p>
                        <p className="text-[11px] text-muted">{g.rightVsWrong.wrongReason}</p>
                      </div>
                    </div>

                    {/* Confusable Pairs Comparison */}
                    {g.confusableItems.length > 1 && (
                      <div className="space-y-1 rounded-lg border border-line bg-surface-2/60 p-2">
                        <p className="font-semibold text-fg">
                          ⚖️ So sánh nhanh: {g.confusableTitle}
                        </p>
                        <ul className="space-y-1">
                          {g.confusableItems.map((c) => (
                            <li key={c.pattern} className="text-[11px] leading-relaxed text-muted">
                              <strong lang="ja" className="text-primary-fg">
                                {c.pattern}
                              </strong>{' '}
                              ({c.meaning}): {c.nuance}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-line bg-surface/80 p-3 text-xs text-muted">
                  Màn này tập trung ôn từ vựng &amp; chữ Hán cốt lõi. Chuyển sang tab{' '}
                  <strong>Từ vựng &amp; Kanji</strong> để nghe đọc trước khi làm kiểm tra bên dưới.
                </p>
              )}
            </div>
          )}

          {/* Tab 2: Core Vocab (8 words with TTS) + 5 Kanji */}
          {activeTab === 'vocab_kanji' && (
            <div className="space-y-3">
              {briefing.vocabItems.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold tracking-wide text-primary-fg uppercase">
                    Từ vựng trọng tâm bài này (bấm loa nghe &amp; nhẩm theo)
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
                          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-surface-2 text-muted transition-colors hover:border-primary/50 hover:text-primary-fg"
                        >
                          <Volume2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {briefing.kanjiItems.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold tracking-wide text-primary-fg uppercase">
                    5 Chữ Hán nhóm bài này (Hán Việt · Âm đọc · Nghĩa)
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {briefing.kanjiItems.map((k) => (
                      <div
                        key={k.id}
                        className="flex items-center gap-2.5 rounded-lg border border-line bg-surface/85 px-2.5 py-1.5 text-xs"
                      >
                        <span
                          lang="ja"
                          className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-lg font-bold text-primary-fg"
                        >
                          {k.kanji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-fg">
                            <span className="text-primary-fg uppercase">
                              {k.hanViet || 'Kanji'}
                            </span>{' '}
                            · {k.meaning}
                          </p>
                          {(k.onReading || k.kunReading) && (
                            <p lang="ja" className="truncate text-[11px] text-muted">
                              {[k.onReading, k.kunReading].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3-Question Comprehension & Trigger Check Gate */}
          <div className="space-y-2.5 rounded-xl border border-line-strong bg-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-fg">
                <HelpCircle className="size-3.5 text-primary-fg" aria-hidden />
                Kiểm tra hiểu bản chất &amp; dấu hiệu ({checks.length} câu — đạt ≥ {requiredCorrect}/
                {checks.length} để mở Chặng 3)
              </p>
              <div className="flex items-center gap-1.5">
                <Badge tone={isUnderstood || passedChecks ? 'success' : 'neutral'} className="tabular">
                  Đúng {correctCount}/{checks.length}
                </Badge>
                {allAnswered && !passedChecks && !isUnderstood && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<RotateCcw className="size-3" aria-hidden />}
                    onClick={() => setAnswersByStage({ stageId: briefing.stageId, picks: {} })}
                  >
                    Làm lại
                  </Button>
                )}
              </div>
            </div>

            {checks.length > 0 ? (
              <div className="space-y-2.5">
                {checks.map((qc, qIdx) => {
                  const chosen = picks[qc.id];
                  const hasPicked = chosen !== undefined;
                  const isRight = hasPicked && chosen === qc.correctIndex;
                  const isWrong = hasPicked && chosen !== qc.correctIndex;

                  return (
                    <div
                      key={qc.id}
                      className="space-y-1.5 rounded-lg border border-line bg-surface-2/60 p-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">Câu {qIdx + 1}</Badge>
                        <Badge tone="sakura">{qc.category}</Badge>
                      </div>
                      <p className="text-xs font-semibold leading-relaxed text-fg">{qc.prompt}</p>
                      <div className="grid gap-1.5 sm:grid-cols-3">
                        {qc.options.map((opt, idx) => {
                          const pickedThis = chosen === idx;
                          const rightOpt = pickedThis && idx === qc.correctIndex;
                          const wrongOpt = pickedThis && idx !== qc.correctIndex;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handlePickOption(qc.id, idx)}
                              className={cn(
                                'cursor-pointer rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-all',
                                rightOpt
                                  ? 'border-success-line bg-success-soft text-success-fg'
                                  : wrongOpt
                                    ? 'border-danger-line bg-danger-soft text-danger-fg'
                                    : 'border-line bg-surface text-fg hover:border-primary/50 hover:bg-primary-soft/20',
                              )}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {isWrong && (
                        <p className="flex items-center gap-1 text-[11px] text-danger-fg">
                          <XCircle className="size-3.5 shrink-0" aria-hidden />
                          Chưa đúng — hãy xem lại phần Tips &amp; Dấu hiệu ở trên rồi chọn lại nhé!
                        </p>
                      )}
                      {isRight && (
                        <p className="flex items-center gap-1 text-[11px] font-medium text-success-fg">
                          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                          Chính xác! {qc.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              !isUnderstood && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted">
                    Đọc xong tóm tắt mục tiêu bài học bên trên?
                  </span>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    leftIcon={<Sparkles className="size-3.5" aria-hidden />}
                    onClick={onMarkUnderstood}
                  >
                    Tôi đã đọc &amp; hiểu bài
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
