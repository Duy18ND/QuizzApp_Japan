import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FastForward,
  Lightbulb,
  RotateCcw,
  Scale,
  Sparkles,
  Trophy,
  Volume2,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Kbd,
  Notice,
  PageContainer,
  ProgressBar,
  buttonStyles,
} from '../components/ui';
import {
  MokumokuSessionShell,
  type MokumokuSidebarItem,
} from '../components/roadmap/MokumokuSessionShell';
import { StageFlipcardTrainer } from '../components/roadmap/StageFlipcardTrainer';
import { StageListeningTrainer } from '../components/roadmap/StageListeningTrainer';
import { StageReadingTrainer } from '../components/roadmap/StageReadingTrainer';
import { MasteryLengthPicker } from '../components/roadmap/MasteryLengthPicker';
import { useAuth } from '../context/auth-context';
import { useCurriculumSnapshot } from '../hooks/useCurriculumData';
import { cn } from '../lib/cn';
import { getPreferredVocabLevel, resolveActiveVocabTextbook } from '../data/vocabTextbooks';
import { recordQuizAttempt } from '../services/quizHistoryService';
import {
  generateStageMap,
  getRecommendedFixedStageCount,
  loadStageRoadmapState,
  recordDailyGrammarInteraction,
} from '../services/stageRoadmapService';
import type { StudyLevel } from '../services/userLevelService';
import {
  buildStageBriefing,
  markStageBriefingUnderstood,
  readStoredStageSession,
  saveStageBossPassed,
  pickMasteryQuestions,
  type StageBriefingData,
  type StoredStageSessionPayload,
} from '../utils/stageBriefingBuilder';
import { speakJapanese } from '../utils/tts';

type StageSessionMode = 'briefing' | 'vocab' | 'kanji' | 'reading' | 'listening' | 'mastery';

interface MasteryQuestionItem {
  id: string;
  category: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  reviewHint?: string;
}

interface QueueEntry {
  questionId: string;
  isRetry: boolean;
}

interface SessionMistakeRecord {
  id: string;
  questionId: string;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  options: string[];
  level: string;
  categoryLabel: string;
}

function normalizeSessionMode(raw: string | undefined): StageSessionMode {
  if (
    raw === 'vocab' ||
    raw === 'kanji' ||
    raw === 'reading' ||
    raw === 'listening' ||
    raw === 'mastery'
  ) {
    return raw;
  }
  return 'briefing';
}

