import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronDown, ChevronUp, Sparkles, Trophy, Volume2, VolumeX } from 'lucide-react';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  IconButton,
  PageContainer,
  PageHeader,
  Select,
  useToast,
} from '../components/ui';
import { buttonStyles } from '../components/ui/styles';
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
  getWordsForVocabTextbook,
  parseVocabLevelParam,
  resolveActiveVocabTextbook,
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
import { recordQuizAttempt } from '../services/quizHistoryService';
import {
  recordDailyStageSkillActivity,
  type StageSkill,
} from '../services/stageRoadmapService';
import { requestOpenLevelModal, type StudyLevel } from '../services/userLevelService';
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
    subtitle: 'Gõ Hiragana hoặc ghép Kana để hạ Yōkai trên cầu.',
    badge: 'Hot',
  },
  {
    id: 'slash',
    glyph: '斬',
    title: 'Chém hoa quả',
    subtitle: 'Vuốt chém quả cầu đúng nghĩa, nhớ tránh bom.',
    badge: 'Mới',
  },
  {
    id: 'match',
    glyph: '結',
    title: 'Nối cặp',
    subtitle: 'Nối Kanji ↔ nghĩa, âm đọc, từ vựng, ngữ pháp.',
  },
  {
    id: 'memory',
    glyph: '札',
    title: 'Lật thẻ',
    subtitle: 'Lật 12 thẻ, tìm cặp từ ↔ nghĩa.',
  },
  {
    id: 'truefalse',
    glyph: '速',
    title: 'Đúng hay sai',
    subtitle: 'Phán đoán nhanh trong 45 giây.',
  },
  {
    id: 'listening',
    glyph: '聴',
    title: 'Luyện nghe',
    subtitle: 'Nghe giọng đọc, bắt đúng từ.',
  },
];

const HIGH_SCORE_KEY = 'nihonmaster_minigame_highscores_v1';
const SOUND_PREF_KEY = 'nihonmaster_minigame_sound_v1';

