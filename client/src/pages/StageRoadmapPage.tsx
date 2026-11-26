import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Bell,
  BellOff,
  BookOpen,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  Download,
  FastForward,
  FileJson,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Share,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Unlock,
} from 'lucide-react';
import {
  buildStageBriefing,
  getStageTaskPhase,
  loadPassedBossStages,
  loadSkippedGateStageIds,
  loadUnderstoodStageIds,
  markStageGateSkipped,
  persistActiveStageSession,
} from '../utils/stageBriefingBuilder';
import {
  Badge,
  Button,
  Card,
  Chip,
  Dropdown,
  Field,
  Input,
  Modal,
  Notice,
  PageContainer,
  PageHeader,
  ProgressBar,
  Select,
  Tabs,
  useToast,
} from '../components/ui';
import { buttonStyles } from '../components/ui/styles';
import { StudyScheduleModal } from '../components/settings/StudyScheduleCard';
import {
  ensureUnifiedStudySchedule,
  formatUnifiedReminderButtonLabel,
  syncRoadmapConfigSlotToSchedule,
} from '../services/unifiedScheduleService';
import {
  AiRoadmapJsonModal,
  type AiJsonModalTab,
} from '../components/roadmap/AiRoadmapJsonModal';
import {
  CreateRoadmapWizardModal,
  type WizardInitialMode,
} from '../components/roadmap/CreateRoadmapWizardModal';
import { CreateQuizModal } from '../components/roadmap/CreateQuizModal';
import { SchedulePicker } from '../components/roadmap/SchedulePicker';
import { CustomLessonPlayerModal } from '../components/studio/CustomLessonPlayerModal';
import { useAuth } from '../context/auth-context';
import {
  getPreferredVocabLevel,
  getVocabTextbooksForLevel,
  resolveActiveVocabTextbook,
  VOCAB_TEXTBOOK_SYNC_EVENT,
} from '../data/vocabTextbooks';
import {
  buildConfigFromCommunityEntry,
  COMMUNITY_ROADMAP_GALLERY,
  ROADMAP_QUICK_TEMPLATES,
  type CommunityRoadmapEntry,
  type RoadmapQuickTemplate,
} from '../data/roadmapTemplates';
import { useCurriculumSnapshot } from '../hooks/useCurriculumData';
import { useQuizHistory } from '../services/quizHistoryService';
import { useAppSelector } from '../store/hooks';
import { cn } from '../lib/cn';
import {
  addDaysToDateKey,
  ALL_DAYS_ORDERED,
  formatVietnameseDateWithWeekday,
  getLocalDateKey,
  getTodayOnlineSeconds,
  loadStudySchedule,
  ONLINE_TIME_SYNC_EVENT,
  STUDY_SCHEDULE_SYNC_EVENT,
  type StudyScheduleConfig,
} from '../services/notificationService';
import {
  getBrowserNotificationPermission,
  type BrowserNotificationState,
} from '../services/pwaReminderService';
import {
  buildCurriculumTaskCatalog,
  calculateRoadmapForecast,
  cloneFixedRoadmapToCustom,
  completeStageAndUnlockNext,
  computeStartDateToAlignStageWithToday,
  createDefaultCustomConfig,
  DAILY_KANJI_TARGET,
  DAILY_PACE_PRESETS,
  DAILY_STAGE_ACTIVITY_SYNC_EVENT,
  DAILY_VOCAB_TARGET,
  decodeRoadmapShareCode,
  deriveAutoCompletedSkillsToday,
  encodeRoadmapShareCode,
  extractBundledStudioLessonsFromShareCode,
  formatMmSs,
  formatShortDayMonth,
  generateStageMap,
  getActiveStageForMap,
  getEffectiveReminderSettings,
  getRecommendedFixedStageCount,
  getStageCountForDailyMinutes,
  isDailyEnforcementPending,
  isProCreatorUnlocked,
  isStageUnlocked,
  loadDailyStageMetrics,
  loadStageRoadmapState,
  saveStageRoadmapState,
  setProCreatorDemoUnlocked,
  STAGE_ROADMAP_SYNC_EVENT,
  STAGE_SKILL_META,
  type CustomRoadmapConfig,
  type RepeatMinutesOption,
  type RoadmapMode,
  type RoadmapStage,
  type StageSkill,
  type StageTask,
  type TotalStagesOption,
  type UserStageRoadmapState,
} from '../services/stageRoadmapService';
import {
  CUSTOM_STUDIO_SYNC_EVENT,
  loadCustomStudioState,
  saveCustomStudioState,
  type CustomLesson,
} from '../services/customStudioService';
import { requestOpenLevelModal, type StudyLevel } from '../services/userLevelService';

const LEVELS: StudyLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const ALL_SKILLS: StageSkill[] = [
  'vocab',
  'kanji',
  'grammar',
  'quiz',
  'reading',
  'listening',
  'review',
];
const REPEAT_OPTIONS: RepeatMinutesOption[] = [5, 10, 15];

function chunkStages(stages: RoadmapStage[], chunkSize = 10): RoadmapStage[][] {
  const byChunkNum = new Map<number, RoadmapStage[]>();
  for (const st of stages) {
    const list = byChunkNum.get(st.chunkNumber) ?? [];
    list.push(st);
    byChunkNum.set(st.chunkNumber, list);
  }
  const grouped = Array.from(byChunkNum.values());
  if (grouped.length > 0) return grouped;
  const chunks: RoadmapStage[][] = [];
  for (let i = 0; i < stages.length; i += chunkSize) {
    chunks.push(stages.slice(i, i + chunkSize));
  }
  return chunks;
}

