import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock,
  ArrowRight,
  Clock,
  Compass,
  Flame,
  GraduationCap,
  Lock,
  LogIn,
  Plus,
} from 'lucide-react';
import { LoginRequiredState } from '../components/auth/LoginRequiredState';
import { WhatsNewBoard } from '../components/home/WhatsNewBoard';
import { StudyScheduleModal } from '../components/settings/StudyScheduleCard';
import {
  Badge,
  Button,
  Card,
  CardLink,
  Chip,
  PageContainer,
  ProgressBar,
  QuizHistoryCard,
  Stat,
  Tabs,
  useToast,
} from '../components/ui';
import { buttonStyles } from '../components/ui/styles';
import { useAuth } from '../context/auth-context';
import {
  buildVocabToolQuery,
  getPreferredVocabLevel,
  getUnitsForVocabTextbook,
  resolveActiveVocabTextbook,
  VOCAB_TEXTBOOK_SYNC_EVENT,
} from '../data/vocabTextbooks';
import { useCurriculumSnapshot } from '../hooks/useCurriculumData';
import {
  buildAttemptMistakeGroups,
  useAttemptMistakeResolutions,
} from '../services/attemptMistakeService';
import {
  getLiveAllVocabulary,
  getLiveGrammarBooks,
  getLiveKanjis,
} from '../services/curriculumStore';
import { useQuizHistory } from '../services/quizHistoryService';
import { cn } from '../lib/cn';
import {
  calculateStudyStreakStats,
  formatOnlineDurationVi,
  getLocalDateKey,
  getTodayOnlineSeconds,
  loadStudySchedule,
  ONLINE_TIME_SYNC_EVENT,
  STUDY_SCHEDULE_SYNC_EVENT,
  type StudyScheduleConfig,
} from '../services/notificationService';
import {
  calculateRoadmapForecast,
  formatMmSs,
  generateStageMap,
  getActiveStageForMap,
  getEffectiveReminderSettings,
  getRecommendedFixedStageCount,
  hasCompletedStageToday,
  loadStageRoadmapState,
  STAGE_ROADMAP_SYNC_EVENT,
} from '../services/stageRoadmapService';
import {
  getStudyLevelMeta,
  requestOpenLevelModal,
  STUDY_LEVEL_OPTIONS,
  type StudyLevel,
} from '../services/userLevelService';
import { useAppSelector } from '../store/hooks';

interface Area {
  to: string;
  glyph: string;
  title: string;
  description: string;
  featured?: boolean;
  badgeText?: string;
  spanFull?: boolean;
}

const JLPT_LANGUAGE_AREAS: Area[] = [
  {
    to: '/jlpt/kanji',
    glyph: '字',
    title: 'Luyện Chữ Hán',
    description: 'Luyện cách đọc Hiragana, âm On-Kun và chọn chữ Hán chuẩn trong câu.',
  },
  {
    to: '/jlpt/vocab',
    glyph: '詞',
    title: 'Luyện Từ vựng',
    description: 'Điền từ theo ngữ cảnh, tìm từ đồng nghĩa và cách dùng từ chuẩn JLPT.',
  },
  {
    to: '/jlpt/grammar',
    glyph: '法',
    title: 'Luyện Ngữ pháp',
    description: 'Chọn mẫu ngữ pháp phù hợp trong câu và điền ngữ pháp vào đoạn văn.',
  },
  {
    to: '/jlpt/star',
    glyph: '星',
    title: 'Luyện Hái sao (★)',
    description: 'Sắp xếp 4 mảnh ghép thành câu hoàn chỉnh và chọn từ đúng ở vị trí ngôi sao.',
  },
];

const JLPT_SKILL_AREAS: Area[] = [
  {
    to: '/jlpt/reading-short',
    glyph: '短',
    title: 'Đọc hiểu Ngắn (Đoản văn)',
    description: 'Đọc nhanh đoạn văn ngắn (150–200 chữ), email, thông báo và tìm ý chính.',
  },
  {
    to: '/jlpt/reading-medium',
    glyph: '中',
    title: 'Đọc hiểu Trung văn',
    description: 'Phân tích bài viết độ dài trung bình (400–500 chữ) và trả lời câu hỏi lý giải.',
  },
  {
    to: '/jlpt/reading-long',
    glyph: '長',
    title: 'Đọc hiểu Trường văn',
    description: 'Luyện đọc bài luận dài, nắm bắt mạch lập luận của tác giả và tìm thông tin.',
  },
  {
    to: '/jlpt/listening',
    glyph: '聴',
    title: 'Luyện Nghe hiểu',
    description: 'Luyện nghe theo từng Mondai kèm transcript và giải thích chi tiết.',
  },
];