export const StageStudySessionPage: React.FC = () => {
  const { stageId, mode } = useParams<{ stageId: string; mode: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, studyLevel, studyTextbookId } = useAuth();
  const cmsSnapshot = useCurriculumSnapshot();

  const sessionMode = normalizeSessionMode(mode);
  const isJumpMode = searchParams.get('mode') === 'jump';
  /** Chosen length of the "Chốt Màn" test (null = still choosing) */
  const [masteryCount, setMasteryCount] = useState<number | null>(null);

  const resolvedSession = useMemo<StoredStageSessionPayload | null>(() => {
    const navState = location.state as StoredStageSessionPayload | null;
    if (navState?.stage && (!stageId || navState.stage.id === stageId)) {
      return navState;
    }

    const stored = readStoredStageSession(stageId);
    if (stored) return stored;

    if (!stageId) return null;

    const roadmapState = loadStageRoadmapState(user?.id);
    const level: StudyLevel =
      roadmapState.activeMode === 'custom' && roadmapState.customConfig
        ? roadmapState.customConfig.level
        : (studyLevel ?? getPreferredVocabLevel(user?.id) ?? 'N5');
    const book = resolveActiveVocabTextbook(
      level,
      user?.id,
      roadmapState.activeMode === 'custom' && roadmapState.customConfig
        ? roadmapState.customConfig.textbookId
        : level === studyLevel
          ? studyTextbookId
          : null,
    );

    const stages =
      roadmapState.activeMode === 'custom' && roadmapState.customConfig
        ? generateStageMap({
            mode: 'custom',
            customRoadmapId: roadmapState.customConfig.id,
            level: roadmapState.customConfig.level,
            textbookId: roadmapState.customConfig.textbookId,
            userId: user?.id,
            snapshot: cmsSnapshot,
            startDate: roadmapState.customConfig.startDate,
            dailyMinutesTarget: roadmapState.customConfig.dailyMinutesTarget,
            totalStages: roadmapState.customConfig.totalStages,
            studyWeekdays: roadmapState.customConfig.studyWeekdays,
            skills: roadmapState.customConfig.skills,
            stageOverrides: roadmapState.customConfig.stageOverrides,
            chunkTitles: roadmapState.customConfig.chunkTitles,
            includeKanaStarter: roadmapState.customConfig.includeKanaStarter,
          })
        : generateStageMap({
            mode: 'fixed',
            level,
            textbookId: book.id,
            userId: user?.id,
            snapshot: cmsSnapshot,
            startDate: roadmapState.fixedStartDate,
            dailyMinutesTarget: roadmapState.fixedDailyMinutesTarget,
            totalStages: getRecommendedFixedStageCount(
              level,
              book.id,
              roadmapState.fixedDailyMinutesTarget,
            ),
            studyWeekdays: roadmapState.fixedStudyWeekdays,
            includeKanaStarter: roadmapState.fixedIncludeKanaStarter,
          });

    const found = stages.find((s) => s.id === stageId);
    if (!found) return null;
    return { stage: found, level, textbookId: book.id };
  }, [cmsSnapshot, location.state, stageId, studyLevel, studyTextbookId, user?.id]);

  const briefing = useMemo(() => {
    if (!resolvedSession) return null;
    return buildStageBriefing(
      resolvedSession.stage,
      cmsSnapshot,
      resolvedSession.level,
      resolvedSession.textbookId,
    );
  }, [cmsSnapshot, resolvedSession]);

  if (!resolvedSession || !briefing) {
    return (
      <PageContainer size="md" className="py-10">
        <EmptyState
          title="Không tìm thấy Màn học này"
          description="Hãy mở lại từ trang Bản đồ Lộ trình để vào đúng Màn học hôm nay của bạn."
          action={
            <Link to="/roadmap" className={buttonStyles({ variant: 'primary' })}>
              Quay lại Bản đồ Lộ trình
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const returnToRoadmapUrl = `/roadmap?stage=${encodeURIComponent(resolvedSession.stage.id)}`;
  // Levels / books without data (e.g. N1 vocab) would otherwise render an empty trainer
  const sessionHasContent =
    sessionMode === 'vocab'
      ? briefing.vocabItems.length > 0 && briefing.vocabQuizQuestions.length > 0
      : sessionMode === 'kanji'
        ? briefing.kanjiItems.length > 0 && briefing.kanjiQuizQuestions.length > 0
        : sessionMode === 'reading'
          ? briefing.readingPassages.length > 0
          : sessionMode === 'listening'
            ? briefing.listeningItems.length > 0
            : sessionMode === 'mastery'
              ? briefing.masteryQuestions.length > 0
              : briefing.grammarItems.length > 0 || briefing.quickChecks.length > 0;
  const modeLabelMap: Record<StageSessionMode, string> = {
    briefing: 'Ngữ pháp · Tips & Dấu hiệu (100%)',
    vocab: 'Lật thẻ Từ vựng → Quiz 100%',
    kanji: 'Lật thẻ Chữ Hán → Quiz 100%',
    reading: 'Đọc hiểu tập trung → Câu hỏi 100%',
    listening: 'Nghe hiểu ẩn/hiện Script (100%)',
    mastery: isJumpMode ? 'Thi nhảy cóc · Đúng 100%' : 'Chặng 4 · Chốt Màn 100%',
  };

  return (
    <PageContainer size="lg" className="space-y-5 py-6">
      {/* Shared Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={returnToRoadmapUrl}
          className={buttonStyles({ variant: 'ghost', size: 'sm', className: '-ml-2' })}
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span>Quay lại Lộ trình (Màn {resolvedSession.stage.stageNumber})</span>
        </Link>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="primary">{resolvedSession.level}</Badge>
          <Badge tone="neutral">Màn {resolvedSession.stage.stageNumber}</Badge>
          <Badge tone={sessionMode === 'mastery' ? 'sakura' : 'success'}>
            {modeLabelMap[sessionMode]}
          </Badge>
        </div>
      </div>

      {/* Mode Switcher */}
      {!sessionHasContent ? (
        <EmptyState
          title={`Màn này chưa có dữ liệu ${MODE_CONTENT_LABEL[sessionMode]} cho ${resolvedSession.level}`}
          description={
            resolvedSession.level === 'N2' || resolvedSession.level === 'N1'
              ? 'Nội dung N2 / N1 đang được cập nhật. Bạn có thể học các phần khác của Màn hoặc chọn trình độ N3–N5.'
              : 'Phần này của Màn chưa có câu hỏi. Hãy học các phần khác của Màn.'
          }
          action={
            <Link to={returnToRoadmapUrl} className={buttonStyles({ variant: 'primary' })}>
              Quay lại Lộ trình
            </Link>
          }
        />
      ) : sessionMode === 'vocab' || sessionMode === 'kanji' ? (
        <StageFlipcardTrainer
          key={`${resolvedSession.stage.id}-${sessionMode}`}
          kind={sessionMode}
          stageNumber={resolvedSession.stage.stageNumber}
          level={resolvedSession.level}
          userId={user?.id}
          vocabItems={briefing.vocabItems}
          kanjiItems={briefing.kanjiItems}
          quizQuestions={
            sessionMode === 'vocab' ? briefing.vocabQuizQuestions : briefing.kanjiQuizQuestions
          }
          onFinishAndReturn={() => navigate(returnToRoadmapUrl)}
        />
      ) : sessionMode === 'reading' ? (
        <StageReadingTrainer
          key={`${resolvedSession.stage.id}-reading`}
          stageNumber={resolvedSession.stage.stageNumber}
          level={resolvedSession.level}
          userId={user?.id}
          passages={briefing.readingPassages}
          onFinishAndReturn={() => navigate(returnToRoadmapUrl)}
        />
      ) : sessionMode === 'listening' ? (
        <StageListeningTrainer
          key={`${resolvedSession.stage.id}-listening`}
          stageNumber={resolvedSession.stage.stageNumber}
          level={resolvedSession.level}
          userId={user?.id}
          items={briefing.listeningItems}
          onFinishAndReturn={() => navigate(returnToRoadmapUrl)}
        />
      ) : sessionMode === 'mastery' && masteryCount === null ? (
        <MasteryLengthPicker
          stageNumber={resolvedSession.stage.stageNumber}
          poolSize={briefing.masteryQuestions.length}
          isJumpMode={isJumpMode}
          onStart={setMasteryCount}
        />
      ) : (
        <StageBriefingAndMasteryRunner
          key={`${resolvedSession.stage.id}-${sessionMode}-${isJumpMode ? 'jump' : 'std'}-${masteryCount ?? 0}`}
          resolvedSession={resolvedSession}
          briefing={
            sessionMode === 'mastery' && masteryCount !== null
              ? { ...briefing, masteryQuestions: pickMasteryQuestions(briefing.masteryQuestions, masteryCount) }
              : briefing
          }
          sessionMode={sessionMode}
          isJumpMode={isJumpMode}
          userId={user?.id}
          returnToRoadmapUrl={returnToRoadmapUrl}
        />
      )}
    </PageContainer>
  );
};

const MODE_CONTENT_LABEL: Record<StageSessionMode, string> = {
  briefing: 'ngữ pháp',
  vocab: 'từ vựng',
  kanji: 'chữ Hán',
  reading: 'đọc hiểu',
  listening: 'nghe hiểu',
  mastery: 'bài kiểm tra',
};

interface StageBriefingAndMasteryRunnerProps {
  resolvedSession: StoredStageSessionPayload;
  briefing: StageBriefingData;
  sessionMode: 'briefing' | 'mastery';
  isJumpMode: boolean;
  userId?: string;
  returnToRoadmapUrl: string;
}

const StageBriefingAndMasteryRunner: React.FC<StageBriefingAndMasteryRunnerProps> = ({
  resolvedSession,
  briefing,
  sessionMode,
  isJumpMode,
  userId,
  returnToRoadmapUrl,
}) => {
  const navigate = useNavigate();

  const activeQuestions = useMemo<MasteryQuestionItem[]>(() => {
    if (sessionMode === 'briefing') {
      return briefing.quickChecks.map((qc) => ({
        id: qc.id,
        category: qc.category,
        prompt: qc.prompt,
        options: [...qc.options],
        correctIndex: qc.correctIndex,
        explanation: qc.explanation,
      }));
    }
    return briefing.masteryQuestions.map((mq) => ({
      id: mq.id,
      category: mq.category,
      prompt: mq.prompt,
      options: [...mq.options],
      correctIndex: mq.correctIndex,
      explanation: mq.explanation,
      reviewHint: mq.reviewHint,
    }));
  }, [briefing, sessionMode]);

  const questionMap = useMemo(() => {
    const map = new Map<string, MasteryQuestionItem>();
    for (const q of activeQuestions) map.set(q.id, q);
    return map;
  }, [activeQuestions]);

  // Mokumoku 2-column reading step-by-step for Grammar (`briefing`), or straight into 100% Quiz for `mastery`
  const [phase, setPhase] = useState<'read' | 'quiz' | 'done'>(
    sessionMode === 'briefing' && briefing.grammarItems.length > 0 ? 'read' : 'quiz',
  );
  const [activeGrammarIdx, setActiveGrammarIdx] = useState(0);
  const [understoodGrammarIds, setUnderstoodGrammarIds] = useState<string[]>([]);
  const [showCompareDetails, setShowCompareDetails] = useState(false);
  const [showTipsPeek, setShowTipsPeek] = useState(false);

  // 100% Mastery Retry Queue State
  const [queue, setQueue] = useState<QueueEntry[]>(() =>
    activeQuestions.map((q) => ({ questionId: q.id, isRetry: false })),
  );
  const [queueIdx, setQueueIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);
  const [missedIds, setMissedIds] = useState<string[]>([]);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [wrongMistakes, setWrongMistakes] = useState<SessionMistakeRecord[]>([]);

  const sessionStartRef = useRef<number>(0);
  const recordedCompletionRef = useRef<boolean>(false);

  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, []);

  const currentGrammar =
    briefing.grammarItems[
      Math.min(activeGrammarIdx, Math.max(0, briefing.grammarItems.length - 1))
    ] ?? null;
  const currentEntry = queue[queueIdx] ?? null;
  const currentQuestion = currentEntry ? (questionMap.get(currentEntry.questionId) ?? null) : null;
  const isAnswered = selectedOption !== null;
  const isCurrentCorrect =
    isAnswered && currentQuestion !== null && selectedOption === currentQuestion.correctIndex;
  const remainingUnmastered = Math.max(0, activeQuestions.length - masteredIds.length);

  const finalizeSessionSuccess = useCallback(() => {
    if (recordedCompletionRef.current) return;
    recordedCompletionRef.current = true;

    if (sessionMode === 'briefing') {
      markStageBriefingUnderstood(resolvedSession.stage.id, userId);
    } else {
      const durationSeconds =
        sessionStartRef.current > 0
          ? Math.max(5, Math.round((Date.now() - sessionStartRef.current) / 1000))
          : 60;
      void recordQuizAttempt(
        {
          quizType: `roadmap-stage-${resolvedSession.stage.stageNumber}`,
          level: resolvedSession.level,
          score: activeQuestions.length,
          totalQuestions: activeQuestions.length,
          durationSeconds,
          mistakesJson: wrongMistakes,
        },
        userId,
      );
      saveStageBossPassed(
        {
          stageId: resolvedSession.stage.id,
          score: activeQuestions.length,
          total: activeQuestions.length,
          accuracyPct: 100,
          isJumpPass: isJumpMode,
          passedAt: new Date().toISOString(),
        },
        userId,
      );
    }
    setPhase('done');
  }, [activeQuestions.length, isJumpMode, resolvedSession, sessionMode, userId, wrongMistakes]);

  const handleMarkGrammarUnderstood = () => {
    if (!currentGrammar) return;
    recordDailyGrammarInteraction(currentGrammar.id, userId);
    setUnderstoodGrammarIds((prev) =>
      prev.includes(currentGrammar.id) ? prev : [...prev, currentGrammar.id],
    );
    setShowCompareDetails(false);
    if (activeGrammarIdx + 1 < briefing.grammarItems.length) {
      setActiveGrammarIdx((i) => i + 1);
    } else if (activeQuestions.length > 0) {
      setPhase('quiz');
    } else {
      finalizeSessionSuccess();
    }
  };

  const handlePickOption = useCallback(
    (optionIdx: number) => {
      if (isAnswered || !currentQuestion) return;
      setSelectedOption(optionIdx);
      setTotalAttempts((n) => n + 1);

      const correct = optionIdx === currentQuestion.correctIndex;
      if (correct) {
        setMasteredIds((prev) =>
          prev.includes(currentQuestion.id) ? prev : [...prev, currentQuestion.id],
        );
      } else {
        setMissedIds((prev) =>
          prev.includes(currentQuestion.id) ? prev : [...prev, currentQuestion.id],
        );
        setQueue((prev) => [...prev, { questionId: currentQuestion.id, isRetry: true }]);
        setWrongMistakes((prev) => {
          if (prev.some((m) => m.questionId === currentQuestion.id)) return prev;
          return [
            ...prev,
            {
              id: `${currentQuestion.id}-${Date.now()}`,
              questionId: currentQuestion.id,
              prompt: currentQuestion.prompt,
              userAnswer: currentQuestion.options[optionIdx] ?? '—',
              correctAnswer: currentQuestion.options[currentQuestion.correctIndex] ?? '—',
              explanation: currentQuestion.explanation,
              options: currentQuestion.options,
              level: resolvedSession.level,
              categoryLabel: `Màn ${resolvedSession.stage.stageNumber} · ${currentQuestion.category}`,
            },
          ];
        });
      }
    },
    [currentQuestion, isAnswered, resolvedSession],
  );

  const handleAdvance = useCallback(() => {
    if (!isAnswered) return;
    const nextIdx = queueIdx + 1;
    if (nextIdx >= queue.length) {
      finalizeSessionSuccess();
    } else {
      setQueueIdx(nextIdx);
      setSelectedOption(null);
    }
  }, [finalizeSessionSuccess, isAnswered, queue.length, queueIdx]);

  useEffect(() => {
    if (phase !== 'quiz' || !currentQuestion) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!isAnswered) {
        const idx = ['1', '2', '3', '4'].indexOf(event.key);
        if (idx !== -1 && idx < currentQuestion.options.length) {
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
  }, [currentQuestion, handleAdvance, handlePickOption, isAnswered, phase]);

  const handleRestartQuiz = () => {
    sessionStartRef.current = Date.now();
    recordedCompletionRef.current = false;
    setQueue(activeQuestions.map((q) => ({ questionId: q.id, isRetry: false })));
    setQueueIdx(0);
    setSelectedOption(null);
    setMasteredIds([]);
    setMissedIds([]);
    setTotalAttempts(0);
    setWrongMistakes([]);
    setPhase('quiz');
  };

  const sidebarItems = useMemo<MokumokuSidebarItem[]>(() => {
    if (sessionMode === 'briefing') {
      const items: MokumokuSidebarItem[] = briefing.grammarItems.map((g) => ({
        id: g.id,
        label: g.name,
        done: understoodGrammarIds.includes(g.id),
      }));
      items.push({
        id: '__quiz__',
        label: `Bài tập · ${activeQuestions.length} câu`,
        isQuizStep: true,
        done: phase === 'done',
        badgeText: '100%',
      });
      return items;
    }
    return activeQuestions.map((q, idx) => ({
      id: q.id,
      label: `Câu ${idx + 1} · ${q.category}`,
      done: masteredIds.includes(q.id),
      badgeText: !masteredIds.includes(q.id) && missedIds.includes(q.id) ? 'Làm lại' : undefined,
    }));
  }, [
    activeQuestions,
    briefing.grammarItems,
    masteredIds,
    missedIds,
    phase,
    sessionMode,
    understoodGrammarIds,
  ]);

  const activeSidebarId =
    sessionMode === 'briefing'
      ? phase === 'read'
        ? (currentGrammar?.id ?? '__quiz__')
        : '__quiz__'
      : (currentQuestion?.id ?? '');

  const { stage } = resolvedSession;
  const firstTryCorrectCount = Math.max(0, activeQuestions.length - missedIds.length);
  const firstTryPct =
    activeQuestions.length > 0
      ? Math.round((firstTryCorrectCount / activeQuestions.length) * 100)
      : 100;

  return (
    <MokumokuSessionShell
      progressLabel={
        sessionMode === 'briefing'
          ? `TIẾN ĐỘ MÀN ${stage.stageNumber}`
          : isJumpMode
            ? 'THI NHẢY CÓC (100%)'
            : `CHỐT MÀN ${stage.stageNumber} (100%)`
      }
      completedCount={
        sessionMode === 'briefing'
          ? understoodGrammarIds.length + (phase === 'done' ? 1 : 0)
          : masteredIds.length
      }
      totalCount={
        sessionMode === 'briefing' ? briefing.grammarItems.length + 1 : activeQuestions.length
      }
      items={sidebarItems}
      activeId={activeSidebarId}
      onSelect={(id) => {
        if (sessionMode !== 'briefing') return;
        if (id === '__quiz__') {
          if (activeQuestions.length > 0 && phase !== 'done') {
            setPhase('quiz');
          }
          return;
        }
        const idx = briefing.grammarItems.findIndex((g) => g.id === id);
        if (idx >= 0) {
          setPhase('read');
          setActiveGrammarIdx(idx);
          setShowCompareDetails(false);
        }
      }}
      footer={
        sessionMode === 'briefing' && phase === 'read' && currentGrammar ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={activeGrammarIdx === 0}
              leftIcon={<ArrowLeft className="size-3.5" aria-hidden />}
              onClick={() => {
                setActiveGrammarIdx((i) => Math.max(0, i - 1));
                setShowCompareDetails(false);
              }}
            >
              Mẫu trước
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="size-3.5" aria-hidden />}
              onClick={handleMarkGrammarUnderstood}
            >
              {activeGrammarIdx + 1 >= briefing.grammarItems.length
                ? `Hiểu rồi · Vào Bài tập (${activeQuestions.length} câu)`
                : 'Hiểu rồi'}
            </Button>
          </>
        ) : undefined
      }
    >
      {/* ==================== MOKUMOKU SINGLE-CARD GRAMMAR VIEW (EXACT HÌNH 2) ==================== */}
      {sessionMode === 'briefing' && phase === 'read' && currentGrammar && (
        <Card padding="lg" className="space-y-5">
          {/* Card Header: MẪU X + Large Pattern Title + Level Pill */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="text-xs font-bold tracking-wider text-muted uppercase">
                MẪU {activeGrammarIdx + 1} · {briefing.headline}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-sakura sm:text-3xl" lang="ja">
                {currentGrammar.name}
              </h1>
            </div>
            <Badge tone="sakura" className="px-2.5 py-1 text-xs font-bold">
              {currentGrammar.level}
            </Badge>
          </div>

          {/* CÁCH DỊCH */}
          <div className="space-y-1">
            <p className="text-[11px] font-bold tracking-wider text-muted uppercase">Cách dịch</p>
            <p className="text-base font-bold text-fg">{currentGrammar.meaning}</p>
          </div>

          {/* Ý NGHĨA · CÁCH DÙNG */}
          {currentGrammar.whenToUse.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold tracking-wider text-muted uppercase">
                Ý nghĩa · Cách dùng
              </p>
              <ul className="space-y-1 text-sm leading-relaxed text-fg/90">
                {currentGrammar.whenToUse.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {/* CẤU TRÚC (Highlighted formula box like Mokumoku) */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold tracking-wider text-muted uppercase">Cấu trúc</p>
            <div className="rounded-xl border border-warning-line/60 bg-warning-soft/30 px-4 py-3 text-sm font-bold text-fg" lang="ja">
              {currentGrammar.formula}
            </div>
          </div>

          {/* DẤU HIỆU NHẬN BIẾT TRONG ĐỀ */}
          {currentGrammar.triggerWords.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold tracking-wider text-muted uppercase">
                Dấu hiệu nhận biết trong đề (Trigger words)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentGrammar.triggerWords.map((tw, idx) => (
                  <span
                    key={idx}
                    lang="ja"
                    className="rounded-lg border border-primary/35 bg-primary-soft/45 px-2.5 py-1 text-xs font-semibold text-primary-fg"
                  >
                    {tw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* VÍ DỤ (Clean textbook sentences with speaker button & hover/tap lookup) */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold tracking-wider text-muted uppercase">Ví dụ</p>
            <div className="space-y-3">
              {currentGrammar.examples.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-2/50 px-3.5 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-base font-semibold leading-relaxed text-fg" lang="ja">
                      {ex.japanese}
                    </p>
                    <p className="text-xs italic text-muted sm:text-sm">{ex.vietnamese}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakJapanese(ex.japanese)}
                    aria-label={`Nghe ví dụ ${idx + 1}`}
                    className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-primary-fg hover:border-primary/50 hover:bg-primary-soft"
                  >
                    <Volume2 className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Mẹo nhớ 3 giây */}
          <div className="flex items-start gap-2.5 rounded-xl border border-warning-line/60 bg-warning-soft/25 p-3 text-xs leading-relaxed text-warning-fg sm:text-sm">
            <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <strong>Mẹo nhớ 3 giây:</strong> {currentGrammar.memoryTip}
            </p>
          </div>

          {/* Collapsible Right vs Wrong & Confusable Pairs (keeps main Mokumoku card super clean!) */}
          <div className="border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setShowCompareDetails((v) => !v)}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-sakura hover:underline"
            >
              {showCompareDetails ? (
                <>
                  Thu gọn Bẫy ○/× &amp; So sánh dễ nhầm <ChevronUp className="size-3.5" aria-hidden />
                </>
              ) : (
                <>
                  Xem thêm Bẫy ○/× &amp; So sánh cặp dễ nhầm <ChevronDown className="size-3.5" aria-hidden />
                </>
              )}
            </button>

            {showCompareDetails && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1 rounded-xl border border-success-line/70 bg-success-soft/20 p-3">
                    <p className="text-xs font-bold text-success-fg">○ Câu chuẩn tự nhiên</p>
                    <p className="text-sm font-semibold text-fg" lang="ja">
                      {currentGrammar.rightVsWrong.rightSentence}
                    </p>
                    <p className="text-xs text-muted">{currentGrammar.rightVsWrong.rightMeaning}</p>
                  </div>
                  <div className="space-y-1 rounded-xl border border-danger-line/70 bg-danger-soft/20 p-3">
                    <p className="flex items-center gap-1 text-xs font-bold text-danger-fg">
                      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                      × Bẫy hay sai
                    </p>
                    <p className="text-sm font-semibold text-fg" lang="ja">
                      {currentGrammar.rightVsWrong.wrongSentence}
                    </p>
                    <p className="text-xs text-muted">{currentGrammar.rightVsWrong.wrongReason}</p>
                  </div>
                </div>

                {currentGrammar.confusableItems.length > 1 && (
                  <div className="space-y-1.5 rounded-xl border border-line bg-surface-2/60 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-fg">
                      <Scale className="size-3.5 text-primary-fg" aria-hidden />
                      {currentGrammar.confusableTitle}
                    </p>
                    {currentGrammar.confusableItems.map((item, idx) => (
                      <p key={idx} className="text-xs leading-relaxed text-muted">
                        <strong className="text-primary-fg" lang="ja">
                          {item.pattern}
                        </strong>{' '}
                        <span className="text-fg">({item.meaning}):</span> {item.nuance}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ==================== 100% RETRY-UNTIL-CORRECT QUIZ ==================== */}
      {phase === 'quiz' && currentQuestion && currentEntry && (
        <div className="space-y-4">
          <Card padding="md" className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-fg tabular">
                  Đã chinh phục: {masteredIds.length}/{activeQuestions.length} câu (Cần 100%)
                </span>
                {remainingUnmastered > 0 && (
                  <Badge tone="neutral" className="tabular">
                    Còn {remainingUnmastered} câu
                  </Badge>
                )}
                {currentEntry.isRetry && (
                  <Badge tone="warning">
                    <RotateCcw className="size-3" aria-hidden />
                    Làm lại câu vừa sai
                  </Badge>
                )}
              </div>
              <span className="hidden items-center gap-1 text-muted sm:flex">
                Phím tắt: <Kbd>1–{currentQuestion.options.length}</Kbd> chọn · <Kbd>Enter</Kbd> tiếp
              </span>
            </div>
            <ProgressBar
              value={masteredIds.length}
              max={Math.max(1, activeQuestions.length)}
              tone={masteredIds.length === activeQuestions.length ? 'success' : 'primary'}
              size="sm"
              label="Tiến độ đạt 100%"
            />
          </Card>

          {sessionMode === 'briefing' && briefing.grammarItems.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowTipsPeek((v) => !v)}
                className="cursor-pointer text-xs font-semibold text-primary-fg underline decoration-primary/40 underline-offset-2 hover:opacity-80"
              >
                {showTipsPeek ? 'Ẩn gợi ý Tips bài đọc' : '📖 Mở nhanh Tips & Dấu hiệu vừa đọc'}
              </button>
              {showTipsPeek && (
                <Card padding="sm" className="mt-2 space-y-2 border-primary/30 bg-surface-2/80">
                  {briefing.grammarItems.map((g) => (
                    <div key={g.id} className="text-xs leading-relaxed">
                      <strong className="text-primary-fg" lang="ja">
                        {g.name}
                      </strong>{' '}
                      <span className="text-fg">— {g.meaning}.</span>{' '}
                      <span className="text-muted">{g.memoryTip}</span>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          )}

          <Card padding="lg" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="neutral" className="tabular">
                  Lượt {queueIdx + 1}/{queue.length}
                </Badge>
                <Badge tone="primary">{currentQuestion.category}</Badge>
                {currentEntry.isRetry && <Badge tone="sakura">🔁 Ôn lại cho tới khi đúng</Badge>}
              </div>
              {isJumpMode && (
                <Badge tone="sakura">
                  <FastForward className="size-3" aria-hidden />
                  Thi nhảy cóc
                </Badge>
              )}
            </div>

            <p className="text-base font-bold leading-relaxed text-fg sm:text-lg" lang="ja">
              {currentQuestion.prompt}
            </p>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {currentQuestion.options.map((opt, idx) => {
                const isPicked = selectedOption === idx;
                const isRightOption = idx === currentQuestion.correctIndex;
                const showCorrect = isAnswered && isRightOption;
                const showWrong = isAnswered && isPicked && !isRightOption;

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
                      <span
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-md border text-xs font-bold',
                          showCorrect
                            ? 'border-success-line bg-surface text-success-fg'
                            : showWrong
                              ? 'border-danger-line bg-surface text-danger-fg'
                              : 'border-line bg-surface text-muted',
                        )}
                      >
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
              <div className="space-y-3 pt-1">
                <Notice tone={isCurrentCorrect ? 'success' : 'warning'}>
                  <p className="font-bold">
                    {isCurrentCorrect
                      ? currentEntry.isRetry
                        ? '✓ Chính xác! Bạn đã sửa thành công câu sai này.'
                        : '✓ Chính xác!'
                      : '× Chưa chính xác — Câu này đã được đưa về cuối bài để làm lại tới khi đúng 100%!'}
                  </p>
                  <p className="mt-1 leading-relaxed">{currentQuestion.explanation}</p>
                  {!isCurrentCorrect && currentQuestion.reviewHint && (
                    <p className="mt-1.5 font-semibold">
                      💡 Gợi ý ôn lại: {currentQuestion.reviewHint}
                    </p>
                  )}
                </Notice>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    rightIcon={<ArrowRight className="size-4" aria-hidden />}
                    onClick={handleAdvance}
                  >
                    {queueIdx + 1 >= queue.length
                      ? 'Hoàn thành 100% bài học'
                      : 'Câu tiếp theo'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ==================== 100% COMPLETION ==================== */}
      {phase === 'done' && (
        <Card padding="lg" className="space-y-5 border-success-line bg-success-soft/20 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-soft text-success-fg">
            <Trophy className="size-7" aria-hidden />
          </div>

          <div className="space-y-1.5">
            <Badge tone="success" className="px-3 py-1 text-xs">
              <Sparkles className="size-3.5" aria-hidden />
              Đạt chuẩn 100% ({activeQuestions.length}/{activeQuestions.length} câu)
            </Badge>
            <h2 className="text-xl font-bold text-fg">
              {sessionMode === 'briefing'
                ? `Đã chốt hiểu 100% Ngữ pháp & Dấu hiệu Màn ${stage.stageNumber}!`
                : isJumpMode
                  ? `Vượt Thi nhảy cóc 100% — Mở khóa ngay Màn ${stage.stageNumber}!`
                  : `Xuất sắc! Chốt Màn ${stage.stageNumber} đạt 100%!`}
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted">
              {missedIds.length > 0
                ? `Bạn đã sửa thành công toàn bộ ${missedIds.length} câu làm sai cho tới khi đúng 100%.`
                : 'Tuyệt vời! Bạn trả lời đúng 100% ngay từ lần đầu tiên không sai câu nào.'}
            </p>
          </div>

          <div className="mx-auto grid max-w-md grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="text-lg font-bold text-success-fg tabular">100%</p>
              <p className="text-[11px] text-muted">Hoàn thành</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="text-lg font-bold text-fg tabular">{firstTryPct}%</p>
              <p className="text-[11px] text-muted">Đúng lần đầu</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="text-lg font-bold text-primary-fg tabular">{totalAttempts}</p>
              <p className="text-[11px] text-muted">Tổng lượt trả lời</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <Button
              type="button"
              variant="secondary"
              leftIcon={<RotateCcw className="size-4" aria-hidden />}
              onClick={handleRestartQuiz}
            >
              Luyện lại lần nữa
            </Button>
            <Button
              type="button"
              variant="primary"
              rightIcon={<ArrowRight className="size-4" aria-hidden />}
              onClick={() => navigate(returnToRoadmapUrl)}
            >
              {sessionMode === 'briefing'
                ? 'Quay lại Lộ trình & mở Chặng 3'
                : `Quay lại Lộ trình · Mở khóa Màn ${stage.stageNumber + 1}`}
            </Button>
          </div>
        </Card>
      )}
    </MokumokuSessionShell>
  );
};
