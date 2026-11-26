import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Headphones,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, Kbd, Notice, ProgressBar, Switch } from '../ui';
import { AudioSpeechPlayer } from '../jlpt/AudioSpeechPlayer';
import { FuriganaText } from '../jlpt/FuriganaText';
import type { JLPTListeningItem } from '../../data/jlpt/jlptDataset';
import { cn } from '../../lib/cn';
import { markJlptItemDone } from '../../services/jlptProgressService';
import { recordQuizAttempt } from '../../services/quizHistoryService';
import { recordDailyStageSkillActivity } from '../../services/stageRoadmapService';
import type { StudyLevel } from '../../services/userLevelService';
import { MokumokuSessionShell, type MokumokuSidebarItem } from './MokumokuSessionShell';

interface StageListeningTrainerProps {
  stageNumber: number;
  level: StudyLevel;
  userId?: string;
  items: JLPTListeningItem[];
  onFinishAndReturn: () => void;
}

interface ListenQueueEntry {
  itemId: string;
  isRetry: boolean;
}

export const StageListeningTrainer: React.FC<StageListeningTrainerProps> = ({
  stageNumber,
  level,
  userId,
  items,
  onFinishAndReturn,
}) => {
  const [queue, setQueue] = useState<ListenQueueEntry[]>(() =>
    items.map((it) => ({ itemId: it.id, isRetry: false })),
  );
  const [queueIdx, setQueueIdx] = useState(0);
  const [pickedOpt, setPickedOpt] = useState<number | null>(null);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);
  const [missedIds, setMissedIds] = useState<string[]>([]);
  const [showHintLines, setShowHintLines] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
  const [playLineRequest, setPlayLineRequest] = useState<{ idx: number; nonce: number } | null>(
    null,
  );
  const [done, setDone] = useState(false);

  const sessionStartRef = useRef<number>(0);
  const recordedRef = useRef(false);

  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, []);

  const itemMap = useMemo(() => {
    const map = new Map<string, JLPTListeningItem>();
    for (const it of items) map.set(it.id, it);
    return map;
  }, [items]);

  const currentEntry = queue[queueIdx] ?? null;
  const currentItem = currentEntry ? (itemMap.get(currentEntry.itemId) ?? null) : null;
  const isAnswered = pickedOpt !== null;
  const isCorrect = isAnswered && currentItem !== null && pickedOpt === currentItem.correctIndex;

  const finalize = useCallback(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    const durationSec =
      sessionStartRef.current > 0
        ? Math.max(5, Math.round((Date.now() - sessionStartRef.current) / 1000))
        : 60;
    recordDailyStageSkillActivity('listening', userId);
    for (const it of items) {
      markJlptItemDone(userId, 'listening', it.id);
    }
    void recordQuizAttempt(
      {
        quizType: 'jlpt-listening',
        level,
        score: items.length,
        totalQuestions: items.length,
        durationSeconds: durationSec,
        mistakesJson: items.map((q) => ({
          id: `ok_${q.id}`,
          questionId: q.id,
          prompt: `${q.situation} — ${q.questionPrompt}`,
          userAnswer: q.options[q.correctIndex],
          correctAnswer: q.options[q.correctIndex],
          explanation: q.explanation,
          options: [...q.options],
          isCorrect: true,
        })),
      },
      userId,
    );
    setDone(true);
  }, [items, level, userId]);

  const handlePickOption = useCallback(
    (optIdx: number) => {
      if (isAnswered || !currentItem) return;
      setPickedOpt(optIdx);
      if (optIdx === currentItem.correctIndex) {
        markJlptItemDone(userId, 'listening', currentItem.id);
        setMasteredIds((prev) =>
          prev.includes(currentItem.id) ? prev : [...prev, currentItem.id],
        );
      } else {
        setMissedIds((prev) => (prev.includes(currentItem.id) ? prev : [...prev, currentItem.id]));
        setQueue((prev) => [...prev, { itemId: currentItem.id, isRetry: true }]);
      }
    },
    [currentItem, isAnswered, userId],
  );

  const handleAdvance = useCallback(() => {
    if (!isAnswered) return;
    if (queueIdx + 1 >= queue.length) {
      finalize();
    } else {
      setQueueIdx((i) => i + 1);
      setPickedOpt(null);
      setShowHintLines(false);
      setActiveLineIdx(null);
      setPlayLineRequest(null);
    }
  }, [finalize, isAnswered, queue.length, queueIdx]);

  useEffect(() => {
    if (done || !currentItem) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (!isAnswered) {
        const idx = ['1', '2', '3', '4'].indexOf(event.key);
        if (idx !== -1 && idx < currentItem.options.length) {
          event.preventDefault();
          handlePickOption(idx);
        }
      } else if (event.key === 'Enter' || event.key === 'ArrowRight') {
        event.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentItem, done, handleAdvance, handlePickOption, isAnswered]);

  const sidebarItems = useMemo<MokumokuSidebarItem[]>(() => {
    return items.map((it, idx) => ({
      id: it.id,
      label: `Hội thoại ${idx + 1}`,
      done: masteredIds.includes(it.id),
      badgeText: !masteredIds.includes(it.id) && missedIds.includes(it.id) ? 'Nghe lại' : undefined,
    }));
  }, [items, masteredIds, missedIds]);

  return (
    <MokumokuSessionShell
      progressLabel="LUYỆN NGHE HIỂU (100%)"
      completedCount={masteredIds.length}
      totalCount={items.length}
      items={sidebarItems}
      activeId={currentItem?.id ?? ''}
      onSelect={() => {
        // Sequential active listening order
      }}
    >
      {done ? (
        <Card padding="lg" className="space-y-5 border-success-line bg-success-soft/20 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-soft text-success-fg">
            <Trophy className="size-7" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <Badge tone="success" className="px-3 py-1 text-xs">
              <Sparkles className="size-3.5" aria-hidden />
              Hoàn thành Nghe hiểu 100% ({items.length}/{items.length} hội thoại)
            </Badge>
            <h2 className="text-xl font-bold text-fg">
              Chinh phục 100% bài Nghe Màn {stageNumber}!
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted">
              Bạn đã nghe chủ động, kiểm tra Script song ngữ và trả lời đúng 100% toàn bộ hội thoại của bài hôm nay.
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              type="button"
              variant="primary"
              rightIcon={<ArrowRight className="size-4" aria-hidden />}
              onClick={onFinishAndReturn}
            >
              Quay lại Lộ trình (Màn {stageNumber})
            </Button>
          </div>
        </Card>
      ) : (
        currentItem &&
        currentEntry && (
          <div className="space-y-4">
            <Card padding="md" className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-fg tabular">
                    Đã nghe đúng: {masteredIds.length}/{items.length} đoạn (Cần 100%)
                  </span>
                  {currentEntry.isRetry && (
                    <Badge tone="warning">
                      <RotateCcw className="size-3" aria-hidden />
                      Nghe lại đoạn vừa sai (Script đã ẩn lại)
                    </Badge>
                  )}
                </div>
                <span className="hidden items-center gap-1 text-muted sm:flex">
                  <Kbd>1–4</Kbd> chọn · <Kbd>Enter</Kbd> tiếp
                </span>
              </div>
              <ProgressBar
                value={masteredIds.length}
                max={Math.max(1, items.length)}
                size="sm"
                tone={masteredIds.length === items.length ? 'success' : 'primary'}
                label="Tiến độ Nghe hiểu 100%"
              />
            </Card>

            <Card padding="lg" className="space-y-5">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="primary">
                    <Headphones className="size-3" aria-hidden />
                    {currentItem.mondaiLabel}
                  </Badge>
                  <Badge tone="neutral" className="tabular">
                    Lượt {queueIdx + 1}/{queue.length}
                  </Badge>
                  <Badge tone={isAnswered ? 'success' : 'sakura'}>
                    {isAnswered ? '✓ Đã mở Script song ngữ' : '🔇 Đang ẩn Script để luyện tai'}
                  </Badge>
                </div>
              </div>

              {/* Situation */}
              <div className="rounded-xl border border-line bg-surface-2/60 p-3.5 text-xs leading-relaxed text-fg sm:text-sm">
                <span className="font-bold text-primary-fg">Tình huống: </span>
                {currentItem.situation}
              </div>

              {/* Multi-voice Audio Player */}
              <AudioSpeechPlayer
                key={`${currentItem.id}-${queueIdx}`}
                dialogue={currentItem.dialogue}
                situation={currentItem.situation}
                questionPrompt={currentItem.questionPrompt}
                onActiveLineChange={setActiveLineIdx}
                playLineRequest={playLineRequest}
              />

              {/* Optional 2-line Hint while blind listening */}
              {!isAnswered && currentItem.dialogue.length > 0 && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowHintLines((v) => !v)}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary-fg"
                  >
                    {showHintLines ? (
                      <>
                        <EyeOff className="size-3.5" aria-hidden />
                        Ẩn gợi ý 2 câu thoại đầu
                      </>
                    ) : (
                      <>
                        <Eye className="size-3.5" aria-hidden />
                        Nghe chưa rõ? Xem nhanh gợi ý 2 câu thoại đầu
                      </>
                    )}
                  </button>
                  {showHintLines && (
                    <div className="space-y-1.5 rounded-xl border border-dashed border-line-strong bg-surface-2/50 p-3 text-xs">
                      {currentItem.dialogue.slice(0, 2).map((line, idx) => (
                        <p key={idx} lang="ja" className="text-fg">
                          <strong className="text-primary-fg">{line.speaker}:</strong>{' '}
                          <FuriganaText segments={line.segments} showFurigana={true} />
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Question Prompt & Options */}
              <div className="space-y-3 border-t border-line pt-4">
                <p className="text-base font-bold text-fg" lang="ja">
                  Câu hỏi: {currentItem.questionPrompt}
                </p>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {currentItem.options.map((opt, idx) => {
                    const isPicked = pickedOpt === idx;
                    const isRight = idx === currentItem.correctIndex;
                    const showCorrect = isAnswered && isRight;
                    const showWrong = isAnswered && isPicked && !isRight;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => handlePickOption(idx)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 text-left text-sm font-medium transition-all disabled:cursor-default',
                          showCorrect
                            ? 'border-success-line bg-success-soft text-success-fg ring-1 ring-success-line'
                            : showWrong
                              ? 'border-danger-line bg-danger-soft text-danger-fg ring-1 ring-danger-line'
                              : isAnswered
                                ? 'border-line bg-surface-2/40 text-muted opacity-60'
                                : 'border-line bg-surface-2 text-fg hover:border-primary/60 hover:bg-primary-soft/25',
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-6 shrink-0 place-items-center rounded-md border border-line bg-surface text-xs font-bold text-muted">
                            {idx + 1}
                          </span>
                          <span lang="ja">{opt}</span>
                        </span>
                        {showCorrect && <CheckCircle2 className="size-4 shrink-0" aria-hidden />}
                        {showWrong && <XCircle className="size-4 shrink-0" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phase 2: Auto-revealed Bilingual Script + Per-line Shadowing Audio */}
              {isAnswered && (
                <div className="space-y-4 border-t border-line pt-4">
                  <Notice tone={isCorrect ? 'success' : 'warning'}>
                    <p className="font-bold">
                      {isCorrect
                        ? currentEntry.isRetry
                          ? '✓ Nghe chuẩn rồi! Bạn đã sửa thành công đoạn hội thoại này.'
                          : '✓ Chính xác! Hãy đọc lại Script & bấm loa từng câu để luyện đọc nhại (Shadowing).'
                        : '× Chưa chính xác — Xem Script song ngữ bên dưới để tìm câu bẫy, rồi đoạn này sẽ quay lại ở cuối bài (ẩn Script) để bạn nghe đúng 100%!'}
                    </p>
                    <p className="mt-1 leading-relaxed">{currentItem.explanation}</p>
                  </Notice>

                  {/* Full Interactive Script */}
                  <div className="space-y-2.5 rounded-xl border border-primary/35 bg-surface-2/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold tracking-wide text-primary-fg uppercase">
                        📜 Script hội thoại (Bấm loa từng dòng để nghe lại &amp; đọc nhại)
                      </p>
                      <Switch
                        checked={showFurigana}
                        onChange={setShowFurigana}
                        label="Furigana"
                      />
                    </div>

                    <div className="space-y-2">
                      {currentItem.dialogue.map((line, lineIdx) => {
                        const isSpeakingThis = activeLineIdx === lineIdx;
                        return (
                          <div
                            key={lineIdx}
                            className={cn(
                              'flex items-start justify-between gap-2.5 rounded-xl border px-3 py-2.5 transition-all',
                              isSpeakingThis
                                ? 'border-primary bg-primary-soft/40 ring-1 ring-primary/30'
                                : 'border-line bg-surface',
                            )}
                          >
                            <div className="min-w-0 text-sm leading-relaxed text-fg" lang="ja">
                              <span className="mr-2 inline-block rounded bg-surface-2 px-1.5 py-0.5 text-xs font-bold text-primary-fg">
                                {line.speaker}
                              </span>
                              <FuriganaText
                                segments={line.segments}
                                showFurigana={showFurigana}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setPlayLineRequest({ idx: lineIdx, nonce: Date.now() })
                              }
                              aria-label={`Nghe lại câu ${lineIdx + 1}`}
                              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-line bg-surface-2 text-primary-fg hover:border-primary/50 hover:bg-primary-soft"
                            >
                              <Volume2 className="size-4" aria-hidden />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {currentItem.translation && (
                      <div className="rounded-lg border border-line bg-surface/80 p-3 text-xs leading-relaxed text-muted">
                        <strong className="text-fg">Dịch tiếng Việt: </strong>
                        {currentItem.translation}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      rightIcon={<ArrowRight className="size-4" aria-hidden />}
                      onClick={handleAdvance}
                    >
                      {queueIdx + 1 >= queue.length
                        ? 'Hoàn thành Nghe 100%'
                        : 'Đoạn hội thoại tiếp theo'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )
      )}
    </MokumokuSessionShell>
  );
};
