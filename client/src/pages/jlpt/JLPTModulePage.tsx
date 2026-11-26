import { getSkzListeningSection, SKZ_LISTENING_SECTION_TITLES } from '../../data/jlpt/skzListening';
import { getSkzReadingPart, SKZ_READING_PART_TITLES } from '../../data/jlpt/skzReading';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Chip,
  Select,
  EmptyState,
  ErrorState,
  Kbd,
  Notice,
  PageContainer,
  PageHeader,
  ProgressBar,
  Stat,
  buttonStyles,
} from '../../components/ui';
import { AudioSpeechPlayer, ListeningTranscriptPanel } from '../../components/jlpt/AudioSpeechPlayer';
import { JlptFullTestView } from '../../components/jlpt/JlptFullTestView';
import { JlptReadingView, type JlptMistakePayload } from '../../components/jlpt/JlptReadingView';
import { McqQuestionBlock } from '../../components/jlpt/McqQuestionBlock';
import { StarQuestionComp } from '../../components/practice/StarQuestionComp';
import {
  JLPT_MODULES,
  toStarQuestionShape,
  type JLPTLevelFilter,
  type JLPTModuleId,
  type JLPTModuleMeta,
} from '../../data/jlpt/jlptDataset';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import {
  getLiveJlptListeningItems,
  getLiveJlptMcqQuestions,
  getLiveJlptReadingPassages,
  getLiveJlptStarQuestions,
} from '../../services/curriculumStore';
import { useAuth } from '../../context/auth-context';
import { clearAttemptMistakeGroup } from '../../services/attemptMistakeService';
import { markJlptItemDone, useJlptDone } from '../../services/jlptProgressService';
import { saveLastPracticeTarget } from '../../services/lastPracticeService';
import { recordQuizAttempt } from '../../services/quizHistoryService';
import { useAppDispatch } from '../../store/hooks';
import { addMistake } from '../../store/slices/mistakeSlice';
import { shuffleArray } from '../../utils/shuffle';
import {
  getListeningSituation,
  getReadingSituation,
  SITUATION_TAGS,
} from '../../data/jlpt/situationPackUtils';

const OTHER_TOPIC = 'Chủ đề khác';

const LEVEL_OPTIONS: Array<{ value: JLPTLevelFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
];

const COUNT_OPTIONS = [5, 10, 15, 0] as const;

export const JLPTModulePage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();

  const meta =
    moduleId && moduleId in JLPT_MODULES ? JLPT_MODULES[moduleId as JLPTModuleId] : undefined;

  if (!meta) {
    return (
      <PageContainer size="md">
        <ErrorState
          title="Không tìm thấy dạng bài JLPT"
          description="Liên kết luyện đề không tồn tại hoặc đã thay đổi."
          onRetry={() => navigate('/')}
          retryLabel="Quay về Trang chủ"
        />
      </PageContainer>
    );
  }

  return <JLPTModuleContent key={meta.id} meta={meta} />;
};