function loadHighScores(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
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

  const activeLevel: StudyLevel =
    parseVocabLevelParam(searchParams.get('level')) ??
    studyLevel ??
    getPreferredVocabLevel(user?.id) ??
    'N5';

  const activeBook = useMemo(
    () =>
      resolveActiveVocabTextbook(
        activeLevel,
        user?.id,
        searchParams.get('book') ?? (activeLevel === studyLevel ? studyTextbookId : null),
      ),
    [activeLevel, searchParams, studyLevel, studyTextbookId, user?.id],
  );

  const [studioVocabLessons, setStudioVocabLessons] = useState<CustomLesson[]>(() =>
    loadCustomStudioState(user?.id).lessons.filter(
      (l) => l.kind === 'vocab' && (l.vocabItems?.length ?? 0) >= 2,
    ),
  );
  const [selectedCustomLessonId, setSelectedCustomLessonId] = useState<string | null>(() =>
    searchParams.get('customLesson'),
  );
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
  const [highScores, setHighScores] = useState<Record<string, number>>(() => loadHighScores());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => loadSoundPref());

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

  const applySelectedUnitIds = useCallback(
    (nextIds: string[]) => {
      setSelectedCustomLessonId(null);
      setSelectedUnitIds(nextIds);
      const next = new URLSearchParams(searchParams);
      next.delete('customLesson');
      if (nextIds.length === 0) {
        next.delete('unit');
      } else {
        next.set('unit', nextIds.join(','));
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const applyCustomLessonId = useCallback(
    (lessonId: string) => {
      setSelectedCustomLessonId(lessonId);
      setSelectedUnitIds([]);
      setShowLessonPicker(false);
      const next = new URLSearchParams(searchParams);
      next.delete('unit');
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

  const allVocab = useMemo(() => getLiveAllVocabulary(cmsSnapshot), [cmsSnapshot]);
  const bookWords = useMemo(
    () => getWordsForVocabTextbook(cmsSnapshot, activeLevel, activeBook),
    [activeBook, activeLevel, cmsSnapshot],
  );

  const filteredWords = useMemo(() => {
    if (activeCustomLesson) {
      return customVocabToVocabularyItems(activeCustomLesson);
    }
    let pool = bookWords;
    if (validSelectedUnits.length > 0) {
      const selectedSet = new Set(validSelectedUnits.map((u) => u.id));
      const unitScoped = bookWords.filter((w) => selectedSet.has(w.unitId));
      if (unitScoped.length > 0) pool = unitScoped;
    }
    if (onlyStarred) {
      const starred = pool.filter((w) => starredIds.includes(Number(w.id)));
      if (starred.length >= 4) return starred;
    }
    return pool.length > 0 ? pool : allVocab;
  }, [activeCustomLesson, allVocab, bookWords, onlyStarred, starredIds, validSelectedUnits]);

  const levelKanjis = useMemo(() => {
    const all = getLiveKanjis(cmsSnapshot);
    const scoped = all.filter((k) => k.jlptLevel === activeLevel);
    return scoped.length >= 6 ? scoped : all;
  }, [activeLevel, cmsSnapshot]);

  const levelGrammars = useMemo(() => {
    const books = getLiveGrammarBooks(cmsSnapshot);
    const scoped = books
      .filter((b) => b.level === activeLevel)
      .flatMap((b) => b.chapters.flatMap((c) => c.grammars));
    return scoped.length >= 6
      ? scoped
      : books.flatMap((b) => b.chapters.flatMap((c) => c.grammars));
  }, [activeLevel, cmsSnapshot]);

  const updateHighScore = (gameId: MiniGameId, score: number) => {
    setHighScores((prev) => {
      if (score <= (prev[gameId] ?? 0)) return prev;
      const next = { ...prev, [gameId]: score };
      try {
        window.localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(next));
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
  }) => {
    updateHighScore(options.gameId, options.score);
    recordDailyStageSkillActivity(options.skill, user?.id);
    void recordQuizAttempt({
      quizType: `minigame-${options.gameId}`,
      level: activeLevel,
      score: Math.max(0, options.correctAnswers),
      totalQuestions: Math.max(1, options.totalQuestions),
      durationSeconds: Math.max(5, options.durationSeconds),
    });
    toast({
      title: `Hoàn thành Mini-game (+${options.score} điểm)! Đã tự động tích tiến độ học hôm nay.`,
      tone: 'success',
    });
  };

  const selectedUnitKey = activeCustomLesson
    ? `custom-${activeCustomLesson.id}`
    : validSelectedUnits.length === 0
      ? 'ALL'
      : validSelectedUnits.map((u) => String(u.id)).join(',');

  const selectedUnitLabel = activeCustomLesson
    ? `Bài tự tạo: ${activeCustomLesson.title}`
    : validSelectedUnits.length === 0
      ? `Trọn bộ ${activeBook.shortTitle}`
      : validSelectedUnits.length === 1
        ? validSelectedUnits[0].name
        : `${validSelectedUnits.length} bài đã chọn (${filteredWords.length} từ)`;

  const selectValue = activeCustomLesson
    ? `custom:${activeCustomLesson.id}`
    : validSelectedUnits.length === 0
      ? 'ALL'
      : validSelectedUnits.length === 1
        ? String(validSelectedUnits[0].id)
        : 'MULTI';

  return (
    <PageContainer size="lg" className="max-w-5xl space-y-3 py-1">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Mini-game' },
        ]}
        title="Mini-game"
        description="Học từ vựng qua trò chơi — mỗi ván đều được tính vào mục tiêu hôm nay."
      />

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

      {/* Lesson picker & sound — solid surface so it stays readable over the landscape */}
      <Card padding="sm" className="space-y-2.5 bg-surface/90 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Chọn bài học cho Mini-game"
            value={selectValue}
            onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith('custom:')) {
                applyCustomLessonId(val.slice('custom:'.length));
              } else if (val === 'ALL') {
                applySelectedUnitIds([]);
              } else if (val !== 'MULTI') {
                applySelectedUnitIds([val]);
              }
            }}
            wrapperClassName="min-w-0 flex-1 basis-56 sm:max-w-xs"
            className="w-full"
          >
            {studioVocabLessons.length > 0 && (
              <optgroup label="Bài tự tạo của bạn">
                {studioVocabLessons.map((lesson) => (
                  <option key={lesson.id} value={`custom:${lesson.id}`}>
                    ★ {lesson.title} ({lesson.vocabItems?.length ?? 0} từ)
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={`Giáo trình ${activeBook.shortTitle}`}>
              <option value="ALL">
                Tất cả ({bookUnits.length} bài · {bookWords.length} từ)
              </option>
              {selectValue === 'MULTI' && (
                <option value="MULTI">
                  Đã chọn {validSelectedUnits.length} bài ({filteredWords.length} từ)
                </option>
              )}
              {bookUnits.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name} ({u.totalWords} từ)
                </option>
              ))}
            </optgroup>
          </Select>

          {bookUnits.length > 1 && (
            <Chip selected={showLessonPicker} onClick={() => setShowLessonPicker((v) => !v)}>
              <BookOpen className="size-3.5" aria-hidden />
              {validSelectedUnits.length > 0 ? `Chọn bài (${validSelectedUnits.length})` : 'Chọn bài'}
              {showLessonPicker ? (
                <ChevronUp className="size-3.5" aria-hidden />
              ) : (
                <ChevronDown className="size-3.5" aria-hidden />
              )}
            </Chip>
          )}

          <Chip selected={onlyStarred} onClick={() => setOnlyStarred((v) => !v)}>
            ★ Từ sao ({starredIds.length})
          </Chip>

          <div className="ml-auto flex items-center gap-1.5">
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
            <Link to="/studio" className={buttonStyles({ variant: 'soft', size: 'sm' })}>
              <Sparkles className="size-3.5" aria-hidden />
              <span>Tự tạo bài</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>
            {activeCustomLesson
              ? `Bài tự tạo · ${activeCustomLesson.level}`
              : `${activeLevel} · ${activeBook.shortTitle}`}
          </span>
          <span aria-hidden>·</span>
          <span>
            <strong className="text-fg">{filteredWords.length}</strong> từ sẵn sàng
          </span>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={requestOpenLevelModal}
            className="font-medium text-primary-fg hover:underline"
          >
            Đổi giáo trình
          </button>
        </div>

        {/* Collapsible multi-lesson picker */}
        {showLessonPicker && bookUnits.length > 0 && (
          <div className="space-y-2 border-t border-line pt-2.5">
            <div className="flex flex-wrap items-center gap-1">
              <Chip
                selected={validSelectedUnits.length === 0}
                onClick={() => applySelectedUnitIds([])}
              >
                Tất cả
              </Chip>
              {bookUnits.length >= 10 &&
                [
                  [0, 5],
                  [5, 10],
                  [10, 15],
                  [15, 20],
                  [20, 25],
                ]
                  .filter(([start]) => start < bookUnits.length)
                  .map(([start, end]) => {
                    const sliceIds = bookUnits.slice(start, end).map((u) => String(u.id));
                    const isRangeActive =
                      sliceIds.length > 0 &&
                      validSelectedUnits.length === sliceIds.length &&
                      sliceIds.every((id) => validSelectedUnits.some((u) => String(u.id) === id));
                    return (
                      <Chip
                        key={`${start}-${end}`}
                        selected={isRangeActive}
                        onClick={() => applySelectedUnitIds(sliceIds)}
                      >
                        Bài {start + 1}–{Math.min(end, bookUnits.length)}
                      </Chip>
                    );
                  })}
            </div>
            <p className="text-xs text-muted">Chạm để bật/tắt từng bài — có thể gộp nhiều bài.</p>
            <div className="flex flex-wrap gap-1.5">
              {bookUnits.map((u, idx) => {
                const uid = String(u.id);
                const isSelected = validSelectedUnits.some((v) => String(v.id) === uid);
                const shortLabel = u.name.split('(')[0].split('—')[0].trim() || `Bài ${idx + 1}`;
                return (
                  <Chip key={u.id} selected={isSelected} onClick={() => toggleUnitSelection(uid)}>
                    {shortLabel} ({u.totalWords})
                  </Chip>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Active Mini-Game Arena */}
      {filteredWords.length === 0 ? (
        <EmptyState
          title="Chưa có từ vựng trong bộ lọc này"
          description="Hãy chọn Tất cả các bài hoặc đổi giáo trình để bắt đầu chơi."
        />
      ) : activeGame === 'shooter' ? (
        <NinjaBridgeShooterGame
          key={`shooter-${activeBook.id}-${selectedUnitKey}-${onlyStarred}`}
          words={filteredWords}
          contextLabel={`${activeLevel} · ${selectedUnitLabel}`}
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
            })
          }
        />
      ) : activeGame === 'slash' ? (
        <FruitSlashVocabGame
          key={`slash-${activeBook.id}-${selectedUnitKey}-${onlyStarred}`}
          words={filteredWords}
          contextLabel={`${activeLevel} · ${selectedUnitLabel}`}
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
            })
          }
        />
      ) : activeGame === 'match' ? (
        <PairMatchGame
          key={`match-${activeBook.id}-${selectedUnitKey}-${onlyStarred}`}
          words={filteredWords}
          kanjis={levelKanjis}
          grammars={levelGrammars}
          levelLabel={`${activeLevel} · ${selectedUnitLabel}`}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onCompleteRound={({ score, skill, seconds }) =>
            handleRecordGameCompletion({
              gameId: 'match',
              score,
              skill,
              totalQuestions: 18,
              correctAnswers: 18,
              durationSeconds: seconds,
            })
          }
        />
      ) : activeGame === 'memory' ? (
        <MemoryFlipGame
          key={`memory-${activeBook.id}-${selectedUnitKey}-${onlyStarred}`}
          words={filteredWords}
          kanjis={levelKanjis}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onCompleteRound={({ score, skill, moves }) =>
            handleRecordGameCompletion({
              gameId: 'memory',
              score,
              skill,
              totalQuestions: 6,
              correctAnswers: 6,
              durationSeconds: moves * 3,
            })
          }
        />
      ) : activeGame === 'truefalse' ? (
        <SpeedTrueFalseGame
          key={`tf-${activeBook.id}-${selectedUnitKey}-${onlyStarred}`}
          words={filteredWords}
          kanjis={levelKanjis}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onCompleteRound={({ score, skill, correctCount }) =>
            handleRecordGameCompletion({
              gameId: 'truefalse',
              score,
              skill,
              totalQuestions: Math.max(1, correctCount),
              correctAnswers: correctCount,
              durationSeconds: 45,
            })
          }
        />
      ) : (
        <ListeningDojoGame
          key={`list-${activeBook.id}-${selectedUnitKey}-${onlyStarred}`}
          words={filteredWords}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onCompleteRound={({ score, skill, correctCount }) =>
            handleRecordGameCompletion({
              gameId: 'listening',
              score,
              skill,
              totalQuestions: 10,
              correctAnswers: correctCount,
              durationSeconds: 40,
            })
          }
        />
      )}
    </PageContainer>
  );
};
