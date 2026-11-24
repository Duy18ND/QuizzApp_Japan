import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, Kbd, Notice, ProgressBar, Switch } from '../ui';
import { FuriganaText } from '../jlpt/FuriganaText';
import type { JLPTReadingPassage } from '../../data/jlpt/jlptDataset';
import { cn } from '../../lib/cn';
import { recordQuizAttempt } from '../../services/quizHistoryService';
import { recordDailyStageSkillActivity } from '../../services/stageRoadmapService';
import type { StudyLevel } from '../../services/userLevelService';
import { MokumokuSessionShell, type MokumokuSidebarItem } from './MokumokuSessionShell';

interface StageReadingTrainerProps {
  stageNumber: number;
  level: StudyLevel;
  userId?: string;
  passages: JLPTReadingPassage[];
  onFinishAndReturn: () => void;
}

interface ReadingQuizFlatItem {
  id: string;
  passageId: string;
  passageTitle: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

interface QuizQueueEntry {
  questionId: string;
  isRetry: boolean;
}

export const StageReadingTrainer: React.FC<StageReadingTrainerProps> = ({
  stageNumber,
  level,
  userId,
  passages,
  onFinishAndReturn,
}) => {
  const flatQuestions = useMemo<ReadingQuizFlatItem[]>(() => {
    const out: ReadingQuizFlatItem[] = [];
    for (const p of passages) {
      for (const q of p.questions) {
        out.push({
          id: q.id,
          passageId: p.id,
          passageTitle: p.title,
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        });
      }
    }
    return out;
  }, [passages]);

  const questionMap = useMemo(() => {
    const map = new Map<string, ReadingQuizFlatItem>();
    for (const q of flatQuestions) map.set(q.id, q);
    return map;
  }, [flatQuestions]);

  const passageMap = useMemo(() => {
    const map = new Map<string, JLPTReadingPassage>();
    for (const p of passages) map.set(p.id, p);
    return map;
  }, [passages]);

  const [step, setStep] = useState<'read' | 'quiz' | 'done'>('read');
  const [activePassageIdx, setActivePassageIdx] = useState(0);
  const [readPassageIds, setReadPassageIds] = useState<string[]>([]);
  const [showFurigana, setShowFurigana] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [peekPassageInQuiz, setPeekPassageInQuiz] = useState(false);

  const [queue, setQueue] = useState<QuizQueueEntry[]>(() =>
    flatQuestions.map((q) => ({ questionId: q.id, isRetry: false })),
  );
  const [queueIdx, setQueueIdx] = useState(0);
  const [pickedOpt, setPickedOpt] = useState<number | null>(null);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);
  const [missedIds, setMissedIds] = useState<string[]>([]);

