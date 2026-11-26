import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock,
  ArrowRight,
  Compass,
  FileText,
  Flame,
  Layers,
  ListChecks,
  LogIn,
  MessagesSquare,
  Trophy,
  Users,
} from 'lucide-react';
import { CommunityReviewsSection } from '../components/home/CommunityReviewsSection';
import { StudyScheduleModal } from '../components/settings/StudyScheduleCard';
import { GrammarQuizPickerModal } from '../components/home/GrammarQuizPickerModal';
import {
  Badge,
  Button,
  Card,
  CardLink,
  PageContainer,
  ProgressBar,
  QuizHistoryCard,
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
import {
  calculateStudyStreakStats,
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
  fetchRoadmapLevelCounts,
  requestOpenLevelModal,
  STUDY_LEVEL_OPTIONS,
  type RoadmapLevelCounts,
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

interface SkillTileProps {
  to: string;
  glyph: string;
  title: string;
  meta: string;
  progress?: { value: number; max: number };
}

/** One whole-card link per skill, with optional progress. */
function SkillTile({ to, glyph, title, meta, progress }: SkillTileProps) {
  return (
    <CardLink to={to} padding="sm" className="flex h-full flex-col gap-2">
      <span className="flex items-center gap-2.5">
        <span
          lang="ja"
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-base font-bold text-primary-fg"
        >
          {glyph}
        </span>
        <span className="min-w-0 font-semibold text-fg">{title}</span>
      </span>
      <span className="line-clamp-2 text-xs text-muted">{meta}</span>
      {progress && progress.max > 0 && (
        <ProgressBar value={progress.value} max={progress.max} size="sm" label={`Tiến độ ${title}`} />
      )}
    </CardLink>
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
          customRoadmapId: cfg.id,
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
          totalStages: getRecommendedFixedStageCount(
            activeLevel,
            targetBookId,
            stageRoadmapState.fixedDailyMinutesTarget,
          ),
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

  const vocabArea = coreBookAreas[0];
  const grammarArea = coreBookAreas[1];
  const kanjiArea = coreBookAreas[2];
  const readingArea = skillBookAreas[0];
  const listeningArea = skillBookAreas[1];
  const [gamesArea, , fullTestArea, pdfArea] = practiceAndStudioAreas;

  const skillTiles: SkillTileProps[] = [
    {
      to: vocabArea.to,
      glyph: '語',
      title: 'Từ vựng',
      meta:
        activeTextbook && activeTextbookStats.unitCount > 0
          ? `${activeTextbook.shortTitle} · ${activeTextbookStats.unitCount} bài`
          : 'Học theo giáo trình, Flashcard, Quiz',
    },
    {
      to: grammarArea.to,
      glyph: '文',
      title: 'Ngữ pháp',
      meta:
        levelScopedStats.grammarDone > 0
          ? `${levelScopedStats.grammarDone}/${levelScopedStats.grammarMax} mẫu đã luyện`
          : 'Làm bài luyện để tính tiến độ',
      progress: { value: levelScopedStats.grammarDone, max: levelScopedStats.grammarMax },
    },
    {
      to: kanjiArea.to,
      glyph: '漢',
      title: 'Kanji',
      meta:
        levelScopedStats.kanjiDone > 0
          ? `${levelScopedStats.kanjiDone}/${levelScopedStats.kanjiMax} chữ đã thuộc`
          : 'Viết đúng 3 lần để thuộc 1 chữ',
      progress: { value: levelScopedStats.kanjiDone, max: levelScopedStats.kanjiMax },
    },
    { to: readingArea.to, glyph: '読', title: 'Đọc hiểu', meta: 'Đoản văn · Trung văn · Trường văn' },
    { to: listeningArea.to, glyph: '聴', title: 'Nghe hiểu', meta: 'Hội thoại Mondai 1–4' },
    { to: gamesArea.to, glyph: '剣', title: 'Mini-game', meta: '6 trò chơi ôn từ vựng' },
  ];

  const toolLinks = [
    { label: 'Thi thử JLPT', to: fullTestArea.to, icon: Trophy },
    { label: 'Flashcard', to: vocabArea.quickActions?.[1]?.to ?? '/flashcard', icon: Layers },
    { label: 'Quiz từ vựng', to: vocabArea.quickActions?.[2]?.to ?? '/vocabulary/quiz', icon: ListChecks },
    // no link: opens the level → lesson → grammar picker
    { label: 'Quiz ngữ pháp', to: '', icon: MessagesSquare },
    { label: 'Xuất PDF', to: pdfArea.to, icon: FileText },
  ];

  const activeStage = stageMapSummary?.activeStage ?? null;
  const [grammarQuizOpen, setGrammarQuizOpen] = useState(false);
  const [roadmapLevelCounts, setRoadmapLevelCounts] = useState<RoadmapLevelCounts | null>(null);

  useEffect(() => {
    if (activeLevel) return;
    let cancelled = false;
    void fetchRoadmapLevelCounts().then((counts) => {
      if (!cancelled) setRoadmapLevelCounts(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [activeLevel]);

  return (
    <PageContainer className="space-y-5">
      {/* Greeting */}
      <section aria-label="Lời chào" className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {user ? `Chào ${user.displayName || 'bạn'}!` : 'Học tiếng Nhật mỗi ngày'}
          </h1>
          <p className="text-sm text-muted">
            {user
              ? 'Hôm nay học tiếp nhé — mỗi ngày một chút.'
              : 'Chơi thử thoải mái. Đăng nhập để lưu tiến độ và lộ trình.'}
          </p>
        </div>
        {user ? (
          <Badge tone={streakStats.completedToday ? 'success' : 'sakura'}>
            <Flame className="size-3.5 shrink-0" aria-hidden />
            <span className="tabular-nums">Chuỗi {streakStats.currentStreak} ngày</span>
          </Badge>
        ) : (
          <Link to="/login" className={buttonStyles({ variant: 'primary', size: 'sm', className: 'md:hidden' })}>
            <LogIn className="size-4 shrink-0" aria-hidden />
            Đăng nhập
          </Link>
        )}
      </section>
      <GrammarQuizPickerModal
        open={grammarQuizOpen}
        defaultLevel={activeLevel}
        onClose={() => setGrammarQuizOpen(false)}
      />
      <StudyScheduleModal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} />

      {/* Today */}
      <Card as="section" aria-labelledby="today-heading" padding="md" className="space-y-4">
        <h2 id="today-heading" className="text-xs font-semibold tracking-wide text-muted uppercase">
          Hôm nay
        </h2>

        {!activeLevel ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-on-primary"
              >
                <Compass className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-fg">Bạn đang học trình độ nào?</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {STUDY_LEVEL_OPTIONS.map((opt) => {
                const learnerCount = roadmapLevelCounts?.[opt.level] ?? 0;
                return (
                  <Button
                    key={opt.level}
                    variant="secondary"
                    className={learnerCount > 0 ? 'h-auto flex-col gap-0.5 py-2' : undefined}
                    onClick={() => void handleQuickSelectLevel(opt.level)}
                  >
                    <span>{opt.level}</span>
                    {learnerCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-normal text-muted tabular-nums">
                        <Users className="size-3 shrink-0" aria-hidden />
                        <span>{learnerCount.toLocaleString('vi-VN')}</span>
                        <span className="hidden sm:inline">người học</span>
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : (
          <div id="study-roadmap-slot" data-study-level={activeLevel} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-on-primary">
                  {activeLevel}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-fg">
                    {activeStage
                      ? `Màn ${activeStage.stageNumber}: ${activeStage.title}`
                      : `Bạn đã hoàn thành lộ trình ${activeLevel}!`}
                  </p>
                  <p className="text-sm text-muted">
                    {stageMapSummary?.planLabel ?? `Lộ trình JLPT ${activeLevel}`}
                    {activeTextbook ? ` · ${activeTextbook.shortTitle}` : ''}
                  </p>
                </div>
              </div>
              <Link
                to="/roadmap"
                className={buttonStyles({ variant: 'primary', size: 'lg', className: 'w-full sm:w-auto' })}
              >
                {activeStage ? `Học tiếp Màn ${activeStage.stageNumber}` : 'Xem bản đồ Màn'}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            {stageMapSummary && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span>Lộ trình</span>
                    <span className="font-medium text-fg tabular-nums">
                      {stageMapSummary.doneCount}/{stageMapSummary.totalCount} màn
                    </span>
                  </div>
                  <ProgressBar
                    value={stageMapSummary.doneCount}
                    max={stageMapSummary.totalCount}
                    label="Tiến độ lộ trình"
                    size="sm"
                  />
                  <p className="text-xs text-muted">
                    {stageMapSummary.forecast.isCompleted
                      ? 'Đã về đích!'
                      : `Dự kiến xong ${stageMapSummary.forecast.estimatedCompletionLabel}`}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span>Học hôm nay</span>
                    <span className="font-medium text-fg tabular-nums">
                      {stageMapSummary.completedToday
                        ? '✓ Đủ mục tiêu'
                        : `${formatMmSs(todayOnlineSeconds)} / ${stageMapSummary.dailyTargetMinutes}:00`}
                    </span>
                  </div>
                  <ProgressBar
                    value={Math.min(todayOnlineSeconds, stageMapSummary.dailyTargetMinutes * 60)}
                    max={stageMapSummary.dailyTargetMinutes * 60}
                    tone={stageMapSummary.completedToday ? 'success' : 'primary'}
                    label="Thời gian học hôm nay"
                    size="sm"
                  />
                  <p className="text-xs text-muted">
                    Mục tiêu {stageMapSummary.dailyTargetMinutes} phút mỗi ngày
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
          {activeLevel && (
            <button
              type="button"
              onClick={requestOpenLevelModal}
              className="font-medium text-primary-fg hover:underline"
            >
              Đổi trình độ
            </button>
          )}
          <button
            type="button"
            onClick={() => setScheduleModalOpen(true)}
            className="inline-flex items-center gap-1 font-medium text-primary-fg hover:underline"
          >
            <AlarmClock className="size-4" aria-hidden />
            Lịch nhắc học
          </button>
          {!user && (
            <span className="text-xs text-muted">Chế độ khách · chưa lưu tiến độ</span>
          )}
        </div>
      </Card>

      {/* Needs review — only when there is something to review */}
      {attemptMistakeGroups.length > 0 && (
        <CardLink
          to="/grammar/mistakes"
          padding="sm"
          className="flex items-center justify-between gap-3 border-warning-line bg-warning-soft"
        >
          <span className="flex items-center gap-3">
            <span className="tabular grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-base font-bold text-warning-fg">
              {totalMistakeCount}
            </span>
            <span>
              <span className="block font-semibold text-fg">Câu sai cần ôn</span>
              <span className="block text-xs text-muted">
                Từ {attemptMistakeGroups.length} bài đã làm — ôn ngay để nhớ lâu
              </span>
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-warning-fg" aria-hidden />
        </CardLink>
      )}

      {/* Skills */}
      <section aria-labelledby="skills-heading" className="space-y-3">
        <h2 id="skills-heading" className="text-base font-bold text-fg">
          Học theo kỹ năng
        </h2>
        <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:gap-3">
          {skillTiles.map((tile) => (
            <li key={tile.title} className="h-full">
              <SkillTile {...tile} />
            </li>
          ))}
        </ul>
      </section>

      {/* More tools — compact icon grid inside one card so it stays readable over the backdrop */}
      <section aria-labelledby="tools-heading">
        <Card padding="sm" className="space-y-3">
          <h2 id="tools-heading" className="px-1 text-base font-bold text-fg">
            Công cụ khác
          </h2>
          <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {toolLinks.map(({ label, to, icon: Icon }) => {
              const tileClass =
                'flex h-full w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary';
              const content = (
                <>
                  <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary-fg">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold leading-tight text-fg sm:text-sm">{label}</span>
                </>
              );
              return (
                <li key={label}>
                  {to ? (
                    <Link to={to} className={tileClass}>
                      {content}
                    </Link>
                  ) : (
                    <button type="button" onClick={() => setGrammarQuizOpen(true)} className={tileClass}>
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {user && <QuizHistoryCard limit={3} showProfileLink />}

      <CommunityReviewsSection />
    </PageContainer>
  );
};