export const StageRoadmapPage: React.FC = () => {
  const { user, studyLevel, studyTextbookId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const cmsSnapshot = useCurriculumSnapshot();
  const quizHistory = useQuizHistory();
  const kanjiProgress = useAppSelector((state) => state.kanji.progress);

  const [syncVersion, setSyncVersion] = useState(0);
  const [viewTab, setViewTab] = useState<RoadmapMode>(() =>
    loadStageRoadmapState(user?.id).activeMode,
  );
  const [stageLayout, setStageLayout] = useState<'map' | 'days'>('map');
  const [notifPermission, setNotifPermission] = useState<BrowserNotificationState>(() =>
    getBrowserNotificationPermission(),
  );
  const [unifiedSchedule, setUnifiedSchedule] = useState<StudyScheduleConfig>(() =>
    loadStudySchedule(getLocalDateKey(), user?.id),
  );
  const [selectedStageId, setSelectedStageId] = useState<string | null>(
    () => searchParams.get('stage') || null,
  );
  const [builderOpen, setBuilderOpen] = useState(() => searchParams.get('create') === '1');
  const [builderIsNew] = useState(() => searchParams.get('create') === '1');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(() =>
    Boolean(searchParams.get('import')),
  );
  const [importCodeInput, setImportCodeInput] = useState(
    () => searchParams.get('import') ?? '',
  );
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [proPaywallOpen, setProPaywallOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryLevelFilter, setGalleryLevelFilter] = useState<'ALL' | 'N5' | 'N4' | 'N3'>('ALL');
  // `?new=wizard` / `?new=quiz` (links from the Studio page) open the creators directly
  const [wizardOpen, setWizardOpen] = useState(() => searchParams.get('new') === 'wizard');
  const [wizardInitialMode, setWizardInitialMode] = useState<WizardInitialMode>('choose');
  const [wizardEditingConfig, setWizardEditingConfig] = useState<CustomRoadmapConfig | null>(null);
  const [createQuizOpen, setCreateQuizOpen] = useState(() => searchParams.get('new') === 'quiz');
  const [deleteConfirmRoadmap, setDeleteConfirmRoadmap] = useState<CustomRoadmapConfig | null>(null);
  const [aiJsonModalOpen, setAiJsonModalOpen] = useState(false);
  const [aiJsonModalTab, setAiJsonModalTab] = useState<AiJsonModalTab>('prompt');
  const [inlinePlayingLesson, setInlinePlayingLesson] = useState<{
    lesson: CustomLesson;
    taskId: string;
  } | null>(null);
  const [draftConfig, setDraftConfig] = useState<CustomRoadmapConfig>(() =>
    createDefaultCustomConfig(studyLevel ?? 'N3', user?.id, studyTextbookId),
  );

  useEffect(() => {
    if (searchParams.get('create') === '1' || searchParams.get('import') || searchParams.get('stage')) {
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      next.delete('import');
      next.delete('stage');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const bump = () => setSyncVersion((v) => v + 1);
    window.addEventListener(STAGE_ROADMAP_SYNC_EVENT, bump);
    window.addEventListener(DAILY_STAGE_ACTIVITY_SYNC_EVENT, bump);
    window.addEventListener(ONLINE_TIME_SYNC_EVENT, bump);
    window.addEventListener(CUSTOM_STUDIO_SYNC_EVENT, bump);
    window.addEventListener(VOCAB_TEXTBOOK_SYNC_EVENT, bump);
    return () => {
      window.removeEventListener(STAGE_ROADMAP_SYNC_EVENT, bump);
      window.removeEventListener(DAILY_STAGE_ACTIVITY_SYNC_EVENT, bump);
      window.removeEventListener(ONLINE_TIME_SYNC_EVENT, bump);
      window.removeEventListener(CUSTOM_STUDIO_SYNC_EVENT, bump);
      window.removeEventListener(VOCAB_TEXTBOOK_SYNC_EVENT, bump);
    };
  }, []);

  const roadmapState = useMemo(
    () => (syncVersion >= 0 ? loadStageRoadmapState(user?.id) : loadStageRoadmapState(user?.id)),
    [syncVersion, user?.id],
  );
  const studioState = useMemo(
    () => (syncVersion >= 0 ? loadCustomStudioState(user?.id) : loadCustomStudioState(user?.id)),
    [syncVersion, user?.id],
  );
  const todayOnlineSeconds = useMemo(
    () =>
      syncVersion >= 0
        ? getTodayOnlineSeconds(undefined, user?.id)
        : getTodayOnlineSeconds(undefined, user?.id),
    [syncVersion, user?.id],
  );
  const todayAutoSkills = useMemo(
    () =>
      syncVersion >= 0
        ? deriveAutoCompletedSkillsToday({
            userId: user?.id,
            quizHistory,
            kanjiProgress,
          })
        : new Set<StageSkill>(),
    [kanjiProgress, quizHistory, syncVersion, user?.id],
  );

  const guestPreferredLevel = useMemo(
    () => (syncVersion >= 0 ? getPreferredVocabLevel(user?.id) : null),
    [syncVersion, user?.id],
  );

  const activeLevel: StudyLevel =
    roadmapState.activeMode === 'custom' && roadmapState.customConfig
      ? roadmapState.customConfig.level
      : (studyLevel ?? guestPreferredLevel ?? 'N5');

  const activeBook = useMemo(
    () =>
      resolveActiveVocabTextbook(
        activeLevel,
        user?.id,
        roadmapState.activeMode === 'custom' && roadmapState.customConfig
          ? roadmapState.customConfig.textbookId
          : activeLevel === studyLevel
            ? studyTextbookId
            : null,
      ),
    [activeLevel, roadmapState.activeMode, roadmapState.customConfig, studyLevel, studyTextbookId, user?.id],
  );

  const stages = useMemo(() => {
    if (roadmapState.activeMode === 'custom' && roadmapState.customConfig) {
      const cfg = roadmapState.customConfig;
      return generateStageMap({
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
        chunkTitles: cfg.chunkTitles,
        includeKanaStarter: cfg.includeKanaStarter,
      });
    }
    return generateStageMap({
      mode: 'fixed',
      level: activeLevel,
      textbookId: activeBook.id,
      userId: user?.id,
      snapshot: cmsSnapshot,
      startDate: roadmapState.fixedStartDate,
      dailyMinutesTarget: roadmapState.fixedDailyMinutesTarget,
      totalStages: getRecommendedFixedStageCount(
        activeLevel,
        activeBook.id,
        roadmapState.fixedDailyMinutesTarget,
      ),
      studyWeekdays: roadmapState.fixedStudyWeekdays,
      includeKanaStarter: roadmapState.fixedIncludeKanaStarter,
    });
  }, [activeBook.id, activeLevel, cmsSnapshot, roadmapState, user?.id]);

  const stageChunks = useMemo(() => chunkStages(stages, 10), [stages]);
  const activeStage = useMemo(
    () => getActiveStageForMap(stages, roadmapState.completedStages),
    [stages, roadmapState.completedStages],
  );
  const selectedStage = useMemo(
    () => stages.find((s) => s.id === selectedStageId) ?? null,
    [stages, selectedStageId],
  );
  const understoodStageIds = useMemo(
    () => (syncVersion >= 0 ? loadUnderstoodStageIds(user?.id) : []),
    [syncVersion, user?.id],
  );
  const skippedGateStageIds = useMemo(
    () => (syncVersion >= 0 ? loadSkippedGateStageIds(user?.id) : []),
    [syncVersion, user?.id],
  );
  const passedBossStages = useMemo(
    () => (syncVersion >= 0 ? loadPassedBossStages(user?.id) : {}),
    [syncVersion, user?.id],
  );
  const dailyMetrics = useMemo(
    () => (syncVersion >= 0 ? loadDailyStageMetrics(user?.id) : { vocabIds: [], kanjiIds: [], grammarIds: [] }),
    [syncVersion, user?.id],
  );
  const selectedStageBriefing = useMemo(
    () =>
      selectedStage
        ? buildStageBriefing(selectedStage, cmsSnapshot, activeLevel, activeBook.id)
        : null,
    [activeBook.id, activeLevel, cmsSnapshot, selectedStage],
  );

  const completedCount = useMemo(
    () => stages.filter((s) => Boolean(roadmapState.completedStages[s.id])).length,
    [stages, roadmapState.completedStages],
  );

  const todayKey = getLocalDateKey();
  const effectiveSettings = getEffectiveReminderSettings(roadmapState);
  const enforcement = isDailyEnforcementPending(roadmapState, todayOnlineSeconds);
  const targetSeconds = effectiveSettings.dailyMinutesTarget * 60;
  const remainingSeconds = Math.max(0, targetSeconds - todayOnlineSeconds);
  const onlineMet = remainingSeconds === 0;

  const roadmapForecast = useMemo(
    () =>
      calculateRoadmapForecast({
        totalStages: stages.length,
        completedCount,
        startDate:
          roadmapState.activeMode === 'custom' && roadmapState.customConfig
            ? roadmapState.customConfig.startDate
            : roadmapState.fixedStartDate,
        studyWeekdays: effectiveSettings.studyWeekdays,
        completedToday: enforcement.isCompletedToday,
        todayKey,
      }),
    [
      completedCount,
      effectiveSettings.studyWeekdays,
      enforcement.isCompletedToday,
      roadmapState.activeMode,
      roadmapState.customConfig,
      roadmapState.fixedStartDate,
      stages.length,
      todayKey,
    ],
  );

  const draftEffectiveTotalStages =
    draftConfig.totalStages +
    (draftConfig.level === 'N5' && draftConfig.includeKanaStarter ? 5 : 0);

  const draftForecast = useMemo(
    () =>
      calculateRoadmapForecast({
        totalStages: draftEffectiveTotalStages,
        completedCount: 0,
        startDate: draftConfig.startDate,
        studyWeekdays: draftConfig.studyWeekdays,
        todayKey,
      }),
    [draftConfig.startDate, draftConfig.studyWeekdays, draftEffectiveTotalStages, todayKey],
  );

  const updateState = (next: UserStageRoadmapState) => {
    saveStageRoadmapState(next, user?.id);
    setSyncVersion((v) => v + 1);
  };

  const handleModeChange = (nextTab: RoadmapMode) => {
    if (nextTab === 'custom' && !roadmapState.customConfig) {
      setViewTab('custom');
      return;
    }
    setViewTab(nextTab);
    updateState({ ...roadmapState, activeMode: nextTab });
  };

  const handleCloneFixedToCustom = () => {
    const fixedLevel: StudyLevel = studyLevel ?? guestPreferredLevel ?? 'N5';
    const fixedBook = resolveActiveVocabTextbook(
      fixedLevel,
      user?.id,
      fixedLevel === studyLevel ? studyTextbookId : null,
    );
    const { config, nextCompletedStages, preservedCount } = cloneFixedRoadmapToCustom({
      state: roadmapState,
      level: fixedLevel,
      textbookId: fixedBook.id,
      bookShortTitle: fixedBook.shortTitle,
    });
    updateState({
      ...roadmapState,
      activeMode: 'custom',
      customConfig: config,
      customRoadmaps: [...roadmapState.customRoadmaps, config],
      activeCustomRoadmapId: config.id,
      completedStages: nextCompletedStages,
    });
    setViewTab('custom');
    toast({
      title:
        preservedCount > 0
          ? `Đã nhân bản "${config.name}" và giữ nguyên ${preservedCount} Màn đã học!`
          : `Đã nhân bản "${config.name}" sang Lộ trình riêng để bạn tùy chỉnh từng Màn!`,
      tone: 'success',
    });
  };

  const handleSaveCommunityRoadmap = (entry: CommunityRoadmapEntry) => {
    const config = buildConfigFromCommunityEntry(entry, todayKey);
    updateState({
      ...roadmapState,
      activeMode: 'custom',
      customConfig: config,
      customRoadmaps: [...roadmapState.customRoadmaps, config],
      activeCustomRoadmapId: config.id,
    });
    setViewTab('custom');
    setGalleryOpen(false);
    toast({
      title: `Đã lưu lộ trình "${entry.name}" (${entry.totalStages} buổi) vào Lộ trình riêng!`,
      tone: 'success',
    });
  };

  const handleSaveSingleStudioLesson = (lesson: CustomLesson) => {
    const currentStudio = loadCustomStudioState(user?.id);
    const mergedMap = new Map<string, CustomLesson>();
    mergedMap.set(lesson.id, lesson);
    for (const l of currentStudio.lessons) {
      if (!mergedMap.has(l.id)) mergedMap.set(l.id, l);
    }
    saveCustomStudioState(
      {
        ...currentStudio,
        lessons: Array.from(mergedMap.values()),
      },
      user?.id,
    );
    setSyncVersion((v) => v + 1);
  };

  const handleDeleteStudioLesson = (lessonId: string) => {
    const currentStudio = loadCustomStudioState(user?.id);
    saveCustomStudioState(
      { ...currentStudio, lessons: currentStudio.lessons.filter((l) => l.id !== lessonId) },
      user?.id,
    );
    setSyncVersion((v) => v + 1);
    toast({ title: 'Đã xóa bài.', tone: 'info' });
  };

  const handleOpenWizard = (initial: WizardInitialMode = 'composer') => {
    setWizardEditingConfig(null);
    setWizardInitialMode(initial);
    setWizardOpen(true);
  };

  const handleSaveQuizFromModal = (lesson: CustomLesson, openRoadmapAfter: boolean) => {
    handleSaveSingleStudioLesson(lesson);
    const count = lesson.quizItems?.length ?? 0;
    toast({
      title: openRoadmapAfter
        ? `Đã lưu bộ Quiz "${lesson.title}" (${count} câu) — hãy bấm + Thêm vào Buổi học!`
        : `Đã lưu bộ Quiz "${lesson.title}" (${count} câu) vào Kho bài của tôi!`,
      tone: 'success',
    });
    if (openRoadmapAfter) {
      handleOpenWizard('composer');
    }
  };

  const handleEditActiveCustomRoadmap = () => {
    if (!roadmapState.customConfig) return;
    setWizardEditingConfig(roadmapState.customConfig);
    setWizardInitialMode('composer');
    setWizardOpen(true);
  };

  const handleOpenAiJsonModal = (initial: AiJsonModalTab = 'prompt') => {
    setAiJsonModalTab(initial);
    setAiJsonModalOpen(true);
  };

  const handleCommitAiJsonRoadmap = ({
    config,
    lessons,
  }: {
    config: CustomRoadmapConfig;
    lessons: CustomLesson[];
  }) => {
    if (lessons.length > 0) {
      const currentStudio = loadCustomStudioState(user?.id);
      const mergedMap = new Map<string, CustomLesson>();
      for (const l of currentStudio.lessons) mergedMap.set(l.id, l);
      for (const l of lessons) mergedMap.set(l.id, l);
      saveCustomStudioState(
        {
          ...currentStudio,
          lessons: Array.from(mergedMap.values()),
        },
        user?.id,
      );
    }

    const existingList = roadmapState.customRoadmaps ?? [];
    const existsIdx = existingList.findIndex((item) => item.id === config.id);
    const nextRoadmaps =
      existsIdx >= 0
        ? existingList.map((item, idx) => (idx === existsIdx ? config : item))
        : [...existingList, config];

    updateState({
      ...roadmapState,
      activeMode: 'custom',
      customConfig: config,
      customRoadmaps: nextRoadmaps,
      activeCustomRoadmapId: config.id,
    });
    if (config.notificationsEnabled && config.reminderTime) {
      void syncRoadmapConfigSlotToSchedule(
        {
          time: config.reminderTime,
          label: config.name,
          weekdays: config.studyWeekdays,
          repeatMinutes: config.repeatIntervalMinutes,
          enabled: true,
        },
        user?.id,
      ).then((updated) => setUnifiedSchedule(updated));
    }
    setViewTab('custom');
    setWizardEditingConfig(null);
    toast({
      title:
        existsIdx >= 0
          ? `Đã cập nhật lộ trình "${config.name}" (${config.totalStages} buổi)!`
          : lessons.length > 0
            ? `Đã tạo "${config.name}" (${config.totalStages} buổi · ${lessons.length} bộ bài tự tạo)!`
            : `Đã tạo lộ trình "${config.name}" (${config.totalStages} buổi)!`,
      tone: 'success',
    });
  };

  const handleApplyQuickTemplate = (tpl: RoadmapQuickTemplate) => {
    const nextBook = resolveActiveVocabTextbook(draftConfig.level, user?.id, draftConfig.textbookId);
    setDraftConfig({
      ...draftConfig,
      name: `${draftConfig.level} · ${tpl.nameSuffix}`,
      textbookId: nextBook.id,
      dailyMinutesTarget: tpl.dailyMinutesTarget,
      totalStages: tpl.totalStages,
      studyWeekdays: [...tpl.studyWeekdays],
      skills: [...tpl.skills],
      includeKanaStarter: draftConfig.level === 'N5' ? Boolean(tpl.includeKanaStarter) : false,
      chunkTitles: tpl.chunkTitles ? { ...tpl.chunkTitles } : {},
    });
    toast({
      title: `Đã áp dụng mẫu "${tpl.title}" (${tpl.dailyMinutesTarget}p/ngày · ${tpl.totalStages} buổi)`,
      tone: 'info',
    });
  };

  const handleSaveCustomRoadmap = () => {
    const cleanConfig: CustomRoadmapConfig = {
      ...draftConfig,
      id:
        builderIsNew || !draftConfig.id
          ? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          : draftConfig.id,
      name: draftConfig.name.trim() || `Lộ trình ${draftConfig.level}`,
      studyWeekdays:
        draftConfig.studyWeekdays.length > 0
          ? draftConfig.studyWeekdays
          : [1, 2, 3, 4, 5, 6, 0],
      skills: draftConfig.skills.length > 0 ? draftConfig.skills : ['vocab', 'quiz', 'review'],
    };
    const existingList = roadmapState.customRoadmaps ?? [];
    const existsIdx = existingList.findIndex((item) => item.id === cleanConfig.id);
    const nextRoadmaps =
      existsIdx >= 0
        ? existingList.map((item, idx) => (idx === existsIdx ? cleanConfig : item))
        : [...existingList, cleanConfig];

    updateState({
      ...roadmapState,
      activeMode: 'custom',
      customConfig: cleanConfig,
      customRoadmaps: nextRoadmaps,
      activeCustomRoadmapId: cleanConfig.id,
    });
    if (cleanConfig.notificationsEnabled && cleanConfig.reminderTime) {
      void syncRoadmapConfigSlotToSchedule(
        {
          time: cleanConfig.reminderTime,
          label: cleanConfig.name,
          weekdays: cleanConfig.studyWeekdays,
          repeatMinutes: cleanConfig.repeatIntervalMinutes,
          enabled: true,
        },
        user?.id,
      ).then((updated) => setUnifiedSchedule(updated));
    }
    setViewTab('custom');
    setBuilderOpen(false);
    toast({
      title: `Đã lưu "${cleanConfig.name}" (${cleanConfig.totalStages} màn)`,
      tone: 'success',
    });
  };

  const handleSelectCustomRoadmap = (roadmapId: string) => {
    const found = roadmapState.customRoadmaps.find((item) => item.id === roadmapId);
    if (!found) return;
    updateState({
      ...roadmapState,
      activeMode: 'custom',
      customConfig: found,
      activeCustomRoadmapId: found.id,
    });
    setViewTab('custom');
  };

  const handleDeleteCustomRoadmap = (roadmapId: string) => {
    const remaining = roadmapState.customRoadmaps.filter((item) => item.id !== roadmapId);
    const nextActive = remaining[0] ?? null;
    updateState({
      ...roadmapState,
      activeMode: nextActive ? 'custom' : 'fixed',
      customConfig: nextActive,
      customRoadmaps: remaining,
      activeCustomRoadmapId: nextActive?.id ?? null,
    });
    if (!nextActive) setViewTab('fixed');
    toast({ title: 'Đã xóa lộ trình tự tạo', tone: 'info' });
  };

  const updateActiveCustomConfig = (updater: (cfg: CustomRoadmapConfig) => CustomRoadmapConfig) => {
    if (!roadmapState.customConfig) return;
    const updatedCfg = updater(roadmapState.customConfig);
    const nextRoadmaps = roadmapState.customRoadmaps.map((item) =>
      item.id === updatedCfg.id ? updatedCfg : item,
    );
    updateState({
      ...roadmapState,
      customConfig: updatedCfg,
      customRoadmaps: nextRoadmaps.length > 0 ? nextRoadmaps : [updatedCfg],
      activeCustomRoadmapId: updatedCfg.id,
    });
  };

  const curriculumCatalog = useMemo(
    () =>
      buildCurriculumTaskCatalog({
        snapshot: cmsSnapshot,
        level: activeLevel,
        textbookId: activeBook.id,
        userId: user?.id,
      }),
    [activeBook.id, activeLevel, cmsSnapshot, user?.id],
  );

  const proUnlocked = useMemo(
    () =>
      syncVersion >= 0
        ? isProCreatorUnlocked(user?.id, user?.role)
        : isProCreatorUnlocked(user?.id, user?.role),
    [syncVersion, user?.id, user?.role],
  );

  const activeShareCode = useMemo(() => {
    if (!roadmapState.customConfig) return '';
    return encodeRoadmapShareCode(
      roadmapState.customConfig,
      user?.displayName,
      studioState.lessons,
    );
  }, [roadmapState.customConfig, studioState.lessons, user?.displayName]);

  const activeShareUrl = useMemo(() => {
    if (!activeShareCode || typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}#/roadmap?import=${encodeURIComponent(activeShareCode)}`;
  }, [activeShareCode]);

  const decodedImportPreview = useMemo(
    () => decodeRoadmapShareCode(importCodeInput),
    [importCodeInput],
  );

  const handleClickShareRoadmap = () => {
    if (!roadmapState.customConfig) return;
    if (!proUnlocked) {
      setProPaywallOpen(true);
      return;
    }
    setShareModalOpen(true);
  };

  const handleImportSharedRoadmap = () => {
    const parsed = decodeRoadmapShareCode(importCodeInput);
    if (!parsed) {
      toast({
        title: 'Mã lộ trình không hợp lệ. Vui lòng dán mã bắt đầu bằng NIHON-...',
        tone: 'warning',
      });
      return;
    }
    const bundledLessons = extractBundledStudioLessonsFromShareCode(importCodeInput);
    if (bundledLessons.length > 0) {
      const currentStudio = loadCustomStudioState(user?.id);
      const existingIds = new Set(currentStudio.lessons.map((l) => l.id));
      const newLessons = bundledLessons.filter((l) => !existingIds.has(l.id));
      if (newLessons.length > 0) {
        saveCustomStudioState(
          {
            ...currentStudio,
            lessons: [...newLessons, ...currentStudio.lessons],
          },
          user?.id,
        );
      }
    }
    const nextList = [...roadmapState.customRoadmaps, parsed];
    updateState({
      ...roadmapState,
      activeMode: 'custom',
      customConfig: parsed,
      customRoadmaps: nextList,
      activeCustomRoadmapId: parsed.id,
    });
    setViewTab('custom');
    setImportModalOpen(false);
    setImportCodeInput('');
    toast({
      title:
        bundledLessons.length > 0
          ? `Đã nhập lộ trình "${parsed.name}" (${parsed.totalStages} màn + ${bundledLessons.length} bài tự tạo)!`
          : `Đã nhập lộ trình "${parsed.name}" (${parsed.totalStages} màn)!`,
      tone: 'success',
    });
  };

  const handleShiftScheduleOneDay = () => {
    if (roadmapState.activeMode === 'custom' && roadmapState.customConfig) {
      updateActiveCustomConfig((cfg) => ({
        ...cfg,
        startDate: addDaysToDateKey(cfg.startDate, 1),
      }));
    } else {
      updateState({
        ...roadmapState,
        fixedStartDate: addDaysToDateKey(roadmapState.fixedStartDate, 1),
      });
    }
    toast({ title: 'Đã dời lịch toàn bộ các màn thêm 1 ngày', tone: 'info' });
  };

  const handleSyncScheduleToToday = () => {
    const activeIdx = activeStage ? Math.max(0, stages.findIndex((s) => s.id === activeStage.id)) : 0;
    const alignedStartDate = computeStartDateToAlignStageWithToday(
      activeIdx,
      effectiveSettings.studyWeekdays,
      todayKey,
    );
    if (roadmapState.activeMode === 'custom' && roadmapState.customConfig) {
      updateActiveCustomConfig((cfg) => ({
        ...cfg,
        startDate: alignedStartDate,
      }));
    } else {
      updateState({
        ...roadmapState,
        fixedStartDate: alignedStartDate,
      });
    }
    toast({
      title: activeStage
        ? `Đã đồng bộ Timeline: Màn ${activeStage.stageNumber} đặt đúng vào Hôm nay (${formatShortDayMonth(todayKey)})!`
        : 'Đã đồng bộ Timeline học về Hôm nay!',
      tone: 'success',
    });
  };

  useEffect(() => {
    let cancelled = false;
    void ensureUnifiedStudySchedule(user?.id).then((synced) => {
      if (!cancelled) setUnifiedSchedule(synced);
    });
    const onScheduleSync = (event: Event) => {
      const custom = event as CustomEvent<StudyScheduleConfig>;
      setUnifiedSchedule(custom.detail ?? loadStudySchedule(getLocalDateKey(), user?.id));
      setNotifPermission(getBrowserNotificationPermission());
    };
    window.addEventListener(STUDY_SCHEDULE_SYNC_EVENT, onScheduleSync);
    return () => {
      cancelled = true;
      window.removeEventListener(STUDY_SCHEDULE_SYNC_EVENT, onScheduleSync);
    };
  }, [user?.id]);

  const handleToggleTask = (taskId: string) => {
    const latest = loadStageRoadmapState(user?.id);
    const exists = latest.completedTaskIds.includes(taskId);
    const nextTaskIds = exists
      ? latest.completedTaskIds.filter((id) => id !== taskId)
      : [...latest.completedTaskIds, taskId];
    updateState({ ...latest, completedTaskIds: nextTaskIds });
  };

  const handleCompleteStage = async (stage: RoadmapStage) => {
    await completeStageAndUnlockNext({
      state: roadmapState,
      stage,
      todayOnlineSeconds,
      userId: user?.id,
    });
    setSyncVersion((v) => v + 1);
    setSelectedStageId(null);
    toast({
      title: `Hoàn thành Màn ${stage.stageNumber}! Đã mở khóa Màn ${stage.stageNumber + 1} & tắt nhắc hôm nay.`,
      tone: 'success',
    });
  };

  return (
    <PageContainer size="lg" className="max-w-5xl space-y-5 py-2">
      {!user && (
        <Notice tone="info" className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Bạn đang xem ở chế độ khách — đăng nhập để lưu tiến độ.
          </span>
          <Link
            to="/login"
            className={buttonStyles({ variant: 'primary', size: 'sm' })}
          >
            Đăng nhập
          </Link>
        </Notice>
      )}
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Lộ trình học' },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span>Lộ trình học</span>
            <Badge tone="primary">
              JLPT {activeLevel} · {activeBook.shortTitle}
            </Badge>
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={
                unifiedSchedule.enabled &&
                unifiedSchedule.timeSlots.length > 0 &&
                notifPermission === 'granted'
                  ? 'soft'
                  : 'secondary'
              }
              size="sm"
              leftIcon={
                unifiedSchedule.enabled && unifiedSchedule.timeSlots.length > 0 ? (
                  <Bell className="size-4" aria-hidden />
                ) : (
                  <BellOff className="size-4" aria-hidden />
                )
              }
              onClick={() => setScheduleModalOpen(true)}
            >
              {formatUnifiedReminderButtonLabel(unifiedSchedule, Boolean(user))}
            </Button>
          </div>
        }
      />

      {/* Today's Gate & Enforcement Status Card */}
      <Card
        padding="md"
        className={cn(
          'space-y-3.5',
          enforcement.isCompletedToday
            ? 'border-success-line bg-success-soft/35'
            : 'border-primary/40 bg-glass-soft',
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={enforcement.isCompletedToday ? 'success' : 'primary'}>
                {enforcement.isCompletedToday
                  ? '✓ Xong mục tiêu hôm nay'
                  : 'Hôm nay'}
              </Badge>
            </div>
            <h2 className="text-base font-bold text-fg">
              {activeStage
                ? `Màn ${activeStage.stageNumber}: ${activeStage.title}`
                : 'Bạn đã chinh phục toàn bộ bản đồ lộ trình!'}
            </h2>
            {!enforcement.isCompletedToday && !onlineMet && (
              <p className="text-xs text-muted">Học thêm {formatMmSs(remainingSeconds)} để mở Màn tiếp theo.</p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {activeStage && (
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
                rightIcon={<ArrowRight className="size-4" aria-hidden />}
                onClick={() => setSelectedStageId(activeStage.id)}
              >
                Học Màn {activeStage.stageNumber}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Học hôm nay (mục tiêu {effectiveSettings.dailyMinutesTarget} phút)</span>
              <span className="tabular font-semibold text-fg">
                {Math.min(100, Math.round((todayOnlineSeconds / targetSeconds) * 100))}%
              </span>
            </div>
            <ProgressBar
              value={Math.min(todayOnlineSeconds, targetSeconds)}
              max={targetSeconds}
              tone={onlineMet ? 'success' : 'primary'}
              size="sm"
              label="Thời gian online tối thiểu hôm nay"
            />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>
                Lộ trình ·{' '}
                <strong className="text-fg">
                  {roadmapForecast.isCompleted
                    ? 'Đã hoàn thành!'
                    : `dự kiến xong ${roadmapForecast.estimatedCompletionLabel}`}
                </strong>
              </span>
              <span className="tabular font-semibold text-fg">
                {completedCount}/{stages.length} màn
              </span>
            </div>
            <ProgressBar
              value={completedCount}
              max={stages.length}
              tone={completedCount === stages.length ? 'success' : 'primary'}
              size="sm"
              label="Tiến độ các màn học"
            />
          </div>
        </div>

        {/* N5 Starting Point Switcher: Learn Kana First (5 Stages) vs Skip Straight to Lesson 1 */}
        {activeLevel === 'N5' && viewTab === 'fixed' && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="text-xs font-semibold text-muted">Bắt đầu N5:</span>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Chip
                selected={
                  !(roadmapState.activeMode === 'custom' && roadmapState.customConfig
                    ? Boolean(roadmapState.customConfig.includeKanaStarter)
                    : Boolean(roadmapState.fixedIncludeKanaStarter))
                }
                onClick={() => {
                  if (roadmapState.activeMode === 'custom' && roadmapState.customConfig) {
                    updateActiveCustomConfig((cfg) => ({ ...cfg, includeKanaStarter: false }));
                  } else {
                    updateState({ ...roadmapState, fixedIncludeKanaStarter: false });
                  }
                  toast({ title: 'Đã chuyển sang: Bỏ qua Kana → Vào thẳng Bài 1 N5', tone: 'info' });
                }}
              >
                Từ Bài 1
              </Chip>
              <Chip
                selected={
                  roadmapState.activeMode === 'custom' && roadmapState.customConfig
                    ? Boolean(roadmapState.customConfig.includeKanaStarter)
                    : Boolean(roadmapState.fixedIncludeKanaStarter)
                }
                onClick={() => {
                  if (roadmapState.activeMode === 'custom' && roadmapState.customConfig) {
                    updateActiveCustomConfig((cfg) => ({ ...cfg, includeKanaStarter: true }));
                  } else {
                    updateState({ ...roadmapState, fixedIncludeKanaStarter: true });
                  }
                  toast({
                    title: 'Đã thêm Chặng 0: 5 Màn Bảng chữ cái Hiragana & Katakana lên đầu lộ trình!',
                    tone: 'success',
                  });
                }}
              >
                Học Kana trước (+5 màn)
              </Chip>
            </div>
          </div>
        )}
      </Card>

      {/* Mode Switcher + Inline Quick Settings */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              aria-label="Chế độ lộ trình"
              variant="pill"
              value={viewTab}
              onChange={handleModeChange}
              className="max-w-full shrink-0"
              items={[
                { value: 'fixed', label: 'Giáo trình chuẩn' },
                {
                  value: 'custom',
                  label: `Lộ trình riêng (${roadmapState.customRoadmaps.length})`,
                },
              ]}
            />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Plus className="size-4" aria-hidden />}
              onClick={() => handleOpenWizard('choose')}
            >
              Tạo lộ trình
            </Button>
            {!(viewTab === 'custom' && !roadmapState.customConfig) && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Settings2 className="size-4" aria-hidden />}
                onClick={() => setSettingsModalOpen(true)}
              >
                Cài đặt lộ trình
              </Button>
            )}
            <Dropdown
              variant="ghost"
              size="sm"
              align="end"
              aria-label="Thêm tùy chọn lộ trình"
              label={<MoreHorizontal className="size-5" aria-hidden />}
              items={[
                ...(viewTab === 'fixed'
                  ? [
                      {
                        id: 'clone-fixed',
                        label: 'Nhân bản sang Lộ trình riêng',
                        icon: <Copy className="size-4" aria-hidden />,
                        onSelect: handleCloneFixedToCustom,
                      },
                    ]
                  : []),
                ...(activeStage && activeStage.scheduledDate !== todayKey
                  ? [
                      {
                        id: 'sync-today',
                        label: 'Đưa Màn hiện tại về hôm nay',
                        icon: <Calendar className="size-4" aria-hidden />,
                        onSelect: handleSyncScheduleToToday,
                      },
                    ]
                  : []),
                {
                  id: 'shift',
                  label: 'Dời lịch thêm 1 ngày',
                  icon: <CalendarPlus className="size-4" aria-hidden />,
                  onSelect: handleShiftScheduleOneDay,
                },
                ...(roadmapState.customConfig && viewTab === 'custom'
                  ? [
                      {
                        id: 'share',
                        label: proUnlocked ? 'Chia sẻ lộ trình' : 'Chia sẻ lộ trình (PRO)',
                        icon: proUnlocked ? (
                          <Share className="size-4" aria-hidden />
                        ) : (
                          <Lock className="size-4" aria-hidden />
                        ),
                        onSelect: handleClickShareRoadmap,
                      },
                      {
                        id: 'export-json',
                        label: 'Xuất file JSON',
                        icon: <FileJson className="size-4" aria-hidden />,
                        onSelect: () => handleOpenAiJsonModal('export'),
                      },
                    ]
                  : []),
                ...(roadmapState.customConfig && viewTab === 'custom'
                  ? [
                      {
                        id: 'edit-plan',
                        label: 'Sửa lộ trình',
                        icon: <Pencil className="size-4" aria-hidden />,
                        onSelect: handleEditActiveCustomRoadmap,
                      },
                      {
                        id: 'delete-plan',
                        label: 'Xóa lộ trình',
                        icon: <Trash2 className="size-4 text-danger-fg" aria-hidden />,
                        onSelect: () => setDeleteConfirmRoadmap(roadmapState.customConfig),
                      },
                    ]
                  : []),
                {
                  id: 'import',
                  label: 'Nhập mã lộ trình',
                  icon: <Download className="size-4" aria-hidden />,
                  onSelect: () => setImportModalOpen(true),
                },
                ...(viewTab === 'fixed'
                  ? [
                      {
                        id: 'level',
                        label: 'Đổi trình độ / sách',
                        icon: <BookOpen className="size-4" aria-hidden />,
                        onSelect: requestOpenLevelModal,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>

        {/* Multi-Roadmap Selector Strip (Thêm · Sửa · Xóa lộ trình riêng) */}
        {viewTab === 'custom' && roadmapState.customRoadmaps.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted">Lộ trình của bạn:</span>
              {roadmapState.customRoadmaps.map((plan) => (
                <Chip
                  key={plan.id}
                  selected={roadmapState.activeCustomRoadmapId === plan.id}
                  onClick={() => handleSelectCustomRoadmap(plan.id)}
                >
                  {plan.name} ({plan.level})
                </Chip>
              ))}
            </div>
          </div>
        )}


      </Card>

      {/* Empty State when user opens "Lộ trình riêng (0)" */}
      {viewTab === 'custom' && !roadmapState.customConfig && (
        <Card padding="lg" className="space-y-4 border-primary/40 bg-glass-soft">
          <h2 className="text-lg font-bold text-fg">Chưa có lộ trình riêng</h2>

          <div className="flex flex-wrap gap-2.5">
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Plus className="size-4 shrink-0" aria-hidden />}
              onClick={() => handleOpenWizard('choose')}
            >
              Tạo lộ trình
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Copy className="size-4 shrink-0" aria-hidden />}
              onClick={handleCloneFixedToCustom}
            >
              Nhân bản từ Giáo trình chuẩn
            </Button>
          </div>
        </Card>
      )}

      {/* Stage Map (Fixed / Custom) */}
      {viewTab === 'custom' && !roadmapState.customConfig ? null : (
      <div className="space-y-4">
        {/* View Switcher: Game Map vs Clean 2-Column Day Cards (Mokumoku Style) */}
        <div className="flex justify-end">
          <div className="inline-flex rounded-xl border border-line bg-surface/85 p-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setStageLayout('map')}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                stageLayout === 'map'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-muted hover:text-fg',
              )}
            >
              Bản đồ
            </button>
            <button
              type="button"
              onClick={() => setStageLayout('days')}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                stageLayout === 'days'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-muted hover:text-fg',
              )}
            >
              Danh sách
            </button>
          </div>
        </div>

        {stageLayout === 'days' ? (
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {stages.map((stage) => {
              const completion = roadmapState.completedStages[stage.id];
              const unlocked = isStageUnlocked(stage, stages, roadmapState.completedStages);
              const isCurrent = activeStage?.id === stage.id && !completion;
              return (
                <button
                  key={stage.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && setSelectedStageId(stage.id)}
                  className={cn(
                    'flex flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition-all',
                    completion
                      ? 'cursor-pointer border-success-line bg-success-soft/25 hover:border-success-fg/60'
                      : isCurrent
                        ? 'cursor-pointer border-primary bg-surface/95 ring-2 ring-primary/25 hover:border-primary'
                        : unlocked
                          ? 'cursor-pointer border-line bg-surface/90 hover:border-primary/50 hover:bg-surface'
                          : 'cursor-not-allowed border-line bg-surface/55 opacity-60',
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={completion ? 'success' : isCurrent ? 'sakura' : 'neutral'}>
                          📅 Ngày {stage.stageNumber}
                        </Badge>
                        <Badge tone="primary">{activeLevel}</Badge>
                        {isCurrent && <Badge tone="sakura">Hôm nay</Badge>}
                      </div>
                      <span className="text-[11px] font-medium text-muted tabular">
                        {formatShortDayMonth(stage.scheduledDate)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-fg sm:text-base">{stage.title}</h3>
                    <p className="line-clamp-2 text-xs text-muted">{stage.theme}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2.5 text-xs text-muted">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>📖 {stage.tasks.length} nhiệm vụ + Chốt Màn</span>
                      <span>⏱ ~{stage.minOnlineMinutes}p</span>
                    </div>
                    {completion ? (
                      <span className="font-bold text-success-fg">✓ Đã xong ({completion.stars}★)</span>
                    ) : unlocked ? (
                      <span className="font-semibold text-primary-fg">Mở Task hôm nay →</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted">
                        <Lock className="size-3" aria-hidden />
                        Đang khóa
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
        <div className="space-y-5">
        {stageChunks.map((chunk, chunkIdx) => {
          const rawChunkNum = chunk[0]?.chunkNumber ?? chunkIdx + 1;
          const chunkNum = rawChunkNum;
          const firstNum = chunk[0]?.stageNumber ?? 1;
          const lastNum = chunk[chunk.length - 1]?.stageNumber ?? chunk.length;
          const doneInChunk = chunk.filter((s) =>
            Boolean(roadmapState.completedStages[s.id]),
          ).length;
          const row1 = chunk.slice(0, 5);
          const row2 = chunk.slice(5, 10);

          const renderNode = (stage: RoadmapStage) => {
            const completion = roadmapState.completedStages[stage.id];
            const unlocked = isStageUnlocked(stage, stages, roadmapState.completedStages);
            const isCurrent = activeStage?.id === stage.id && !completion;
            const isTodayScheduled = stage.scheduledDate === todayKey;
            const isOverdue = !completion && stage.scheduledDate < todayKey;
            const stars = completion?.stars ?? 0;

            return (
              <div
                key={stage.id}
                className="relative z-10 flex flex-col items-center text-center"
              >
                {/* Floating Mascot / Today marker above current active node */}
                <div className="mb-1.5 flex h-6 items-center justify-center">
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary-fg shadow-card">
                      <span lang="ja">問</span>
                      <span>{isTodayScheduled ? 'Hôm nay' : 'Đang học'}</span>
                    </span>
                  ) : isOverdue && unlocked ? (
                    <Badge tone="warning" className="px-1.5 py-0 text-[10px]">
                      Trễ lịch
                    </Badge>
                  ) : null}
                </div>

                {/* Circular Stage Medallion */}
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && setSelectedStageId(stage.id)}
                  aria-label={
                    completion
                      ? `Màn ${stage.stageNumber} đã hoàn thành (${stars} sao) — Bấm để ôn lại`
                      : unlocked
                        ? `Mở Màn ${stage.stageNumber}: ${stage.title}`
                        : `Màn ${stage.stageNumber} đang khóa — Hoàn thành Màn ${stage.stageNumber - 1} để mở`
                  }
                  className={cn(
                    'group relative grid size-14 place-items-center rounded-full border-2 text-base font-bold transition-transform duration-150 sm:size-16 sm:text-lg',
                    completion
                      ? 'cursor-pointer border-success-line bg-success-soft text-success-fg hover:scale-105'
                      : isCurrent
                        ? 'cursor-pointer border-primary bg-primary text-on-primary ring-4 ring-primary/25 shadow-card hover:scale-105'
                        : unlocked
                          ? 'cursor-pointer border-primary/60 bg-surface text-primary-fg hover:scale-105 hover:bg-primary-soft'
                          : 'cursor-not-allowed border-line bg-surface-2 text-muted opacity-75',
                  )}
                >
                  {completion ? (
                    <Check className="size-6 stroke-[2.5]" aria-hidden />
                  ) : unlocked ? (
                    <span className="tabular">{stage.stageNumber}</span>
                  ) : (
                    <Lock className="size-5" aria-hidden />
                  )}
                </button>

                {/* 3-Star Row */}
                <div className="mt-1.5 flex items-center gap-0.5" aria-hidden>
                  {[1, 2, 3].map((idx) => (
                    <Star
                      key={idx}
                      className={cn(
                        'size-3.5',
                        idx <= stars
                          ? 'fill-current text-warning-fg'
                          : 'text-line-strong',
                      )}
                    />
                  ))}
                </div>

                {/* Scheduled Date & Short Label */}
                <span
                  className={cn(
                    'tabular mt-0.5 text-[11px] font-medium',
                    isCurrent
                      ? 'text-primary-fg font-semibold'
                      : completion
                        ? 'text-success-fg'
                        : 'text-muted',
                  )}
                >
                  {formatShortDayMonth(stage.scheduledDate)}
                </span>
              </div>
            );
          };

          return (
            <Card key={chunkNum} padding="lg" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <h3 className="text-base font-bold text-fg">
                  {chunkNum === 0 ? 'Khởi động' : `Chặng ${chunkNum}`} · Màn {firstNum}–{lastNum}
                </h3>
                <Badge
                  tone={doneInChunk === chunk.length ? 'success' : 'neutral'}
                  className="tabular"
                >
                  {doneInChunk}/{chunk.length} màn
                </Badge>
              </div>

              {/* Row 1: 5 Nodes */}
              <div className="relative">
                <div
                  aria-hidden
                  className="pointer-events-none absolute top-14 right-[10%] left-[10%] hidden border-t-2 border-dashed border-line-strong md:block"
                />
                <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-5">
                  {row1.map(renderNode)}
                </div>
              </div>

              {/* Row 2: Next 5 Nodes */}
              {row2.length > 0 && (
                <div className="relative pt-2">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute top-16 right-[10%] left-[10%] hidden border-t-2 border-dashed border-line-strong md:block"
                  />
                  <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-5">
                    {row2.map(renderNode)}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        </div>
        )}
      </div>
      )}

      {/* Roadmap settings (start date, daily minutes -> dynamic timeline sessions, study days) */}
      <Modal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        size="md"
        title="Cài đặt lộ trình"
        footer={
          <Button type="button" variant="primary" onClick={() => setSettingsModalOpen(false)}>
            Xong
          </Button>
        }
      >
        {(() => {
          const customPlan = viewTab === 'custom' ? roadmapState.customConfig : null;
          // Hand-built plans keep their own sessions: pace must not generate or drop any
          const builtSessions = customPlan
            ? Object.values(customPlan.stageOverrides ?? {}).filter((o) => o?.replaceBaseTasks).length
            : 0;
          return (
            <div className="space-y-4">
              <SchedulePicker
                idPrefix="plan-settings"
                minutes={customPlan ? customPlan.dailyMinutesTarget : roadmapState.fixedDailyMinutesTarget}
                showStageCount={builtSessions === 0}
                onMinutesChange={(minutes, recommendedStages) => {
                  if (customPlan) {
                    updateActiveCustomConfig((cfg) => ({
                      ...cfg,
                      dailyMinutesTarget: minutes,
                      totalStages: (builtSessions > 0 ? builtSessions : recommendedStages) as TotalStagesOption,
                    }));
                  } else {
                    updateState({ ...roadmapState, fixedDailyMinutesTarget: minutes });
                  }
                }}
                startDate={customPlan ? customPlan.startDate : roadmapState.fixedStartDate}
                onStartDateChange={(date) => {
                  if (customPlan) updateActiveCustomConfig((cfg) => ({ ...cfg, startDate: date }));
                  else updateState({ ...roadmapState, fixedStartDate: date });
                }}
                weekdays={effectiveSettings.studyWeekdays}
                onWeekdaysChange={(days) => {
                  if (customPlan) updateActiveCustomConfig((cfg) => ({ ...cfg, studyWeekdays: days }));
                  else updateState({ ...roadmapState, fixedStudyWeekdays: days });
                }}
              />

              <div className="rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-sm text-muted">
                {stages.length} buổi · xong {roadmapForecast.estimatedCompletionLabel}
              </div>
            </div>
          );
        })()}
      </Modal>
      <StudyScheduleModal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} />

      {/* Stage Detail & Unlock Modal */}
      <Modal
        open={Boolean(selectedStage)}
        onClose={() => setSelectedStageId(null)}
        size="lg"
        title={
          selectedStage
            ? `Màn ${selectedStage.stageNumber} · ${selectedStage.title}`
            : ''
        }
        description={
          selectedStage
            ? `${formatVietnameseDateWithWeekday(selectedStage.scheduledDate)} · ${selectedStage.theme}`
            : undefined
        }
        footer={
          selectedStage && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedStageId(null)}
              >
                Đóng
              </Button>
              {roadmapState.completedStages[selectedStage.id] ? (
                <Badge tone="success" className="px-3 py-1.5 text-xs">
                  <CheckCircle2 className="size-4" aria-hidden />
                  Đã hoàn thành ({roadmapState.completedStages[selectedStage.id].stars}★)
                </Badge>
              ) : (
                (() => {
                  const isActiveSelected = activeStage?.id === selectedStage.id;
                  const doneTaskCount = selectedStage.tasks.filter(
                    (t) =>
                      roadmapState.completedTaskIds.includes(t.id) ||
                      (isActiveSelected && todayAutoSkills.has(t.skill)),
                  ).length;
                  const allTasksChecked = doneTaskCount === selectedStage.tasks.length;
                  const isCustomAuthoredStage = Boolean(
                    roadmapState.activeMode === 'custom' &&
                      roadmapState.customConfig?.stageOverrides?.[selectedStage.stageNumber]
                        ?.replaceBaseTasks,
                  );
                  const bossRecord = passedBossStages[selectedStage.id] ?? null;
                  const hasMasteryQuiz = Boolean(
                    !isCustomAuthoredStage &&
                      selectedStageBriefing &&
                      selectedStageBriefing.masteryQuestions.length > 0,
                  );
                  const bossSatisfied = !hasMasteryQuiz || Boolean(bossRecord);
                  const canComplete =
                    Boolean(bossRecord?.isJumpPass) ||
                    (isCustomAuthoredStage
                      ? allTasksChecked
                      : onlineMet && allTasksChecked && bossSatisfied);
                  const hasNextStage = selectedStage.stageNumber < stages.length;
                  return (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={!canComplete}
                      leftIcon={<Sparkles className="size-4" aria-hidden />}
                      onClick={() => void handleCompleteStage(selectedStage)}
                    >
                      {canComplete
                        ? hasNextStage
                          ? `Hoàn thành & Mở khóa Màn ${selectedStage.stageNumber + 1}`
                          : 'Hoàn thành Màn cuối cùng'
                        : !allTasksChecked
                          ? isCustomAuthoredStage
                            ? `Hoàn thành ${doneTaskCount}/${selectedStage.tasks.length} bài trước`
                            : 'Hoàn thành Chặng 1 → 3 trước'
                          : !bossSatisfied
                            ? 'Vượt Chốt Màn Chặng 4 (100%)'
                            : `Còn thiếu ${formatMmSs(remainingSeconds)} online`}
                    </Button>
                  );
                })()
              )}
            </>
          )
        }
      >
        {selectedStage && (
          <div className="space-y-4">
            {/* Condition 1: Daily Online Time Gate */}
            <div className="rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-fg">
                  <Clock className="size-4 text-primary-fg" aria-hidden />
                  Online hôm nay ({selectedStage.minOnlineMinutes}p)
                </span>
                <Badge tone={onlineMet ? 'success' : 'warning'} className="tabular">
                  {onlineMet
                    ? `Đạt (${formatMmSs(todayOnlineSeconds)})`
                    : `${formatMmSs(todayOnlineSeconds)} / ${selectedStage.minOnlineMinutes}:00`}
                </Badge>
              </div>
              <ProgressBar
                value={Math.min(todayOnlineSeconds, selectedStage.minOnlineMinutes * 60)}
                max={selectedStage.minOnlineMinutes * 60}
                tone={onlineMet ? 'success' : 'primary'}
                size="sm"
                label="Thời gian online để mở khóa màn"
              />
            </div>

            {/* 4-Phase 20–30 Min Daily Study Blueprint Strip */}
            {(() => {
              const stageCompleted = Boolean(roadmapState.completedStages[selectedStage.id]);
              const isTaskDone = (t: StageTask) =>
                roadmapState.completedTaskIds.includes(t.id) ||
                (activeStage?.id === selectedStage.id && todayAutoSkills.has(t.skill));

              const studyTasks = selectedStage.tasks.filter(
                (t) => getStageTaskPhase(t) === 'study',
              );
              const practiceTasks = selectedStage.tasks.filter(
                (t) => getStageTaskPhase(t) === 'practice',
              );
              const isCustomAuthoredStage = Boolean(
                roadmapState.activeMode === 'custom' &&
                  roadmapState.customConfig?.stageOverrides?.[selectedStage.stageNumber]
                    ?.replaceBaseTasks,
              );
              const orderedTasks = isCustomAuthoredStage
                ? selectedStage.tasks
                : [...studyTasks, ...practiceTasks];

              const isBriefingUnderstood =
                stageCompleted || understoodStageIds.includes(selectedStage.id);
              const isGateSkipped =
                stageCompleted || skippedGateStageIds.includes(selectedStage.id);
              const allStudyTasksDone = studyTasks.every(isTaskDone);
              const allPracticeTasksDone = practiceTasks.every(isTaskDone);
              const bossRecord = passedBossStages[selectedStage.id] ?? null;

              const isPracticeUnlocked =
                stageCompleted ||
                isCustomAuthoredStage ||
                isGateSkipped ||
                (isBriefingUnderstood && (studyTasks.length === 0 || allStudyTasksDone));

              const isBossUnlocked =
                stageCompleted ||
                Boolean(bossRecord) ||
                (isPracticeUnlocked && allPracticeTasksDone);

              const firstPendingTask = orderedTasks.find((t) => !isTaskDone(t));

              const renderTaskItem = (
                task: StageTask,
                stepNumber: number,
                locked: boolean,
                phase: 'study' | 'practice',
              ) => {
                const manualDone = roadmapState.completedTaskIds.includes(task.id);
                const autoDone =
                  activeStage?.id === selectedStage.id && todayAutoSkills.has(task.skill);
                const done = manualDone || autoDone;
                const isNextStep = !done && !locked && firstPendingTask?.id === task.id;
                const skillMeta = STAGE_SKILL_META[task.skill];

                const isWritingTask = task.to.startsWith('/games?game=shooter') || task.to.startsWith('/vocabulary/writing');
                const isKanaTask =
                  task.to.includes('/kana') ||
                  task.title.toLowerCase().includes('hiragana') ||
                  task.title.toLowerCase().includes('katakana');
                let sessionModeTarget: 'vocab' | 'kanji' | 'briefing' | 'reading' | 'listening' | null =
                  null;
                if (!isWritingTask && !isKanaTask && roadmapState.activeMode !== 'custom') {
                  if (task.skill === 'vocab' && phase === 'study') sessionModeTarget = 'vocab';
                  else if (task.skill === 'kanji') sessionModeTarget = 'kanji';
                  else if (task.skill === 'grammar' && phase === 'study') sessionModeTarget = 'briefing';
                  else if (task.skill === 'reading') sessionModeTarget = 'reading';
                  else if (task.skill === 'listening') sessionModeTarget = 'listening';
                }

                // Short, crisp task title & 1-line subtitle (keeps custom user titles intact)
                const compactTitle =
                  roadmapState.activeMode === 'custom'
                    ? task.title
                    : sessionModeTarget === 'vocab'
                      ? 'Từ vựng (Lật thẻ)'
                      : sessionModeTarget === 'kanji'
                        ? '5 chữ Kanji'
                        : sessionModeTarget === 'briefing'
                          ? 'Ngữ pháp bài học'
                          : sessionModeTarget === 'reading'
                            ? 'Đọc hiểu ngắn'
                            : sessionModeTarget === 'listening'
                              ? 'Nghe hiểu & Script'
                              : isWritingTask
                                ? 'Luyện gõ từ vựng'
                                : task.skill === 'quiz'
                                  ? 'Quiz nhanh 10 câu'
                                  : task.title.replace(/\s*\([^)]*\)/g, '').trim();

                const compactSub =
                  roadmapState.activeMode === 'custom'
                    ? task.subtitle
                    : sessionModeTarget === 'vocab'
                      ? 'Lật thẻ nhớ nghĩa → Quiz 100%'
                      : sessionModeTarget === 'kanji'
                        ? 'Hán Việt, On–Kun → Quiz 100%'
                        : sessionModeTarget === 'briefing'
                          ? 'Đọc từng mẫu → Bài tập 100%'
                          : sessionModeTarget === 'reading'
                            ? 'Đọc đoạn văn → Trả lời đúng 100%'
                            : sessionModeTarget === 'listening'
                              ? 'Nghe ẩn Script → Mở Script 100%'
                              : isWritingTask
                                ? 'Gõ chuẩn trường âm & âm ngắt'
                                : task.skill === 'quiz'
                                  ? 'Sai làm lại tới đúng 100%'
                                  : task.subtitle;

                return (
                  <li
                    key={task.id}
                    className={cn(
                      'flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
                      done
                        ? 'border-success-line bg-success-soft/45'
                        : locked
                          ? 'border-line bg-surface-2/35 opacity-75'
                          : isNextStep
                            ? 'border-primary/60 bg-primary-soft/25 ring-1 ring-primary/20'
                            : 'border-line bg-surface-2/50',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {locked ? (
                        <span
                          title="Hoàn thành Chặng 1–2 để mở khóa"
                          className="shrink-0 text-muted"
                        >
                          <Lock className="size-4" aria-hidden />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              phase === 'practice' &&
                              task.skill === 'quiz' &&
                              !done &&
                              !isGateSkipped &&
                              roadmapState.activeMode !== 'custom'
                            ) {
                              toast({
                                title: 'Hãy hoàn thành Quiz 100% để tự động tích xanh!',
                                tone: 'info',
                              });
                              return;
                            }
                            handleToggleTask(task.id);
                          }}
                          aria-pressed={done}
                          aria-label={
                            done
                              ? `Bỏ đánh dấu ${compactTitle}`
                              : `Đánh dấu hoàn thành ${compactTitle}`
                          }
                          className={cn(
                            'shrink-0 cursor-pointer rounded-full transition-colors',
                            done ? 'text-success-fg' : 'text-muted hover:text-primary-fg',
                          )}
                        >
                          {done ? (
                            <CheckCircle2 className="size-5" />
                          ) : (
                            <Circle className="size-5" />
                          )}
                        </button>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            tone={
                              done
                                ? 'success'
                                : locked
                                  ? 'neutral'
                                  : isNextStep
                                    ? 'primary'
                                    : 'neutral'
                            }
                          >
                            Bước {stepNumber}
                          </Badge>
                          <span
                            className={cn(
                              'text-sm font-semibold',
                              done ? 'text-muted line-through' : 'text-fg',
                            )}
                          >
                            {compactTitle}
                          </span>
                          <Badge tone={skillMeta.tone}>{skillMeta.label}</Badge>
                          {isNextStep && <Badge tone="sakura">Tiếp theo</Badge>}
                          <span className="text-xs text-muted">~{task.minutes}p</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">{compactSub}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
                      {locked ? (
                        <Button type="button" variant="secondary" size="sm" disabled>
                          <Lock className="size-3.5" aria-hidden />
                          Mở sau Chặng 2
                        </Button>
                      ) : sessionModeTarget ? (
                        (() => {
                          const modeTarget = sessionModeTarget;
                          const ctaLabel = done
                            ? 'Ôn lại'
                            : modeTarget === 'vocab' || modeTarget === 'kanji'
                              ? 'Lật thẻ'
                              : modeTarget === 'listening'
                                ? 'Nghe ngay'
                                : 'Học ngay';
                          return (
                            <Button
                              type="button"
                              variant={done ? 'secondary' : isNextStep ? 'primary' : 'soft'}
                              size="sm"
                              rightIcon={<ArrowRight className="size-3.5" aria-hidden />}
                              onClick={() => {
                                persistActiveStageSession({
                                  stage: selectedStage,
                                  level: activeLevel,
                                  textbookId: activeBook.id,
                                });
                                setSelectedStageId(null);
                                navigate(
                                  `/roadmap/stage/${encodeURIComponent(selectedStage.id)}/${modeTarget}`,
                                  {
                                    state: {
                                      stage: selectedStage,
                                      level: activeLevel,
                                      textbookId: activeBook.id,
                                    },
                                  },
                                );
                              }}
                            >
                              {ctaLabel}
                            </Button>
                          );
                        })()
                      ) : (() => {
                          const studioMatch = task.to.match(/^\/studio\?lesson=([^&]+)/);
                          const inlineLesson = studioMatch
                            ? studioState.lessons.find(
                                (l) => l.id === decodeURIComponent(studioMatch[1]),
                              ) ?? null
                            : null;
                          if (inlineLesson) {
                            return (
                              <Button
                                type="button"
                                variant={done ? 'secondary' : isNextStep ? 'primary' : 'soft'}
                                size="sm"
                                rightIcon={<ArrowRight className="size-3.5" aria-hidden />}
                                onClick={() =>
                                  setInlinePlayingLesson({
                                    lesson: inlineLesson,
                                    taskId: task.id,
                                  })
                                }
                              >
                                {done
                                  ? 'Ôn lại'
                                  : inlineLesson.kind === 'quiz'
                                    ? 'Làm Quiz'
                                    : 'Học ngay'}
                              </Button>
                            );
                          }
                          return (
                            <Link
                              to={
                                task.to.startsWith('/vocabulary/quiz')
                                  ? `${task.to}${task.to.includes('?') ? '&' : '?'}mastery=1&stage=${encodeURIComponent(selectedStage.id)}`
                                  : task.to
                              }
                              onClick={() => setSelectedStageId(null)}
                              className={buttonStyles({
                                variant: done ? 'secondary' : isNextStep ? 'primary' : 'soft',
                                size: 'sm',
                              })}
                            >
                              {done ? 'Ôn lại' : phase === 'practice' ? 'Làm bài' : 'Học ngay'}
                              <ArrowRight className="size-3.5" aria-hidden />
                            </Link>
                          );
                        })()}
                    </div>
                  </li>
                );
              };

              if (isCustomAuthoredStage) {
                const doneCustomCount = selectedStage.tasks.filter(isTaskDone).length;
                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-primary-fg">
                        📘 Bài học trong Buổi này ({doneCustomCount}/{selectedStage.tasks.length})
                      </span>
                      <Badge
                        tone={
                          doneCustomCount === selectedStage.tasks.length &&
                          selectedStage.tasks.length > 0
                            ? 'success'
                            : 'neutral'
                        }
                        className="tabular"
                      >
                        {doneCustomCount === selectedStage.tasks.length &&
                        selectedStage.tasks.length > 0
                          ? '✓ Đã xong toàn bộ bài'
                          : 'Bấm Học ngay hoặc tích tròn sau khi học xong'}
                      </Badge>
                    </div>
                    <ul className="space-y-2">
                      {selectedStage.tasks.map((task, idx) =>
                        renderTaskItem(
                          task,
                          idx + 1,
                          false,
                          getStageTaskPhase(task),
                        ),
                      )}
                    </ul>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Visual 4-Phase 20-30m Stepper Strip */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      {
                        label: '1. Nạp Từ/Kanji',
                        sub: '~7p',
                        done: studyTasks.length === 0 || allStudyTasksDone,
                      },
                      {
                        label: '2. Tips & Dấu hiệu',
                        sub: '~7p',
                        done: isBriefingUnderstood,
                      },
                      {
                        label: '3. Thực chiến',
                        sub: '~7p',
                        done: practiceTasks.length === 0 || allPracticeTasksDone,
                      },
                      {
                        label: '4. Chốt Màn 100%',
                        sub: '~5p',
                        done: stageCompleted || Boolean(bossRecord),
                      },
                    ].map((ph) => (
                      <div
                        key={ph.label}
                        className={cn(
                          'flex items-center justify-between gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold',
                          ph.done
                            ? 'border-success-line bg-success-soft/35 text-success-fg'
                            : 'border-line bg-surface-2/60 text-muted',
                        )}
                      >
                        <span className="truncate">{ph.label}</span>
                        <span className="shrink-0 opacity-80">{ph.done ? '✓' : ph.sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* CHẶNG 1: Từ vựng & Kanji */}
                  {studyTasks.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-primary-fg">
                          📘 Chặng 1 · Từ vựng &amp; Kanji ({studyTasks.filter(isTaskDone).length}/{studyTasks.length})
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <Badge
                            tone={dailyMetrics.vocabIds.length >= DAILY_VOCAB_TARGET ? 'success' : 'neutral'}
                            className="tabular"
                          >
                            Từ: {Math.min(dailyMetrics.vocabIds.length, DAILY_VOCAB_TARGET)}/{DAILY_VOCAB_TARGET}
                          </Badge>
                          <Badge
                            tone={dailyMetrics.kanjiIds.length >= DAILY_KANJI_TARGET ? 'success' : 'neutral'}
                            className="tabular"
                          >
                            Kanji: {Math.min(dailyMetrics.kanjiIds.length, DAILY_KANJI_TARGET)}/{DAILY_KANJI_TARGET}
                          </Badge>
                        </div>
                      </div>
                      <ul className="space-y-1.5">
                        {studyTasks.map((task, idx) =>
                          renderTaskItem(task, idx + 1, false, 'study'),
                        )}
                      </ul>
                    </div>
                  )}

                  {/* CHẶNG 2: Tips & Dấu hiệu */}
                  {!isCustomAuthoredStage && selectedStageBriefing && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-primary-fg">
                        📖 Chặng 2 · Tips &amp; Dấu hiệu ({isBriefingUnderstood ? '1/1' : '0/1'})
                      </span>
                      <div
                        className={cn(
                          'flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
                          isBriefingUnderstood
                            ? 'border-success-line bg-success-soft/45'
                            : 'border-primary/45 bg-primary-soft/20',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={cn(
                              'grid size-7 shrink-0 place-items-center rounded-lg',
                              isBriefingUnderstood
                                ? 'bg-success-soft text-success-fg'
                                : 'bg-primary-soft text-primary-fg',
                            )}
                          >
                            {isBriefingUnderstood ? (
                              <CheckCircle2 className="size-4" aria-hidden />
                            ) : (
                              <BookOpen className="size-4" aria-hidden />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={cn(
                                  'text-sm font-semibold',
                                  isBriefingUnderstood ? 'text-muted line-through' : 'text-fg',
                                )}
                              >
                                Tips, Dấu hiệu &amp; Bẫy ○/×
                              </span>
                              <Badge tone={isBriefingUnderstood ? 'success' : 'primary'}>
                                {isBriefingUnderstood ? '✓ 100%' : '100%'}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted">
                              Đọc từng mẫu → {selectedStageBriefing.quickChecks.length} câu chốt hiểu
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant={isBriefingUnderstood ? 'secondary' : 'primary'}
                          size="sm"
                          className="shrink-0 self-end sm:self-center"
                          rightIcon={<ArrowRight className="size-3.5" aria-hidden />}
                          onClick={() => {
                            persistActiveStageSession({
                              stage: selectedStage,
                              level: activeLevel,
                              textbookId: activeBook.id,
                            });
                            setSelectedStageId(null);
                            navigate(`/roadmap/stage/${encodeURIComponent(selectedStage.id)}/briefing`, {
                              state: {
                                stage: selectedStage,
                                level: activeLevel,
                                textbookId: activeBook.id,
                              },
                            });
                          }}
                        >
                          {isBriefingUnderstood ? 'Xem lại' : 'Đọc & Làm'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* CHẶNG 3: Thực chiến */}
                  {practiceTasks.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-fg">
                          {isPracticeUnlocked ? (
                            <Unlock className="size-3.5 text-success-fg" aria-hidden />
                          ) : (
                            <Lock className="size-3.5 text-warning-fg" aria-hidden />
                          )}
                          ⚔️ Chặng 3 · Thực chiến ({practiceTasks.filter(isTaskDone).length}/{practiceTasks.length})
                        </span>
                        {!isPracticeUnlocked && (
                          <button
                            type="button"
                            onClick={() => {
                              markStageGateSkipped(selectedStage.id, user?.id);
                              setSyncVersion((v) => v + 1);
                              toast({
                                title: 'Đã mở khóa Chặng 3!',
                                tone: 'info',
                              });
                            }}
                            className="cursor-pointer text-[11px] font-medium text-primary-fg underline decoration-primary/40 underline-offset-2 hover:opacity-80"
                          >
                            Mở nhanh Chặng 3
                          </button>
                        )}
                      </div>

                      <ul className="space-y-1.5">
                        {practiceTasks.map((task, idx) =>
                          renderTaskItem(
                            task,
                            studyTasks.length + idx + 1,
                            !isPracticeUnlocked,
                            'practice',
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  {/* CHẶNG 4: Chốt Màn 100% */}
                  {!isCustomAuthoredStage &&
                    selectedStageBriefing &&
                    selectedStageBriefing.masteryQuestions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-fg">
                        {bossRecord ? (
                          <Trophy className="size-3.5 text-success-fg" aria-hidden />
                        ) : isBossUnlocked ? (
                          <Award className="size-3.5 text-sakura" aria-hidden />
                        ) : (
                          <Lock className="size-3.5 text-muted" aria-hidden />
                        )}
                        🏆 Chặng 4 · Chốt Màn (chọn {Math.min(10, selectedStageBriefing.masteryQuestions.length)}–{Math.min(20, selectedStageBriefing.masteryQuestions.length)} câu)
                      </span>
                      <div
                        className={cn(
                          'flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
                          bossRecord
                            ? 'border-success-line bg-success-soft/45'
                            : isBossUnlocked
                              ? 'border-sakura/50 bg-sakura-soft/20'
                              : 'border-line bg-surface-2/40',
                        )}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                'text-sm font-semibold',
                                bossRecord ? 'text-muted line-through' : 'text-fg',
                              )}
                            >
                              Mini-Test tổng hợp
                            </span>
                            {bossRecord ? (
                              <Badge tone="success">
                                ✓ {bossRecord.accuracyPct}%{bossRecord.isJumpPass ? ' · Nhảy cóc' : ''}
                              </Badge>
                            ) : (
                              <Badge tone="sakura">Đúng 100%</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted">
                            Từ vựng · Kanji · Ngữ pháp — sai làm lại tới đúng
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
                          {isBossUnlocked || bossRecord ? (
                            <Button
                              type="button"
                              variant={bossRecord ? 'secondary' : 'primary'}
                              size="sm"
                              rightIcon={<ArrowRight className="size-3.5" aria-hidden />}
                              onClick={() => {
                                persistActiveStageSession({
                                  stage: selectedStage,
                                  level: activeLevel,
                                  textbookId: activeBook.id,
                                });
                                setSelectedStageId(null);
                                navigate(
                                  `/roadmap/stage/${encodeURIComponent(selectedStage.id)}/mastery`,
                                  {
                                    state: {
                                      stage: selectedStage,
                                      level: activeLevel,
                                      textbookId: activeBook.id,
                                    },
                                  },
                                );
                              }}
                            >
                              {bossRecord ? 'Làm lại' : 'Chốt Màn'}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="soft"
                              size="sm"
                              leftIcon={<FastForward className="size-3.5" aria-hidden />}
                              onClick={() => {
                                persistActiveStageSession({
                                  stage: selectedStage,
                                  level: activeLevel,
                                  textbookId: activeBook.id,
                                });
                                setSelectedStageId(null);
                                navigate(
                                  `/roadmap/stage/${encodeURIComponent(selectedStage.id)}/mastery?mode=jump`,
                                  {
                                    state: {
                                      stage: selectedStage,
                                      level: activeLevel,
                                      textbookId: activeBook.id,
                                    },
                                  },
                                );
                              }}
                            >
                              Nhảy cóc
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Custom Roadmap Builder Modal */}
      <Modal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        size="lg"
        title="Tạo lộ trình mới (Tự thiết kế riêng)"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setBuilderOpen(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              leftIcon={<Sparkles className="size-4" aria-hidden />}
              onClick={handleSaveCustomRoadmap}
            >
              Lưu &amp; Tạo bản đồ Màn
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* 1-Tap Quick Templates */}
          <div className="space-y-2 rounded-xl border border-line bg-surface-2/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-fg">
                Chọn nhanh từ 4 mẫu có sẵn (1 chạm điền tự động):
              </span>
              <span className="text-[11px] text-muted">Hoặc tự chỉnh chi tiết bên dưới</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROADMAP_QUICK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyQuickTemplate(tpl)}
                  className="flex cursor-pointer flex-col gap-1 rounded-xl border border-line bg-surface p-2.5 text-left transition-colors hover:border-primary hover:bg-primary-soft/35"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-fg">{tpl.title}</span>
                    <Badge tone="primary" className="px-1.5 py-0 text-[10px]">
                      {tpl.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted">{tpl.summary}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tên lộ trình" htmlFor="custom-roadmap-name">
              <Input
                id="custom-roadmap-name"
                value={draftConfig.name}
                onChange={(e) => setDraftConfig({ ...draftConfig, name: e.target.value })}
                placeholder="VD: Chinh phục N3 trong 30 ngày"
              />
            </Field>
            <Field label="Ngày bắt đầu" htmlFor="custom-start-date">
              <Input
                id="custom-start-date"
                type="date"
                value={draftConfig.startDate}
                onChange={(e) =>
                  setDraftConfig({ ...draftConfig, startDate: e.target.value || todayKey })
                }
              />
            </Field>
            <Field label="Trình độ JLPT" htmlFor="custom-level">
              <Select
                id="custom-level"
                value={draftConfig.level}
                onChange={(e) => {
                  const nextLvl = e.target.value as StudyLevel;
                  const nextBook = resolveActiveVocabTextbook(nextLvl, user?.id);
                  const recommendedTotal = getRecommendedFixedStageCount(
                    nextLvl,
                    nextBook.id,
                    draftConfig.dailyMinutesTarget,
                  );
                  const isAutoNamed =
                    !draftConfig.name.trim() || draftConfig.name.trim().startsWith('Lộ trình ');
                  setDraftConfig({
                    ...draftConfig,
                    level: nextLvl,
                    textbookId: nextBook.id,
                    totalStages: recommendedTotal,
                    name: isAutoNamed
                      ? `Lộ trình ${nextLvl} · ${nextBook.shortTitle}`
                      : draftConfig.name,
                  });
                }}
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    JLPT {lvl}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Giáo trình chính" htmlFor="custom-book">
              <Select
                id="custom-book"
                value={draftConfig.textbookId}
                onChange={(e) => {
                  const nextBookId = e.target.value;
                  const nextBook = getVocabTextbooksForLevel(draftConfig.level).find(
                    (b) => b.id === nextBookId,
                  );
                  const recommendedTotal = getRecommendedFixedStageCount(
                    draftConfig.level,
                    nextBookId,
                    draftConfig.dailyMinutesTarget,
                  );
                  const isAutoNamed =
                    !draftConfig.name.trim() || draftConfig.name.trim().startsWith('Lộ trình ');
                  setDraftConfig({
                    ...draftConfig,
                    textbookId: nextBookId,
                    totalStages: recommendedTotal,
                    name:
                      isAutoNamed && nextBook
                        ? `Lộ trình ${draftConfig.level} · ${nextBook.shortTitle}`
                        : draftConfig.name,
                  });
                }}
              >
                {getVocabTextbooksForLevel(draftConfig.level).map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Interactive Daily Study Pace -> Auto-syncs Timeline session count */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-fg">
                Chọn thời lượng học mỗi ngày (tự tính số buổi Timeline)
              </span>
              <span className="text-xs text-muted">
                VD: 10p → 60 buổi · 30p → 30 buổi
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {DAILY_PACE_PRESETS.map((preset) => {
                const selected = draftConfig.dailyMinutesTarget === preset.minutes;
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setDraftConfig({
                        ...draftConfig,
                        dailyMinutesTarget: preset.minutes,
                        totalStages: getStageCountForDailyMinutes(preset.minutes),
                      })
                    }
                    className={cn(
                      'flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border p-2.5 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary-soft/70 text-primary-fg'
                        : 'border-line bg-surface-2/60 text-fg hover:border-primary/60 hover:bg-surface-2',
                    )}
                  >
                    <span className="text-xs font-bold tabular">{preset.label}</span>
                    <span className="text-[11px] font-semibold tabular">
                      {preset.stages} buổi
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tổng số buổi (có thể chỉnh tay)" htmlFor="custom-total-stages">
              <Select
                id="custom-total-stages"
                value={draftConfig.totalStages}
                onChange={(e) =>
                  setDraftConfig({
                    ...draftConfig,
                    totalStages: Number(e.target.value) as TotalStagesOption,
                  })
                }
              >
                <option value={60}>60 buổi (6 Chặng — 10p/ngày nhẹ nhàng)</option>
                <option value={45}>45 buổi (5 Chặng — 15p/ngày đều đặn)</option>
                <option value={40}>40 buổi (4 Chặng — 20p/ngày cân bằng)</option>
                <option value={35}>35 buổi (4 Chặng — 25p/ngày chuẩn nhanh)</option>
                <option value={30}>30 buổi (3 Chặng — 30p/ngày chuyên sâu)</option>
                <option value={20}>20 buổi (2 Chặng — Gọn nhanh)</option>
                <option value={10}>10 buổi (1 Chặng — Ôn cấp tốc)</option>
              </Select>
            </Field>
            <Field label="Giờ nhắc & Nhắc lặp" htmlFor="custom-reminder-time">
              <div className="flex gap-2">
                <Input
                  id="custom-reminder-time"
                  type="time"
                  value={draftConfig.reminderTime}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, reminderTime: e.target.value || '20:00' })
                  }
                  className="flex-1"
                />
                <Select
                  aria-label="Chu kỳ nhắc lặp"
                  value={draftConfig.repeatIntervalMinutes}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      repeatIntervalMinutes: Number(e.target.value) as RepeatMinutesOption,
                    })
                  }
                  className="w-24"
                >
                  {REPEAT_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}p
                    </option>
                  ))}
                </Select>
              </div>
            </Field>
          </div>

          {draftConfig.level === 'N5' && (
            <div className="space-y-1.5 rounded-xl border border-line bg-surface-2/50 p-3">
              <p className="text-xs font-bold text-fg">
                Điểm xuất phát N5 (Bảng chữ cái Hiragana &amp; Katakana)
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip
                  selected={!draftConfig.includeKanaStarter}
                  onClick={() =>
                    setDraftConfig({ ...draftConfig, includeKanaStarter: false })
                  }
                >
                  Đã thuộc Kana · Học thẳng Bài 1
                </Chip>
                <Chip
                  selected={Boolean(draftConfig.includeKanaStarter)}
                  onClick={() =>
                    setDraftConfig({ ...draftConfig, includeKanaStarter: true })
                  }
                >
                  + Thêm Chặng 0: Học Hiragana &amp; Katakana trước (5 màn)
                </Chip>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-fg">Các ngày học trong tuần</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: 'Cả tuần', days: [1, 2, 3, 4, 5, 6, 0] },
                  { label: 'T2–T6', days: [1, 2, 3, 4, 5] },
                  { label: 'T2, T4, T6', days: [1, 3, 5] },
                ].map((quick) => (
                  <button
                    key={quick.label}
                    type="button"
                    onClick={() => setDraftConfig({ ...draftConfig, studyWeekdays: quick.days })}
                    className="cursor-pointer rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-muted hover:border-primary hover:text-primary-fg"
                  >
                    {quick.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_DAYS_ORDERED.map((d) => {
                const active = draftConfig.studyWeekdays.includes(d.day);
                return (
                  <Chip
                    key={d.day}
                    selected={active}
                    onClick={() => {
                      const nextDays = active
                        ? draftConfig.studyWeekdays.filter((x) => x !== d.day)
                        : [...draftConfig.studyWeekdays, d.day];
                      if (nextDays.length > 0) {
                        setDraftConfig({ ...draftConfig, studyWeekdays: nextDays });
                      }
                    }}
                  >
                    {d.shortLabel}
                  </Chip>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-fg">Kỹ năng đưa vào các Màn</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SKILLS.map((sk) => {
                const active = draftConfig.skills.includes(sk);
                return (
                  <Chip
                    key={sk}
                    selected={active}
                    onClick={() => {
                      const nextSkills = active
                        ? draftConfig.skills.filter((x) => x !== sk)
                        : [...draftConfig.skills, sk];
                      if (nextSkills.length > 0) {
                        setDraftConfig({ ...draftConfig, skills: nextSkills });
                      }
                    }}
                  >
                    {STAGE_SKILL_META[sk].label}
                  </Chip>
                );
              })}
            </div>
          </div>
          <Notice tone="info">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
              <span>
                Dự kiến hoàn thành:{' '}
                <strong className="text-fg">{draftForecast.estimatedCompletionLabel}</strong>
              </span>
              <span className="text-muted tabular">
                {draftEffectiveTotalStages} màn · {draftForecast.daysPerWeek} ngày/tuần (~{draftForecast.estimatedWeeks} tuần)
              </span>
            </div>
          </Notice>
        </div>
      </Modal>

      {/* Community Roadmap Gallery Modal (1-Tap Save to Lộ trình riêng) */}
      <Modal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        size="lg"
        title="Kho Lộ trình Cộng đồng (Lưu 1 chạm)"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              leftIcon={<Download className="size-4" aria-hidden />}
              onClick={() => {
                setGalleryOpen(false);
                setImportModalOpen(true);
              }}
            >
              Nhập mã NIHON-... riêng
            </Button>
            <Button type="button" variant="primary" onClick={() => setGalleryOpen(false)}>
              Đóng
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-muted uppercase">Cấp độ:</span>
            {(['ALL', 'N5', 'N4', 'N3'] as const).map((lvl) => (
              <Chip
                key={lvl}
                selected={galleryLevelFilter === lvl}
                onClick={() => setGalleryLevelFilter(lvl)}
              >
                {lvl === 'ALL' ? 'Tất cả' : lvl}
              </Chip>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {COMMUNITY_ROADMAP_GALLERY.filter(
              (entry) => galleryLevelFilter === 'ALL' || entry.level === galleryLevelFilter,
            ).map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-line bg-surface-2/55 p-3.5"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="primary">{entry.level}</Badge>
                      <Badge tone="sakura">{entry.tag}</Badge>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-fg">{entry.name}</h3>
                  <p className="text-xs leading-relaxed text-muted">{entry.description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted">
                    <span className="rounded bg-surface px-1.5 py-0.5 font-semibold text-fg ring-1 ring-line tabular">
                      {entry.dailyMinutesTarget}p/ngày · {entry.totalStages} buổi
                    </span>
                    <span className="rounded bg-surface px-1.5 py-0.5 ring-1 ring-line">
                      {entry.studyWeekdays.length} ngày/tuần
                    </span>
                    <span>bởi {entry.authorName}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  fullWidth
                  leftIcon={<Download className="size-3.5" aria-hidden />}
                  onClick={() => handleSaveCommunityRoadmap(entry)}
                >
                  Lưu về Lộ trình riêng
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Import Shared Roadmap Modal (FREE for all users) */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        size="md"
        title="Nhập mã lộ trình"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setImportModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!decodedImportPreview}
              leftIcon={<Download className="size-4" aria-hidden />}
              onClick={handleImportSharedRoadmap}
            >
              Nhập
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Mã hoặc link chia sẻ" htmlFor="import-roadmap-code">
            <Input
              id="import-roadmap-code"
              value={importCodeInput}
              onChange={(e) => setImportCodeInput(e.target.value)}
              placeholder="VD: NIHON-eyJ2IjoxLC..."
            />
          </Field>
          {decodedImportPreview ? (
            <Notice tone="success">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-fg">
                  ✓ Tìm thấy lộ trình: {decodedImportPreview.name}
                </p>
                <p className="text-muted">
                  Trình độ: <strong className="text-fg">JLPT {decodedImportPreview.level}</strong> ·{' '}
                  Số màn: <strong className="text-fg">{decodedImportPreview.totalStages} màn</strong> ·{' '}
                  Mục tiêu: <strong className="text-fg">{decodedImportPreview.dailyMinutesTarget} phút/ngày</strong>
                  {decodedImportPreview.authorName
                    ? ` · Tác giả: ${decodedImportPreview.authorName}`
                    : ''}
                </p>
              </div>
            </Notice>
          ) : importCodeInput.trim().length > 0 ? (
            <Notice tone="warning">
              <span className="text-xs">
                Mã chưa đúng định dạng. Hãy kiểm tra lại mã bắt đầu bằng <code>NIHON-</code>.
              </span>
            </Notice>
          ) : null}
        </div>
      </Modal>

      {/* PRO Paywall Modal for Sharing Custom Roadmaps */}
      <Modal
        open={proPaywallOpen}
        onClose={() => setProPaywallOpen(false)}
        size="md"
        title="Chia sẻ lộ trình (PRO)"
        description="Tạo lộ trình miễn phí. Chia sẻ cho người khác cần gói PRO."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setProPaywallOpen(false)}
            >
              Đóng
            </Button>
            {(import.meta.env.DEV || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <Button
                type="button"
                variant="soft"
                onClick={() => {
                  setProCreatorDemoUnlocked(user?.id, true);
                  setSyncVersion((v) => v + 1);
                  setProPaywallOpen(false);
                  setShareModalOpen(true);
                  toast({
                    title: 'Đã bật chế độ Dùng thử PRO Creator (Admin/Dev)!',
                    tone: 'success',
                  });
                }}
              >
                Bật thử PRO (Dev/Admin)
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              leftIcon={<Sparkles className="size-4" aria-hidden />}
              onClick={() =>
                toast({
                  title: 'Cổng thanh toán PRO (VietQR / SePay) đang trong giai đoạn hoàn thiện — sẽ sớm mở chính thức!',
                  tone: 'info',
                })
              }
            >
              Đăng ký PRO (Sắp ra mắt)
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-fg">
          <div className="rounded-xl border border-sakura/40 bg-sakura-soft/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-fg">Quyền lợi gói Nihongo 問 PRO Creator</span>
              <Badge tone="sakura">PRO</Badge>
            </div>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted">
              <li>
                <strong className="text-fg">Xuất mã &amp; Link chia sẻ lộ trình (NIHON-...):</strong>{' '}
                Người nhận nhập mã học hoàn toàn miễn phí theo đúng Chặng, Màn, bài học và Mini-game bạn đã thiết kế.
              </li>
              <li>
                <strong className="text-fg">Không giới hạn số lộ trình tự tạo:</strong>{' '}
                Soạn riêng từng giáo trình cho từng nhóm học viên hoặc từng kỹ năng (Từ vựng, Kanji, Đọc-Nghe).
              </li>
              <li>
                <strong className="text-fg">Gắn tên Tác giả / Giáo viên:</strong>{' '}
                Hiển thị tên bạn trên lộ trình khi học viên nhập mã.
              </li>
            </ul>
          </div>
          <Notice tone="info">
            <span className="text-xs text-muted">
              Trong giai đoạn Beta, toàn bộ tính năng học N5, Mini-game và tạo lộ trình cá nhân đều <strong className="text-fg">miễn phí 100%</strong>. Gói PRO Creator cho tính năng chia sẻ lớp học sẽ sớm được mở cổng nâng cấp.
            </span>
          </Notice>
        </div>
      </Modal>

      {/* Live Share Custom Roadmap Modal (Once PRO is Unlocked) */}
      <Modal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        size="md"
        title={`Chia sẻ lộ trình: ${roadmapState.customConfig?.name ?? ''}`}
        footer={
          <>
            {user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProCreatorDemoUnlocked(user?.id, false);
                  setSyncVersion((v) => v + 1);
                  setShareModalOpen(false);
                  toast({ title: 'Đã tắt chế độ Demo PRO (khóa lại nút Chia sẻ)', tone: 'info' });
                }}
              >
                Khóa lại Demo PRO
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={() => setShareModalOpen(false)}
            >
              Xong
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="sakura">PRO Creator ✓</Badge>
            <Badge tone="primary">
              JLPT {roadmapState.customConfig?.level} · {roadmapState.customConfig?.totalStages} màn
            </Badge>
          </div>

          <Field label="Mã chia sẻ" htmlFor="share-code-box">
            <div className="flex gap-2">
              <Input
                id="share-code-box"
                readOnly
                value={activeShareCode}
                className="flex-1 font-mono text-xs"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(activeShareCode);
                  toast({ title: 'Đã sao chép Mã lộ trình!', tone: 'success' });
                }}
              >
                Sao chép mã
              </Button>
            </div>
          </Field>

          <Field label="Link chia sẻ" htmlFor="share-url-box">
            <div className="flex gap-2">
              <Input
                id="share-url-box"
                readOnly
                value={activeShareUrl}
                className="flex-1 font-mono text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(activeShareUrl);
                  toast({ title: 'Đã sao chép Link chia sẻ!', tone: 'success' });
                }}
              >
                Sao chép Link
              </Button>
            </div>
          </Field>
        </div>
      </Modal>

      {/* Modal 1: Standalone Create Quiz with Skill Role (Từ vựng, Chữ Hán, Ngữ pháp...) */}
      <CreateQuizModal
        open={createQuizOpen}
        onClose={() => setCreateQuizOpen(false)}
        defaultLevel={activeLevel}
        onSaveQuiz={handleSaveQuizFromModal}
      />

      {/* Modal 2: Unified Visual Create / Edit Roadmap Builder */}
      <CreateRoadmapWizardModal
        open={wizardOpen}
        initialMode={wizardInitialMode}
        editingConfig={wizardEditingConfig}
        editingStages={wizardEditingConfig ? stages : []}
        onClose={() => {
          setWizardOpen(false);
          setWizardEditingConfig(null);
        }}
        defaultLevel={activeLevel}
        defaultTextbookId={activeBook.id}
        userId={user?.id}
        todayKey={todayKey}
        cmsSnapshot={cmsSnapshot}
        studioLessons={studioState.lessons}
        onSaveStudioLesson={handleSaveSingleStudioLesson}
        onDeleteStudioLesson={handleDeleteStudioLesson}
        onCommitRoadmap={handleCommitAiJsonRoadmap}
      />

      {/* Confirm Delete Custom Roadmap Modal */}
      <Modal
        open={Boolean(deleteConfirmRoadmap)}
        onClose={() => setDeleteConfirmRoadmap(null)}
        size="sm"
        title="Xóa lộ trình riêng này?"
        description="Bài tự tạo của bạn vẫn được giữ lại."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteConfirmRoadmap(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              leftIcon={<Trash2 className="size-4" aria-hidden />}
              onClick={() => {
                if (!deleteConfirmRoadmap) return;
                const targetId = deleteConfirmRoadmap.id;
                setDeleteConfirmRoadmap(null);
                handleDeleteCustomRoadmap(targetId);
              }}
            >
              Xóa lộ trình
            </Button>
          </>
        }
      >
        {deleteConfirmRoadmap && (
          <div className="rounded-xl border border-line bg-surface-2/60 p-3 text-xs">
            <p className="font-bold text-fg">{deleteConfirmRoadmap.name}</p>
            <p className="mt-1 text-muted">
              JLPT {deleteConfirmRoadmap.level} · {deleteConfirmRoadmap.totalStages} buổi ·{' '}
              {deleteConfirmRoadmap.dailyMinutesTarget} phút/ngày
            </p>
          </div>
        )}
      </Modal>

      {/* AI Prompt → JSON Input/Output Roadmap Modal (also handles Export Backup) */}
      <AiRoadmapJsonModal
        open={aiJsonModalOpen}
        initialTab={aiJsonModalTab}
        onClose={() => setAiJsonModalOpen(false)}
        defaultLevel={activeLevel}
        defaultTextbookId={activeBook.id}
        todayKey={todayKey}
        catalog={curriculumCatalog}
        customRoadmaps={roadmapState.customRoadmaps}
        activeCustomRoadmapId={roadmapState.activeCustomRoadmapId}
        studioLessons={studioState.lessons}
        onImportCommit={handleCommitAiJsonRoadmap}
      />

      {/* Inline Custom Lesson / Custom Quiz Player right inside Roadmap */}
      <CustomLessonPlayerModal
        lesson={inlinePlayingLesson?.lesson ?? null}
        onClose={() => setInlinePlayingLesson(null)}
        onMarkStudied={
          inlinePlayingLesson
            ? () => {
                if (!roadmapState.completedTaskIds.includes(inlinePlayingLesson.taskId)) {
                  handleToggleTask(inlinePlayingLesson.taskId);
                }
                toast({
                  title: `Đã hoàn thành "${inlinePlayingLesson.lesson.title}"!`,
                  tone: 'success',
                });
              }
            : undefined
        }
      />

    </PageContainer>
  );
};