const JLPT_FULL_TEST_AREA: Area = {
  to: '/jlpt/full-test',
  glyph: '全',
  title: 'Thi thử Toàn bộ (Full Test)',
  description:
    'Làm đề thi JLPT hoàn chỉnh đầy đủ các phần có bấm giờ, chấm điểm tự động và lưu câu sai để ôn lại.',
  featured: true,
  badgeText: 'JLPT Mock',
  spanFull: true,
};

const STUDIO_CREATOR_AREA: Area = {
  to: '/studio',
  glyph: '創',
  title: 'Studio Tự tạo bài & Vẽ bản đồ lộ trình',
  description:
    'Tự soạn bài Từ vựng (nhập tay hoặc dán nhanh từ Excel), Ngữ pháp, Kanji như Admin, chơi ngay trên 6 Mini-game và kéo-thả tự vẽ lộ trình riêng.',
  badgeText: 'Creator · Mới',
  spanFull: true,
};

function FeatureNavCard({ area, compact = false }: { area: Area; compact?: boolean }) {
  return (
    <Link
      to={area.to}
      className={cn(
        'animate-fade-up group relative flex h-full cursor-pointer items-start gap-3.5 overflow-hidden rounded-xl border shadow-card transition-[border-color,background-color,transform] duration-150 ease-out-soft hover:-translate-y-0.5 active:scale-[0.99]',
        compact ? 'p-3' : 'p-3.5',
        area.featured
          ? 'border-sakura/50 bg-glass-soft hover:border-sakura hover:bg-glass-hover'
          : area.spanFull
            ? 'border-primary/45 bg-glass-soft hover:border-primary hover:bg-glass-hover'
            : 'border-line bg-glass hover:border-primary hover:bg-glass-hover',
      )}
    >
      <span
        aria-hidden
        className="seigaiha-mask pointer-events-none absolute -right-2 -bottom-2 h-8 w-20 bg-wave opacity-0 transition-opacity duration-150 group-hover:opacity-30"
      />
      <span
        lang="ja"
        aria-hidden
        className={cn(
          'relative flex size-10 shrink-0 items-center justify-center rounded-lg text-base font-bold transition-colors duration-150',
          area.featured
            ? 'bg-sakura text-on-primary ring-2 ring-sakura/30 group-hover:bg-primary'
            : area.spanFull
              ? 'bg-primary text-on-primary ring-2 ring-primary/25'
              : 'bg-primary-soft text-primary-fg ring-1 ring-primary/20 group-hover:bg-primary group-hover:text-on-primary group-hover:ring-sakura/45',
        )}
      >
        {area.glyph}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="block text-sm font-semibold text-fg md:text-base">{area.title}</span>
          {area.badgeText && (
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                area.featured
                  ? 'border-sakura/35 bg-glass-soft text-sakura'
                  : 'border-primary/35 bg-primary-soft text-primary-fg',
              )}
            >
              {area.badgeText}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted md:text-sm">
          {area.description}
        </span>
      </span>
      {area.spanFull && (
        <ArrowRight
          className="relative mt-2.5 hidden size-4 shrink-0 text-primary-fg transition-transform duration-150 group-hover:translate-x-0.5 sm:block"
          aria-hidden
        />
      )}
    </Link>
  );
}

