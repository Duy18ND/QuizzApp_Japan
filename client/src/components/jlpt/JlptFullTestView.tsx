import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Filter,
  Pause,
  Play,
  RotateCcw,
  Star,
  Volume2,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Chip,
  Notice,
  ProgressBar,
  Stat,
  Tabs,
  type TabItem,
} from '../ui';
import { cn } from '../../lib/cn';
import {
  EXAM_FORMAT_COUNTS,
  EXAM_FORMAT_META,
  EXAM_FORMAT_MINUTES,
  JLPT_MODULES,
  REAL_JLPT_EXAM_PRESETS,
  toStarQuestionShape,
  type ExamCounts,
  type ExamFormat,
  type JLPTLevelFilter,
  type RealJlptExamPreset,
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
import { recordQuizAttempt } from '../../services/quizHistoryService';
import { JLPT_EXAM_RESULTS_ITEM_ID } from '../../services/cloudProgressWriter';
import { isSupabaseAccountUuid } from '../../services/sessionScope';
import { supabase } from '../../services/supabaseClient';
import { shuffleArray } from '../../utils/shuffle';
import { speakJapaneseDialoguePreview } from '../../utils/tts';
import { StarQuestionComp } from '../practice/StarQuestionComp';
import { AudioSpeechPlayer, ListeningTranscriptPanel } from './AudioSpeechPlayer';
import { JlptReadingView, type JlptMistakePayload } from './JlptReadingView';
import { McqQuestionBlock } from './McqQuestionBlock';

type ExamSectionId = 's1' | 's2' | 's3' | 's4';

const ALL_SECTIONS: ExamSectionId[] = ['s1', 's2', 's3', 's4'];

const SECTION_META: Record<
  ExamSectionId,
  { shortLabel: string; label: string; minutes: number }
> = {
  s1: { shortLabel: 'Chữ Hán & Từ vựng', label: '1. Chữ Hán & Từ vựng', minutes: 10 },
  s2: { shortLabel: 'Ngữ pháp & Hái sao ★', label: '2. Ngữ pháp & Hái sao ★', minutes: 10 },
  s3: { shortLabel: 'Đọc hiểu', label: '3. Đọc hiểu', minutes: 12 },
  s4: { shortLabel: 'Nghe hiểu', label: '4. Nghe hiểu', minutes: 10 },
};

interface JlptFullTestViewProps {
  levelFilter: JLPTLevelFilter;
  retryAttemptId?: string;
  onRecordMistake: (payload: JlptMistakePayload) => void;
}

interface SavedExamResult {
  presetId: string;
  total180: number;
  passThreshold: number;
  isPassed: boolean;
  accuracyPct: number;
  completedAt: string;
}

/**
 * Best result per exam preset. Signed-in users: one reserved `user_progress` row
 * (`item_id = JLPT_EXAM_RESULTS_ITEM_ID`, payload in `metadata_json.examResults`), cached in memory.
 * Guests keep results for the current session only (guests never persist progress).
 */
const examResultsCache = new Map<string, Record<string, SavedExamResult>>();
const GUEST_EXAM_KEY = '__guest__';

function sanitizeExamResults(raw: unknown): Record<string, SavedExamResult> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, SavedExamResult> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const r = value as Partial<SavedExamResult> | null;
    if (r && typeof r.total180 === 'number' && typeof r.isPassed === 'boolean') {
      out[id] = {
        presetId: id,
        total180: r.total180,
        passThreshold: Number(r.passThreshold) || 0,
        isPassed: r.isPassed,
        accuracyPct: Number(r.accuracyPct) || 0,
        completedAt: typeof r.completedAt === 'string' ? r.completedAt : '',
      };
    }
  }
  return out;
}

async function loadExamResults(uid?: string | null): Promise<Record<string, SavedExamResult>> {
  if (!supabase || !isSupabaseAccountUuid(uid)) return examResultsCache.get(GUEST_EXAM_KEY) ?? {};
  const cached = examResultsCache.get(uid);
  if (cached) return cached;
  try {
    const { data } = await supabase
      .from('user_progress')
      .select('metadata_json')
      .eq('user_id', uid)
      .eq('item_type', 'mistake')
      .eq('item_id', JLPT_EXAM_RESULTS_ITEM_ID)
      .maybeSingle();
    const meta = (data?.metadata_json ?? null) as Record<string, unknown> | null;
    const results = sanitizeExamResults(meta?.examResults);
    examResultsCache.set(uid, results);
    return results;
  } catch {
    return {};
  }
}

async function saveExamResult(
  uid: string | null | undefined,
  result: SavedExamResult,
): Promise<Record<string, SavedExamResult>> {
  const current = await loadExamResults(uid);
  const prev = current[result.presetId];
  // Keep a previous PASS unless the new attempt also passes or scores higher
  const keepPrev = prev && prev.isPassed && !result.isPassed && prev.total180 > result.total180;
  const next: Record<string, SavedExamResult> = { ...current, [result.presetId]: keepPrev ? prev : result };

  if (!supabase || !isSupabaseAccountUuid(uid)) {
    examResultsCache.set(GUEST_EXAM_KEY, next);
    return next;
  }
  examResultsCache.set(uid, next);
  const { error } = await supabase.from('user_progress').upsert(
    {
      user_id: uid,
      item_type: 'mistake',
      item_id: JLPT_EXAM_RESULTS_ITEM_ID,
      status: 'learning',
      score: Object.values(next).filter((r) => r.isPassed).length,
      attempts: 0,
      starred: false,
      wrong_count: 0,
      metadata_json: { examResults: next },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,item_type,item_id' },
  );
  if (error) console.warn('Could not save JLPT exam result:', error.message);
  return next;
}

/** Deterministic seeded Fisher-Yates subset so each preset has a distinct, stable question set. */
function pickSeededSubset<T>(items: T[], count: number, seedNum: number): T[] {
  if (items.length === 0 || count <= 0) return [];
  const copy = [...items];
  let s = (seedNum + 1) * 2654435761;
  const nextRand = () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822519) + 3266489917) >>> 0;
    return s / 4294967296;
  };
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function computeSkillRank(correct: number, total: number): {
  grade: 'A' | 'B' | 'C';
  tone: 'success' | 'primary' | 'warning';
  pct: number;
} {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  if (pct >= 67) return { grade: 'A', tone: 'success', pct };
  if (pct >= 34) return { grade: 'B', tone: 'primary', pct };
  return { grade: 'C', tone: 'warning', pct };
}