  const sessionStartRef = useRef<number>(0);
  const recordedRef = useRef(false);

  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, []);

  const currentPassage = passages[Math.min(activePassageIdx, Math.max(0, passages.length - 1))] ?? null;
  const currentEntry = queue[queueIdx] ?? null;
  const currentQ = currentEntry ? (questionMap.get(currentEntry.questionId) ?? null) : null;
  const currentQPassage = currentQ ? (passageMap.get(currentQ.passageId) ?? null) : null;
  const isAnswered = pickedOpt !== null;
  const isCorrect = isAnswered && currentQ !== null && pickedOpt === currentQ.correctIndex;

  const finalize = useCallback(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    const durationSec =
      sessionStartRef.current > 0
        ? Math.max(5, Math.round((Date.now() - sessionStartRef.current) / 1000))
        : 60;
    recordDailyStageSkillActivity('reading', userId);
    void recordQuizAttempt(
      {
        quizType: 'jlpt-reading-short',
        level,
        score: Math.max(1, flatQuestions.length),
        totalQuestions: Math.max(1, flatQuestions.length),
        durationSeconds: durationSec,
        mistakesJson: [],
      },
      userId,
    );
    setStep('done');
  }, [flatQuestions.length, level, userId]);

  const handleUnderstoodPassage = () => {
    if (!currentPassage) return;
    setReadPassageIds((prev) =>
      prev.includes(currentPassage.id) ? prev : [...prev, currentPassage.id],
    );
    setShowTranslation(false);
    if (activePassageIdx + 1 < passages.length) {
      setActivePassageIdx((i) => i + 1);
    } else if (flatQuestions.length > 0) {
      setStep('quiz');
    } else {
      finalize();
    }
  };

  const handlePickOpt = useCallback(
    (optIdx: number) => {
      if (isAnswered || !currentQ) return;
      setPickedOpt(optIdx);
      if (optIdx === currentQ.correctIndex) {
        setMasteredIds((prev) => (prev.includes(currentQ.id) ? prev : [...prev, currentQ.id]));
      } else {
        setMissedIds((prev) => (prev.includes(currentQ.id) ? prev : [...prev, currentQ.id]));
        setQueue((prev) => [...prev, { questionId: currentQ.id, isRetry: true }]);
      }
    },
    [currentQ, isAnswered],
  );

  const handleAdvanceQuiz = useCallback(() => {
    if (!isAnswered) return;
    if (queueIdx + 1 >= queue.length) {
      finalize();
    } else {
      setQueueIdx((i) => i + 1);
      setPickedOpt(null);
      setPeekPassageInQuiz(false);
    }
  }, [finalize, isAnswered, queue.length, queueIdx]);

  useEffect(() => {
    if (step !== 'quiz' || !currentQ) return;
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
        if (idx !== -1 && idx < currentQ.options.length) {
          event.preventDefault();
          handlePickOpt(idx);
        }
      } else if (event.key === 'Enter' || event.key === 'ArrowRight') {
        event.preventDefault();
        handleAdvanceQuiz();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentQ, handleAdvanceQuiz, handlePickOpt, isAnswered, step]);

  const sidebarItems = useMemo<MokumokuSidebarItem[]>(() => {
    const items: MokumokuSidebarItem[] = passages.map((p, idx) => ({
      id: p.id,
      label: `Đoạn đọc ${idx + 1}`,
      done: readPassageIds.includes(p.id),
    }));
    items.push({
      id: '__quiz__',
      label: `Câu hỏi Đọc hiểu · ${flatQuestions.length} câu`,
      isQuizStep: true,
      done: step === 'done',
      badgeText: '100%',
    });
    return items;
  }, [flatQuestions.length, passages, readPassageIds, step]);

  return (
    <MokumokuSessionShell
      progressLabel="TIẾN ĐỘ ĐỌC HIỂU"
      completedCount={readPassageIds.length + (step === 'done' ? 1 : 0)}
      totalCount={passages.length + 1}
      items={sidebarItems}
      activeId={step === 'read' ? (currentPassage?.id ?? '') : '__quiz__'}
      onSelect={(id) => {
        if (id === '__quiz__') {
          if (flatQuestions.length > 0 && step !== 'done') setStep('quiz');
          return;
        }
        const idx = passages.findIndex((p) => p.id === id);
        if (idx >= 0) {
          setStep('read');
          setActivePassageIdx(idx);
        }
      }}
      footer={
        step === 'read' && currentPassage ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={activePassageIdx === 0}
              leftIcon={<ArrowLeft className="size-3.5" aria-hidden />}
              onClick={() => {
                setActivePassageIdx((i) => Math.max(0, i - 1));
                setShowTranslation(false);
              }}
            >
              Đoạn trước
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="size-3.5" aria-hidden />}
              onClick={handleUnderstoodPassage}
            >
              {activePassageIdx + 1 >= passages.length
                ? 'Hiểu rồi · Vào làm câu hỏi (100%)'
                : 'Hiểu rồi'}
            </Button>
          </>
        ) : undefined
      }
    >
      {/* ==================== STEP 1: FOCUSED READING PASSAGE ==================== */}
      {step === 'read' && currentPassage && (
        <Card padding="lg" className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
            <div className="space-y-1">
              <p className="text-xs font-bold tracking-wide text-muted uppercase">
                BÀI ĐỌC {activePassageIdx + 1} · {currentPassage.genre}
              </p>
              <h2 className="text-lg font-bold text-fg sm:text-xl" lang="ja">
                {currentPassage.title}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="sakura">{currentPassage.level}</Badge>
              <Switch
                checked={showFurigana}
                onChange={setShowFurigana}
                label="Furigana"
              />
            </div>
          </div>

          <p className="text-xs text-muted">
            💡 Mẹo: Di chuột hoặc chạm trực tiếp vào bất kỳ chữ tiếng Nhật nào để bật tra từ nhanh <strong>[訳 Dịch]</strong>.
          </p>

          <div className="space-y-3 rounded-2xl border border-line bg-surface-2/50 p-5 text-base leading-loose text-fg" lang="ja">
            {currentPassage.paragraphs.map((para, pIdx) => (
              <p key={pIdx}>
                <FuriganaText segments={para.segments} showFurigana={showFurigana} />
              </p>
            ))}
          </div>

          {currentPassage.vocabNotes && currentPassage.vocabNotes.length > 0 && (
            <div className="space-y-2 rounded-xl border border-line bg-surface-2/40 p-3.5">
              <p className="text-xs font-bold tracking-wide text-muted uppercase">
                Từ vựng chú thích trong bài
              </p>
              <div className="flex flex-wrap gap-2">
                {currentPassage.vocabNotes.map((vn, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs"
                  >
                    <strong className="text-primary-fg" lang="ja">
                      {vn.word}
                    </strong>{' '}
                    <span className="text-muted">({vn.reading}):</span> {vn.meaning}
                  </span>
                ))}
              </div>
            </div>
          )}

          {currentPassage.translation && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowTranslation((v) => !v)}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary-fg hover:underline"
              >
                {showTranslation ? (
                  <>
                    <EyeOff className="size-3.5" aria-hidden />
                    Ẩn bản dịch tiếng Việt
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5" aria-hidden />
                    Xem bản dịch tham khảo (sau khi tự đọc)
                  </>
                )}
              </button>
              {showTranslation && (
                <div className="rounded-xl border border-line bg-surface-2/60 p-3.5 text-xs leading-relaxed text-muted sm:text-sm">
                  {currentPassage.translation}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ==================== STEP 2: 100% READING QUESTIONS ==================== */}
      {step === 'quiz' && currentQ && currentEntry && (
        <div className="space-y-4">
          <Card padding="md" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-fg tabular">
                  Câu hỏi Đọc hiểu: Đã đúng {masteredIds.length}/{flatQuestions.length} câu (Cần 100%)
                </span>
                {currentEntry.isRetry && (
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
              value={masteredIds.length}
              max={Math.max(1, flatQuestions.length)}
              size="sm"
              tone={masteredIds.length === flatQuestions.length ? 'success' : 'primary'}
              label="Tiến độ Đọc hiểu 100%"
            />
          </Card>

          <Card padding="lg" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="neutral" className="tabular">
                  Lượt {queueIdx + 1}/{queue.length}
                </Badge>
                <Badge tone="primary">{currentQ.passageTitle}</Badge>
              </div>
              {currentQPassage && (
                <button
                  type="button"
                  onClick={() => setPeekPassageInQuiz((v) => !v)}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary-fg hover:underline"
                >
                  <BookOpen className="size-3.5" aria-hidden />
                  {peekPassageInQuiz ? 'Thu gọn đoạn văn' : 'Xem lại đoạn văn tìm dẫn chứng'}
                </button>
              )}
            </div>

            {peekPassageInQuiz && currentQPassage && (
              <div className="space-y-2 rounded-xl border border-primary/30 bg-surface-2/70 p-4 text-sm leading-relaxed text-fg" lang="ja">
                {currentQPassage.paragraphs.map((para, idx) => (
                  <p key={idx}>
                    <FuriganaText segments={para.segments} showFurigana={showFurigana} />
                  </p>
                ))}
              </div>
            )}

            <p className="text-base font-bold leading-relaxed text-fg sm:text-lg" lang="ja">
              {currentQ.prompt}
            </p>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {currentQ.options.map((opt, idx) => {
                const isPicked = pickedOpt === idx;
                const isRight = idx === currentQ.correctIndex;
                const showCorrect = isAnswered && isRight;
                const showWrong = isAnswered && isPicked && !isRight;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handlePickOpt(idx)}
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

            {isAnswered && (
              <div className="space-y-3">
                <Notice tone={isCorrect ? 'success' : 'warning'}>
                  <p className="font-bold">
                    {isCorrect
                      ? currentEntry.isRetry
                        ? '✓ Chính xác! Bạn đã sửa thành công câu đọc hiểu này.'
                        : '✓ Chính xác!'
                      : '× Chưa chính xác — Câu này sẽ quay lại cuối bài để làm lại tới khi đúng 100%!'}
                  </p>
                  <p className="mt-1 leading-relaxed">{currentQ.explanation}</p>
                </Notice>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    rightIcon={<ArrowRight className="size-4" aria-hidden />}
                    onClick={handleAdvanceQuiz}
                  >
                    {queueIdx + 1 >= queue.length ? 'Hoàn thành Đọc hiểu 100%' : 'Câu tiếp theo'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ==================== STEP 3: 100% DONE ==================== */}
      {step === 'done' && (
        <Card padding="lg" className="space-y-5 border-success-line bg-success-soft/20 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-soft text-success-fg">
            <Trophy className="size-7" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <Badge tone="success" className="px-3 py-1 text-xs">
              <Sparkles className="size-3.5" aria-hidden />
              Hoàn thành Đọc hiểu 100%
            </Badge>
            <h2 className="text-xl font-bold text-fg">
              Đã đọc hiểu &amp; trả lời đúng 100% câu hỏi Màn {stageNumber}!
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted">
              {missedIds.length > 0
                ? `Bạn đã sửa thành công ${missedIds.length} câu sai và hoàn thành trọn vẹn bài đọc.`
                : 'Tuyệt vời! Bạn đọc hiểu chuẩn xác 100% ngay từ lần đầu.'}
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
      )}
    </MokumokuSessionShell>
  );
};
