import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronDown, ChevronUp, Sparkles, Volume2, VolumeX } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
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
  badge: string;
  featured?: boolean;
}

const MINI_GAMES: MiniGameSpec[] = [
  {
    id: 'shooter',
    glyph: '剣',
    title: 'Chém Từ Vựng (Ninja Cầu Anh Đào)',
    subtitle: 'PC gõ Hiragana / Chữ Hán · iPad/Mobile ghép mảnh Kana phóng kiếm khí hạ Yōkai.',
    badge: 'Game chính',
    featured: true,
  },
  {
    id: 'slash',
    glyph: '斬',
    title: 'Chém Hoa Quả Từ Vựng (Fruit Slash)',
    subtitle: 'Nhìn nghĩa phía trên, vuốt chém đôi quả cầu tiếng Nhật đúng nghĩa & tránh bom!',
    badge: 'Mới · Vuốt chém',
    featured: true,
  },
  {
    id: 'match',
    glyph: '結',
    title: 'Nối Cặp 2 Cột (Liên Kết Bùa)',
    subtitle: 'Nối nhanh Chữ Hán ↔ Nghĩa, Chữ Hán ↔ Âm đọc, Từ vựng & Ngữ pháp.',
    badge: '4 chế độ nối',
  },
  {
    id: 'memory',
    glyph: '札',
    title: 'Lật Thẻ Ký Ức (Cặp Bùa Nhật)',
    subtitle: 'Lật mở 12 thẻ bùa tìm cặp Từ vựng / Kanji ↔ Nghĩa Việt kèm phát âm.',
    badge: 'Nhớ mặt chữ',
  },
  {
    id: 'truefalse',
    glyph: '速',
    title: 'Phản Xạ Đúng / Sai 45s (○ / ×)',
    subtitle: 'Phán đoán siêu tốc cặp Từ vựng & Kanji là Đúng hay Sai trong 45 giây.',
    badge: 'Tốc độ 45s',
  },
  {
    id: 'listening',
    glyph: '聴',
    title: 'Thính Giác Ninja (Nghe & Bắt Âm)',
    subtitle: 'Ẩn mặt chữ, nghe giọng đọc tiếng Nhật và bắt đúng mục tiêu.',
    badge: 'Phản xạ nghe',
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
          { label: 'Phòng Mini-game (Dojo)' },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>Phòng Mini-game · Dojo Phản Xạ</span>
            <Badge tone="primary">
              {activeCustomLesson
                ? `Bài tự tạo · ${activeCustomLesson.level}`
                : `${activeLevel} · ${activeBook.shortTitle}`}
            </Badge>
            <Badge tone="sakura">{filteredWords.length} từ sẵn sàng</Badge>
          </span>
        }
        description="Chọn trò chơi và chọn bài học (hoặc bài tự tạo trong Studio) bên dưới — tự động tính vào mục tiêu học hằng ngày."
      />

      {/* Compact 6 Mini-Game Switcher Strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {MINI_GAMES.map((g) => {
          const isSelected = activeGame === g.id;
          const best = highScores[g.id] ?? 0;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => handleSelectGame(g.id)}
              title={g.subtitle}
              className={cn(
                'flex cursor-pointer flex-col justify-between rounded-xl border px-2.5 py-2 text-left shadow-card transition-all duration-150',
                isSelected
                  ? 'border-primary bg-primary-soft/75 ring-2 ring-primary/30'
                  : 'border-line bg-glass hover:border-primary/60',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  lang="ja"
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold',
                    isSelected
                      ? 'bg-primary text-on-primary'
                      : 'bg-primary-soft text-primary-fg',
                  )}
                >
                  {g.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-fg">
                    {g.title.split('(')[0].trim()}
                  </p>
                  <p className="truncate text-[10px] text-muted">
                    {best > 0 ? `🏆 ${best.toLocaleString('vi-VN')}` : g.badge}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Unified Lesson Picker & Audio Control Card */}
      <Card padding="sm" className="space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted">Bài chơi:</span>
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
              wrapperClassName="w-full sm:w-64"
              className="w-full"
            >
              {studioVocabLessons.length > 0 && (
                <optgroup label="Bài tự tạo của bạn (Studio)">
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
              <Button
                type="button"
                variant={showLessonPicker ? 'primary' : 'soft'}
                size="sm"
                onClick={() => setShowLessonPicker((v) => !v)}
                leftIcon={<BookOpen className="size-3.5" aria-hidden />}
                rightIcon={
                  showLessonPicker ? (
                    <ChevronUp className="size-3.5" aria-hidden />
                  ) : (
                    <ChevronDown className="size-3.5" aria-hidden />
                  )
                }
              >
                {validSelectedUnits.length > 0
                  ? `Chọn từng bài (${validSelectedUnits.length})`
                  : 'Chọn từng bài / nhiều bài'}
              </Button>
            )}

            <Chip
              selected={onlyStarred}
              onClick={() => setOnlyStarred((v) => !v)}
            >
              ★ Từ sao ({starredIds.length})
            </Chip>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleToggleSound}
              leftIcon={
                soundEnabled ? (
                  <Volume2 className="size-4 text-primary-fg" aria-hidden />
                ) : (
                  <VolumeX className="size-4 text-muted" aria-hidden />
                )
              }
            >
              {soundEnabled ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}
            </Button>

            <Link
              to="/studio"
              className={buttonStyles({ variant: 'soft', size: 'sm' })}
            >
              <Sparkles className="size-3.5" aria-hidden />
              <span>Tự tạo bài</span>
            </Link>

            <Chip selected={false} onClick={requestOpenLevelModal}>
              Đổi giáo trình ({activeLevel})
            </Chip>
          </div>
        </div>

        {/* Collapsible Multi-Lesson Pill Grid */}
        {showLessonPicker && bookUnits.length > 0 && (
          <div className="space-y-2 border-t border-line pt-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted">
                Chạm từng bài để bật/tắt (có thể gộp nhiều bài để luyện cùng lúc):
              </span>
              <div className="flex flex-wrap items-center gap-1">
                <Chip
                  selected={validSelectedUnits.length === 0}
                  onClick={() => applySelectedUnitIds([])}
                >
                  Tất cả ({bookUnits.length} bài)
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
                      const sliceIds = bookUnits
                        .slice(start, end)
                        .map((u) => String(u.id));
                      const isRangeActive =
                        sliceIds.length > 0 &&
                        validSelectedUnits.length === sliceIds.length &&
                        sliceIds.every((id) =>
                          validSelectedUnits.some((u) => String(u.id) === id),
                        );
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
            </div>

            <div className="flex flex-wrap gap-1.5">
              {bookUnits.map((u, idx) => {
                const uid = String(u.id);
                const isSelected = validSelectedUnits.some((v) => String(v.id) === uid);
                const shortLabel = u.name.split('(')[0].split('—')[0].trim() || `Bài ${idx + 1}`;
                return (
                  <Chip
                    key={u.id}
                    selected={isSelected}
                    onClick={() => toggleUnitSelection(uid)}
                  >
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
