import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock,
  ArrowRight,
  Clock,
  Compass,
  Flame,
  GraduationCap,
  LogIn,
  Plus,
} from 'lucide-react';
import { CommunityReviewsSection } from '../components/home/CommunityReviewsSection';
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
  useToast,
} from '../components/ui';
import { buttonStyles } from '../components/ui/styles';
import { useAuth } from '../context/auth-context';
import {
  buildVocabToolQuery,
  getDefaultVocabTextbook,
  getPreferredVocabLevel,
  getUnitsForVocabTextbook,
  resolveActiveVocabTextbook,
  savePreferredVocabLevel,
  savePreferredVocabTextbookId,
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

interface QuickActionLink {
  label: string;
  to: string;
  primary?: boolean;
}

interface Area {
  to: string;
  glyph: string;
  title: string;
  description: string;
  featured?: boolean;
  badgeText?: string;
  spanFull?: boolean;
  quickActions?: QuickActionLink[];
  quickActionsCols?: 2 | 3;
}

function FeatureNavCard({ area, compact = false }: { area: Area; compact?: boolean }) {
  const actionColsClass =
    area.quickActionsCols === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return (
    <div
      className={cn(
        'animate-fade-up group relative flex h-full flex-col justify-between gap-3 overflow-hidden rounded-xl border shadow-card transition-[border-color,background-color,transform] duration-150 ease-out-soft hover:-translate-y-0.5',
        compact ? 'p-3.5' : 'p-4',
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
      <Link to={area.to} className="relative flex items-start gap-3">
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
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-bold text-fg md:text-base">{area.title}</span>
            {area.badgeText && (
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                  area.featured
                    ? 'border-sakura/35 bg-glass-soft text-sakura'
                    : 'border-primary/35 bg-primary-soft text-primary-fg',
                )}
              >
                {area.badgeText}
              </span>
            )}
          </span>
          <span className="mt-1 line-clamp-2 min-h-[2.4rem] block text-xs leading-relaxed text-muted">
            {area.description}
          </span>
        </span>
      </Link>

      {area.quickActions && area.quickActions.length > 0 && (
        <div
          className={cn(
            'relative grid gap-1.5 border-t border-line/70 pt-2.5',
            actionColsClass,
          )}
        >
          {area.quickActions.map((act) => (
            <Link
              key={act.to + act.label}
              to={act.to}
              className={cn(
                'inline-flex h-8 items-center justify-center truncate rounded-lg border px-2 text-center text-xs font-semibold transition-colors',
                act.primary
                  ? 'border-primary/45 bg-primary-soft text-primary-fg hover:bg-primary hover:text-on-primary'
                  : 'border-line bg-surface-2/75 text-fg hover:border-primary/50 hover:text-primary-fg',
              )}
            >
              <span className="truncate">{act.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
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

  const activeLevel: StudyLevel | null =
    studyLevel ?? (syncVersion >= 0 ? getPreferredVocabLevel(user?.id) : null);
  const activeLevelMeta = getStudyLevelMeta(activeLevel);
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

  // Stage Map summary for Tier 1 ("Hôm nay & Lộ trình") — available for both authenticated & guest users
  const stageMapSummary = useMemo(() => {
    if (!activeLevel) return null;
    const isCustom = stageRoadmapState.activeMode === 'custom' && Boolean(stageRoadmapState.customConfig);
    const cfg = stageRoadmapState.customConfig;
    const targetBookId = activeTextbook?.id ?? studyTextbookId;
    const stages = isCustom && cfg
      ? generateStageMap({
          mode: 'custom',
          level: cfg.level,
          textbookId: cfg.textbookId,
          userId: user?.id,
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
          level: activeLevel,
          textbookId: targetBookId,
          userId: user?.id,
          snapshot: cmsSnapshot,
          startDate: stageRoadmapState.fixedStartDate,
          dailyMinutesTarget: stageRoadmapState.fixedDailyMinutesTarget,
          totalStages: getRecommendedFixedStageCount(activeLevel, targetBookId),
          studyWeekdays: stageRoadmapState.fixedStudyWeekdays,
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
      planLabel: isCustom && cfg ? cfg.name : `Lộ trình JLPT ${activeLevel}`,
      activeStage,
      doneCount,
      totalCount: stages.length,
      dailyTargetMinutes: effective.dailyMinutesTarget,
      completedToday,
      forecast,
    };
  }, [activeLevel, activeTextbook?.id, cmsSnapshot, stageRoadmapState, studyTextbookId, todayOnlineSeconds, user?.id]);

  const jlptQuery =
    activeLevel === 'N5' || activeLevel === 'N4' || activeLevel === 'N3'
      ? `?level=${activeLevel}`
      : '';

  const levelScopedStats = useMemo(() => {
    if (!activeLevel) {
      return {
        kanjiDone: kanjiLearned,
        kanjiMax: kanjiTotal,
        grammarDone: grammarPracticed,
        grammarMax: grammarTotal,
      };
    }
    const levelKanjis = allKanjis.filter((k) => k.jlptLevel === activeLevel);
    const levelKanjiDone = levelKanjis.filter((k) => kanjiProgress[k.id]?.learned).length;
    const levelGrammarRules = liveGrammarBooks
      .filter((b) => b.level === activeLevel)
      .flatMap((b) => b.chapters.flatMap((c) => c.grammars));
    const levelGrammarDone = levelGrammarRules.filter((g) => {
      const rec = grammarRecords[g.id];
      return rec && Object.values(rec).some((score) => (score ?? 0) > 0);
    }).length;
    return {
      kanjiDone: levelKanjiDone,
      kanjiMax: levelKanjis.length || kanjiTotal,
      grammarDone: levelGrammarDone,
      grammarMax: levelGrammarRules.length || grammarTotal,
    };
  }, [activeLevel, allKanjis, grammarPracticed, grammarRecords, grammarTotal, kanjiLearned, kanjiProgress, kanjiTotal, liveGrammarBooks]);

  // ZONE 2: "Học như Cuốn sách — Trọn bộ 5 Kỹ năng" (3 Core Pillars top row + 2 Applied Skills bottom row)
  const coreBookAreas: Area[] = useMemo(() => {
    const firstGrammarBook =
      liveGrammarBooks.find((b) => activeTextbook && b.id === activeTextbook.id) ??
      liveGrammarBooks.find((b) => b.level === (activeLevel ?? 'N5')) ??
      liveGrammarBooks[0];
    const firstChapter = firstGrammarBook?.chapters[0];
    const scenarioQuizUrl =
      firstGrammarBook && firstChapter
        ? `/grammar/${firstGrammarBook.id}/${firstChapter.id}/practice?mode=scenario&count=12`
        : '/grammar';

    if (activeLevel && activeTextbook) {
      const lvlLower = activeLevel.toLowerCase();
      const toolQuery = buildVocabToolQuery(activeLevel, activeTextbook.id);
      const bookPath = `/vocabulary/${lvlLower}/book/${activeTextbook.id}`;
      return [
        {
          to: bookPath,
          glyph: '語',
          title: '1. Sách Từ vựng',
          description:
            activeTextbookStats.wordCount > 0
              ? `${activeTextbook.title} (${activeTextbookStats.unitCount} bài · ${activeTextbookStats.wordCount} từ) kèm phát âm & Flashcard.`
              : `Mở thẳng bài học & bộ công cụ từ vựng của ${activeTextbook.title}.`,
          badgeText: `${activeLevel} · ${activeTextbook.shortTitle}`,
          quickActionsCols: 2,
          quickActions: [
            { label: `Mở ${activeTextbookStats.unitCount || 25} bài →`, to: bookPath, primary: true },
            { label: 'Flashcard', to: `/flashcard/${lvlLower}/book/${activeTextbook.id}` },
            { label: 'Quiz nhanh', to: `/vocabulary/quiz${toolQuery}` },
            { label: 'Luyện gõ', to: `/vocabulary/writing${toolQuery}` },
          ],
        },
        {
          to: '/grammar',
          glyph: '文',
          title: '2. Sách Ngữ pháp',
          description:
            activeTextbookStats.grammarRuleCount > 0
              ? `${activeTextbookStats.grammarRuleCount} mẫu ngữ pháp ${activeLevel}: giải thích Dùng khi nào, So sánh dễ nhầm & Mẹo nhớ.`
              : `Hệ thống ngữ pháp trọng tâm ${activeLevel} kèm ví dụ và Quiz Tình huống.`,
          badgeText: `JLPT ${activeLevel}`,
          quickActionsCols: 2,
          quickActions: [
            { label: 'Mở Ngữ pháp →', to: '/grammar', primary: true },
            { label: '🎯 Quiz Tình huống', to: scenarioQuizUrl },
            { label: 'Hái sao ★', to: `/jlpt/star${jlptQuery}` },
            { label: 'Đề Ngữ pháp', to: `/jlpt/grammar${jlptQuery}` },
          ],
        },
        {
          to: `/kanji${jlptQuery}`,
          glyph: '漢',
          title: '3. Sách Chữ Hán',
          description:
            activeTextbookStats.levelKanjiCount > 0
              ? `${activeTextbookStats.levelKanjiCount} chữ Kanji ${activeLevel} chia nhóm 5 chữ/bài, có Hán Việt, On-Kun & tập viết nét.`
              : `Tra cứu Hán Việt, tập viết thứ tự nét và kiểm tra chữ Hán ${activeLevel}.`,
          badgeText: `JLPT ${activeLevel}`,
          quickActionsCols: 2,
          quickActions: [
            { label: `Bảng ${activeTextbookStats.levelKanjiCount || 112} chữ →`, to: `/kanji${jlptQuery}`, primary: true },
            { label: '5 chữ Bài 1', to: `/kanji?level=${activeLevel}&group=1&size=5` },
            { label: 'Quiz Chữ Hán', to: `/jlpt/kanji${jlptQuery}` },
            { label: 'Nối cặp Kanji', to: `/games${toolQuery}&game=match` },
          ],
        },
      ];
    }

    return [
      {
        to: '/vocabulary',
        glyph: '語',
        title: '1. Sách Từ vựng',
        description: 'Trọn bộ 12 giáo trình N5–N3 chia theo từng bài kèm Flashcard, Quiz & Luyện gõ.',
        quickActionsCols: 2,
        quickActions: [
          { label: 'Mở giáo trình →', to: '/vocabulary', primary: true },
          { label: 'Flashcard', to: '/flashcard' },
          { label: 'Quiz nhanh', to: '/vocabulary/quiz' },
          { label: 'Luyện gõ', to: '/vocabulary/writing' },
        ],
      },
      {
        to: '/grammar',
        glyph: '文',
        title: '2. Sách Ngữ pháp',
        description: 'Giải thích rõ Dùng khi nào, Sắc thái, So sánh cặp dễ nhầm & Quiz Tình huống.',
        quickActionsCols: 2,
        quickActions: [
          { label: 'Mở Ngữ pháp →', to: '/grammar', primary: true },
          { label: '🎯 Quiz Tình huống', to: scenarioQuizUrl },
          { label: 'Hái sao ★', to: '/jlpt/star' },
          { label: 'Đề Ngữ pháp', to: '/jlpt/grammar' },
        ],
      },
      {
        to: '/kanji',
        glyph: '漢',
        title: '3. Sách Chữ Hán',
        description: '513 chữ Kanji N5–N3 có âm Hán Việt, On-Kun, từ ghép và tập viết nét.',
        quickActionsCols: 2,
        quickActions: [
          { label: 'Bảng Kanji →', to: '/kanji', primary: true },
          { label: '5 chữ Bài 1', to: '/kanji?level=N5&group=1&size=5' },
          { label: 'Quiz Chữ Hán', to: '/jlpt/kanji' },
          { label: 'Nối cặp Kanji', to: '/games?game=match' },
        ],
      },
    ];
  }, [activeLevel, activeTextbook, activeTextbookStats, jlptQuery, liveGrammarBooks]);

  const skillBookAreas: Area[] = useMemo(() => {
    const levelLabel = activeLevel ?? 'N5–N3';
    const toolQuery =
      activeLevel && activeTextbook ? buildVocabToolQuery(activeLevel, activeTextbook.id) : '';
    return [
      {
        to: `/jlpt/reading-short${jlptQuery}`,
        glyph: '読',
        title: `4. Sách Đọc hiểu (${levelLabel})`,
        description:
          'Mục lục bài đọc đủ 3 cấp độ (Đoản văn → Trung văn → Trường văn), hỗ trợ chạm tra từ, Furigana & dịch chi tiết.',
        badgeText: `Dokkai · ${levelLabel}`,
        quickActionsCols: 3,
        quickActions: [
          { label: 'Đoản văn →', to: `/jlpt/reading-short${jlptQuery}`, primary: true },
          { label: 'Trung văn', to: `/jlpt/reading-medium${jlptQuery}` },
          { label: 'Trường văn', to: `/jlpt/reading-long${jlptQuery}` },
        ],
      },
      {
        to: `/jlpt/listening${jlptQuery}`,
        glyph: '聴',
        title: `5. Sách Nghe hiểu (${levelLabel})`,
        description:
          'Kho hội thoại Mondai 1–4 theo từng bài có bảng Transcript tiếng Nhật, dịch Việt và đọc nhại Shadowing.',
        badgeText: `Choukai · ${levelLabel}`,
        quickActionsCols: 3,
        quickActions: [
          { label: 'Bài Nghe →', to: `/jlpt/listening${jlptQuery}`, primary: true },
          {
            label: 'Game Nghe',
            to: `/games${toolQuery ? `${toolQuery}&game=listening` : '?game=listening'}`,
          },
          { label: 'Đề Từ vựng', to: `/jlpt/vocab${jlptQuery}` },
        ],
      },
    ];
  }, [activeLevel, activeTextbook, jlptQuery]);

  // ZONE 3: Fast Practice, Creator Studio, Full Mock Exam & PDF (1 symmetrical row of 4 cards)
  const practiceAndStudioAreas: Area[] = useMemo(() => {
    const toolQuery =
      activeLevel && activeTextbook ? buildVocabToolQuery(activeLevel, activeTextbook.id) : '';
    return [
      {
        to: `/games${toolQuery}`,
        glyph: '剣',
        title: 'Mini-game Dojo',
        description: '6 game phản xạ: Chém Từ Vựng, Bắn Yōkai, Nối Cặp, Lật Thẻ & Thính Giác.',
        badgeText: activeLevel ? `6 Game · ${activeLevel}` : '6 Game',
        featured: true,
      },
      {
        to: '/studio',
        glyph: '創',
        title: 'Studio Tự tạo',
        description: 'Tự soạn bài Từ vựng (dán Excel), Ngữ pháp, Kanji & tự vẽ sơ đồ lộ trình.',
        badgeText: 'Free Beta',
      },
      {
        to: `/jlpt/full-test${jlptQuery}`,
        glyph: '全',
        title: 'Đề thi JLPT thật',
        description: 'Bộ đề chuẩn 2023–2024 đủ 4 phần (thang 180 điểm + chấm điểm liệt).',
        badgeText: activeLevel ? `3 Đề ${activeLevel}` : '9 Đề thật',
      },
      {
        to: '/pdf',
        glyph: '印',
        title: 'Xuất phiếu PDF',
        description: 'Tạo tài liệu Từ vựng, Ngữ pháp và Kanji chuẩn đẹp để tải về hoặc in.',
        badgeText: activeLevel ? `JLPT ${activeLevel}` : 'In ấn',
      },
    ];
  }, [activeLevel, activeTextbook, jlptQuery]);

  const handleQuickSelectLevel = async (level: StudyLevel) => {
    if (user) {
      await updateStudyLevel(level);
    } else {
      const defaultBook = getDefaultVocabTextbook(level);
      savePreferredVocabLevel(level, null);
      savePreferredVocabTextbookId(level, defaultBook.id, null);
    }
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
          <div className="flex flex-wrap items-center gap-2">
            {stageMapSummary && (
              <Badge tone={stageMapSummary.completedToday ? 'success' : 'primary'}>
                <Clock className="size-3" aria-hidden />
                <span className="tabular">
                  {stageMapSummary.completedToday
                    ? '✓ Đã xong mục tiêu hôm nay'
                    : `Online hôm nay: ${formatMmSs(todayOnlineSeconds)} / ${stageMapSummary.dailyTargetMinutes}:00`}
                </span>
              </Badge>
            )}
            {!user && (
              <Badge tone="neutral">Chế độ khách · chưa lưu tiến độ</Badge>
            )}
          </div>
        </div>

        <div className="mb-4">
          {!activeLevel ? (
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
              data-study-level={activeLevel}
              className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-3.5 sm:p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-on-primary">
                    {activeLevel}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-fg sm:text-base">
                        {stageMapSummary?.planLabel ?? `Lộ trình học tập JLPT ${activeLevel}`}
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
                        : `Bạn đã hoàn thành toàn bộ bản đồ lộ trình JLPT ${activeLevel}!`}
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
                      Tiến độ Bản đồ Màn ({activeLevel}) ·{' '}
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
                    label={`Tiến độ Bản đồ Màn JLPT ${activeLevel}`}
                    size="sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Stat
              label={activeLevel ? `Kanji ${activeLevel} đã thuộc` : 'Kanji đã thuộc'}
              value={`${levelScopedStats.kanjiDone}/${levelScopedStats.kanjiMax}`}
            />
            <ProgressBar
              value={levelScopedStats.kanjiDone}
              max={levelScopedStats.kanjiMax}
              label="Kanji đã thuộc"
              size="sm"
            />
            <Link to="/kanji" className="text-xs text-muted hover:text-primary-fg hover:underline">
              Viết đúng 3 lần để thuộc 1 chữ → Luyện Kanji
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <Stat
              label={activeLevel ? `Ngữ pháp ${activeLevel} đã luyện` : 'Ngữ pháp đã luyện'}
              value={`${levelScopedStats.grammarDone}/${levelScopedStats.grammarMax}`}
            />
            <ProgressBar
              value={levelScopedStats.grammarDone}
              max={levelScopedStats.grammarMax}
              label="Ngữ pháp đã luyện"
              size="sm"
            />
            <Link to="/grammar" className="text-xs text-muted hover:text-primary-fg hover:underline">
              Làm bài luyện của mẫu câu → Ngữ pháp
            </Link>
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
      </Card>

      {/* =================================================================== */}
      {/* KHU VỰC 2: HỌC NHƯ CUỐN SÁCH — TRỌN BỘ 5 KỸ NĂNG                     */}
      {/* (Từ vựng · Ngữ pháp · Chữ Hán · Đọc hiểu · Nghe hiểu)               */}
      {/* =================================================================== */}
      <section aria-labelledby="section-textbook-mode" className="space-y-3">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-glass px-4 py-2.5 shadow-card">
          <div>
            <h2
              id="section-textbook-mode"
              className="flex items-center gap-2 text-base font-bold text-fg md:text-lg"
            >
              <span aria-hidden className="h-4 w-1 rounded-full bg-wave" />
              Học như Cuốn sách (Trọn bộ 5 Kỹ năng)
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Mở tự do từng bài Từ vựng, Ngữ pháp, Chữ Hán, Đọc hiểu và Nghe hiểu theo đúng giáo trình đang chọn.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={requestOpenLevelModal}
          >
            {activeLevel && activeTextbook
              ? `Đang học: ${activeLevel} · ${activeTextbook.shortTitle}`
              : 'Chọn giáo trình'}
          </Button>
        </div>

        {/* Hàng trên: 3 gốc kiến thức (Từ vựng · Ngữ pháp · Chữ Hán) */}
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:gap-4">
          {coreBookAreas.map((area) => (
            <li key={area.to} className="h-full">
              <FeatureNavCard area={area} />
            </li>
          ))}
        </ul>

        {/* Hàng dưới: 2 kỹ năng vận dụng (Sách Đọc hiểu · Sách Nghe hiểu) */}
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-4">
          {skillBookAreas.map((area) => (
            <li key={area.to} className="h-full">
              <FeatureNavCard area={area} />
            </li>
          ))}
        </ul>
      </section>

      {/* =================================================================== */}
      {/* KHU VỰC 3: THỰC CHIẾN & CÔNG CỤ MỞ RỘNG (1 hàng 4 ô thẳng tắp)       */}
      {/* =================================================================== */}
      <section aria-labelledby="section-quick-and-review" className="space-y-3">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-glass px-4 py-2.5 shadow-card">
          <div>
            <h2
              id="section-quick-and-review"
              className="flex items-center gap-2 text-base font-bold text-fg md:text-lg"
            >
              <span aria-hidden className="h-4 w-1 rounded-full bg-wave" />
              Thực chiến &amp; Công cụ mở rộng
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Phòng 6 Mini-game Dojo, Studio tự tạo bài &amp; vẽ bản đồ, Bộ đề thi JLPT thật và Xuất PDF.
            </p>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {practiceAndStudioAreas.map((area) => (
            <li key={area.to} className="h-full">
              <FeatureNavCard area={area} compact />
            </li>
          ))}
        </ul>
      </section>

      {/* =================================================================== */}
      {/* LỊCH SỬ LÀM BÀI GẦN ĐÂY (Thu gọn 3 lượt gần nhất để trang chủ gọn)  */}
      {/* =================================================================== */}
      <QuizHistoryCard limit={3} showProfileLink />

      {/* =================================================================== */}
      {/* ĐÁNH GIÁ THẬT TỪ CỘNG ĐỒNG HỌC VIÊN (1 tài khoản / 1 đánh giá)      */}
      {/* =================================================================== */}
      <CommunityReviewsSection />
    </PageContainer>
  );
};
