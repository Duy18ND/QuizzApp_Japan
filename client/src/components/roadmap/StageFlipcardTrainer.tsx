import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, Kbd, Notice, ProgressBar } from '../ui';
import { cn } from '../../lib/cn';
import { recordQuizAttempt } from '../../services/quizHistoryService';
import {
  recordDailyKanjiInteraction,
  recordDailyStageSkillActivity,
  recordDailyVocabInteraction,
} from '../../services/stageRoadmapService';
import type { StudyLevel } from '../../services/userLevelService';
import type {
  BriefingKanjiItem,
  BriefingVocabItem,
  StageMasteryQuestion,
} from '../../utils/stageBriefingBuilder';
import { speakJapanese } from '../../utils/tts';
import { MokumokuSessionShell, type MokumokuSidebarItem } from './MokumokuSessionShell';

interface StageFlipcardTrainerProps {
  kind: 'vocab' | 'kanji';
  stageNumber: number;
  level: StudyLevel;
  userId?: string;
  vocabItems: BriefingVocabItem[];
  kanjiItems: BriefingKanjiItem[];
  quizQuestions: StageMasteryQuestion[];
  onFinishAndReturn: () => void;
}

interface QuizQueueEntry {
  questionId: string;
  isRetry: boolean;
}

export const StageFlipcardTrainer: React.FC<StageFlipcardTrainerProps> = ({
  kind,
  stageNumber,
  level,
  userId,
  vocabItems,
  kanjiItems,
  quizQuestions,
  onFinishAndReturn,
}) => {
  const deckIds = useMemo(
    () => (kind === 'vocab' ? vocabItems.map((v) => v.id) : kanjiItems.map((k) => k.id)),
    [kanjiItems, kind, vocabItems],
  );

  const [step, setStep] = useState<'cards' | 'quiz' | 'done'>('cards');
  const [cardQueue, setCardQueue] = useState<string[]>(() => deckIds);
  const [cardPos, setCardPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rememberedIds, setRememberedIds] = useState<string[]>([]);

  // Quiz 100% retry-until-correct state
  const [quizQueue, setQuizQueue] = useState<QuizQueueEntry[]>(() =>
    quizQuestions.map((q) => ({ questionId: q.id, isRetry: false })),
  );
  const [quizIdx, setQuizIdx] = useState(0);
  const [pickedOpt, setPickedOpt] = useState<number | null>(null);
  const [masteredQuizIds, setMasteredQuizIds] = useState<string[]>([]);
  const [missedQuizIds, setMissedQuizIds] = useState<string[]>([]);
  const [totalQuizAttempts, setTotalQuizAttempts] = useState(0);
  const sessionStartRef = useRef<number>(0);
  const recordedRef = useRef(false);

  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, []);

  const currentCardId = cardQueue[cardPos] ?? deckIds[0];
  const currentVocab =
    kind === 'vocab' ? (vocabItems.find((v) => v.id === currentCardId) ?? null) : null;
  const currentKanji =
    kind === 'kanji' ? (kanjiItems.find((k) => k.id === currentCardId) ?? null) : null;

  const questionMap = useMemo(() => {
    const map = new Map<string, StageMasteryQuestion>();
    for (const q of quizQuestions) map.set(q.id, q);
    return map;
  }, [quizQuestions]);

  const currentQuizEntry = quizQueue[quizIdx] ?? null;
  const currentQuiz = currentQuizEntry ? (questionMap.get(currentQuizEntry.questionId) ?? null) : null;
  const isQuizAnswered = pickedOpt !== null;
  const isQuizCorrect = isQuizAnswered && currentQuiz !== null && pickedOpt === currentQuiz.correctIndex;

  const completeAll = useCallback(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    const durationSec =
      sessionStartRef.current > 0
        ? Math.max(5, Math.round((Date.now() - sessionStartRef.current) / 1000))
        : 60;
    recordDailyStageSkillActivity(kind === 'vocab' ? 'vocab' : 'kanji', userId);
    void recordQuizAttempt(
      {
        quizType: kind === 'vocab' ? 'vocabulary' : 'kanji',
        level,
        score: Math.max(1, quizQuestions.length),
        totalQuestions: Math.max(1, quizQuestions.length),
        durationSeconds: durationSec,
        mistakesJson: [],
      },
      userId,
    );
    setStep('done');
  }, [kind, level, quizQuestions.length, userId]);

  const handleMarkRemembered = useCallback(() => {
    if (!currentCardId) return;
    if (kind === 'vocab') {
      recordDailyVocabInteraction(currentCardId, userId);
    } else {
      recordDailyKanjiInteraction(currentCardId, userId);
    }
    const nextRemembered = rememberedIds.includes(currentCardId)
      ? rememberedIds
      : [...rememberedIds, currentCardId];
    setRememberedIds(nextRemembered);
    setFlipped(false);

    if (cardPos + 1 < cardQueue.length) {
      setCardPos((p) => p + 1);
    } else if (quizQuestions.length > 0) {
      setStep('quiz');
    } else {
      completeAll();
    }
  }, [cardPos, cardQueue.length, completeAll, currentCardId, kind, quizQuestions.length, rememberedIds, userId]);

  const handleNeedReviewAgain = useCallback(() => {
    if (!currentCardId) return;
    setCardQueue((prev) => [...prev, currentCardId]);
    setFlipped(false);
    setCardPos((p) => p + 1);
  }, [currentCardId]);

  const handlePickQuizOption = useCallback(
    (optIdx: number) => {
      if (isQuizAnswered || !currentQuiz) return;
      setPickedOpt(optIdx);
      setTotalQuizAttempts((n) => n + 1);
      if (optIdx === currentQuiz.correctIndex) {
        setMasteredQuizIds((prev) =>
          prev.includes(currentQuiz.id) ? prev : [...prev, currentQuiz.id],
        );
      } else {
        setMissedQuizIds((prev) =>
          prev.includes(currentQuiz.id) ? prev : [...prev, currentQuiz.id],
        );
        setQuizQueue((prev) => [...prev, { questionId: currentQuiz.id, isRetry: true }]);
      }
    },
    [currentQuiz, isQuizAnswered],
  );

  const handleAdvanceQuiz = useCallback(() => {
    if (!isQuizAnswered) return;
    if (quizIdx + 1 >= quizQueue.length) {
      completeAll();
    } else {
      setQuizIdx((i) => i + 1);
      setPickedOpt(null);
    }
  }, [completeAll, isQuizAnswered, quizIdx, quizQueue.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (step === 'cards') {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          if (!flipped) {
            setFlipped(true);
          } else {
            handleMarkRemembered();
          }
        }
      } else if (step === 'quiz' && currentQuiz) {
        if (!isQuizAnswered) {
          const idx = ['1', '2', '3', '4'].indexOf(event.key);
          if (idx !== -1 && idx < currentQuiz.options.length) {
            event.preventDefault();
            handlePickQuizOption(idx);
          }
        } else if (event.key === 'Enter' || event.key === 'ArrowRight') {
          event.preventDefault();
          handleAdvanceQuiz();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentQuiz,
    flipped,
    handleAdvanceQuiz,
    handleMarkRemembered,
    handlePickQuizOption,
    isQuizAnswered,
    step,
  ]);

  const sidebarItems = useMemo<MokumokuSidebarItem[]>(() => {
    const base: MokumokuSidebarItem[] =
      kind === 'vocab'
        ? vocabItems.map((v) => ({
            id: v.id,
            label: v.japanese,
            done: rememberedIds.includes(v.id),
          }))
        : kanjiItems.map((k) => ({
            id: k.id,
            label: `${k.kanji} · ${k.hanViet || k.meaning}`,
            done: rememberedIds.includes(k.id),
          }));

    base.push({
      id: '__quiz__',
      label: `Quiz chốt · ${quizQuestions.length} câu`,
      isQuizStep: true,
      done: step === 'done',
      badgeText: '100%',
    });
    return base;
  }, [kanjiItems, kind, quizQuestions.length, rememberedIds, step, vocabItems]);

  const activeSidebarId = step === 'cards' ? (currentCardId ?? '') : '__quiz__';

  return (
    <MokumokuSessionShell
      progressLabel={kind === 'vocab' ? 'LẬT THẺ TỪ VỰNG' : 'LẬT THẺ CHỮ HÁN'}
      completedCount={rememberedIds.length + (step === 'done' ? 1 : 0)}
      totalCount={deckIds.length + 1}
      items={sidebarItems}
      activeId={activeSidebarId}
      onSelect={(id) => {
        if (id === '__quiz__') {
          if (quizQuestions.length > 0 && step !== 'done') {
            setStep('quiz');
          }
          return;
        }
        const idx = cardQueue.findIndex((cid) => cid === id);
        if (idx >= 0) {
          setStep('cards');
          setCardPos(idx);
          setFlipped(false);
        }
      }}
      footer={
        step === 'cards' ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={cardPos === 0}
              leftIcon={<ArrowLeft className="size-3.5" aria-hidden />}
              onClick={() => {
                setCardPos((p) => Math.max(0, p - 1));
                setFlipped(false);
              }}
            >
              Thẻ trước
            </Button>

            {!flipped ? (
              <Button type="button" variant="primary" size="sm" onClick={() => setFlipped(true)}>
                Lật xem đáp án <Kbd className="ml-1.5 hidden sm:inline">Space</Kbd>
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw className="size-3.5" aria-hidden />}
                  onClick={handleNeedReviewAgain}
                >
                  Chưa nhớ (lặp lại)
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  rightIcon={<ArrowRight className="size-3.5" aria-hidden />}
                  onClick={handleMarkRemembered}
                >
                  {cardPos + 1 >= cardQueue.length ? 'Đã nhớ · Vào Quiz 100%' : 'Đã nhớ'}
                </Button>
              </div>
            )}
          </>
        ) : undefined
      }
    >
      {/* ==================== STEP 1: INTERACTIVE FLIPCARD ==================== */}
      {step === 'cards' && (currentVocab || currentKanji) && (
        <Card padding="lg" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge tone="primary" className="tabular">
                Thẻ {cardPos + 1}/{cardQueue.length}
              </Badge>
              <Badge tone="neutral">{level}</Badge>
              {cardPos >= deckIds.length && (
                <Badge tone="warning">
                  <RotateCcw className="size-3" aria-hidden />
                  Ôn lại thẻ chưa nhớ
                </Badge>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                speakJapanese(
                  currentVocab
                    ? currentVocab.hiragana || currentVocab.japanese
                    : currentKanji?.compounds[0]?.hiragana ||
                        currentKanji?.kunReading ||
                        currentKanji?.onReading ||
                        currentKanji?.kanji ||
                        '',
                )
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-primary-fg hover:border-primary/50 hover:bg-primary-soft"
            >
              <Volume2 className="size-3.5" aria-hidden />
              Nghe phát âm
            </button>
          </div>

          {/* Clickable Flip Surface */}
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className={cn(
              'flex min-h-[260px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 px-5 py-8 text-center transition-all',
              flipped
                ? 'border-primary/45 bg-primary-soft/15'
                : 'border-dashed border-line-strong bg-surface-2/60 hover:border-primary/50 hover:bg-surface-2',
            )}
          >
            {kind === 'vocab' && currentVocab && (
              <>
                <p className="text-xs font-semibold tracking-wider text-muted uppercase">
                  {flipped ? 'MẶT SAU · NGHĨA & CÁCH ĐỌC' : 'MẶT TRƯỚC · THỬ NHỚ NGHĨA'}
                </p>
                <p className="mt-3 text-4xl font-bold text-fg sm:text-5xl" lang="ja">
                  {currentVocab.japanese}
                </p>
                {flipped ? (
                  <div className="mt-5 space-y-2">
                    <p className="text-lg font-semibold text-primary-fg" lang="ja">
                      {currentVocab.hiragana}
                    </p>
                    {currentVocab.hanviet && (
                      <Badge tone="sakura" className="px-2.5 py-0.5 text-xs uppercase">
                        Hán Việt: {currentVocab.hanviet}
                      </Badge>
                    )}
                    <p className="text-xl font-bold text-fg">{currentVocab.meaning}</p>
                  </div>
                ) : (
                  <p className="mt-6 text-xs text-muted">
                    👆 Chạm vào thẻ hoặc bấm <Kbd>Space</Kbd> để lật xem nghĩa
                  </p>
                )}
              </>
            )}

            {kind === 'kanji' && currentKanji && (
              <>
                <p className="text-xs font-semibold tracking-wider text-muted uppercase">
                  {flipped ? 'MẶT SAU · HÁN VIỆT, ON–KUN & TỪ GHÉP' : 'MẶT TRƯỚC · NHẬN DIỆN CHỮ HÁN'}
                </p>
                <p className="mt-2 text-7xl font-bold text-fg sm:text-8xl" lang="ja">
                  {currentKanji.kanji}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  {currentKanji.strokeCount && (
                    <Badge tone="neutral">{currentKanji.strokeCount} nét</Badge>
                  )}
                  {currentKanji.radical && (
                    <Badge tone="neutral">Bộ thủ: {currentKanji.radical}</Badge>
                  )}
                </div>

                {flipped ? (
                  <div className="mt-5 w-full max-w-md space-y-3">
                    <div>
                      <p className="text-xl font-extrabold tracking-wide text-sakura uppercase">
                        {currentKanji.hanViet || 'KANJI'}
                      </p>
                      <p className="mt-0.5 text-base font-bold text-fg">{currentKanji.meaning}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                      {currentKanji.onReadings.length > 0 && (
                        <span className="rounded-lg border border-primary/35 bg-primary-soft/50 px-2.5 py-1 font-semibold text-primary-fg" lang="ja">
                          On: {currentKanji.onReadings.join('・')}
                        </span>
                      )}
                      {currentKanji.kunReadings.length > 0 && (
                        <span className="rounded-lg border border-success-line/60 bg-success-soft/50 px-2.5 py-1 font-semibold text-success-fg" lang="ja">
                          Kun: {currentKanji.kunReadings.join('・')}
                        </span>
                      )}
                    </div>
                    {currentKanji.compounds.length > 0 && (
                      <div className="space-y-1.5 rounded-xl border border-line bg-surface p-3 text-left">
                        <p className="text-[11px] font-bold text-muted uppercase">Từ ghép hay gặp</p>
                        {currentKanji.compounds.map((c, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span lang="ja" className="font-semibold text-fg">
                              {c.word}{' '}
                              <span className="font-normal text-muted">({c.hiragana})</span>
                            </span>
                            <span className="text-muted">{c.meaning}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-6 text-xs text-muted">
                    👆 Chạm vào thẻ hoặc bấm <Kbd>Space</Kbd> để xem Hán Việt &amp; cách đọc
                  </p>
                )}
              </>
            )}
          </button>
        </Card>
      )}

      {/* ==================== STEP 2: 100% RETRY-UNTIL-CORRECT QUIZ ==================== */}
      {step === 'quiz' && currentQuiz && currentQuizEntry && (
        <div className="space-y-4">
          <Card padding="md" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-fg tabular">
                  Quiz chốt 100%: Đã đúng {masteredQuizIds.length}/{quizQuestions.length} câu
                </span>
                {currentQuizEntry.isRetry && (
                  <Badge tone="warning">
                    <RotateCcw className="size-3" aria-hidden />
                    Làm lại câu vừa sai
                  </Badge>
                )}
              </div>
              <span className="hidden items-center gap-1 text-muted sm:flex">
                <Kbd>1–4</Kbd> chọn · <Kbd>Enter</Kbd> tiếp
              </span>
            </div>
            <ProgressBar
              value={masteredQuizIds.length}
              max={Math.max(1, quizQuestions.length)}
              size="sm"
              tone={masteredQuizIds.length === quizQuestions.length ? 'success' : 'primary'}
              label="Tiến độ Quiz 100%"
            />
          </Card>

          <Card padding="lg" className="space-y-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral" className="tabular">
                Lượt {quizIdx + 1}/{quizQueue.length}
              </Badge>
              <Badge tone="primary">{currentQuiz.category}</Badge>
              {currentQuizEntry.isRetry && <Badge tone="sakura">🔁 Ôn lại tới khi đúng</Badge>}
            </div>

            <p className="text-base font-bold leading-relaxed text-fg sm:text-lg" lang="ja">
              {currentQuiz.prompt}
            </p>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {currentQuiz.options.map((opt, idx) => {
                const isPicked = pickedOpt === idx;
                const isRight = idx === currentQuiz.correctIndex;
                const showCorrect = isQuizAnswered && isRight;
                const showWrong = isQuizAnswered && isPicked && !isRight;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isQuizAnswered}
                    onClick={() => handlePickQuizOption(idx)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 text-left text-sm font-medium transition-all disabled:cursor-default',
                      showCorrect
                        ? 'border-success-line bg-success-soft text-success-fg ring-1 ring-success-line'
                        : showWrong
                          ? 'border-danger-line bg-danger-soft text-danger-fg ring-1 ring-danger-line'
                          : isQuizAnswered
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

            {isQuizAnswered && (
              <div className="space-y-3">
                <Notice tone={isQuizCorrect ? 'success' : 'warning'}>
                  <p className="font-bold">
                    {isQuizCorrect
                      ? currentQuizEntry.isRetry
                        ? '✓ Chính xác! Bạn đã sửa thành công câu sai này.'
                        : '✓ Chính xác!'
                      : '× Chưa chính xác — Câu này sẽ tự động quay lại cuối bài để làm lại tới khi đúng 100%!'}
                  </p>
                  <p className="mt-1 leading-relaxed">{currentQuiz.explanation}</p>
                </Notice>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    rightIcon={<ArrowRight className="size-4" aria-hidden />}
                    onClick={handleAdvanceQuiz}
                  >
                    {quizIdx + 1 >= quizQueue.length ? 'Hoàn thành 100%' : 'Câu tiếp theo'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ==================== STEP 3: 100% COMPLETION ==================== */}
      {step === 'done' && (
        <Card padding="lg" className="space-y-5 border-success-line bg-success-soft/20 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-soft text-success-fg">
            <Trophy className="size-7" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <Badge tone="success" className="px-3 py-1 text-xs">
              <Sparkles className="size-3.5" aria-hidden />
              Hoàn thành 100% · {kind === 'vocab' ? 'Từ vựng' : 'Chữ Hán'} Màn {stageNumber}
            </Badge>
            <h2 className="text-xl font-bold text-fg">
              Đã lật thẻ &amp; chinh phục 100% Quiz ({quizQuestions.length}/{quizQuestions.length})!
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted">
              {missedQuizIds.length > 0
                ? `Bạn đã sửa thành công ${missedQuizIds.length} câu sai qua ${totalQuizAttempts} lượt trả lời. Nhiệm vụ của Màn đã tự động tích xanh!`
                : 'Tuyệt vời! Bạn nhớ chính xác 100% ngay từ lần đầu tiên.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
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
      )}
    </MokumokuSessionShell>
  );
};