export const JlptFullTestView: React.FC<JlptFullTestViewProps> = ({
  levelFilter,
  retryAttemptId,
  onRecordMistake,
}) => {
  const { user } = useAuth();
  const [attemptKey, setAttemptKey] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [selectedSections, setSelectedSections] = useState<ExamSectionId[]>([...ALL_SECTIONS]);
  const [savedResults, setSavedResults] = useState<Record<string, SavedExamResult>>({});
  useEffect(() => {
    let cancelled = false;
    void loadExamResults(user?.id).then((results) => {
      if (!cancelled) setSavedResults(results);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const [examFormat, setExamFormat] = useState<ExamFormat>('jlpt');
  const presetsOfLevel = useMemo(
    () =>
      REAL_JLPT_EXAM_PRESETS,
    [],
  );
  const availablePresets = useMemo(
    () => presetsOfLevel.filter((p) => (p.format ?? 'jlpt') === examFormat),
    [presetsOfLevel, examFormat],
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>('auto');
  // undefined = first group open, null = all closed
  const [openLevel, setOpenLevel] = useState<JLPTLevelFilter | null | undefined>(undefined);
  const examCounts: ExamCounts = EXAM_FORMAT_COUNTS[examFormat];
  const activePreset: RealJlptExamPreset | null = useMemo(() => {
    if (selectedPresetId === 'random') return null;
    const explicit = availablePresets.find((p) => p.id === selectedPresetId);
    // default paper: first one of the level the page was opened with
    return explicit ?? availablePresets.find((p) => p.level === levelFilter) ?? availablePresets[0] ?? null;
  }, [availablePresets, levelFilter, selectedPresetId]);

  const effectiveLevel: JLPTLevelFilter = activePreset ? activePreset.level : levelFilter;
  const isFull4Sections = selectedSections.length === 4;
  const computedDurationMinutes = useMemo(() => {
    if (isFull4Sections && activePreset) return activePreset.durationMinutes;
    const sectionSum = selectedSections.reduce((sum, sid) => sum + SECTION_META[sid].minutes, 0);
    const formatMinutes = EXAM_FORMAT_MINUTES[examFormat];
    if (!formatMinutes) return sectionSum;
    const full = formatMinutes[effectiveLevel === 'ALL' ? 'N4' : effectiveLevel];
    return isFull4Sections ? full : Math.max(5, Math.round((full * selectedSections.length) / 4));
  }, [activePreset, effectiveLevel, examFormat, isFull4Sections, selectedSections]);

  const toggleSection = (sid: ExamSectionId) => {
    setSelectedSections((prev) => {
      if (prev.includes(sid)) {
        if (prev.length <= 1) return prev; // Keep at least 1 section
        return prev.filter((item) => item !== sid);
      }
      return ALL_SECTIONS.filter((item) => item === sid || prev.includes(item));
    });
  };

  const handleStartExam = () => {
    setAttemptKey((k) => k + 1);
    setSessionStarted(true);
  };

  const handleExamSaved = useCallback(
    (result: SavedExamResult) => {
      void saveExamResult(user?.id, result).then(setSavedResults);
    },
    [user?.id],
  );

  // =========================================================================
  // PRE-EXAM LOBBY (Chọn đề & Chọn phần trước khi bắt đầu bấm giờ)
  // =========================================================================
  if (!sessionStarted) {
    const passRuleText =
      effectiveLevel === 'N3'
        ? 'Tổng ≥ 95/180 điểm · Cả 3 phần (Ngôn ngữ / Đọc / Nghe) đều phải ≥ 19/60 (không dính điểm liệt).'
        : effectiveLevel === 'N4'
          ? 'Tổng ≥ 90/180 điểm · Ngôn ngữ + Đọc ≥ 38/120 & Nghe hiểu ≥ 19/60.'
          : 'Tổng ≥ 80/180 điểm · Ngôn ngữ + Đọc ≥ 38/120 & Nghe hiểu ≥ 19/60.';

    return (
      <div className="space-y-4">
        {/* Step 1: Pick Exam Paper */}
        <Card padding="lg" className="space-y-4 border-primary/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-wide text-primary-fg uppercase">
                Bước 1 · Chọn đề
              </p>
              <h2 className="mt-1 text-lg font-bold text-fg">
                {EXAM_FORMAT_META[examFormat].label}: {availablePresets.length} đề
              </h2>
              <p className="mt-0.5 text-xs text-muted">{EXAM_FORMAT_META[examFormat].hint}</p>
            </div>
            <Badge tone="sakura">
              {Object.keys(savedResults).filter((id) =>
                availablePresets.some((p) => p.id === id),
              ).length}
              /{availablePresets.length} đề đã thi
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Dạng đề">
            {(Object.keys(EXAM_FORMAT_META) as ExamFormat[]).map((fmt) => (
              <Chip
                key={fmt}
                selected={examFormat === fmt}
                onClick={() => {
                  setExamFormat(fmt);
                  setSelectedPresetId('auto');
                }}
              >
                {EXAM_FORMAT_META[fmt].label} ({presetsOfLevel.filter((p) => (p.format ?? 'jlpt') === fmt).length})
              </Chip>
            ))}
          </div>

          <div className="space-y-2">
          {(['N5', 'N4', 'N3'] as const)
            .map((lvl) => ({ lvl, list: availablePresets.filter((p) => p.level === lvl) }))
            .filter((group) => group.list.length > 0)
            .map(({ lvl, list }) => {
              const defaultOpen = levelFilter === 'ALL' ? availablePresets[0]?.level : levelFilter;
              const isOpen = openLevel === undefined ? lvl === defaultOpen : openLevel === lvl;
              const done = list.filter((p) => savedResults[p.id]).length;
              return (
                <div key={lvl} className="rounded-xl border border-line">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenLevel(isOpen ? null : lvl)}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-left"
                  >
                    <span className="text-sm font-bold text-fg">
                      {lvl} · {list.length} đề
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      {done > 0 ? `đã thi ${done}` : null}
                      <ChevronDown className={cn('size-4 transition-transform', isOpen && 'rotate-180')} aria-hidden />
                    </span>
                  </button>
                  {isOpen && (
          <div className="grid grid-cols-1 gap-2.5 border-t border-line p-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((preset) => {
              const isSelected = activePreset?.id === preset.id;
              const record = savedResults[preset.id];
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={cn(
                    'flex cursor-pointer flex-col justify-between gap-2 rounded-xl border-2 p-3.5 text-left transition-colors',
                    isSelected
                      ? 'border-primary bg-primary-soft/35 ring-2 ring-primary/20'
                      : 'border-line bg-surface-2/50 hover:border-primary/60 hover:bg-surface',
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <Badge tone={isSelected ? 'primary' : 'neutral'}>
                        {preset.level} · {preset.sessionLabel}
                      </Badge>
                      {record ? (
                        <Badge tone={record.isPassed ? 'success' : 'warning'} className="tabular">
                          {record.isPassed ? '✓ ĐẬU' : 'Trượt'} · {record.total180}/180
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted">Chưa thi</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-fg">{preset.title}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-muted">
                    <span>⏱ {preset.durationMinutes} phút</span>
                    <span>Đậu ≥ {preset.passScore}/180đ</span>
                  </div>
                </button>
              );
            })}
          </div>
                  )}
                </div>
              );
            })}
          </div>

        </Card>

        {/* Step 2: Choose Sections & Official JLPT Pass Rules */}
        <Card padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold tracking-wide text-primary-fg uppercase">
                Bước 2 · Chọn phần thi &amp; Xem chuẩn chấm điểm JLPT
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Làm đủ cả 4 phần để nhận phiếu báo điểm Đỗ (合格) / Trượt (不合格) theo cách chấm JLPT, hoặc chọn lẻ từng phần để ôn nhanh.
              </p>
            </div>
            {!isFull4Sections && (
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={() => setSelectedSections([...ALL_SECTIONS])}
              >
                Chọn lại đủ 4 phần
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {ALL_SECTIONS.map((sid) => (
              <Chip
                key={sid}
                selected={selectedSections.includes(sid)}
                onClick={() => toggleSection(sid)}
              >
                {SECTION_META[sid].label}
              </Chip>
            ))}
          </div>

          <Notice tone="info" title={`Chuẩn đánh giá Đậu / Trượt JLPT ${effectiveLevel === 'ALL' ? 'N5–N3' : effectiveLevel}`}>
            {passRuleText}
          </Notice>

          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted">
              Đề đang chọn:{' '}
              <strong className="text-fg">
                {activePreset
                  ? activePreset.title
                  : `${EXAM_FORMAT_META[examFormat].label} trộn ngẫu nhiên (${levelFilter})`}
              </strong>{' '}
              · <strong className="text-fg">{selectedSections.length}/4 phần</strong> ·{' '}
              <strong className="text-fg">{computedDurationMinutes} phút</strong>
            </div>
            <Button
              type="button"
              variant="primary"
              size="lg"
              leftIcon={<Play className="size-4" aria-hidden />}
              onClick={handleStartExam}
              className="w-full sm:w-auto"
            >
              Bắt đầu làm bài ({computedDurationMinutes} phút)
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <JlptFullTestSession
      key={`${effectiveLevel}-${activePreset?.id ?? `random-${examFormat}`}-${selectedSections.join(',')}-${attemptKey}`}
      levelFilter={effectiveLevel}
      preset={activePreset}
      counts={activePreset?.counts ? { ...examCounts, ...activePreset.counts } : examCounts}
      includedSections={selectedSections}
      durationMinutes={computedDurationMinutes}
      attemptKey={attemptKey}
      retryAttemptId={retryAttemptId}
      onBackToLobby={() => setSessionStarted(false)}
      onNewAttempt={() => setAttemptKey((k) => k + 1)}
      onSaveResult={handleExamSaved}
      onRecordMistake={onRecordMistake}
    />
  );
};

interface JlptFullTestSessionProps {
  levelFilter: JLPTLevelFilter;
  preset: RealJlptExamPreset | null;
  counts: ExamCounts;
  includedSections: ExamSectionId[];
  durationMinutes: number;
  attemptKey: number;
  retryAttemptId?: string;
  onBackToLobby: () => void;
  onNewAttempt: () => void;
  onSaveResult: (result: SavedExamResult) => void;
  onRecordMistake: (payload: JlptMistakePayload) => void;
}

interface ReviewMistakeItem {
  id: string;
  sectionLabel: string;
  prompt: string;
  context?: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  fullSentence?: string;
  listeningDialogue?: ReturnType<typeof getLiveJlptListeningItems>[number]['dialogue'];
}

const JlptFullTestSession: React.FC<JlptFullTestSessionProps> = ({
  levelFilter,
  preset,
  counts,
  includedSections,
  durationMinutes,
  attemptKey,
  retryAttemptId,
  onBackToLobby,
  onNewAttempt,
  onSaveResult,
  onRecordMistake,
}) => {
  const { user } = useAuth();
  const cmsSnapshot = useCurriculumSnapshot();
  const initialDurationSeconds = Math.max(5, durationMinutes) * 60;
  const [activeSection, setActiveSection] = useState<ExamSectionId>(includedSections[0] ?? 's1');
  const [secondsLeft, setSecondsLeft] = useState(initialDurationSeconds);
  const [timerPaused, setTimerPaused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showWrongOnlyPanel, setShowWrongOnlyPanel] = useState(true);

  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});
  const [starAnswers, setStarAnswers] = useState<
    Record<string, { answer: string; isCorrect: boolean }>
  >({});
  const [showListeningTranscript, setShowListeningTranscript] = useState<Record<string, boolean>>({});
  const [showTranscriptFurigana, setShowTranscriptFurigana] = useState(true);
  const [activeListeningLines, setActiveListeningLines] = useState<Record<string, number | null>>({});
  const [playLineRequests, setPlayLineRequests] = useState<
    Record<string, { idx: number; nonce: number }>
  >({});

  const hasS1 = includedSections.includes('s1');
  const hasS2 = includedSections.includes('s2');
  const hasS3 = includedSections.includes('s3');
  const hasS4 = includedSections.includes('s4');
  const isFull4Sections = hasS1 && hasS2 && hasS3 && hasS4;

  const examSet = useMemo(() => {
    void attemptKey;
    const allKanji = hasS1 ? getLiveJlptMcqQuestions(cmsSnapshot, 'kanji', levelFilter) : [];
    const allVocab = hasS1 ? getLiveJlptMcqQuestions(cmsSnapshot, 'vocab', levelFilter) : [];
    const allGrammar = hasS2 ? getLiveJlptMcqQuestions(cmsSnapshot, 'grammar', levelFilter) : [];
    const allStar = hasS2 ? getLiveJlptStarQuestions(cmsSnapshot, levelFilter) : [];
    const shortReadings = hasS3 ? getLiveJlptReadingPassages(cmsSnapshot, 'reading-short', levelFilter) : [];
    const mediumReadings = hasS3 ? getLiveJlptReadingPassages(cmsSnapshot, 'reading-medium', levelFilter) : [];
    const longReadings = hasS3 ? getLiveJlptReadingPassages(cmsSnapshot, 'reading-long', levelFilter) : [];
    const allListening = hasS4 ? getLiveJlptListeningItems(cmsSnapshot, levelFilter) : [];

    if (preset) {
      const seed = preset.seedOffset;
      const kanjiPool = pickSeededSubset(allKanji, counts.kanji, seed * 17 + 1);
      const vocabPool = pickSeededSubset(allVocab, counts.vocab, seed * 17 + 2);
      const grammarPool = pickSeededSubset(allGrammar, counts.grammar, seed * 17 + 3);
      const starPool = pickSeededSubset(allStar, counts.star, seed * 17 + 4);
      const readingPassages = [
        ...pickSeededSubset(shortReadings, counts.readingShort, seed * 17 + 5),
        ...pickSeededSubset(mediumReadings, counts.readingMedium, seed * 17 + 6),
        ...pickSeededSubset(longReadings, counts.readingLong, seed * 17 + 7),
      ];
      const listeningItems = pickSeededSubset(allListening, counts.listening, seed * 17 + 8);

      return {
        s1: [...kanjiPool, ...vocabPool],
        grammarMcqs: grammarPool,
        starItems: starPool,
        readingPassages,
        listeningItems,
      };
    }

    const kanjiPool = shuffleArray(allKanji).slice(0, counts.kanji);
    const vocabPool = shuffleArray(allVocab).slice(0, counts.vocab);
    const grammarPool = shuffleArray(allGrammar).slice(0, counts.grammar);
    const starPool = shuffleArray(allStar).slice(0, counts.star);
    const readingPassages = [
      ...shuffleArray(shortReadings).slice(0, counts.readingShort),
      ...shuffleArray(mediumReadings).slice(0, counts.readingMedium),
      ...shuffleArray(longReadings).slice(0, counts.readingLong),
    ];
    const listeningItems = shuffleArray(allListening).slice(0, counts.listening);

    return {
      s1: [...kanjiPool, ...vocabPool],
      grammarMcqs: grammarPool,
      starItems: starPool,
      readingPassages,
      listeningItems,
    };
  }, [attemptKey, cmsSnapshot, counts, hasS1, hasS2, hasS3, hasS4, levelFilter, preset]);

  const readingQuestions = useMemo(
    () => examSet.readingPassages.flatMap((p) => p.questions.map((q) => ({ passage: p, question: q }))),
    [examSet.readingPassages],
  );

  const totalQuestions =
    examSet.s1.length +
    examSet.grammarMcqs.length +
    examSet.starItems.length +
    readingQuestions.length +
    examSet.listeningItems.length;

  const answeredCount =
    examSet.s1.filter((q) => mcqAnswers[q.id] !== undefined).length +
    examSet.grammarMcqs.filter((q) => mcqAnswers[q.id] !== undefined).length +
    examSet.starItems.filter((q) => starAnswers[q.id] !== undefined).length +
    readingQuestions.filter(({ question }) => mcqAnswers[question.id] !== undefined).length +
    examSet.listeningItems.filter((q) => mcqAnswers[q.id] !== undefined).length;

  const sectionScores = useMemo(() => {
    const s1Correct = examSet.s1.filter((q) => mcqAnswers[q.id] === q.correctIndex).length;
    const s2GrammarCorrect = examSet.grammarMcqs.filter((q) => mcqAnswers[q.id] === q.correctIndex).length;
    const s2StarCorrect = examSet.starItems.filter((item) => starAnswers[item.id]?.isCorrect).length;
    const s2Correct = s2GrammarCorrect + s2StarCorrect;
    const s2Total = examSet.grammarMcqs.length + examSet.starItems.length;
    const s3Correct = readingQuestions.filter(({ question }) => mcqAnswers[question.id] === question.correctIndex).length;
    const s4Correct = examSet.listeningItems.filter((item) => mcqAnswers[item.id] === item.correctIndex).length;

    const totalCorrect = s1Correct + s2Correct + s3Correct + s4Correct;
    return {
      s1: { correct: s1Correct, total: examSet.s1.length },
      s2: { correct: s2Correct, total: s2Total },
      s3: { correct: s3Correct, total: readingQuestions.length },
      s4: { correct: s4Correct, total: examSet.listeningItems.length },
      totalCorrect,
      totalQuestions,
    };
  }, [examSet, mcqAnswers, readingQuestions, starAnswers, totalQuestions]);

  const accuracyPct =
    totalQuestions > 0 ? Math.round((sectionScores.totalCorrect / totalQuestions) * 100) : 0;

  // Official JLPT 180-point scaled score + exact pass/fail cutoffs (N5/N4 vs N3)
  const jlptScaled = useMemo(() => {
    const langTotal = Math.max(1, sectionScores.s1.total + sectionScores.s2.total);
    const langCorrect = sectionScores.s1.correct + sectionScores.s2.correct;
    const langScore = Math.round((langCorrect / langTotal) * 60);
    const readScore =
      sectionScores.s3.total > 0
        ? Math.round((sectionScores.s3.correct / sectionScores.s3.total) * 60)
        : 0;
    const listenScore =
      sectionScores.s4.total > 0
        ? Math.round((sectionScores.s4.correct / sectionScores.s4.total) * 60)
        : 0;

    // Official N5 & N4 combine Language Knowledge + Reading into 1 section out of 120 (cutoff 38/120)
    const combinedLangReadTotal = Math.max(
      1,
      sectionScores.s1.total + sectionScores.s2.total + sectionScores.s3.total,
    );
    const combinedLangReadCorrect =
      sectionScores.s1.correct + sectionScores.s2.correct + sectionScores.s3.correct;
    const combinedLangReadScore = Math.round(
      (combinedLangReadCorrect / combinedLangReadTotal) * 120,
    );

    const isN3Format = levelFilter === 'N3';
    const total180 = isN3Format
      ? langScore + readScore + listenScore
      : combinedLangReadScore + listenScore;

    const passThreshold =
      preset?.passScore ?? (levelFilter === 'N5' ? 80 : levelFilter === 'N4' ? 90 : 95);

    const langCutoffOk = !isN3Format || langScore >= 19;
    const readCutoffOk = !isN3Format || readScore >= 19;
    const combinedCutoffOk = isN3Format || combinedLangReadScore >= 38;
    const listenCutoffOk = listenScore >= 19;
    const passedCutoffs = isN3Format
      ? langCutoffOk && readCutoffOk && listenCutoffOk
      : combinedCutoffOk && listenCutoffOk;

    const isPassed = isFull4Sections ? total180 >= passThreshold && passedCutoffs : accuracyPct >= 65;

    const failReasons: string[] = [];
    if (isFull4Sections && !isPassed) {
      if (total180 < passThreshold) {
        failReasons.push(
          `Tổng điểm ${total180}/180 chưa đạt chuẩn tối thiểu ${passThreshold}/180 (thiếu ${passThreshold - total180} điểm).`,
        );
      }
      if (isN3Format) {
        if (!langCutoffOk) failReasons.push(`Dính điểm liệt Kiến thức ngôn ngữ (${langScore}/60 < 19đ).`);
        if (!readCutoffOk) failReasons.push(`Dính điểm liệt Đọc hiểu (${readScore}/60 < 19đ).`);
        if (!listenCutoffOk) failReasons.push(`Dính điểm liệt Nghe hiểu (${listenScore}/60 < 19đ).`);
      } else {
        if (!combinedCutoffOk) {
          failReasons.push(
            `Dính điểm liệt Ngôn ngữ + Đọc hiểu (${combinedLangReadScore}/120 < 38đ).`,
          );
        }
        if (!listenCutoffOk) failReasons.push(`Dính điểm liệt Nghe hiểu (${listenScore}/60 < 19đ).`);
      }
    }

    const skillRanks = [
      ...(hasS1
        ? [{ id: 's1', label: 'Chữ Hán & Từ vựng', ...computeSkillRank(sectionScores.s1.correct, sectionScores.s1.total), correct: sectionScores.s1.correct, total: sectionScores.s1.total }]
        : []),
      ...(hasS2
        ? [{ id: 's2', label: 'Ngữ pháp & Hái sao ★', ...computeSkillRank(sectionScores.s2.correct, sectionScores.s2.total), correct: sectionScores.s2.correct, total: sectionScores.s2.total }]
        : []),
      ...(hasS3
        ? [{ id: 's3', label: 'Đọc hiểu (Dokkai)', ...computeSkillRank(sectionScores.s3.correct, sectionScores.s3.total), correct: sectionScores.s3.correct, total: sectionScores.s3.total }]
        : []),
      ...(hasS4
        ? [{ id: 's4', label: 'Nghe hiểu (Choukai)', ...computeSkillRank(sectionScores.s4.correct, sectionScores.s4.total), correct: sectionScores.s4.correct, total: sectionScores.s4.total }]
        : []),
    ];

    return {
      isN3Format,
      langScore,
      readScore,
      combinedLangReadScore,
      listenScore,
      total180,
      passThreshold,
      langCutoffOk,
      readCutoffOk,
      combinedCutoffOk,
      listenCutoffOk,
      passedCutoffs,
      isPassed,
      failReasons,
      skillRanks,
    };
  }, [accuracyPct, hasS1, hasS2, hasS3, hasS4, isFull4Sections, levelFilter, preset?.passScore, sectionScores]);

  // Unified list of ALL wrong or unanswered questions for instant post-exam review
  const reviewMistakeItems = useMemo<ReviewMistakeItem[]>(() => {
    if (!submitted) return [];
    const list: ReviewMistakeItem[] = [];

    examSet.s1.forEach((q, idx) => {
      const chosen = mcqAnswers[q.id];
      if (chosen !== q.correctIndex) {
        list.push({
          id: `rev-s1-${q.id}`,
          sectionLabel: `Chữ Hán & Từ vựng · Câu ${idx + 1}`,
          prompt: q.prompt,
          userAnswer: chosen !== undefined ? q.options[chosen] : '(Chưa chọn đáp án)',
          correctAnswer: q.options[q.correctIndex],
          explanation: q.explanation,
        });
      }
    });

    examSet.grammarMcqs.forEach((q, idx) => {
      const chosen = mcqAnswers[q.id];
      if (chosen !== q.correctIndex) {
        list.push({
          id: `rev-s2-${q.id}`,
          sectionLabel: `Ngữ pháp · Câu ${idx + 1}`,
          prompt: q.prompt,
          userAnswer: chosen !== undefined ? q.options[chosen] : '(Chưa chọn đáp án)',
          correctAnswer: q.options[q.correctIndex],
          explanation: q.explanation,
        });
      }
    });

    examSet.starItems.forEach((item, idx) => {
      const chosen = starAnswers[item.id];
      if (!chosen?.isCorrect) {
        list.push({
          id: `rev-star-${item.id}`,
          sectionLabel: `Hái sao ★ · Câu ${examSet.grammarMcqs.length + idx + 1}`,
          prompt: `${item.prefix} ＿＿ ＿＿ ★ ＿＿ ${item.suffix}`,
          userAnswer: chosen?.answer || '(Chưa hoàn thành)',
          correctAnswer: item.correctAnswer,
          fullSentence: item.fullSentence,
          explanation: item.explanation,
        });
      }
    });

    readingQuestions.forEach(({ passage, question }, idx) => {
      const chosen = mcqAnswers[question.id];
      if (chosen !== question.correctIndex) {
        list.push({
          id: `rev-s3-${question.id}`,
          sectionLabel: `Đọc hiểu · Câu ${idx + 1}`,
          context: `Bài đọc: ${passage.title}`,
          prompt: question.prompt,
          userAnswer: chosen !== undefined ? question.options[chosen] : '(Chưa chọn đáp án)',
          correctAnswer: question.options[question.correctIndex],
          explanation: question.explanation,
        });
      }
    });

    examSet.listeningItems.forEach((item, idx) => {
      const chosen = mcqAnswers[item.id];
      if (chosen !== item.correctIndex) {
        list.push({
          id: `rev-s4-${item.id}`,
          sectionLabel: `Nghe hiểu · Bài ${idx + 1}`,
          context: item.situation,
          prompt: item.questionPrompt,
          userAnswer: chosen !== undefined ? item.options[chosen] : '(Chưa chọn đáp án)',
          correctAnswer: item.options[item.correctIndex],
          explanation: item.explanation,
          listeningDialogue: item.dialogue,
        });
      }
    });

    return list;
  }, [examSet, mcqAnswers, readingQuestions, starAnswers, submitted]);

  const handleSubmitExam = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    setTimerPaused(true);

    const meta = JLPT_MODULES['full-test'];
    const sessionMistakeSummary: Array<Record<string, unknown>> = [];
    const fullTestPath = `/jlpt/full-test${levelFilter !== 'ALL' ? `?level=${levelFilter}` : ''}`;

    [...examSet.s1, ...examSet.grammarMcqs].forEach((q, idx) => {
      const chosen = mcqAnswers[q.id];
      if (chosen !== undefined && chosen !== q.correctIndex) {
        const entry = {
          id: `${meta.mistakeGrammarId}_${q.id}_${idx}`,
          grammarId: meta.mistakeGrammarId,
          questionId: q.id,
          prompt: q.prompt,
          userAnswer: q.options[chosen],
          correctAnswer: q.options[q.correctIndex],
          explanation: q.explanation,
          options: [...q.options],
          level: q.level,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
        };
        sessionMistakeSummary.push(entry);
        onRecordMistake({
          grammarId: meta.mistakeGrammarId,
          questionId: q.id,
          userAnswer: q.options[chosen],
          correctAnswer: q.options[q.correctIndex],
          errorType: meta.errorType,
          prompt: q.prompt,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
          explanation: q.explanation,
          level: q.level,
          options: [...q.options],
        });
      }
    });

    examSet.starItems.forEach((item, idx) => {
      const chosen = starAnswers[item.id];
      if (chosen && !chosen.isCorrect) {
        const entry = {
          id: `${meta.mistakeGrammarId}_star_${item.id}_${idx}`,
          grammarId: meta.mistakeGrammarId,
          questionId: item.id,
          prompt: item.fullSentence,
          userAnswer: chosen.answer || '(chưa hoàn thành)',
          correctAnswer: item.correctAnswer,
          explanation: item.explanation,
          level: item.level,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
        };
        sessionMistakeSummary.push(entry);
        onRecordMistake({
          grammarId: meta.mistakeGrammarId,
          questionId: item.id,
          userAnswer: chosen.answer || '(chưa hoàn thành)',
          correctAnswer: item.correctAnswer,
          errorType: 'wrong_word_order',
          prompt: item.fullSentence,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
          explanation: item.explanation,
          level: item.level,
        });
      }
    });

    readingQuestions.forEach(({ passage, question }, idx) => {
      const chosen = mcqAnswers[question.id];
      if (chosen !== undefined && chosen !== question.correctIndex) {
        const entry = {
          id: `${meta.mistakeGrammarId}_read_${question.id}_${idx}`,
          grammarId: meta.mistakeGrammarId,
          questionId: question.id,
          prompt: `[${passage.title}] ${question.prompt}`,
          userAnswer: question.options[chosen],
          correctAnswer: question.options[question.correctIndex],
          explanation: question.explanation,
          options: [...question.options],
          level: passage.level,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
        };
        sessionMistakeSummary.push(entry);
        onRecordMistake({
          grammarId: meta.mistakeGrammarId,
          questionId: question.id,
          userAnswer: question.options[chosen],
          correctAnswer: question.options[question.correctIndex],
          errorType: meta.errorType,
          prompt: `[${passage.title}] ${question.prompt}`,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
          explanation: question.explanation,
          level: passage.level,
          options: [...question.options],
        });
      }
    });

    examSet.listeningItems.forEach((item, idx) => {
      const chosen = mcqAnswers[item.id];
      if (chosen !== undefined && chosen !== item.correctIndex) {
        const entry = {
          id: `${meta.mistakeGrammarId}_lis_${item.id}_${idx}`,
          grammarId: meta.mistakeGrammarId,
          questionId: item.id,
          prompt: `${item.situation} — ${item.questionPrompt}`,
          userAnswer: item.options[chosen],
          correctAnswer: item.options[item.correctIndex],
          explanation: item.explanation,
          options: [...item.options],
          level: item.level,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
        };
        sessionMistakeSummary.push(entry);
        onRecordMistake({
          grammarId: meta.mistakeGrammarId,
          questionId: item.id,
          userAnswer: item.options[chosen],
          correctAnswer: item.options[item.correctIndex],
          errorType: meta.errorType,
          prompt: `${item.situation} — ${item.questionPrompt}`,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
          explanation: item.explanation,
          level: item.level,
          options: [...item.options],
        });
      }
    });

    // correct answers, so "Xem lại" can show the whole paper
    const addCorrect = (id: string, prompt: string, answer: string, explanation?: string, options?: string[]) =>
      sessionMistakeSummary.push({
        id: `ok_${id}`,
        questionId: id,
        prompt,
        userAnswer: answer,
        correctAnswer: answer,
        explanation,
        options,
        isCorrect: true,
      });
    [...examSet.s1, ...examSet.grammarMcqs].forEach((q) => {
      if (mcqAnswers[q.id] === q.correctIndex) {
        addCorrect(q.id, q.prompt, q.options[q.correctIndex], q.explanation, [...q.options]);
      }
    });
    examSet.starItems.forEach((item) => {
      if (starAnswers[item.id]?.isCorrect) {
        addCorrect(item.id, item.fullSentence, item.correctAnswer, item.explanation);
      }
    });
    readingQuestions.forEach(({ passage, question }) => {
      if (mcqAnswers[question.id] === question.correctIndex) {
        addCorrect(question.id, `[${passage.title}] ${question.prompt}`, question.options[question.correctIndex], question.explanation, [...question.options]);
      }
    });
    examSet.listeningItems.forEach((item) => {
      if (mcqAnswers[item.id] === item.correctIndex) {
        addCorrect(item.id, `${item.situation} — ${item.questionPrompt}`, item.options[item.correctIndex], item.explanation, [...item.options]);
      }
    });

    if (preset && isFull4Sections) {
      onSaveResult({
        presetId: preset.id,
        total180: jlptScaled.total180,
        passThreshold: jlptScaled.passThreshold,
        isPassed: jlptScaled.isPassed,
        accuracyPct,
        completedAt: new Date().toISOString(),
      });
    }

    void recordQuizAttempt(
      {
        quizType: 'jlpt-full',
        level: levelFilter,
        score: sectionScores.totalCorrect,
        totalQuestions: Math.max(1, totalQuestions),
        durationSeconds: Math.max(1, initialDurationSeconds - secondsLeft),
        mistakesJson: sessionMistakeSummary,
      },
      user?.id,
    ).then(() => {
      if (retryAttemptId) {
        clearAttemptMistakeGroup(retryAttemptId, user?.id);
      }
    });
  }, [
    accuracyPct,
    examSet,
    initialDurationSeconds,
    isFull4Sections,
    jlptScaled.isPassed,
    jlptScaled.passThreshold,
    jlptScaled.total180,
    levelFilter,
    mcqAnswers,
    onRecordMistake,
    onSaveResult,
    preset,
    readingQuestions,
    retryAttemptId,
    secondsLeft,
    sectionScores.totalCorrect,
    starAnswers,
    submitted,
    totalQuestions,
    user?.id,
  ]);

  const submitRef = useRef(handleSubmitExam);
  useEffect(() => {
    submitRef.current = handleSubmitExam;
  }, [handleSubmitExam]);

  useEffect(() => {
    if (submitted || timerPaused) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.setTimeout(() => submitRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [submitted, timerPaused]);

  const tabItems: TabItem<ExamSectionId>[] = [
    ...(hasS1 ? [{ value: 's1' as const, label: `1. Chữ Hán & Từ vựng (${examSet.s1.length})` }] : []),
    ...(hasS2
      ? [
          {
            value: 's2' as const,
            label: `2. Ngữ pháp & Hái sao (${examSet.grammarMcqs.length + examSet.starItems.length})`,
          },
        ]
      : []),
    ...(hasS3 ? [{ value: 's3' as const, label: `3. Đọc hiểu (${readingQuestions.length})` }] : []),
    ...(hasS4 ? [{ value: 's4' as const, label: `4. Nghe hiểu (${examSet.listeningItems.length})` }] : []),
  ];

  const weakestSkill = useMemo(() => {
    if (jlptScaled.skillRanks.length === 0) return null;
    return [...jlptScaled.skillRanks].sort((a, b) => a.pct - b.pct)[0];
  }, [jlptScaled.skillRanks]);

  return (
    <div className="space-y-6">
      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="size-4" aria-hidden />}
              onClick={onBackToLobby}
            >
              Chọn đề khác
            </Button>

            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5">
              <Clock
                className={secondsLeft <= 120 ? 'size-4 text-danger-fg' : 'size-4 text-primary-fg'}
                aria-hidden
              />
              <span
                className={
                  secondsLeft <= 120
                    ? 'tabular font-mono text-base font-bold text-danger-fg'
                    : 'tabular font-mono text-base font-bold text-fg'
                }
              >
                {formatTimer(secondsLeft)}
              </span>
            </div>

            {!submitted && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={
                  timerPaused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />
                }
                onClick={() => setTimerPaused((p) => !p)}
              >
                {timerPaused ? 'Tiếp tục giờ' : 'Tạm dừng'}
              </Button>
            )}

            <p className="text-sm text-muted tabular">
              Đã làm:{' '}
              <span className="font-semibold text-fg">
                {answeredCount}/{totalQuestions}
              </span>{' '}
              câu
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw className="size-4" aria-hidden />}
              onClick={onNewAttempt}
            >
              Làm lại đề này
            </Button>

            {!submitted && (
              <Button variant="primary" size="md" onClick={handleSubmitExam}>
                Nộp bài &amp; Chấm điểm
              </Button>
            )}
          </div>
        </div>

        <ProgressBar
          value={submitted ? sectionScores.totalCorrect : answeredCount}
          max={Math.max(1, totalQuestions)}
          tone={submitted ? (jlptScaled.isPassed ? 'success' : 'danger') : 'primary'}
          label="Tiến độ bài thi JLPT"
          size="sm"
        />
      </Card>

      {/* OFFICIAL JLPT SCORE REPORT CARD */}
      {submitted && (
        <Card
          padding="lg"
          className={cn(
            'space-y-5 border-2',
            jlptScaled.isPassed ? 'border-success-line' : 'border-danger-line',
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold tracking-wide text-primary-fg uppercase">
                Phiếu Báo Điểm ·{' '}
                {preset ? preset.title : `Đề trộn JLPT (${levelFilter === 'ALL' ? 'Tổng hợp' : levelFilter})`}
              </p>
              <h2 className="text-2xl font-bold text-fg tabular">
                {isFull4Sections
                  ? `${jlptScaled.total180} / 180 điểm`
                  : `${sectionScores.totalCorrect} / ${sectionScores.totalQuestions} câu đúng (${accuracyPct}%)`}
              </h2>
              <p className="text-xs text-muted">
                {isFull4Sections
                  ? `Đúng ${sectionScores.totalCorrect}/${sectionScores.totalQuestions} câu (${accuracyPct}%) · Ngưỡng đậu JLPT ${levelFilter}: ≥ ${jlptScaled.passThreshold}/180 điểm và không dính điểm liệt.`
                  : 'Chế độ luyện từng phần — chọn đủ cả 4 phần để nhận đánh giá Đậu/Trượt thang 180 điểm chuẩn JLPT.'}
              </p>
            </div>

            <Badge
              tone={jlptScaled.isPassed ? 'success' : 'danger'}
              className="px-3.5 py-1.5 text-sm font-bold"
            >
              {isFull4Sections
                ? jlptScaled.isPassed
                  ? '🎉 ĐỖ · 合格 (ĐẠT CHUẨN JLPT)'
                  : '✗ TRƯỢT · 不合格 (CHƯA ĐẠT)'
                : jlptScaled.isPassed
                  ? '✓ Đạt mục tiêu luyện tập'
                  : 'Cần ôn tập thêm'}
            </Badge>
          </div>

          {/* Official Scaled Section Scores with Cutoff Indicators */}
          {isFull4Sections && (
            <div
              className={cn(
                'grid grid-cols-1 gap-3 sm:grid-cols-2',
                jlptScaled.isN3Format ? 'md:grid-cols-4' : 'md:grid-cols-3',
              )}
            >
              {jlptScaled.isN3Format ? (
                <>
                  <Stat
                    label="Kiến thức ngôn ngữ"
                    value={`${jlptScaled.langScore}/60đ`}
                    hint={
                      jlptScaled.langCutoffOk
                        ? '✓ Không liệt (≥ 19đ)'
                        : '✗ Dính điểm liệt (< 19đ)'
                    }
                  />
                  <Stat
                    label="Đọc hiểu (Dokkai)"
                    value={`${jlptScaled.readScore}/60đ`}
                    hint={
                      jlptScaled.readCutoffOk
                        ? '✓ Không liệt (≥ 19đ)'
                        : '✗ Dính điểm liệt (< 19đ)'
                    }
                  />
                </>
              ) : (
                <Stat
                  label="Ngôn ngữ + Đọc hiểu"
                  value={`${jlptScaled.combinedLangReadScore}/120đ`}
                  hint={
                    jlptScaled.combinedCutoffOk
                      ? '✓ Không liệt (≥ 38đ)'
                      : '✗ Dính điểm liệt (< 38đ)'
                  }
                />
              )}
              <Stat
                label="Nghe hiểu (Choukai)"
                value={`${jlptScaled.listenScore}/60đ`}
                hint={
                  jlptScaled.listenCutoffOk
                    ? '✓ Không liệt (≥ 19đ)'
                    : '✗ Dính điểm liệt (< 19đ)'
                }
              />
              <Stat
                label="Tổng điểm quy đổi"
                value={`${jlptScaled.total180}/180đ`}
                hint={
                  jlptScaled.total180 >= jlptScaled.passThreshold
                    ? `✓ Đủ ngưỡng ≥ ${jlptScaled.passThreshold}đ`
                    : `✗ Thiếu ${jlptScaled.passThreshold - jlptScaled.total180}đ (cần ≥ ${jlptScaled.passThreshold}đ)`
                }
              />
            </div>
          )}

          {/* Fail reasons explanation (Cutoff vs Total score) */}
          {jlptScaled.failReasons.length > 0 && (
            <Notice tone="danger" title="Lý do chưa đạt chuẩn JLPT">
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                {jlptScaled.failReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </Notice>
          )}

          {/* Skill Reference Ranks A / B / C */}
          <div className="space-y-2 rounded-xl border border-line bg-surface-2/50 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-fg uppercase">
                <Award className="size-4 text-primary-fg" aria-hidden />
                Xếp hạng năng lực từng phần (A ≥ 67% · B 34–66% · C &lt; 34%)
              </span>
              {weakestSkill && weakestSkill.pct < 80 && (
                <span className="text-xs text-muted">
                  Nên ưu tiên ôn lại: <strong className="text-fg">{weakestSkill.label}</strong> ({weakestSkill.pct}%)
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {jlptScaled.skillRanks.map((sk) => (
                <div
                  key={sk.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-fg">{sk.label}</p>
                    <p className="text-[11px] text-muted tabular">
                      {sk.correct}/{sk.total} câu ({sk.pct}%)
                    </p>
                  </div>
                  <Badge tone={sk.tone} className="shrink-0 font-bold">
                    Hạng {sk.grade}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Centralized Wrong & Unanswered Questions Review with Detailed Explanations */}
          <div className="space-y-3 border-t border-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning-fg" aria-hidden />
                <h3 className="text-sm font-bold text-fg">
                  Tổng hợp câu sai &amp; chưa làm ({reviewMistakeItems.length} câu)
                </h3>
              </div>
              {reviewMistakeItems.length > 0 && (
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  leftIcon={<Filter className="size-3.5" aria-hidden />}
                  onClick={() => setShowWrongOnlyPanel((v) => !v)}
                >
                  {showWrongOnlyPanel ? 'Thu gọn danh sách câu sai' : 'Mở giải thích chi tiết câu sai'}
                </Button>
              )}
            </div>

            {reviewMistakeItems.length === 0 ? (
              <Notice tone="success" title="Tuyệt đối 100%!">
                Bạn đã trả lời đúng toàn bộ câu hỏi trong bài thi này — không có câu sai nào cần sửa.
              </Notice>
            ) : (
              showWrongOnlyPanel && (
                <div className="max-h-[460px] space-y-2.5 overflow-y-auto pr-1">
                  {reviewMistakeItems.map((item) => (
                    <div
                      key={item.id}
                      className="space-y-2 rounded-xl border border-danger-line/60 bg-surface-2/60 p-3.5 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge tone="danger">{item.sectionLabel}</Badge>
                        {item.listeningDialogue && item.listeningDialogue.length > 0 && (
                          <Button
                            type="button"
                            variant="soft"
                            size="sm"
                            leftIcon={<Volume2 className="size-3.5" aria-hidden />}
                            onClick={() => speakJapaneseDialoguePreview(item.listeningDialogue!)}
                          >
                            Nghe lại hội thoại
                          </Button>
                        )}
                      </div>
                      {item.context && <p className="text-xs text-muted">{item.context}</p>}
                      <p lang="ja" className="font-semibold text-fg">
                        {item.prompt}
                      </p>
                      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div className="rounded-lg border border-danger-line bg-danger-soft/45 px-2.5 py-1.5 text-danger-fg">
                          <span className="font-semibold">✗ Bạn chọn: </span>
                          <span lang="ja">{item.userAnswer}</span>
                        </div>
                        <div className="rounded-lg border border-success-line bg-success-soft/45 px-2.5 py-1.5 text-success-fg">
                          <span className="font-semibold">✓ Đáp án đúng: </span>
                          <span lang="ja">{item.correctAnswer}</span>
                        </div>
                      </div>
                      {item.fullSentence && (
                        <p lang="ja" className="text-xs font-semibold text-primary-fg">
                          Câu hoàn chỉnh: {item.fullSentence}
                        </p>
                      )}
                      <p className="rounded-lg bg-surface px-3 py-2 text-xs leading-relaxed text-fg">
                        <strong className="text-primary-fg">Giải thích:</strong> {item.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </Card>
      )}

      {tabItems.length > 1 && (
        <div className="rounded-xl border border-line bg-glass px-3 py-1.5 shadow-card backdrop-blur-md">
          <Tabs
            items={tabItems}
            value={activeSection}
            onChange={setActiveSection}
            variant="pill"
            aria-label="Các phần trong đề thi JLPT"
            className="gap-1.5"
          />
        </div>
      )}

      {activeSection === 's1' && hasS1 && (
        <div className="space-y-4">
          {examSet.s1.map((q, idx) => (
            <Card key={q.id} padding="lg" className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge tone="neutral">Câu {idx + 1}</Badge>
              </div>
              <McqQuestionBlock
                prompt={q.prompt}
                options={q.options}
                selectedIndex={mcqAnswers[q.id] ?? null}
                correctIndex={q.correctIndex}
                revealResult={submitted}
                locked={submitted}
                explanation={q.explanation}
                levelLabel={q.level}
                mondaiLabel={q.mondaiLabel}
                onSelect={(optIdx) => {
                  if (submitted) return;
                  setMcqAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                }}
              />
            </Card>
          ))}
        </div>
      )}

      {activeSection === 's2' && hasS2 && (
        <div className="space-y-5">
          {examSet.grammarMcqs.map((q, idx) => (
            <Card key={q.id} padding="lg" className="space-y-3">
              <Badge tone="neutral">Câu {idx + 1}</Badge>
              <McqQuestionBlock
                prompt={q.prompt}
                options={q.options}
                selectedIndex={mcqAnswers[q.id] ?? null}
                correctIndex={q.correctIndex}
                revealResult={submitted}
                locked={submitted}
                explanation={q.explanation}
                levelLabel={q.level}
                mondaiLabel={q.mondaiLabel}
                onSelect={(optIdx) => {
                  if (submitted) return;
                  setMcqAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                }}
              />
            </Card>
          ))}

          {examSet.starItems.map((item, idx) => {
            const saved = starAnswers[item.id];
            return (
              <Card key={item.id} padding="lg" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">Câu {examSet.grammarMcqs.length + idx + 1}</Badge>
                    <Badge tone="primary">{item.level}</Badge>
                    <Badge tone="warning">
                      <Star className="size-3 fill-current" aria-hidden />
                      Mondai ★
                    </Badge>
                  </div>

                  {saved && !submitted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setStarAnswers((prev) => {
                          const next = { ...prev };
                          delete next[item.id];
                          return next;
                        })
                      }
                    >
                      Xếp lại
                    </Button>
                  )}
                </div>

                {!saved && !submitted ? (
                  <StarQuestionComp
                    key={`${item.id}-${attemptKey}`}
                    mode="star_question"
                    question={toStarQuestionShape(item)}
                    submitLabel="Chốt đáp án ★"
                    onSubmit={(answer, isCorrect) => {
                      setStarAnswers((prev) => ({
                        ...prev,
                        [item.id]: { answer, isCorrect },
                      }));
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-line bg-surface-2 p-4">
                      <p className="text-xs font-semibold text-muted uppercase">Đáp án ★ bạn đã chọn</p>
                      <p lang="ja" className="mt-1 text-lg font-bold text-primary-fg">
                        {saved?.answer || '(Chưa chọn)'}
                      </p>
                    </div>

                    {submitted && (
                      <div
                        className={
                          saved?.isCorrect
                            ? 'rounded-xl border border-success-line bg-success-soft p-4 text-sm'
                            : 'rounded-xl border border-danger-line bg-danger-soft p-4 text-sm'
                        }
                      >
                        <p className="mb-1 flex items-center gap-1.5 font-semibold">
                          {saved?.isCorrect ? (
                            <>
                              <CheckCircle2 className="size-4 text-success-fg" aria-hidden />
                              <span className="text-success-fg">Chính xác!</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="size-4 text-danger-fg" aria-hidden />
                              <span className="text-danger-fg">
                                Chưa đúng — Đáp án đúng tại ★ là 「{item.correctAnswer}」
                              </span>
                            </>
                          )}
                        </p>
                        <p lang="ja" className="font-semibold text-fg">
                          {item.fullSentence}
                        </p>
                        <p className="mt-1 text-muted">{item.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {activeSection === 's3' && hasS3 && (
        <JlptReadingView
          key={`fulltest-reading-${levelFilter}-${attemptKey}`}
          passages={examSet.readingPassages}
          moduleMeta={JLPT_MODULES['reading-short']}
          onRecordMistake={onRecordMistake}
          controlledAnswers={mcqAnswers}
          revealAll={submitted}
          onControlledAnswer={(questionId, optIdx) => {
            if (submitted) return;
            setMcqAnswers((prev) => ({ ...prev, [questionId]: optIdx }));
          }}
        />
      )}

      {activeSection === 's4' && hasS4 && (
        <div className="space-y-5">
          {examSet.listeningItems.map((item, idx) => {
            const transcriptVisible = showListeningTranscript[item.id] ?? submitted;
            return (
              <Card key={item.id} padding="lg" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">Bài nghe {idx + 1}</Badge>
                    <Badge tone="primary">{item.level}</Badge>
                    <Badge tone="neutral">{item.mondaiLabel}</Badge>
                  </div>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() =>
                      setShowListeningTranscript((prev) => ({
                        ...prev,
                        [item.id]: !transcriptVisible,
                      }))
                    }
                  >
                    {transcriptVisible ? 'Ẩn Transcript' : 'Hiện Transcript'}
                  </Button>
                </div>

                <p className="text-sm text-muted">{item.situation}</p>
                <AudioSpeechPlayer
                  key={`${item.id}-${attemptKey}`}
                  dialogue={item.dialogue}
                  situation={item.situation}
                  questionPrompt={item.questionPrompt}
                  onActiveLineChange={(lineIdx) =>
                    setActiveListeningLines((prev) => ({ ...prev, [item.id]: lineIdx }))
                  }
                  playLineRequest={playLineRequests[item.id] ?? null}
                />

                {transcriptVisible && (
                  <ListeningTranscriptPanel
                    dialogue={item.dialogue}
                    translation={item.translation}
                    showTranslation={submitted}
                    showFurigana={showTranscriptFurigana}
                    onToggleFurigana={setShowTranscriptFurigana}
                    situation={item.situation}
                    questionPrompt={item.questionPrompt}
                    activeLineIdx={activeListeningLines[item.id] ?? null}
                    onPlayLine={(lineIdx) =>
                      setPlayLineRequests((prev) => ({
                        ...prev,
                        [item.id]: {
                          idx: lineIdx,
                          nonce: (prev[item.id]?.nonce ?? 0) + 1,
                        },
                      }))
                    }
                  />
                )}

                <McqQuestionBlock
                  prompt={item.questionPrompt}
                  options={item.options}
                  selectedIndex={mcqAnswers[item.id] ?? null}
                  correctIndex={item.correctIndex}
                  revealResult={submitted}
                  locked={submitted}
                  explanation={item.explanation}
                  onSelect={(optIdx) => {
                    if (submitted) return;
                    setMcqAnswers((prev) => ({ ...prev, [item.id]: optIdx }));
                  }}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
