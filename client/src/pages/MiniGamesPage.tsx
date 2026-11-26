import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  ChevronUp,
  ListChecks,
  RotateCcw,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  PageContainer,
  PageHeader,
  ProgressBar,
  Select,
  useToast,
} from '../components/ui';
import {
  ListeningDojoGame,
  MemoryFlipGame,
  PairMatchGame,
  SpeedTrueFalseGame,
} from '../components/games/ArcadeSubGames';
import { FruitSlashVocabGame } from '../components/games/FruitSlashVocabGame';
import { NinjaBridgeShooterGame } from '../components/games/NinjaBridgeShooterGame';
import { useAuth } from '../context/auth-context';
import {
  getPreferredVocabLevel,
  getUnitsForVocabTextbook,
  getVocabTextbooksForLevel,
  getWordsForVocabTextbook,
  parseVocabLevelParam,
  resolveActiveVocabTextbook,
  savePreferredVocabTextbookId,
} from '../data/vocabTextbooks';
import { useCurriculumSnapshot } from '../hooks/useCurriculumData';
import { useUserProgress } from '../hooks/useUserProgress';
import { cn } from '../lib/cn';
import {
  getLiveAllVocabulary,
  getLiveGrammarBooks,
  getLiveKanjis,
} from '../services/curriculumStore';
import {
  CUSTOM_STUDIO_SYNC_EVENT,
  customVocabToVocabularyItems,
  loadCustomStudioState,
  type CustomLesson,
} from '../services/customStudioService';
import {
  awardMiniGameXp,
  computeRoundXp,
  DAILY_CHALLENGE_BONUS_XP,
  getBeltInfo,
  loadMiniGameProfile,
  pickDailyChallengeIds,
  type MiniGameProfile,
} from '../services/miniGameProfileService';
import { getLocalDateKey } from '../services/notificationService';
import {
  HIGH_SCORE_KEY,
  HIGH_SCORE_SYNC_EVENT,
  notifyDeviceDataChanged,
} from '../services/deviceSyncEvents';
import { recordQuizAttempt } from '../services/quizHistoryService';
import {
  recordDailyStageSkillActivity,
  type StageSkill,
} from '../services/stageRoadmapService';
import { type StudyLevel } from '../services/userLevelService';
import type { VocabularyItem } from '../types/vocabulary';
import { shuffleArray } from '../utils/shuffle';
import { stopJapaneseSpeech } from '../utils/tts';

export type MiniGameId = 'shooter' | 'slash' | 'match' | 'memory' | 'truefalse' | 'listening';

interface MiniGameSpec {
  id: MiniGameId;
  glyph: string;
  title: string;
  subtitle: string;
  badge?: string;
}

const MINI_GAMES: MiniGameSpec[] = [
  {
    id: 'shooter',
    glyph: '剣',
    title: 'Ninja chém từ',
    subtitle: 'Gõ Hiragana hoặc chạm chọn.',
    badge: 'Hot',
  },
  {
    id: 'slash',
    glyph: '斬',
    title: 'Chém hoa quả',
    subtitle: 'Vuốt chém đúng nghĩa.',
    badge: 'Mới',
  },
  {
    id: 'match',
    glyph: '結',
    title: 'Nối cặp',
    subtitle: 'Nối Kanji, từ vựng, ngữ pháp.',
  },
  {
    id: 'memory',
    glyph: '札',
    title: 'Lật thẻ',
    subtitle: 'Tìm cặp từ ↔ nghĩa.',
  },
  {
    id: 'truefalse',
    glyph: '速',
    title: 'Đúng hay sai',
    subtitle: 'Đoán nhanh ○ / ×.',
  },
  {
    id: 'listening',
    glyph: '聴',
    title: 'Luyện nghe',
    subtitle: 'Nghe và chọn đúng từ.',
  },
];

/** A temporary word set played instead of the selected lessons. */
interface PracticeSet {
  kind: 'review' | 'daily';
  ids: number[];
  label: string;
}

/** Practice sets smaller than this are padded with other words so every game has enough choices. */
const MIN_PRACTICE_WORDS = 8;

const SOUND_PREF_KEY = 'nihonmaster_minigame_sound_v1';
const BASE_MINI_GAME_LEVELS: StudyLevel[] = ['N5', 'N4', 'N3'];

function formatUnitShortLabel(name: string, idx: number): string {
  return name.split('(')[0].split('—')[0].trim() || `Bài ${idx + 1}`;
}

function formatUnitTopicLabel(name: string, idx: number): string {
  const short = formatUnitShortLabel(name, idx);
  const dashIdx = name.indexOf('—');
  if (dashIdx === -1) return short;
  const topic = name
    .slice(dashIdx + 1)
    .replace(/\)\s*$/, '')
    .trim();
  return topic ? `${short} (${topic})` : short;
}