const JLPTModuleContent: React.FC<{ meta: JLPTModuleMeta }> = ({ meta }) => {
  const dispatch = useAppDispatch();
  const { user, studyLevel } = useAuth();
  const doneIds = useJlptDone(user?.id);
  const [searchParams] = useSearchParams();
  const retryAttemptId = searchParams.get('retryAttemptId')?.trim() || undefined;
  const sessionStartRef = useRef<number>(0);
  const sessionMistakesRef = useRef<Array<Record<string, unknown>>>([]);

  const lessonParam = Math.max(0, Number(searchParams.get('lesson')) || 0);
  const limitParam = Math.max(0, Number(searchParams.get('limit')) || 0);
  const [ignoreLessonScope, setIgnoreLessonScope] = useState(false);
  const activeLesson = !ignoreLessonScope && lessonParam > 0 ? lessonParam : 0;

  const [levelFilter, setLevelFilter] = useState<JLPTLevelFilter>(() => {
    const raw = (searchParams.get('level') || '').toUpperCase();
    if (raw === 'N5' || raw === 'N4' || raw === 'N3') return raw;
    if (studyLevel === 'N5' || studyLevel === 'N4' || studyLevel === 'N3') return studyLevel;
    return 'ALL';
  });
  const [questionLimit, setQuestionLimit] = useState<number>(() =>
    limitParam > 0 ? limitParam : 5,
  );
  const [sessionSeed, setSessionSeed] = useState<number>(0);

  useEffect(() => {
    sessionStartRef.current = Date.now();
    sessionMistakesRef.current = [];
    const qs = levelFilter !== 'ALL' ? `?level=${levelFilter}` : '';
    saveLastPracticeTarget(
      {
        path: `/jlpt/${meta.id}${qs}`,
        label: levelFilter !== 'ALL' ? `${meta.title} · ${levelFilter}` : meta.title,
        level: levelFilter !== 'ALL' ? levelFilter : undefined,
        quizType: meta.id === 'full-test' ? 'jlpt-full' : `jlpt-${meta.id}`,
      },
      user?.id,
    );
  }, [meta.id, meta.title, levelFilter, user?.id]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const [selectedMcqIdx, setSelectedMcqIdx] = useState<number | null>(null);
  const [starResult, setStarResult] = useState<{
    answer: string;
    isCorrect: boolean;
    feedbackMsg?: string;
  } | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);
  const [activeListeningLineIdx, setActiveListeningLineIdx] = useState<number | null>(null);
  const [playLineRequest, setPlayLineRequest] = useState<{ idx: number; nonce: number } | null>(null);

  const resetSequentialSession = useCallback(() => {
    sessionStartRef.current = Date.now();
    sessionMistakesRef.current = [];
    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setFinished(false);
    setSelectedMcqIdx(null);
    setStarResult(null);
    setShowTranscript(false);
    setActiveListeningLineIdx(null);
    setPlayLineRequest(null);
  }, []);

  const handleLevelChange = (nextLevel: JLPTLevelFilter) => {
    setFilterSnapshot({ reading: [...doneIds.reading], listening: [...doneIds.listening] });
    setLevelFilter(nextLevel);
    resetSequentialSession();
  };

  const handleCountChange = (nextLimit: number) => {
    setQuestionLimit(nextLimit);
    resetSequentialSession();
  };

  const handleReshuffle = () => {
    setFilterSnapshot({ reading: [...doneIds.reading], listening: [...doneIds.listening] });
    setSessionSeed((s) => s + 1);
    resetSequentialSession();
  };

  const recordJlptMistake = useCallback(
    (payload: JlptMistakePayload) => {
      const mistakeId = `${payload.grammarId}_${payload.questionId}_${Date.now()}_${sessionMistakesRef.current.length}`;
      sessionMistakesRef.current.push({
        id: mistakeId,
        grammarId: payload.grammarId,
        questionId: payload.questionId,
        prompt: payload.prompt,
        userAnswer: payload.userAnswer,
        correctAnswer: payload.correctAnswer,
        explanation: payload.explanation,
        options: payload.options,
        level: payload.level,
        categoryLabel: payload.categoryLabel,
        practicePath: payload.practicePath,
      });
      dispatch(
        addMistake({
          id: mistakeId,
          grammarId: payload.grammarId,
          questionId: payload.questionId,
          userAnswer: payload.userAnswer,
          correctAnswer: payload.correctAnswer,
          errorType: payload.errorType,
          createdAt: new Date().toISOString(),
          prompt: payload.prompt,
          categoryLabel: payload.categoryLabel,
          practicePath: payload.practicePath,
          explanation: payload.explanation,
          level: payload.level,
          options: payload.options,
        }),
      );
    },
    [dispatch],
  );

  const cmsSnapshot = useCurriculumSnapshot();

  const sliceForDailyLesson = useCallback(<T,>(items: T[], lessonNum: number, count: number): T[] => {
    if (items.length === 0) return [];
    const effCount = count > 0 ? Math.min(count, items.length) : items.length;
    const startIdx = ((lessonNum - 1) * effCount) % items.length;
    const result: T[] = [];
    for (let i = 0; i < effCount; i += 1) {
      result.push(items[(startIdx + i) % items.length]);
    }
    return result;
  }, []);

  const mcqItems = useMemo(() => {
    if (meta.id !== 'kanji' && meta.id !== 'vocab' && meta.id !== 'grammar') return [];
    const raw = getLiveJlptMcqQuestions(cmsSnapshot, meta.id, levelFilter);
    if (activeLesson > 0 && sessionSeed === 0) {
      return sliceForDailyLesson(raw, activeLesson, questionLimit);
    }
    void sessionSeed;
    const pool = shuffleArray(raw);
    return questionLimit > 0 ? pool.slice(0, questionLimit) : pool;
  }, [activeLesson, cmsSnapshot, levelFilter, meta.id, questionLimit, sessionSeed, sliceForDailyLesson]);

  const starItems = useMemo(() => {
    if (meta.id !== 'star') return [];
    const raw = getLiveJlptStarQuestions(cmsSnapshot, levelFilter);
    if (activeLesson > 0 && sessionSeed === 0) {
      return sliceForDailyLesson(raw, activeLesson, questionLimit);
    }
    void sessionSeed;
    const pool = shuffleArray(raw);
    return questionLimit > 0 ? pool.slice(0, questionLimit) : pool;
  }, [activeLesson, cmsSnapshot, levelFilter, meta.id, questionLimit, sessionSeed, sliceForDailyLesson]);

  // ?topic=… preselects a topic (links from roadmap sessions)
  const [situationFilter, setSituationFilter] = useState<string>(() => searchParams.get('topic') ?? 'all');
  const [doneFilter, setDoneFilter] = useState<'all' | 'todo' | 'done'>('all');
  // Snapshot of done IDs taken when switching filter / reshuffling so answering an item in
  // "Chưa làm" mode adds the ✓ badge without yanking the active item away mid-review.
  const [filterSnapshot, setFilterSnapshot] = useState<{ reading: string[]; listening: string[] }>(
    () => ({ reading: [], listening: [] }),
  );

  const handleDoneFilterChange = (next: 'all' | 'todo' | 'done') => {
    setFilterSnapshot({ reading: [...doneIds.reading], listening: [...doneIds.listening] });
    setDoneFilter(next);
    resetSequentialSession();
  };

  // Situations available for the current module & level (only the situation packs carry one)
  const availableSituations = useMemo(() => {
    let tags: Array<string | null> = [];
    if (meta.id === 'reading-short' || meta.id === 'reading-medium' || meta.id === 'reading-long') {
      tags = getLiveJlptReadingPassages(cmsSnapshot, meta.id, levelFilter).map(getReadingSituation);
    } else if (meta.id === 'listening') {
      tags = getLiveJlptListeningItems(cmsSnapshot, levelFilter).map(getListeningSituation);
    }
    const topics: string[] = SITUATION_TAGS.filter((tag) => tags.includes(tag));
    // Listening items without a topic tag stay reachable under "Chủ đề khác"
    if (meta.id === 'listening' && topics.length > 0 && tags.includes(null)) topics.push(OTHER_TOPIC);
    return topics;
  }, [cmsSnapshot, levelFilter, meta.id]);
  const activeSituation = availableSituations.some((t) => t === situationFilter) ? situationFilter : 'all';

  // Shin Kanzen N3 読解 parts available in this module
  const [readingLessonFilter, setReadingLessonFilter] = useState<number | 'all'>('all');
  const availableReadingLessons = useMemo(() => {
    if (levelFilter !== 'N3') return [];
    if (meta.id !== 'reading-short' && meta.id !== 'reading-medium' && meta.id !== 'reading-long') return [];
    const set = new Set<number>();
    for (const p of getLiveJlptReadingPassages(cmsSnapshot, meta.id, levelFilter)) {
      const n = getSkzReadingPart(p);
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [cmsSnapshot, levelFilter, meta.id]);
  const activeReadingLesson =
    readingLessonFilter !== 'all' && availableReadingLessons.includes(readingLessonFilter)
      ? readingLessonFilter
      : 'all';

  const allScopedReading = useMemo(() => {
    if (
      meta.id !== 'reading-short' &&
      meta.id !== 'reading-medium' &&
      meta.id !== 'reading-long'
    ) {
      return [];
    }
    const all = getLiveJlptReadingPassages(cmsSnapshot, meta.id, levelFilter);
    return all.filter(
      (p) =>
        (activeSituation === 'all' || getReadingSituation(p) === activeSituation) &&
        (activeReadingLesson === 'all' || getSkzReadingPart(p) === activeReadingLesson),
    );
  }, [activeReadingLesson, activeSituation, cmsSnapshot, levelFilter, meta.id]);

  const readingPassages = useMemo(() => {
    if (allScopedReading.length === 0) return [];
    if (activeLesson > 0) {
      return [allScopedReading[(activeLesson - 1) % allScopedReading.length]];
    }
    if (doneFilter === 'todo') {
      return allScopedReading.filter((p) => !filterSnapshot.reading.includes(p.id));
    }
    if (doneFilter === 'done') {
      return allScopedReading.filter((p) => filterSnapshot.reading.includes(p.id));
    }
    return allScopedReading;
  }, [activeLesson, allScopedReading, doneFilter, filterSnapshot.reading]);

  // Shin Kanzen N3 聴解 sections
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const availableSections = useMemo(() => {
    if (meta.id !== 'listening' || levelFilter !== 'N3') return [];
    const set = new Set<string>();
    for (const item of getLiveJlptListeningItems(cmsSnapshot, levelFilter)) {
      const sec = getSkzListeningSection(item);
      if (sec) set.add(sec);
    }
    return Array.from(set).sort();
  }, [cmsSnapshot, levelFilter, meta.id]);
  const activeSection = availableSections.includes(sectionFilter) ? sectionFilter : 'all';

  const allScopedListening = useMemo(() => {
    if (meta.id !== 'listening') return [];
    const all = getLiveJlptListeningItems(cmsSnapshot, levelFilter);
    return all.filter(
      (i) =>
        (activeSituation === 'all' || (getListeningSituation(i) ?? OTHER_TOPIC) === activeSituation) &&
        (activeSection === 'all' || getSkzListeningSection(i) === activeSection),
    );
  }, [activeSection, activeSituation, cmsSnapshot, levelFilter, meta.id]);

  const listeningItems = useMemo(() => {
    if (allScopedListening.length === 0) return [];
    if (activeLesson > 0 && sessionSeed === 0) {
      return sliceForDailyLesson(allScopedListening, activeLesson, questionLimit);
    }
    const filtered =
      doneFilter === 'todo'
        ? allScopedListening.filter((i) => !filterSnapshot.listening.includes(i.id))
        : doneFilter === 'done'
          ? allScopedListening.filter((i) => filterSnapshot.listening.includes(i.id))
          : allScopedListening;
    void sessionSeed;
    // Listening plays every item of the current filters (lesson / situation / done) — no count picker
    return shuffleArray(filtered);
  }, [activeLesson, allScopedListening, doneFilter, filterSnapshot.listening, questionLimit, sessionSeed, sliceForDailyLesson]);

  const progressSummary = useMemo(() => {
    if (meta.id === 'reading-short' || meta.id === 'reading-medium' || meta.id === 'reading-long') {
      const doneCount = allScopedReading.filter((p) => doneIds.reading.includes(p.id)).length;
      return { kindLabel: 'bài đọc', doneCount, total: allScopedReading.length };
    }
    if (meta.id === 'listening') {
      const doneCount = allScopedListening.filter((i) => doneIds.listening.includes(i.id)).length;
      return { kindLabel: 'bài nghe', doneCount, total: allScopedListening.length };
    }
    return null;
  }, [allScopedListening, allScopedReading, doneIds.listening, doneIds.reading, meta.id]);

  const isMcqMode = meta.id === 'kanji' || meta.id === 'vocab' || meta.id === 'grammar';
  const isStarMode = meta.id === 'star';
  const isReadingMode =
    meta.id === 'reading-short' ||
    meta.id === 'reading-medium' ||
    meta.id === 'reading-long';
  const isListeningMode = meta.id === 'listening';
  const isFullTestMode = meta.id === 'full-test';

  const sequentialTotal = isMcqMode
    ? mcqItems.length
    : isStarMode
      ? starItems.length
      : isListeningMode
        ? listeningItems.length
        : 0;

  const hasAnsweredCurrent =
    isMcqMode || isListeningMode
      ? selectedMcqIdx !== null
      : isStarMode
        ? starResult !== null
        : false;

  const handleAdvance = useCallback(() => {
    if (currentIndex >= sequentialTotal - 1) {
      const durationSeconds =
        sessionStartRef.current > 0
          ? Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000))
          : 0;
      void recordQuizAttempt(
        {
          quizType: `jlpt-${meta.id}`,
          level: levelFilter,
          score: correctCount,
          totalQuestions: Math.max(1, sequentialTotal),
          durationSeconds,
          mistakesJson: [...sessionMistakesRef.current],
        },
        user?.id,
      ).then(() => {
        if (retryAttemptId) {
          clearAttemptMistakeGroup(retryAttemptId, user?.id);
        }
      });
      setFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedMcqIdx(null);
      setStarResult(null);
      setShowTranscript(false);
      setActiveListeningLineIdx(null);
      setPlayLineRequest(null);
    }
  }, [currentIndex, sequentialTotal, meta.id, levelFilter, correctCount, user?.id, retryAttemptId]);

  useEffect(() => {
    if (!hasAnsweredCurrent || finished) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasAnsweredCurrent, finished, handleAdvance]);

  const containerSize = isReadingMode || isFullTestMode ? 'lg' : 'md';

  return (
    <PageContainer size={containerSize}>
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: meta.title },
        ]}
        title={
          <span className="flex items-center gap-3">
            <span
              lang="ja"
              aria-hidden
              className="grid size-10 place-items-center rounded-xl bg-primary-soft text-lg font-bold text-primary-fg"
            >
              {meta.glyph}
            </span>
            <span>{meta.title}</span>
          </span>
        }
      />

      {activeLesson > 0 && (
        <Card padding="sm" className="mb-4 flex flex-wrap items-center justify-between gap-2 border-primary/50 bg-primary-soft/35">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <Badge tone="primary">Nhiệm vụ hôm nay · Bài {activeLesson}</Badge>
            <span className="font-medium text-fg">
              {isReadingMode
                ? `Đang mở riêng Bài đọc số ${activeLesson} (${levelFilter})`
                : `Đang lọc riêng ${sequentialTotal} câu bài tập của Bài ${activeLesson} (${levelFilter})`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/roadmap"
              className={buttonStyles({ variant: 'soft', size: 'sm' })}
            >
              ← Về Bản đồ Màn
            </Link>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIgnoreLessonScope(true);
                setQuestionLimit(5);
                resetSequentialSession();
              }}
            >
              Mở toàn bộ kho đề {levelFilter}
            </Button>
          </div>
        </Card>
      )}

      {/* the full test groups its papers by level itself */}
      {!isFullTestMode && (
      <Card tone="muted" padding="sm" className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">Cấp độ:</span>
            {LEVEL_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                selected={levelFilter === opt.value}
                onClick={() => handleLevelChange(opt.value)}
              >
                {opt.label}
              </Chip>
            ))}
          </div>

          {(isMcqMode || isStarMode || isListeningMode) && (
            <div className="flex flex-wrap items-center gap-2">
              {!isListeningMode && (
                <span className="text-xs font-semibold tracking-wide text-muted uppercase">Số câu:</span>
              )}
              {!isListeningMode && COUNT_OPTIONS.map((cnt) => (
                <Chip
                  key={cnt}
                  selected={questionLimit === cnt}
                  onClick={() => handleCountChange(cnt)}
                >
                  {cnt === 0 ? 'Tất cả' : `${cnt} câu`}
                </Chip>
              ))}

              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw className="size-3.5" aria-hidden />}
                onClick={handleReshuffle}
              >
                Đổi đề
              </Button>
            </div>
          )}
        </div>
      </Card>
      )}

      {(availableSections.length > 0 ||
        availableReadingLessons.length > 0 ||
        availableSituations.length > 0) && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {availableReadingLessons.length > 0 && (
            <Select
              aria-label="Lọc theo dạng bài đọc"
              value={String(activeReadingLesson)}
              wrapperClassName="w-full"
              className="w-full"
              onChange={(e) => {
                setReadingLessonFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
                resetSequentialSession();
              }}
            >
              <option value="all">Dạng bài đọc: tất cả</option>
              {availableReadingLessons.map((n) => (
                <option key={n} value={n}>
                  {SKZ_READING_PART_TITLES[n]}
                </option>
              ))}
            </Select>
          )}
          {availableSections.length > 0 && (
            <Select
              aria-label="Lọc theo dạng bài nghe"
              value={activeSection}
              wrapperClassName="w-full"
              className="w-full"
              onChange={(e) => {
                setSectionFilter(e.target.value);
                resetSequentialSession();
              }}
            >
              <option value="all">Dạng bài nghe: tất cả</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  {SKZ_LISTENING_SECTION_TITLES[sec] ?? sec}
                </option>
              ))}
            </Select>
          )}
          {availableSituations.length > 0 && (
            <Select
              aria-label="Lọc theo chủ đề"
              value={activeSituation}
              wrapperClassName="w-full"
              className="w-full"
              onChange={(e) => {
                setSituationFilter(e.target.value);
                resetSequentialSession();
              }}
            >
              <option value="all">Chủ đề: tất cả</option>
              {availableSituations.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}

      {progressSummary && progressSummary.total > 0 && activeLesson === 0 && (
        <Card padding="sm" className="mb-4 space-y-2.5 border-line bg-surface-2/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="font-semibold text-fg tabular">
                Tiến độ: {progressSummary.doneCount}/{progressSummary.total} {progressSummary.kindLabel} đã làm
              </span>
              {progressSummary.doneCount === progressSummary.total && (
                <Badge tone="success">✓ Hoàn thành toàn bộ</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip selected={doneFilter === 'all'} onClick={() => handleDoneFilterChange('all')}>
                Tất cả ({progressSummary.total})
              </Chip>
              <Chip selected={doneFilter === 'todo'} onClick={() => handleDoneFilterChange('todo')}>
                Chưa làm ({Math.max(0, progressSummary.total - progressSummary.doneCount)})
              </Chip>
              <Chip selected={doneFilter === 'done'} onClick={() => handleDoneFilterChange('done')}>
                ✓ Đã làm ({progressSummary.doneCount})
              </Chip>
            </div>
          </div>
          <ProgressBar
            value={progressSummary.doneCount}
            max={progressSummary.total}
            tone={progressSummary.doneCount === progressSummary.total ? 'success' : 'primary'}
            size="sm"
            label={`Tiến độ ${progressSummary.kindLabel}`}
          />
        </Card>
      )}

      {isReadingMode && (
        <JlptReadingView
          key={`${meta.id}-${levelFilter}-${activeSituation}-${doneFilter}`}
          passages={readingPassages}
          moduleMeta={meta}
          retryAttemptId={retryAttemptId}
          onRecordMistake={recordJlptMistake}
        />
      )}

      {isFullTestMode && (
        <JlptFullTestView
          levelFilter={levelFilter}
          retryAttemptId={retryAttemptId}
          onRecordMistake={recordJlptMistake}
        />
      )}

      {(isMcqMode || isStarMode || isListeningMode) && (
        <>
          {sequentialTotal === 0 ? (
            <EmptyState
              title="Chưa có câu hỏi phù hợp"
              description="Hãy thử đổi cấp độ hoặc chọn 'Tất cả' để luyện tập."
            />
          ) : finished ? (
            <Card padding="lg" className="mx-auto max-w-2xl space-y-6 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-fg">
                <Trophy className="size-8" aria-hidden />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-fg">Hoàn thành {meta.title}!</h2>
                <p className="text-sm text-muted">
                  Bạn đã hoàn thành {sequentialTotal} câu hỏi ({levelFilter === 'ALL' ? 'Tổng hợp' : levelFilter}).
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface-2 p-3 text-center sm:gap-4 sm:p-4 sm:text-left">
                <Stat label="Đúng" value={correctCount} />
                <Stat label="Sai" value={wrongCount} />
                <Stat
                  label="Chính xác"
                  value={`${Math.round((correctCount / Math.max(1, sequentialTotal)) * 100)}%`}
                />
              </div>

              {wrongCount > 0 && (
                <Notice tone="info" title="Câu sai đã được tự động lưu lại">
                  Các câu làm sai đã được lưu vào mục <strong>Câu sai cần ôn</strong> trên Trang chủ để bạn ôn tập lại bất cứ lúc nào.
                </Notice>
              )}

              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to="/roadmap"
                  className={buttonStyles({ variant: 'primary', size: 'lg' })}
                >
                  ← Về Bản đồ Màn
                </Link>
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<RotateCcw className="size-4" aria-hidden />}
                  onClick={handleReshuffle}
                >
                  Luyện đề mới
                </Button>
                {wrongCount > 0 && (
                  <Link
                    to="/grammar/mistakes"
                    className={buttonStyles({ variant: 'secondary', size: 'lg' })}
                  >
                    Xem câu sai đã lưu
                  </Link>
                )}
              </div>
            </Card>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2.5 rounded-xl border border-line bg-glass p-3.5 shadow-card backdrop-blur-md">
                {sequentialTotal > 12 && (
                  <div className="flex items-center gap-2 border-b border-line pb-2.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={currentIndex === 0}
                      aria-label="Bài trước"
                      onClick={() => {
                        setCurrentIndex((i) => Math.max(0, i - 1));
                        setSelectedMcqIdx(null);
                        setStarResult(null);
                        setShowTranscript(false);
                      }}
                    >
                      ←
                    </Button>
                    <Select
                      aria-label="Chọn bài"
                      value={String(currentIndex)}
                      wrapperClassName="min-w-0 flex-1"
                      className="w-full"
                      onChange={(e) => {
                        setCurrentIndex(Number(e.target.value));
                        setSelectedMcqIdx(null);
                        setStarResult(null);
                        setShowTranscript(false);
                      }}
                    >
                      {Array.from({ length: sequentialTotal }).map((_, idx) => {
                        const done =
                          isListeningMode &&
                          listeningItems[idx] &&
                          doneIds.listening.includes(listeningItems[idx].id);
                        return (
                          <option key={idx} value={idx}>
                            {done ? '✓ ' : ''}
                            {isListeningMode ? `Hội thoại ${idx + 1}` : `Câu ${idx + 1}`}
                            {isListeningMode && listeningItems[idx] ? ` · ${listeningItems[idx].situation}` : ''}
                          </option>
                        );
                      })}
                    </Select>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={currentIndex >= sequentialTotal - 1}
                      aria-label="Bài sau"
                      onClick={() => {
                        setCurrentIndex((i) => Math.min(sequentialTotal - 1, i + 1));
                        setSelectedMcqIdx(null);
                        setStarResult(null);
                        setShowTranscript(false);
                      }}
                    >
                      →
                    </Button>
                  </div>
                )}
                {sequentialTotal > 1 && sequentialTotal <= 12 && (
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-2.5">
                    <span className="mr-1 text-xs font-bold text-primary-fg">
                      📖 Mục lục bài ({sequentialTotal}):
                    </span>
                    {Array.from({ length: sequentialTotal }).map((_, idx) => {
                      const listeningDone =
                        isListeningMode &&
                        listeningItems[idx] &&
                        doneIds.listening.includes(listeningItems[idx].id);
                      return (
                        <Chip
                          key={idx}
                          selected={idx === currentIndex}
                          onClick={() => {
                            setCurrentIndex(idx);
                            setSelectedMcqIdx(null);
                            setStarResult(null);
                            setShowTranscript(false);
                          }}
                        >
                          {isListeningMode
                            ? `${listeningDone ? '✓ ' : ''}Hội thoại ${idx + 1}`
                            : `Câu ${idx + 1}`}
                        </Chip>
                      );
                    })}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-fg tabular">
                    {isListeningMode ? `Bài nghe ${currentIndex + 1}` : `Câu ${currentIndex + 1}`} / {sequentialTotal}
                  </span>
                  <div className="flex items-center gap-3 tabular">
                    <span className="font-medium text-success-fg">Đúng: {correctCount}</span>
                    <span className="font-medium text-danger-fg">Sai: {wrongCount}</span>
                  </div>
                </div>
                <ProgressBar
                  value={currentIndex + (hasAnsweredCurrent ? 1 : 0)}
                  max={sequentialTotal}
                  label="Tiến độ luyện tập JLPT"
                  size="sm"
                />
              </div>

              <Card padding="lg" className="space-y-6">
                {isMcqMode && mcqItems[currentIndex] && (() => {
                  const q = mcqItems[currentIndex];
                  return (
                    <McqQuestionBlock
                      prompt={q.prompt}
                      options={q.options}
                      selectedIndex={selectedMcqIdx}
                      correctIndex={q.correctIndex}
                      revealResult={selectedMcqIdx !== null}
                      locked={selectedMcqIdx !== null}
                      explanation={q.explanation}
                      levelLabel={q.level}
                      mondaiLabel={q.mondaiLabel}
                      enableKeyboard
                      onSelect={(optIdx) => {
                        if (selectedMcqIdx !== null) return;
                        setSelectedMcqIdx(optIdx);
                        if (optIdx === q.correctIndex) {
                          setCorrectCount((c) => c + 1);
                        } else {
                          setWrongCount((w) => w + 1);
                          recordJlptMistake({
                            grammarId: meta.mistakeGrammarId,
                            questionId: q.id,
                            userAnswer: q.options[optIdx],
                            correctAnswer: q.options[q.correctIndex],
                            errorType: meta.errorType,
                            prompt: q.prompt,
                            categoryLabel: meta.categoryLabel,
                            practicePath: `/jlpt/${meta.id}?level=${q.level}`,
                            explanation: q.explanation,
                            level: q.level,
                            options: [...q.options],
                          });
                        }
                      }}
                    />
                  );
                })()}

                {isStarMode && starItems[currentIndex] && (() => {
                  const item = starItems[currentIndex];
                  const starQuestion = toStarQuestionShape(item);

                  return (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="primary">{item.level}</Badge>
                        <Badge tone="warning">
                          <Sparkles className="size-3" aria-hidden />
                          {item.mondaiLabel}
                        </Badge>
                      </div>

                      {!starResult ? (
                        <StarQuestionComp
                          key={`${item.id}-${sessionSeed}-${currentIndex}`}
                          mode="star_question"
                          question={starQuestion}
                          submitLabel="Kiểm tra đáp án ★"
                          onSubmit={(answer, isCorrect, feedbackMsg) => {
                            setStarResult({ answer, isCorrect, feedbackMsg });
                            if (isCorrect) {
                              setCorrectCount((c) => c + 1);
                            } else {
                              setWrongCount((w) => w + 1);
                              recordJlptMistake({
                                grammarId: meta.mistakeGrammarId,
                                questionId: item.id,
                                userAnswer: answer || '(chưa hoàn thành)',
                                correctAnswer: item.correctAnswer,
                                errorType: 'wrong_word_order',
                                prompt: item.fullSentence,
                                categoryLabel: meta.categoryLabel,
                                practicePath: '/jlpt/star',
                                explanation: item.explanation,
                                level: item.level,
                              });
                            }
                          }}
                        />
                      ) : (
                        <div
                          className={
                            starResult.isCorrect
                              ? 'space-y-3 rounded-xl border border-success-line bg-success-soft p-5'
                              : 'space-y-3 rounded-xl border border-danger-line bg-danger-soft p-5'
                          }
                        >
                          <p className="flex items-center gap-2 font-semibold">
                            {starResult.isCorrect ? (
                              <>
                                <CheckCircle2 className="size-5 text-success-fg" aria-hidden />
                                <span className="text-success-fg">
                                  Chính xác! Đáp án tại vị trí ★ là 「{item.correctAnswer}」
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="size-5 text-danger-fg" aria-hidden />
                                <span className="text-danger-fg">
                                  Chưa chính xác (Bạn chọn: 「{starResult.answer}」 · Đáp án đúng tại ★: 「
                                  {item.correctAnswer}」)
                                </span>
                              </>
                            )}
                          </p>
                          <div className="space-y-1 border-t border-line pt-3 text-sm">
                            <p lang="ja" className="text-base font-bold text-fg">
                              {item.fullSentence}
                            </p>
                            {item.meaning && <p className="text-muted">Dịch: {item.meaning}</p>}
                            <p className="pt-1 leading-relaxed text-fg">{item.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {isListeningMode && listeningItems[currentIndex] && (() => {
                  const item = listeningItems[currentIndex];
                  const transcriptVisible = showTranscript || selectedMcqIdx !== null;

                  return (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="primary">{item.level}</Badge>
                          <Badge tone="neutral">{item.mondaiLabel}</Badge>
                          {doneIds.listening.includes(item.id) && (
                            <Badge tone="success">✓ Đã làm</Badge>
                          )}
                        </div>
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => setShowTranscript((v) => !v)}
                        >
                          {transcriptVisible ? 'Ẩn Transcript' : 'Hiện Transcript'}
                        </Button>
                      </div>

                      <p className="text-sm text-muted">
                        <strong>Tình huống:</strong> {item.situation}
                      </p>

                      <AudioSpeechPlayer
                        key={`${item.id}-${sessionSeed}-${currentIndex}`}
                        dialogue={item.dialogue}
                        situation={item.situation}
                        questionPrompt={item.questionPrompt}
                        onActiveLineChange={setActiveListeningLineIdx}
                        playLineRequest={playLineRequest}
                      />

                      {transcriptVisible && (
                        <ListeningTranscriptPanel
                          dialogue={item.dialogue}
                          translation={item.translation}
                          showTranslation={true}
                          showFurigana={showFurigana}
                          onToggleFurigana={setShowFurigana}
                          situation={item.situation}
                          questionPrompt={item.questionPrompt}
                          activeLineIdx={activeListeningLineIdx}
                          onPlayLine={(lineIdx) =>
                            setPlayLineRequest((prev) => ({
                              idx: lineIdx,
                              nonce: (prev?.nonce ?? 0) + 1,
                            }))
                          }
                        />
                      )}

                      <McqQuestionBlock
                        prompt={item.questionPrompt}
                        options={item.options}
                        selectedIndex={selectedMcqIdx}
                        correctIndex={item.correctIndex}
                        revealResult={selectedMcqIdx !== null}
                        locked={selectedMcqIdx !== null}
                        explanation={item.explanation}
                        enableKeyboard
                        onSelect={(optIdx) => {
                          if (selectedMcqIdx !== null) return;
                          setSelectedMcqIdx(optIdx);
                          markJlptItemDone(user?.id, 'listening', item.id);
                          if (optIdx === item.correctIndex) {
                            setCorrectCount((c) => c + 1);
                          } else {
                            setWrongCount((w) => w + 1);
                            recordJlptMistake({
                              grammarId: meta.mistakeGrammarId,
                              questionId: item.id,
                              userAnswer: item.options[optIdx],
                              correctAnswer: item.options[item.correctIndex],
                              errorType: meta.errorType,
                              prompt: `${item.situation} — ${item.questionPrompt}`,
                              categoryLabel: meta.categoryLabel,
                              practicePath: `/jlpt/listening?level=${item.level}`,
                              explanation: item.explanation,
                              level: item.level,
                              options: [...item.options],
                            });
                          }
                        }}
                      />
                    </div>
                  );
                })()}

                {hasAnsweredCurrent && (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleAdvance}
                    rightIcon={<ArrowRight className="size-4" aria-hidden />}
                  >
                    {currentIndex >= sequentialTotal - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}
                    <Kbd className="hidden border-transparent bg-surface/20 text-on-primary md:inline-flex">
                      Enter
                    </Kbd>
                  </Button>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
};