export const HomePage: React.FC = () => {
  const { user, studyLevel, studyTextbookId, updateStudyLevel } = useAuth();
  const { toast } = useToast();
  const cmsSnapshot = useCurriculumSnapshot();
  const allKanjis = useMemo(() => getLiveKanjis(cmsSnapshot), [cmsSnapshot]);
  const kanjiTotal = allKanjis.length;
  const allVocab = useMemo(() => getLiveAllVocabulary(cmsSnapshot), [cmsSnapshot]);
  const liveGrammarBooks = useMemo(() => getLiveGrammarBooks(cmsSnapshot), [cmsSnapshot]);
  const grammarTotal = useMemo(
    () =>
      liveGrammarBooks.reduce(
        (sum, book) =>
          sum + book.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.grammars.length, 0),
        0,
      ),
    [liveGrammarBooks],
  );
  const kanjiProgress = useAppSelector((state) => state.kanji.progress);
  const grammarRecords = useAppSelector((state) => state.grammarProgress.records);
  const quizHistory = useQuizHistory();
  const mistakeResolutions = useAttemptMistakeResolutions();

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [jlptTab, setJlptTab] = useState<'language' | 'skills'>('language');
  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    const bump = () => setSyncVersion((v) => v + 1);
    window.addEventListener(STUDY_SCHEDULE_SYNC_EVENT, bump);
    window.addEventListener(ONLINE_TIME_SYNC_EVENT, bump);
    window.addEventListener(STAGE_ROADMAP_SYNC_EVENT, bump);
    window.addEventListener(VOCAB_TEXTBOOK_SYNC_EVENT, bump);
    return () => {
      window.removeEventListener(STUDY_SCHEDULE_SYNC_EVENT, bump);
      window.removeEventListener(ONLINE_TIME_SYNC_EVENT, bump);
      window.removeEventListener(STAGE_ROADMAP_SYNC_EVENT, bump);
      window.removeEventListener(VOCAB_TEXTBOOK_SYNC_EVENT, bump);
    };
  }, []);

  const schedule: StudyScheduleConfig = useMemo(
    () => (syncVersion >= 0 ? loadStudySchedule() : loadStudySchedule()),
    [syncVersion],
  );
  const todayOnlineSeconds = useMemo(
    () =>
      syncVersion >= 0
        ? getTodayOnlineSeconds(undefined, user?.id)
        : getTodayOnlineSeconds(undefined, user?.id),
    [syncVersion, user?.id],
  );
  const stageRoadmapState = useMemo(
    () =>
      syncVersion >= 0
        ? loadStageRoadmapState(user?.id)
        : loadStageRoadmapState(user?.id),
    [syncVersion, user?.id],
  );

  const attemptMistakeGroups = useMemo(
    () => buildAttemptMistakeGroups(quizHistory, allVocab, liveGrammarBooks, mistakeResolutions),
    [quizHistory, allVocab, liveGrammarBooks, mistakeResolutions],
  );

  const totalMistakeCount = useMemo(
    () => attemptMistakeGroups.reduce((sum, group) => sum + group.mistakes.length, 0),
    [attemptMistakeGroups],
  );

  const streakStats = calculateStudyStreakStats(
    {
      streakMode: 'every_day',
      streakDaysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      completedDates: schedule.completedDates,
    },
    getLocalDateKey(),
  );

  const kanjiLearned = Object.values(kanjiProgress).filter((item) => item.learned).length;
  const grammarPracticed = Object.values(grammarRecords).filter((record) =>
    Object.values(record).some((score) => score > 0),
  ).length;

  const activeLevelMeta = user ? getStudyLevelMeta(studyLevel) : null;
  const activeLevel: StudyLevel | null =
    studyLevel ?? (syncVersion >= 0 ? getPreferredVocabLevel(user?.id) : null);
  const activeTextbook = useMemo(
    () =>
      activeLevel && syncVersion >= 0
        ? resolveActiveVocabTextbook(activeLevel, user?.id, studyTextbookId)
        : null,
    [activeLevel, studyTextbookId, syncVersion, user?.id],
  );

  const activeTextbookStats = useMemo(() => {
    if (!activeLevel || !activeTextbook) {
      return { unitCount: 0, wordCount: 0, grammarRuleCount: 0, levelKanjiCount: 0 };
    }
    const units = getUnitsForVocabTextbook(cmsSnapshot, activeLevel, activeTextbook);
    const levelGrammarCount = liveGrammarBooks
      .filter((b) => b.level === activeLevel)
      .reduce(
        (sum, b) => sum + b.chapters.reduce((cs, c) => cs + c.grammars.length, 0),
        0,
      );
    const levelKanjiCount = allKanjis.filter((k) => k.jlptLevel === activeLevel).length;
    return {
      unitCount: units.filter((u) => u.totalWords > 0).length,
      wordCount: units.reduce((sum, u) => sum + u.totalWords, 0),
      grammarRuleCount: levelGrammarCount,
      levelKanjiCount,
    };
  }, [activeLevel, activeTextbook, allKanjis, cmsSnapshot, liveGrammarBooks]);

  // Stage Map summary for Tier 1 ("Hôm nay & Lộ trình")
  const stageMapSummary = useMemo(() => {
    if (!user || !studyLevel) return null;
    const isCustom = stageRoadmapState.activeMode === 'custom' && Boolean(stageRoadmapState.customConfig);
    const cfg = stageRoadmapState.customConfig;
    const stages = isCustom && cfg
      ? generateStageMap({
          mode: 'custom',
          level: cfg.level,
          textbookId: cfg.textbookId,
          userId: user.id,
          snapshot: cmsSnapshot,
          startDate: cfg.startDate,
          dailyMinutesTarget: cfg.dailyMinutesTarget,
          totalStages: cfg.totalStages,
          studyWeekdays: cfg.studyWeekdays,
          skills: cfg.skills,
          stageOverrides: cfg.stageOverrides,
          includeKanaStarter: cfg.includeKanaStarter,
        })
      : generateStageMap({
          mode: 'fixed',
          level: studyLevel,
          textbookId: studyTextbookId,
          userId: user.id,
          snapshot: cmsSnapshot,
          startDate: stageRoadmapState.fixedStartDate,
          dailyMinutesTarget: stageRoadmapState.fixedDailyMinutesTarget,
          totalStages: getRecommendedFixedStageCount(studyLevel, studyTextbookId),
          includeKanaStarter: stageRoadmapState.fixedIncludeKanaStarter,
        });

    const activeStage = getActiveStageForMap(stages, stageRoadmapState.completedStages);
    const doneCount = stages.filter((s) => Boolean(stageRoadmapState.completedStages[s.id])).length;
    const effective = getEffectiveReminderSettings(stageRoadmapState);
    const completedToday =
      hasCompletedStageToday(stageRoadmapState) &&
      todayOnlineSeconds >= effective.dailyMinutesTarget * 60;
    const forecast = calculateRoadmapForecast({
      totalStages: stages.length,
      completedCount: doneCount,
      startDate: isCustom && cfg ? cfg.startDate : stageRoadmapState.fixedStartDate,
      studyWeekdays: effective.studyWeekdays,
      completedToday,
    });

    return {
      isCustom,
      planLabel: isCustom && cfg ? cfg.name : `Lộ trình JLPT ${studyLevel}`,
      activeStage,
      doneCount,
      totalCount: stages.length,
      dailyTargetMinutes: effective.dailyMinutesTarget,
      completedToday,
      forecast,
    };
  }, [cmsSnapshot, stageRoadmapState, studyLevel, studyTextbookId, todayOnlineSeconds, user]);

  // Tier 2: Read like a Textbook (3 core pillars)
  const bookAreas: Area[] = useMemo(() => {
    if (activeLevel && activeTextbook) {
      return [
        {
          to: `/vocabulary/${activeLevel.toLowerCase()}/book/${activeTextbook.id}`,
          glyph: '語',
          title: 'Từ vựng',
          description:
            activeTextbookStats.wordCount > 0
              ? `Mở thẳng ${activeTextbook.title} (${activeTextbookStats.unitCount} bài · ${activeTextbookStats.wordCount} từ).`
              : `Mở thẳng bài học & 4 công cụ của ${activeTextbook.title}.`,
          badgeText: `${activeLevel} · ${activeTextbook.shortTitle}`,
        },
        {
          to: '/grammar',
          glyph: '文',
          title: 'Ngữ pháp',
          description:
            activeTextbookStats.grammarRuleCount > 0
              ? `${activeTextbookStats.grammarRuleCount} mẫu ngữ pháp trọng tâm cấp độ ${activeLevel} kèm ví dụ & bài tập.`
              : `Bài học và luyện tập ngữ pháp trọng tâm cho trình độ JLPT ${activeLevel}.`,
          badgeText: `JLPT ${activeLevel}`,
        },
        {
          to: '/kanji',
          glyph: '漢',
          title: 'Kanji',
          description:
            activeTextbookStats.levelKanjiCount > 0
              ? `${activeTextbookStats.levelKanjiCount} chữ Kanji ${activeLevel} có Hán Việt, nghĩa Việt & tập viết nét.`
              : `Tra cứu Hán Việt, tập viết nét và theo dõi chữ Hán ${activeLevel}.`,
          badgeText: `JLPT ${activeLevel}`,
        },
      ];
    }
    return [
      {
        to: '/vocabulary',
        glyph: '語',
        title: 'Từ vựng',
        description: 'Danh sách từ theo cấp độ JLPT, giáo trình và từng bài học.',
      },
      {
        to: '/grammar',
        glyph: '文',
        title: 'Ngữ pháp',
        description: 'Bài học ngữ pháp phân theo giáo trình kèm bài luyện tập.',
      },
      {
        to: '/kanji',
        glyph: '漢',
        title: 'Kanji',
        description: 'Tra cứu âm Hán Việt, tập viết nét và theo dõi chữ đã thuộc.',
      },
    ];
  }, [activeLevel, activeTextbook, activeTextbookStats]);

  // Tier 3: Fast Practice Tools + Mini-game Dojo (4 cards)
  const quickToolAreas: Area[] = useMemo(() => {
    if (activeLevel && activeTextbook) {
      const toolQuery = buildVocabToolQuery(activeLevel, activeTextbook.id);
      return [
        {
          to: `/games${toolQuery}`,
          glyph: '剣',
          title: 'Phòng Mini-game (Dojo)',
          description: `Chém Từ Vựng (Ninja), Chém Hoa Quả, Nối Cặp 2 Cột & 3 game ${activeTextbook.shortTitle}.`,
          badgeText: `6 Game · ${activeLevel}`,
          featured: true,
        },
        {
          to: `/vocabulary/quiz${toolQuery}`,
          glyph: '問',
          title: 'Luyện Quiz nhanh',
          description: `Trắc nghiệm 4 đáp án chọn sẵn ${activeTextbook.shortTitle} (${activeLevel}).`,
          badgeText: `${activeLevel} · ${activeTextbook.shortTitle}`,
        },
        {
          to: `/flashcard/${activeLevel.toLowerCase()}/book/${activeTextbook.id}`,
          glyph: '札',
          title: 'Flashcard thẻ lật',
          description: `Ôn từ vựng theo từng bài của ${activeTextbook.shortTitle}.`,
          badgeText: `${activeLevel} · ${activeTextbook.shortTitle}`,
        },
        {
          to: '/pdf',
          glyph: '印',
          title: 'Xuất phiếu PDF',
          description: `Tạo tài liệu từ vựng, ngữ pháp và Kanji chuẩn ${activeLevel} để in.`,
          badgeText: `JLPT ${activeLevel}`,
        },
      ];
    }
    return [
      {
        to: '/games',
        glyph: '剣',
        title: 'Phòng Mini-game (Dojo)',
        description: 'Chém Từ Vựng (Ninja), Chém Hoa Quả Từ Vựng, Nối Cặp 2 Cột, Lật Thẻ & Phản Xạ.',
        badgeText: '6 Game · Mới',
        featured: true,
      },
      {
        to: '/vocabulary/quiz',
        glyph: '問',
        title: 'Luyện Quiz nhanh',
        description: 'Trắc nghiệm 4 đáp án kèm giải thích đúng/sai.',
      },
      {
        to: '/flashcard',
        glyph: '札',
        title: 'Flashcard thẻ lật',
        description: 'Ôn từ vựng bằng thẻ lật theo từng bài học.',
      },
      {
        to: '/pdf',
        glyph: '印',
        title: 'Xuất phiếu PDF',
        description: 'Tạo tài liệu từ vựng, ngữ pháp và Kanji để in.',
      },
    ];
  }, [activeLevel, activeTextbook]);

  // Tier 4: JLPT Exam Room (2 compact tabs + featured Full Test)
  const jlptQuery =
    activeLevel === 'N5' || activeLevel === 'N4' || activeLevel === 'N3'
      ? `?level=${activeLevel}`
      : '';

  const scopedJlptList = useMemo(() => {
    const raw = jlptTab === 'language' ? JLPT_LANGUAGE_AREAS : JLPT_SKILL_AREAS;
    return raw.map((area) => ({ ...area, to: `${area.to}${jlptQuery}` }));
  }, [jlptQuery, jlptTab]);

  const scopedFullTest: Area = useMemo(
    () => ({
      ...JLPT_FULL_TEST_AREA,
      to: `${JLPT_FULL_TEST_AREA.to}${jlptQuery}`,
    }),
    [jlptQuery],
  );

  const handleQuickSelectLevel = async (level: StudyLevel) => {
    if (!user) return;
    await updateStudyLevel(level);
    toast({
      title: `Đã chọn trình độ JLPT ${level}`,
      tone: 'success',
    });
  };

  return (
    <PageContainer className="space-y-6">
      {/* Welcome & Streak Top Strip */}
      <section
        aria-label="Giới thiệu"
        className="flex flex-col gap-3 rounded-xl border border-line bg-glass px-3.5 py-3 shadow-card sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4 md:px-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              lang="ja"
              className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold tracking-widest text-primary-fg"
            >
              日本語道場
            </span>
            <h1 className="text-lg font-bold tracking-tight text-fg sm:text-xl md:text-2xl">
              Học tiếng Nhật mỗi ngày
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            {user
              ? `Xin chào ${user.displayName}! Học theo Màn mỗi ngày hoặc mở tự do như cuốn sách.`
              : 'Đăng nhập bằng Google hoặc Email để mở Bản đồ Màn học, tạo lộ trình riêng và đồng bộ tiến độ.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <>
              <Badge tone={streakStats.completedToday ? 'success' : 'sakura'}>
                <Flame className="size-3.5 shrink-0" aria-hidden />
                <span className="tabular-nums">
                  {streakStats.currentStreak} ngày · {formatOnlineDurationVi(todayOnlineSeconds)}
                </span>
              </Badge>
              {schedule.enabled && (
                <Badge tone="primary">
                  <span className="font-mono tabular-nums">{schedule.primaryTime}</span>
                </Badge>
              )}
            </>
          ) : (
            <Link
              to="/login"
              className={buttonStyles({ variant: 'primary', size: 'sm', className: 'w-full sm:w-auto' })}
            >
              <LogIn className="size-4 shrink-0" aria-hidden />
              Đăng nhập lưu tiến độ
            </Link>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            leftIcon={<AlarmClock className="size-4 shrink-0 text-primary-fg" aria-hidden />}
            onClick={() => setScheduleModalOpen(true)}
          >
            Lịch nhắc &amp; Mục tiêu
          </Button>
        </div>
      </section>
      <StudyScheduleModal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} />

      {/* What's New / Feature Announcement Board */}
      <WhatsNewBoard />

      {/* =================================================================== */}
      {/* TẦNG 1: LỘ TRÌNH & MỤC TIÊU HÔM NAY (Chế độ Kỷ luật — 1 điểm vào)   */}
      {/* =================================================================== */}
      <Card as="section" aria-label="Tầng 1: Lộ trình và Mục tiêu hôm nay" padding="md">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              lang="ja"
              aria-hidden
              className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-on-primary"
            >
              道
            </span>
            <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Lộ trình &amp; Mục tiêu hôm nay
            </h2>
          </div>
          {!user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/roadmap"
                className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-7 px-2.5 text-xs' })}
              >
                Xem thử Bản đồ Màn
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
              <Badge tone="neutral">
                <Lock className="size-3 shrink-0" aria-hidden />
                Yêu cầu đăng nhập
              </Badge>
            </div>
          ) : (
            stageMapSummary && (
              <Badge tone={stageMapSummary.completedToday ? 'success' : 'primary'}>
                <Clock className="size-3" aria-hidden />
                <span className="tabular">
                  {stageMapSummary.completedToday
                    ? '✓ Đã xong mục tiêu hôm nay'
                    : `Online hôm nay: ${formatMmSs(todayOnlineSeconds)} / ${stageMapSummary.dailyTargetMinutes}:00`}
                </span>
              </Badge>
            )
          )}
        </div>

        {user ? (
          <>
            <div className="mb-4">
              {!studyLevel ? (
                <div className="rounded-xl border border-primary/45 bg-primary-soft/50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary"
                      >
                        <Compass className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-fg sm:text-base">
                          Chọn trình độ &amp; giáo trình để mở Bản đồ Màn học
                        </h3>
                        <p className="mt-0.5 text-xs text-muted sm:text-sm">
                          Chọn 1 lần để tự động đồng bộ toàn bộ sách, Quiz, Flashcard và lộ trình học theo ngày.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="shrink-0"
                      leftIcon={<GraduationCap className="size-4" aria-hidden />}
                      onClick={requestOpenLevelModal}
                    >
                      Chọn trình độ
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
                    <span className="text-xs font-medium text-muted">Chọn nhanh:</span>
                    {STUDY_LEVEL_OPTIONS.map((opt) => (
                      <Chip
                        key={opt.level}
                        selected={false}
                        onClick={() => void handleQuickSelectLevel(opt.level)}
                      >
                        JLPT {opt.level}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  id="study-roadmap-slot"
                  data-study-level={studyLevel}
                  className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-3.5 sm:p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-on-primary">
                        {studyLevel}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-fg sm:text-base">
                            {stageMapSummary?.planLabel ?? `Lộ trình học tập JLPT ${studyLevel}`}
                            {activeLevelMeta && !stageMapSummary?.isCustom
                              ? ` · ${activeLevelMeta.title}`
                              : ''}
                          </h3>
                          {activeTextbook && (
                            <Badge tone="neutral">{activeTextbook.shortTitle}</Badge>
                          )}
                          {stageMapSummary?.isCustom && (
                            <Badge tone="primary">Tự tạo</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted sm:text-sm">
                          {stageMapSummary?.activeStage
                            ? `Màn hiện tại: Màn ${stageMapSummary.activeStage.stageNumber} — ${stageMapSummary.activeStage.title}`
                            : `Bạn đã hoàn thành toàn bộ bản đồ lộ trình JLPT ${studyLevel}!`}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Link
                        to="/roadmap"
                        className={buttonStyles({ variant: 'primary', size: 'sm' })}
                      >
                        {stageMapSummary?.activeStage
                          ? `Mở Màn ${stageMapSummary.activeStage.stageNumber}`
                          : 'Xem Bản đồ Màn'}
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                      <Link
                        to="/roadmap?create=1"
                        className={buttonStyles({ variant: 'soft', size: 'sm' })}
                      >
                        <Plus className="size-4" aria-hidden />
                        Tự tạo lộ trình
                      </Link>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={requestOpenLevelModal}
                      >
                        Đổi trình độ / sách
                      </Button>
                    </div>
                  </div>

                  {stageMapSummary && (
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                        <span>
                          Tiến độ Bản đồ Màn ({studyLevel}) ·{' '}
                          <strong className="text-fg">
                            {stageMapSummary.forecast.isCompleted
                              ? 'Đã về đích!'
                              : `Dự kiến xong: ${stageMapSummary.forecast.estimatedCompletionLabel} (~${stageMapSummary.forecast.estimatedWeeks} tuần)`}
                          </strong>
                        </span>
                        <span className="font-medium text-fg tabular-nums">
                          {stageMapSummary.doneCount}/{stageMapSummary.totalCount} màn
                        </span>
                      </div>
                      <ProgressBar
                        value={stageMapSummary.doneCount}
                        max={stageMapSummary.totalCount}
                        label={`Tiến độ Bản đồ Màn JLPT ${studyLevel}`}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Stat label="Kanji đã thuộc" value={`${kanjiLearned}/${kanjiTotal}`} />
                <ProgressBar value={kanjiLearned} max={kanjiTotal} label="Kanji đã thuộc" size="sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Stat label="Ngữ pháp đã luyện" value={`${grammarPracticed}/${grammarTotal}`} />
                <ProgressBar
                  value={grammarPracticed}
                  max={grammarTotal}
                  label="Ngữ pháp đã luyện"
                  size="sm"
                />
              </div>
              <Stat
                label="Bài sai cần ôn"
                value={attemptMistakeGroups.length}
                hint={
                  attemptMistakeGroups.length > 0
                    ? `${totalMistakeCount} câu sai cần ôn`
                    : 'Chưa có bài sai nào'
                }
              />
              <div className="flex items-end">
                <CardLink
                  to="/grammar/mistakes"
                  padding="sm"
                  className="flex w-full items-center justify-between gap-2 border-sakura/40 bg-sakura-soft text-sm font-semibold text-fg hover:border-sakura hover:bg-glass-hover"
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="size-2 rounded-full bg-sakura" />
                    Ôn tập lỗi sai
                    {attemptMistakeGroups.length > 0 && (
                      <Badge tone="danger" className="tabular">
                        {attemptMistakeGroups.length}
                      </Badge>
                    )}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-sakura" aria-hidden />
                </CardLink>
              </div>
            </div>
          </>
        ) : (
          <LoginRequiredState
            compact
            title="Đăng nhập để mở khóa Bản đồ Màn học, tạo lộ trình riêng & lưu tiến độ"
            description="Chọn 1 lần Trình độ + Giáo trình, theo dõi đếm giờ 10–15p/ngày, tự tạo lộ trình như Admin và đồng bộ lịch sử trên mọi thiết bị."
          />
        )}
      </Card>

      {/* =================================================================== */}
      {/* TẦNG 2: ĐỌC NHƯ CUỐN SÁCH (3 cột trụ: Từ vựng · Ngữ pháp · Kanji)   */}
      {/* =================================================================== */}
      <section aria-labelledby="section-textbook-mode">
        <div className="mb-3 inline-flex flex-col rounded-xl border border-line bg-glass px-3.5 py-2 shadow-card">
          <h2
            id="section-textbook-mode"
            className="flex items-center gap-2 text-base font-semibold text-fg md:text-lg"
          >
            <span aria-hidden className="h-4 w-1 rounded-full bg-wave" />
            Đọc như Cuốn sách
          </h2>
          <p className="mt-0.5 text-xs text-muted md:text-sm">
            Mở tự do từng bài Từ vựng, Ngữ pháp và chữ Hán theo đúng giáo trình bạn đang học.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
          {bookAreas.map((area) => (
            <li key={area.to}>
              <FeatureNavCard area={area} />
            </li>
          ))}
        </ul>
      </section>

      {/* =================================================================== */}
      {/* TẦNG 3: CÔNG CỤ LUYỆN TẬP NHANH                                     */}
      {/* =================================================================== */}
      <section aria-labelledby="section-quick-and-review">
        <div className="mb-3 inline-flex flex-col rounded-xl border border-line bg-glass px-3.5 py-2 shadow-card">
          <h2
            id="section-quick-and-review"
            className="flex items-center gap-2 text-base font-semibold text-fg md:text-lg"
          >
            <span aria-hidden className="h-4 w-1 rounded-full bg-wave" />
            Luyện tập nhanh
          </h2>
          <p className="mt-0.5 text-xs text-muted md:text-sm">
            Phiên ôn nhanh bằng Mini-game Chém Từ Vựng, Nối Cặp, Quiz 4 đáp án, Flashcard và xuất PDF.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {quickToolAreas.map((area) => (
            <li key={area.to}>
              <FeatureNavCard area={area} compact />
            </li>
          ))}
        </ul>

        <div className="mt-3 lg:mt-4">
          <FeatureNavCard area={STUDIO_CREATOR_AREA} />
        </div>
      </section>

      {/* =================================================================== */}
      {/* TẦNG 4: PHÒNG LUYỆN THI JLPT (Full Test nổi bật + 2 Tab gọn gàng)   */}
      {/* =================================================================== */}
      <section aria-labelledby="section-jlpt-practice" className="space-y-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="inline-flex flex-col rounded-xl border border-line bg-glass px-3.5 py-2 shadow-card">
            <h2
              id="section-jlpt-practice"
              className="flex items-center gap-2 text-base font-semibold text-fg md:text-lg"
            >
              <span aria-hidden className="h-4 w-1 rounded-full bg-wave" />
              Phòng luyện thi JLPT
            </h2>
            <p className="mt-0.5 text-xs text-muted md:text-sm">
              Luyện chuyên sâu từng Mondai hoặc làm đề thi thử toàn bộ chuẩn cấu trúc JLPT.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-glass p-1 shadow-card self-start sm:self-auto">
            <Tabs
              aria-label="Nhóm kỹ năng luyện thi JLPT"
              variant="pill"
              value={jlptTab}
              onChange={setJlptTab}
              items={[
                { value: 'language', label: 'Kiến thức ngôn ngữ (4)' },
                { value: 'skills', label: 'Đọc & Nghe hiểu (4)' },
              ]}
            />
          </div>
        </div>

        <FeatureNavCard area={scopedFullTest} />

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
          {scopedJlptList.map((area) => (
            <li key={area.to}>
              <FeatureNavCard area={area} />
            </li>
          ))}
        </ul>
      </section>

      {/* =================================================================== */}
      {/* TẦNG 5: LỊCH SỬ LÀM BÀI GẦN ĐÂY                                     */}
      {/* =================================================================== */}
      <QuizHistoryCard limit={5} showProfileLink />
    </PageContainer>
  );
};