function loadHighScores(userId?: string | null): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw =
      (userId ? window.localStorage.getItem(`${HIGH_SCORE_KEY}:${userId}`) : null) ??
      window.localStorage.getItem(HIGH_SCORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function loadSoundPref(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(SOUND_PREF_KEY);
    return raw === null ? true : raw !== 'false';
  } catch {
    return true;
  }
}

export const MiniGamesPage: React.FC = () => {
  const { user, studyLevel, studyTextbookId } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const cmsSnapshot = useCurriculumSnapshot();
  const { progress, toggleStar } = useUserProgress();
  const starredIds = progress.starredWords;

  const rawGameParam = (searchParams.get('game') || 'shooter') as MiniGameId;
  const activeGame: MiniGameId = MINI_GAMES.some((g) => g.id === rawGameParam)
    ? rawGameParam
    : 'shooter';

  const allVocab = useMemo(() => getLiveAllVocabulary(cmsSnapshot), [cmsSnapshot]);

  const levelWordCountMap = useMemo(() => {
    const counts: Record<StudyLevel, number> = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
    for (const w of allVocab) {
      if (w.level && w.level in counts) {
        counts[w.level as StudyLevel] += 1;
      }
    }
    return counts;
  }, [allVocab]);

  const availableLevels = useMemo<StudyLevel[]>(() => {
    const extras = (['N2', 'N1'] as const).filter((lvl) => levelWordCountMap[lvl] > 0);
    return [...BASE_MINI_GAME_LEVELS, ...extras];
  }, [levelWordCountMap]);

  const rawLevel: StudyLevel =
    parseVocabLevelParam(searchParams.get('level')) ??
    studyLevel ??
    getPreferredVocabLevel(user?.id) ??
    'N5';
  const activeLevel: StudyLevel = availableLevels.includes(rawLevel) ? rawLevel : 'N3';

  const levelBooksWithStats = useMemo(
    () =>
      getVocabTextbooksForLevel(activeLevel)
        .map((book) => {
          const units = getUnitsForVocabTextbook(cmsSnapshot, activeLevel, book);
          const wordCount = units.reduce((sum, u) => sum + u.totalWords, 0);
          return { book, unitCount: units.length, wordCount };
        })
        .filter((entry) => entry.wordCount > 0),
    [activeLevel, cmsSnapshot],
  );

  const activeBook = useMemo(() => {
    const resolved = resolveActiveVocabTextbook(
      activeLevel,
      user?.id,
      searchParams.get('book') ?? (activeLevel === studyLevel ? studyTextbookId : null),
    );
    if (levelBooksWithStats.some((entry) => entry.book.id === resolved.id)) {
      return resolved;
    }
    return levelBooksWithStats[0]?.book ?? resolved;
  }, [activeLevel, levelBooksWithStats, searchParams, studyLevel, studyTextbookId, user?.id]);

  const [studioVocabLessons, setStudioVocabLessons] = useState<CustomLesson[]>(() =>
    loadCustomStudioState(user?.id).lessons.filter(
      (l) => l.kind === 'vocab' && (l.vocabItems?.length ?? 0) >= 2,
    ),
  );
  const [selectedCustomLessonId, setSelectedCustomLessonId] = useState<string | null>(() =>
    searchParams.get('customLesson'),
  );
  const [allCurriculumMode, setAllCurriculumMode] = useState<boolean>(
    () => searchParams.get('scope') === 'all-books',
  );
  // One course per level, so "all books" equals that course; the lesson picker stays available.
  const [allBooksInLevel, setAllBooksInLevel] = useState<boolean>(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>(() => {
    const param = searchParams.get('unit');
    if (!param || param === 'ALL') return [];
    return param
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  });
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [highScores, setHighScores] = useState<Record<string, number>>(() =>
    loadHighScores(user?.id),
  );
  useEffect(() => {
    const reload = () => setHighScores(loadHighScores(user?.id));
    reload();
    window.addEventListener(HIGH_SCORE_SYNC_EVENT, reload);
    return () => window.removeEventListener(HIGH_SCORE_SYNC_EVENT, reload);
  }, [user?.id]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => loadSoundPref());
  const [practiceSet, setPracticeSet] = useState<PracticeSet | null>(null);
  const [lastMissedIds, setLastMissedIds] = useState<number[]>([]);
  const [miniProfile, setMiniProfile] = useState<MiniGameProfile>({ xp: 0, dailyChallengeDates: [] });
  const todayKey = getLocalDateKey();

  useEffect(() => {
    let cancelled = false;
    void loadMiniGameProfile(user?.id).then((profile) => {
      if (!cancelled) setMiniProfile(profile);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const syncStudio = () => {
      setStudioVocabLessons(
        loadCustomStudioState(user?.id).lessons.filter(
          (l) => l.kind === 'vocab' && (l.vocabItems?.length ?? 0) >= 2,
        ),
      );
    };
    syncStudio();
    window.addEventListener(CUSTOM_STUDIO_SYNC_EVENT, syncStudio);
    return () => window.removeEventListener(CUSTOM_STUDIO_SYNC_EVENT, syncStudio);
  }, [user?.id]);

  const activeCustomLesson = useMemo(
    () =>
      selectedCustomLessonId
        ? (studioVocabLessons.find((l) => l.id === selectedCustomLessonId) ?? null)
        : null,
    [selectedCustomLessonId, studioVocabLessons],
  );

  const bookUnits = useMemo(
    () => getUnitsForVocabTextbook(cmsSnapshot, activeLevel, activeBook),
    [activeBook, activeLevel, cmsSnapshot],
  );

  // Normalize selected unit IDs against active book units so switching book never traps stale IDs
  const validSelectedUnits = useMemo(() => {
    if (selectedUnitIds.length === 0) return [];
    return bookUnits.filter(
      (u) =>
        selectedUnitIds.includes(String(u.id)) ||
        (u.dbUnitId !== undefined && selectedUnitIds.includes(String(u.dbUnitId))),
    );
  }, [bookUnits, selectedUnitIds]);

  const handleSelectLevel = useCallback(
    (nextLevel: StudyLevel) => {
      const nextReadyBooks = getVocabTextbooksForLevel(nextLevel).filter(
        (b) => getUnitsForVocabTextbook(cmsSnapshot, nextLevel, b).some((u) => u.totalWords > 0),
      );
      const preferred = resolveActiveVocabTextbook(nextLevel, user?.id);
      const nextBook =
        nextReadyBooks.find((b) => b.id === preferred.id) ?? nextReadyBooks[0] ?? preferred;

      setSelectedCustomLessonId(null);
      setAllCurriculumMode(false);
      setAllBooksInLevel(false);
      setSelectedUnitIds([]);
      setShowLessonPicker(false);
      setPracticeSet(null);

      const next = new URLSearchParams(searchParams);
      next.set('level', nextLevel);
      next.set('book', nextBook.id);
      next.delete('unit');
      next.delete('scope');
      next.delete('customLesson');
      setSearchParams(next, { replace: true });
    },
    [cmsSnapshot, searchParams, setSearchParams, user?.id],
  );

  const handleSelectBook = useCallback(
    (nextBookId: string) => {
      savePreferredVocabTextbookId(activeLevel, nextBookId, user?.id);
      setSelectedCustomLessonId(null);
      setAllCurriculumMode(false);
      setAllBooksInLevel(false);
      setSelectedUnitIds([]);
      setShowLessonPicker(false);
      setPracticeSet(null);

      const next = new URLSearchParams(searchParams);
      next.set('level', activeLevel);
      next.set('book', nextBookId);
      next.delete('unit');
      next.delete('scope');
      next.delete('customLesson');
      setSearchParams(next, { replace: true });
    },
    [activeLevel, searchParams, setSearchParams, user?.id],
  );

  const applyAllBooksInLevel = useCallback(() => {
    setSelectedCustomLessonId(null);
    setAllCurriculumMode(false);
    setAllBooksInLevel(true);
    setSelectedUnitIds([]);
    setShowLessonPicker(false);
    setPracticeSet(null);

    const next = new URLSearchParams(searchParams);
    next.set('level', activeLevel);
    next.set('scope', 'all-level');
    next.delete('unit');
    next.delete('customLesson');
    setSearchParams(next, { replace: true });
  }, [activeLevel, searchParams, setSearchParams]);

  const applySelectedUnitIds = useCallback(
    (nextIds: string[]) => {
      setSelectedCustomLessonId(null);
      setAllCurriculumMode(false);
      setAllBooksInLevel(false);
      setSelectedUnitIds(nextIds);
      setPracticeSet(null);
      const next = new URLSearchParams(searchParams);
      next.set('level', activeLevel);
      next.set('book', activeBook.id);
      next.delete('customLesson');
      next.delete('scope');
      if (nextIds.length === 0) {
        next.delete('unit');
      } else {
        next.set('unit', nextIds.join(','));
      }
      setSearchParams(next, { replace: true });
    },
    [activeBook.id, activeLevel, searchParams, setSearchParams],
  );

  const applyAllCurriculumMode = useCallback(() => {
    setSelectedCustomLessonId(null);
    setAllCurriculumMode(true);
    setAllBooksInLevel(false);
    setSelectedUnitIds([]);
    setShowLessonPicker(false);
    setPracticeSet(null);
    const next = new URLSearchParams(searchParams);
    next.delete('customLesson');
    next.delete('unit');
    next.set('scope', 'all-books');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const applyCustomLessonId = useCallback(
    (lessonId: string) => {
      setSelectedCustomLessonId(lessonId);
      setAllCurriculumMode(false);
      setAllBooksInLevel(false);
      setSelectedUnitIds([]);
      setPracticeSet(null);
      setShowLessonPicker(false);
      const next = new URLSearchParams(searchParams);
      next.delete('unit');
      next.delete('scope');
      next.set('customLesson', lessonId);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const toggleUnitSelection = useCallback(
    (unitIdStr: string) => {
      const current = validSelectedUnits.map((u) => String(u.id));
      const exists = current.includes(unitIdStr);
      const next = exists
        ? current.filter((id) => id !== unitIdStr)
        : [...current, unitIdStr];
      applySelectedUnitIds(next);
    },
    [applySelectedUnitIds, validSelectedUnits],
  );

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (!next) {
        stopJapaneseSpeech();
      }
      try {
        window.localStorage.setItem(SOUND_PREF_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const levelWords = useMemo(
    () => allVocab.filter((w) => w.level === activeLevel),
    [activeLevel, allVocab],
  );
  const bookWords = useMemo(
    () => getWordsForVocabTextbook(cmsSnapshot, activeLevel, activeBook),
    [activeBook, activeLevel, cmsSnapshot],
  );

  const filteredWords = useMemo(() => {
    if (activeCustomLesson) {
      return customVocabToVocabularyItems(activeCustomLesson);
    }
    let pool = allCurriculumMode
      ? allVocab
      : allBooksInLevel
        ? levelWords
        : bookWords;
    if (!allCurriculumMode && !allBooksInLevel && validSelectedUnits.length > 0) {
      const selectedSet = new Set(validSelectedUnits.map((u) => u.id));
      const unitScoped = bookWords.filter((w) => selectedSet.has(w.unitId));
      if (unitScoped.length > 0) pool = unitScoped;
    }
    if (onlyStarred) {
      const starred = pool.filter((w) => starredIds.includes(Number(w.id)));
      if (starred.length >= 4) return starred;
    }
    return pool.length > 0 ? pool : allVocab;
  }, [
    activeCustomLesson,
    allBooksInLevel,
    allCurriculumMode,
    allVocab,
    bookWords,
    levelWords,
    onlyStarred,
    starredIds,
    validSelectedUnits,
  ]);

  const dailyChallengeIds = useMemo(
    () =>
      pickDailyChallengeIds(
        bookWords.length > 0 ? bookWords : levelWords,
        todayKey,
        `${activeLevel}|${activeBook.id}`,
      ),
    [activeBook.id, activeLevel, bookWords, levelWords, todayKey],
  );
  const dailyDoneToday = miniProfile.dailyChallengeDates.includes(todayKey);
  const beltInfo = getBeltInfo(miniProfile.xp);

  // Words actually played: the selected lessons, or the review / daily-challenge set
  const gameWords = useMemo(() => {
    if (!practiceSet) return filteredWords;
    const byId = new Map<number, VocabularyItem>();
    for (const w of [...allVocab, ...bookWords, ...filteredWords]) byId.set(w.id, w);
    const picked = practiceSet.ids
      .map((id) => byId.get(id))
      .filter((w): w is VocabularyItem => w !== undefined);
    if (picked.length >= MIN_PRACTICE_WORDS) return picked;
    const pickedIds = new Set(picked.map((w) => w.id));
    const filler = shuffleArray(filteredWords.filter((w) => !pickedIds.has(w.id))).slice(
      0,
      MIN_PRACTICE_WORDS - picked.length,
    );
    return [...picked, ...filler];
  }, [allVocab, bookWords, filteredWords, practiceSet]);

  const practiceKey = practiceSet ? `${practiceSet.kind}-${practiceSet.ids.join('.')}` : 'lessons';

  const startDailyChallenge = () => {
    setLastMissedIds([]);
    setPracticeSet({
      kind: 'daily',
      ids: dailyChallengeIds,
      label: `Thử thách hôm nay · ${dailyChallengeIds.length} từ`,
    });
  };

  const startMissedReview = () => {
    setPracticeSet({
      kind: 'review',
      ids: lastMissedIds,
      label: `Ôn ${lastMissedIds.length} từ vừa sai`,
    });
    setLastMissedIds([]);
  };

  const levelKanjis = useMemo(() => {
    const all = getLiveKanjis(cmsSnapshot);
    if (allCurriculumMode) return all;
    const scoped = all.filter((k) => k.jlptLevel === activeLevel);
    return scoped.length >= 6 ? scoped : all;
  }, [activeLevel, allCurriculumMode, cmsSnapshot]);

  const levelGrammars = useMemo(() => {
    const books = getLiveGrammarBooks(cmsSnapshot);
    if (allCurriculumMode) {
      return books.flatMap((b) => b.chapters.flatMap((c) => c.grammars));
    }
    const scoped = books
      .filter((b) => b.level === activeLevel)
      .flatMap((b) => b.chapters.flatMap((c) => c.grammars));
    return scoped.length >= 6
      ? scoped
      : books.flatMap((b) => b.chapters.flatMap((c) => c.grammars));
  }, [activeLevel, allCurriculumMode, cmsSnapshot]);

  const updateHighScore = (gameId: MiniGameId, score: number) => {
    setHighScores((prev) => {
      if (score <= (prev[gameId] ?? 0)) return prev;
      const next = { ...prev, [gameId]: score };
      try {
        window.localStorage.setItem(
          user?.id ? `${HIGH_SCORE_KEY}:${user.id}` : HIGH_SCORE_KEY,
          JSON.stringify(next),
        );
        notifyDeviceDataChanged();
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleSelectGame = (gameId: MiniGameId) => {
    const next = new URLSearchParams(searchParams);
    next.set('game', gameId);
    setSearchParams(next, { replace: true });
  };

  const handleRecordGameCompletion = (options: {
    gameId: MiniGameId;
    score: number;
    skill: StageSkill;
    totalQuestions: number;
    correctAnswers: number;
    durationSeconds: number;
    /** Word ids answered wrong (Ninja & Fruit slash report them) */
    missedIds?: number[];
  }) => {
    updateHighScore(options.gameId, options.score);
    if (options.missedIds) {
      setLastMissedIds(options.missedIds);
      if (practiceSet?.kind === 'review' && options.missedIds.length === 0) {
        toast({ title: 'Bạn đã nhớ hết các từ vừa sai!', tone: 'success' });
      }
    }
    recordDailyStageSkillActivity(options.skill, user?.id);
    void recordQuizAttempt({
      quizType: `minigame-${options.gameId}`,
      level: activeLevel,
      score: Math.max(0, options.correctAnswers),
      totalQuestions: Math.max(1, options.totalQuestions),
      durationSeconds: Math.max(5, options.durationSeconds),
    });
    void awardMiniGameXp(
      user?.id,
      computeRoundXp(options.correctAnswers),
      practiceSet?.kind === 'daily' ? todayKey : undefined,
    ).then((res) => {
      setMiniProfile(res.profile);
      toast({
        title: `Xong ván! +${res.gainedXp + res.dailyBonusXp} XP`,
        description:
          res.dailyBonusXp > 0
            ? `Hoàn thành thử thách hôm nay (+${res.dailyBonusXp} XP thưởng).`
            : `${options.score.toLocaleString('vi-VN')} điểm · đã tính vào mục tiêu hôm nay.`,
        tone: 'success',
      });
      if (res.newBelt) {
        toast({ title: `🎉 Chúc mừng! Bạn đã lên ${res.newBelt.name}`, tone: 'success' });
      }
    });
  };

  const scopeMode: 'custom' | 'all-curriculum' | 'level' = activeCustomLesson
    ? 'custom'
    : allCurriculumMode
      ? 'all-curriculum'
      : 'level';

  const selectedUnitKey = activeCustomLesson
    ? `custom-${activeCustomLesson.id}`
    : allCurriculumMode
      ? 'ALL_BOOKS'
      : allBooksInLevel
        ? `ALL_LEVEL_${activeLevel}`
        : validSelectedUnits.length === 0
          ? `${activeLevel}-${activeBook.id}-ALL`
          : `${activeLevel}-${activeBook.id}-${validSelectedUnits.map((u) => String(u.id)).join(',')}`;

  const gameContextLabel = activeCustomLesson
    ? `Bài tự tạo · ${activeCustomLesson.title}`
    : allCurriculumMode
      ? 'Tất cả giáo trình (N5–N3)'
      : allBooksInLevel
        ? `${activeLevel} · Tất cả sách (${levelBooksWithStats.length} sách)`
        : validSelectedUnits.length === 0
          ? `${activeLevel} · ${activeBook.shortTitle} · Trọn bộ`
          : validSelectedUnits.length === 1
            ? `${activeLevel} · ${activeBook.shortTitle} · ${formatUnitTopicLabel(validSelectedUnits[0].name, 0)}`
            : `${activeLevel} · ${activeBook.shortTitle} · ${validSelectedUnits.length} bài`;

  const levelRangeLabel = availableLevels.length > 1
    ? `${availableLevels[0]}–${availableLevels[availableLevels.length - 1]}`
    : availableLevels[0] ?? 'N5';

  return (
    <PageContainer size="lg" className="max-w-5xl space-y-3 py-1">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Mini-game' },
        ]}
        title="Mini-game"
      />

      {/* Ninja belt + daily challenge */}
      <Card
        padding="sm"
        className="grid gap-3 bg-surface/90 backdrop-blur-md sm:grid-cols-2 sm:items-center"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={cn('h-3 w-10 shrink-0 rounded-full', beltInfo.belt.stripeClass)}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-bold text-fg">{beltInfo.belt.name}</p>
              <p className="text-xs text-muted tabular-nums">
                {miniProfile.xp.toLocaleString('vi-VN')} XP
              </p>
            </div>
            <ProgressBar
              value={Math.round(beltInfo.progress * 100)}
              max={100}
              size="sm"
              tone="primary"
              label="Tiến độ lên đai tiếp theo"
            />
            <p className="text-xs text-muted">
              {beltInfo.next
                ? `Còn ${beltInfo.xpToNext.toLocaleString('vi-VN')} XP để lên ${beltInfo.next.name}`
                : 'Bạn đã đạt đai cao nhất!'}
              {!user && ' · Đăng nhập để lưu đai'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-fg">
              <Target className="size-4 text-primary-fg" aria-hidden />
              Thử thách hôm nay
            </p>
            <p className="text-xs text-muted">
              {dailyDoneToday
                ? 'Đã hoàn thành — mai quay lại nhé!'
                : `${dailyChallengeIds.length} từ · game nào cũng được · +${DAILY_CHALLENGE_BONUS_XP} XP`}
            </p>
          </div>
          {dailyDoneToday ? (
            <Badge tone="success">
              <CheckCircle2 className="size-3.5" aria-hidden />
              Xong
            </Badge>
          ) : (
            <Button
              size="sm"
              variant={practiceSet?.kind === 'daily' ? 'secondary' : 'primary'}
              disabled={practiceSet?.kind === 'daily' || dailyChallengeIds.length < 4}
              onClick={startDailyChallenge}
            >
              {practiceSet?.kind === 'daily' ? 'Đang chơi' : 'Chơi ngay'}
            </Button>
          )}
        </div>
      </Card>

      {/* Game picker: horizontal swipe on phones, grid from tablet up */}
      <div
        role="tablist"
        aria-label="Chọn trò chơi"
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-6"
      >
        {MINI_GAMES.map((g) => {
          const isSelected = activeGame === g.id;
          const best = highScores[g.id] ?? 0;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleSelectGame(g.id)}
              className={cn(
                'flex w-40 shrink-0 snap-start flex-col gap-2 rounded-2xl border p-3 text-left backdrop-blur-md',
                'transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] sm:w-auto',
                isSelected
                  ? 'border-primary bg-surface/95 shadow-card ring-2 ring-primary/25'
                  : 'border-line bg-surface/70 hover:border-primary/60 hover:bg-surface/90',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  lang="ja"
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-xl text-lg font-bold',
                    isSelected ? 'bg-primary text-on-primary' : 'bg-primary-soft text-primary-fg',
                  )}
                >
                  {g.glyph}
                </span>
                {g.badge && <Badge tone="sakura">{g.badge}</Badge>}
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-bold text-fg">{g.title}</p>
                <p className="line-clamp-2 text-xs text-muted">{g.subtitle}</p>
              </div>
              <p className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-muted">
                <Trophy
                  className={cn('size-3.5', best > 0 ? 'text-warning' : 'text-subtle')}
                  aria-hidden
                />
                {best > 0 ? `Kỷ lục ${best.toLocaleString('vi-VN')}` : 'Chưa có kỷ lục'}
              </p>
            </button>
          );
        })}
      </div>

      {/* Bộ chọn nguồn từ vựng: phân rõ Trình độ (N5–N3) → Giáo trình / Sách → Bài học */}
      <Card padding="sm" className="space-y-3 bg-surface/90 backdrop-blur-md">
        {/* Thanh tiêu đề & công cụ phụ */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-2.5">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-fg">
            <BookOpen className="size-4 text-primary-fg" aria-hidden />
            Chọn nội dung luyện tập
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip selected={onlyStarred} onClick={() => setOnlyStarred((v) => !v)}>
              ★ Từ sao ({starredIds.length})
            </Chip>
            <IconButton
              variant="secondary"
              size="sm"
              aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              aria-pressed={soundEnabled}
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              onClick={handleToggleSound}
            >
              {soundEnabled ? (
                <Volume2 className="size-4 text-primary-fg" aria-hidden />
              ) : (
                <VolumeX className="size-4 text-muted" aria-hidden />
              )}
            </IconButton>
          </div>
        </div>

        {/* Trình độ → Giáo trình → Bài học: three compact selects on one row */}
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            aria-label="Chọn trình độ JLPT"
            value={scopeMode === 'level' ? activeLevel : scopeMode === 'custom' ? 'custom' : 'all'}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'all') applyAllCurriculumMode();
              else if (v === 'custom') {
                const targetId = activeCustomLesson?.id ?? studioVocabLessons[0]?.id;
                if (targetId) applyCustomLessonId(targetId);
              } else handleSelectLevel(v as (typeof availableLevels)[number]);
            }}
          >
            {availableLevels.map((lvl) => (
              <option key={lvl} value={lvl}>
                Trình độ {lvl} ({levelWordCountMap[lvl].toLocaleString('vi-VN')} từ)
              </option>
            ))}
            <option value="all">
              Tất cả {levelRangeLabel} ({allVocab.length.toLocaleString('vi-VN')} từ)
            </option>
            {studioVocabLessons.length > 0 && (
              <option value="custom">★ Bài tự tạo ({studioVocabLessons.length})</option>
            )}
          </Select>

          {scopeMode === 'level' && levelBooksWithStats.length > 1 && (
            <Select
              aria-label={`Chọn giáo trình ${activeLevel}`}
              value={allBooksInLevel ? 'all' : activeBook.id}
              onChange={(e) => {
                if (e.target.value === 'all') applyAllBooksInLevel();
                else handleSelectBook(e.target.value);
              }}
            >
              <option value="all">
                Mọi giáo trình {activeLevel} ({levelWords.length.toLocaleString('vi-VN')} từ)
              </option>
              {levelBooksWithStats.map(({ book, unitCount, wordCount }) => (
                <option key={book.id} value={book.id}>
                  {book.shortTitle} · {unitCount} bài · {wordCount} từ
                </option>
              ))}
            </Select>
          )}

          {scopeMode === 'level' && !allBooksInLevel && bookUnits.length > 0 && (
            <div className="flex gap-1.5">
              <Select
                aria-label={`Chọn bài học trong ${activeBook.shortTitle}`}
                wrapperClassName="min-w-0 flex-1"
                className="w-full"
                value={
                  validSelectedUnits.length === 0
                    ? ''
                    : validSelectedUnits.length === 1
                      ? String(validSelectedUnits[0].id)
                      : 'multi'
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') applySelectedUnitIds([]);
                  else if (v.startsWith('range:')) {
                    const [a, b] = v.slice(6).split('-').map(Number);
                    applySelectedUnitIds(bookUnits.slice(a, b).map((u) => String(u.id)));
                  } else if (v !== 'multi') applySelectedUnitIds([v]);
                }}
              >
                <option value="">Trọn bộ ({bookUnits.length} bài)</option>
                {validSelectedUnits.length > 1 && (
                  <option value="multi">Đang chọn {validSelectedUnits.length} bài</option>
                )}
                {bookUnits.length > 10 &&
                  Array.from({ length: Math.ceil(bookUnits.length / 5) }, (_, i) => (
                    <option key={`r${i}`} value={`range:${i * 5}-${i * 5 + 5}`}>
                      Bài {i * 5 + 1}–{Math.min(i * 5 + 5, bookUnits.length)}
                    </option>
                  ))}
                {bookUnits.map((u, idx) => (
                  <option key={u.id} value={String(u.id)}>
                    {formatUnitShortLabel(u.name, idx)} ({u.totalWords} từ)
                  </option>
                ))}
              </Select>
              <IconButton
                variant="secondary"
                aria-label="Chọn gộp nhiều bài"
                title="Chọn gộp nhiều bài"
                aria-pressed={showLessonPicker}
                onClick={() => setShowLessonPicker((v) => !v)}
              >
                {showLessonPicker ? (
                  <ChevronUp className="size-4" aria-hidden />
                ) : (
                  <ListChecks className="size-4" aria-hidden />
                )}
              </IconButton>
            </div>
          )}

          {scopeMode === 'custom' && studioVocabLessons.length > 0 && (
            <Select
              aria-label="Chọn bài tự tạo"
              wrapperClassName="sm:col-span-2"
              value={activeCustomLesson?.id ?? ''}
              onChange={(e) => applyCustomLessonId(e.target.value)}
            >
              {studioVocabLessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title} ({lesson.vocabItems?.length ?? 0} từ)
                </option>
              ))}
            </Select>
          )}
        </div>

        {/* Optional multi-lesson picker */}
        {scopeMode === 'level' && !allBooksInLevel && showLessonPicker && bookUnits.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-line bg-surface-2/50 p-2.5">
            <p className="text-xs text-muted">Chạm để bật/tắt từng bài — có thể gộp nhiều bài cùng lúc.</p>
            <div className="flex flex-wrap gap-1.5">
              {bookUnits.map((u, idx) => {
                const uid = String(u.id);
                const isSelected = validSelectedUnits.some((v) => String(v.id) === uid);
                return (
                  <Chip key={u.id} selected={isSelected} onClick={() => toggleUnitSelection(uid)}>
                    <span title={u.name}>{formatUnitShortLabel(u.name, idx)}</span>
                    <span className="text-[11px] opacity-75 tabular-nums">({u.totalWords})</span>
                  </Chip>
                );
              })}
            </div>
          </div>
        )}

        {/* Tóm tắt phạm vi đang chơi */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2 text-xs text-muted">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-fg">{gameContextLabel}</span>
            <span aria-hidden>·</span>
            <span>
              <strong className="text-fg tabular-nums">
                {filteredWords.length.toLocaleString('vi-VN')}
              </strong>{' '}
              từ sẵn sàng
              {onlyStarred && ' · lọc từ sao'}
            </span>
          </div>
          {scopeMode === 'level' && !allBooksInLevel && validSelectedUnits.length > 0 && (
            <button
              type="button"
              onClick={() => applySelectedUnitIds([])}
              className="font-medium text-primary-fg hover:underline"
            >
              Chơi trọn bộ sách
            </button>
          )}
        </div>
      </Card>

      {/* Practice mode banner, or the offer to review the words just missed */}
      {practiceSet ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary bg-primary-soft px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-fg">
            {practiceSet.kind === 'daily' ? (
              <Target className="size-4" aria-hidden />
            ) : (
              <RotateCcw className="size-4" aria-hidden />
            )}
            {practiceSet.label}
          </span>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<X className="size-3.5" aria-hidden />}
            onClick={() => setPracticeSet(null)}
          >
            Thoát
          </Button>
        </div>
      ) : lastMissedIds.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning-line bg-warning-soft px-3 py-2">
          <span className="text-sm text-warning-fg">
            Ván vừa rồi còn <strong>{lastMissedIds.length}</strong> từ bạn chưa nhớ.
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="primary"
              leftIcon={<RotateCcw className="size-3.5" aria-hidden />}
              onClick={startMissedReview}
            >
              Ôn lại ngay
            </Button>
            <IconButton size="sm" aria-label="Bỏ qua" onClick={() => setLastMissedIds([])}>
              <X className="size-4" aria-hidden />
            </IconButton>
          </div>
        </div>
      ) : null}

      {/* Active Mini-Game Arena */}
      {gameWords.length === 0 ? (
        <EmptyState
          title="Chưa có từ vựng trong bộ lọc này"
          description="Hãy chọn Tất cả các bài hoặc đổi giáo trình để bắt đầu chơi."
        />
      ) : activeGame === 'shooter' ? (
        <NinjaBridgeShooterGame
          key={`shooter-${selectedUnitKey}-${onlyStarred}-${practiceKey}`}
          words={gameWords}
          contextLabel={practiceSet ? practiceSet.label : gameContextLabel}
          starredIds={starredIds}
          onToggleStar={(id) => toggleStar(id)}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onSessionFinish={({ score, defeatedCount, missedWords, durationSeconds }) =>
            handleRecordGameCompletion({
              gameId: 'shooter',
              score,
              skill: 'vocab',
              totalQuestions: Math.max(1, defeatedCount + missedWords.length),
              correctAnswers: defeatedCount,
              durationSeconds,
              missedIds: missedWords.map((w) => w.id),
            })
          }
        />
      ) : activeGame === 'slash' ? (
        <FruitSlashVocabGame
          key={`slash-${selectedUnitKey}-${onlyStarred}-${practiceKey}`}
          words={gameWords}
          contextLabel={practiceSet ? practiceSet.label : gameContextLabel}
          starredIds={starredIds}
          onToggleStar={(id) => toggleStar(id)}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onSessionFinish={({ score, correctCount, missedWords, durationSeconds }) =>
            handleRecordGameCompletion({
              gameId: 'slash',
              score,
              skill: 'vocab',
              totalQuestions: Math.max(1, correctCount + missedWords.length),
              correctAnswers: correctCount,
              durationSeconds,
              missedIds: missedWords.map((w) => w.id),
            })
          }
        />
      ) : activeGame === 'match' ? (
        <PairMatchGame
          key={`match-${selectedUnitKey}-${onlyStarred}-${practiceKey}`}
          words={gameWords}
          kanjis={levelKanjis}
          grammars={levelGrammars}
          levelLabel={gameContextLabel}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onCompleteRound={({ score, skill, seconds, matchedCount }) =>
            handleRecordGameCompletion({
              gameId: 'match',
              score,
              skill,
              totalQuestions: Math.max(1, matchedCount),
              correctAnswers: matchedCount,
              durationSeconds: seconds,
            })
          }
        />
      ) : activeGame === 'memory' ? (
        <MemoryFlipGame
          key={`memory-${activeBook.id}-${selectedUnitKey}-${onlyStarred}-${practiceKey}`}
          words={gameWords}
          kanjis={levelKanjis}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onCompleteRound={({ score, skill, moves, matchedPairs }) =>
            handleRecordGameCompletion({
              gameId: 'memory',
              score,
              skill,
              totalQuestions: Math.max(1, matchedPairs),
              correctAnswers: matchedPairs,
              durationSeconds: Math.max(5, moves * 3),
            })
          }
        />
      ) : activeGame === 'truefalse' ? (
        <SpeedTrueFalseGame
          key={`tf-${activeBook.id}-${selectedUnitKey}-${onlyStarred}-${practiceKey}`}
          words={gameWords}
          kanjis={levelKanjis}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onCompleteRound={({ score, skill, correctCount, totalAnswered }) =>
            handleRecordGameCompletion({
              gameId: 'truefalse',
              score,
              skill,
              totalQuestions: Math.max(1, totalAnswered),
              correctAnswers: correctCount,
              durationSeconds: Math.max(5, totalAnswered * 2),
            })
          }
        />
      ) : (
        <ListeningDojoGame
          key={`list-${activeBook.id}-${selectedUnitKey}-${onlyStarred}-${practiceKey}`}
          words={gameWords}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onCompleteRound={({ score, skill, correctCount, totalAnswered }) =>
            handleRecordGameCompletion({
              gameId: 'listening',
              score,
              skill,
              totalQuestions: Math.max(1, totalAnswered),
              correctAnswers: correctCount,
              durationSeconds: Math.max(5, totalAnswered * 4),
            })
          }
        />
      )}
    </PageContainer>
  );
};
