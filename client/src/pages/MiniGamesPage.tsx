import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  PageContainer,
  PageHeader,
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
import { recordQuizAttempt } from '../services/quizHistoryService';
import {
  recordDailyStageSkillActivity,
  type StageSkill,
} from '../services/stageRoadmapService';
import { requestOpenLevelModal, type StudyLevel } from '../services/userLevelService';

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
    subtitle: 'PC gõ Romaji · iPad/Mobile ghép mảnh Kana phóng kiếm khí hạ Yōkai.',
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

function loadHighScores(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
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

  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    () => searchParams.get('unit') || 'ALL',
  );
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [highScores, setHighScores] = useState<Record<string, number>>(() => loadHighScores());

  const bookUnits = useMemo(
    () => getUnitsForVocabTextbook(cmsSnapshot, activeLevel, activeBook),
    [activeBook, activeLevel, cmsSnapshot],
  );

  const allVocab = useMemo(() => getLiveAllVocabulary(cmsSnapshot), [cmsSnapshot]);
  const bookWords = useMemo(
    () => getWordsForVocabTextbook(cmsSnapshot, activeLevel, activeBook),
    [activeBook, activeLevel, cmsSnapshot],
  );

  const filteredWords = useMemo(() => {
    let pool = bookWords;
    if (selectedUnitId !== 'ALL') {
      const targetUnit = bookUnits.find(
        (u) => String(u.id) === selectedUnitId || String(u.dbUnitId) === selectedUnitId,
      );
      if (targetUnit) {
        const unitScoped = bookWords.filter((w) => w.unitId === targetUnit.id);
        if (unitScoped.length > 0) pool = unitScoped;
      }
    }
    if (onlyStarred) {
      const starred = pool.filter((w) => starredIds.includes(Number(w.id)));
      if (starred.length >= 4) return starred;
    }
    return pool.length > 0 ? pool : allVocab;
  }, [allVocab, bookUnits, bookWords, onlyStarred, selectedUnitId, starredIds]);

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

  const selectedUnitLabel =
    selectedUnitId === 'ALL'
      ? `Trọn bộ ${activeBook.shortTitle}`
      : bookUnits.find((u) => String(u.id) === selectedUnitId)?.name ?? `Bài ${selectedUnitId}`;

  return (
    <PageContainer size="lg" className="max-w-5xl space-y-5 py-2">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Phòng Mini-game (Dojo)' },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span>Phòng Mini-game · Dojo Phản Xạ</span>
            <Badge tone="primary">
              JLPT {activeLevel} · {activeBook.shortTitle}
            </Badge>
            <Badge tone="sakura">{filteredWords.length} từ sẵn sàng</Badge>
          </span>
        }
        description="Học mà chơi — mỗi ván 1–3 phút tự động lấy từ đúng bài bạn đang học, cộng vào thời gian online 10–15p và tự động tích xanh nhiệm vụ Màn."
      />

      {/* 6 Mini-Game Switcher Strip */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {MINI_GAMES.map((g) => {
          const isSelected = activeGame === g.id;
          const best = highScores[g.id] ?? 0;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => handleSelectGame(g.id)}
              className={cn(
                'flex cursor-pointer flex-col justify-between rounded-xl border p-3 text-left shadow-card transition-all duration-150',
                isSelected
                  ? 'border-primary bg-primary-soft/65 ring-2 ring-primary/25'
                  : 'border-line bg-glass hover:border-primary/60',
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    lang="ja"
                    className={cn(
                      'grid size-8 place-items-center rounded-lg text-sm font-bold',
                      isSelected
                        ? 'bg-primary text-on-primary'
                        : 'bg-primary-soft text-primary-fg',
                    )}
                  >
                    {g.glyph}
                  </span>
                  <Badge tone={g.featured ? 'sakura' : 'neutral'} className="text-[10px]">
                    {g.badge}
                  </Badge>
                </div>
                <p className="mt-2 text-xs font-bold text-fg sm:text-sm">{g.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">{g.subtitle}</p>
              </div>
              {best > 0 && (
                <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-success-fg">
                  <Trophy className="size-3" aria-hidden />
                  <span>Kỷ lục: {best.toLocaleString('vi-VN')}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Lesson & Scope Filter Bar */}
      <Card padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">Nguồn bài học:</span>
          <Select
            aria-label="Chọn bài học cho Mini-game"
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            className="sm:w-72"
          >
            <option value="ALL">
              Tất cả các bài · {activeBook.title} ({bookWords.length} từ)
            </option>
            {bookUnits.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.name} ({u.totalWords} từ)
              </option>
            ))}
          </Select>

          <Chip
            selected={onlyStarred}
            onClick={() => setOnlyStarred((v) => !v)}
          >
            ★ Ưu tiên từ đánh dấu sao ({starredIds.length})
          </Chip>
        </div>

        <Chip selected={false} onClick={requestOpenLevelModal}>
          Đổi trình độ / giáo trình ({activeLevel})
        </Chip>
      </Card>

      {/* Active Mini-Game Arena */}
      {filteredWords.length === 0 ? (
        <EmptyState
          title="Chưa có từ vựng trong bộ lọc này"
          description="Hãy chọn Tất cả các bài hoặc đổi giáo trình để bắt đầu chơi."
        />
      ) : activeGame === 'shooter' ? (
        <NinjaBridgeShooterGame
          key={`shooter-${activeBook.id}-${selectedUnitId}-${onlyStarred}`}
          words={filteredWords}
          contextLabel={`${activeLevel} · ${selectedUnitLabel}`}
          starredIds={starredIds}
          onToggleStar={(id) => toggleStar(id)}
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
          key={`slash-${activeBook.id}-${selectedUnitId}-${onlyStarred}`}
          words={filteredWords}
          contextLabel={`${activeLevel} · ${selectedUnitLabel}`}
          starredIds={starredIds}
          onToggleStar={(id) => toggleStar(id)}
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
          key={`match-${activeBook.id}-${selectedUnitId}-${onlyStarred}`}
          words={filteredWords}
          kanjis={levelKanjis}
          grammars={levelGrammars}
          levelLabel={`${activeLevel} · ${selectedUnitLabel}`}
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
          key={`memory-${activeBook.id}-${selectedUnitId}-${onlyStarred}`}
          words={filteredWords}
          kanjis={levelKanjis}
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
          key={`tf-${activeBook.id}-${selectedUnitId}-${onlyStarred}`}
          words={filteredWords}
          kanjis={levelKanjis}
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
          key={`list-${activeBook.id}-${selectedUnitId}-${onlyStarred}`}
          words={filteredWords}
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
