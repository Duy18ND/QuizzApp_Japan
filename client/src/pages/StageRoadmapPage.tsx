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
  Download,
  ExternalLink,
  FastForward,
  Lock,
  Map as MapIcon,
  Pencil,
  Plus,
  Settings2,
  Share,
  Smartphone,
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
import { useAuth } from '../context/auth-context';
import {
  buildVocabToolQuery,
  getPreferredVocabLevel,
  getVocabTextbooksForLevel,
  resolveActiveVocabTextbook,
  VOCAB_TEXTBOOK_SYNC_EVENT,
} from '../data/vocabTextbooks';
import { STUDY_ROADMAPS } from '../data/studyRoadmaps';
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
  ONLINE_TIME_SYNC_EVENT,
} from '../services/notificationService';
import {
  dispatchStudyReminderNotification,
  getBrowserNotificationPermission,
  isRunningStandalone,
  isWebPushConfigured,
  isWebPushSubscribedOnDevice,
  PWA_INSTALL_CHANGE_EVENT,
  requestBrowserNotificationPermission,
  scheduleDelayedLockscreenTestNotification,
  subscribeAndSyncWebPush,
  triggerOneTapPwaInstall,
  type BrowserNotificationState,
} from '../services/pwaReminderService';
import {
  consumeGoogleCalendarSyncPending,
  downloadRoadmapIcsFile,
  requestGoogleCalendarConsent,
  syncRoadmapStagesToGoogleCalendar,
  type GoogleCalendarSyncResult,
} from '../services/googleCalendarSyncService';
import {
  buildCurriculumTaskCatalog,
  buildOneTapStageGoogleCalendarUrl,
  calculateRoadmapForecast,
  completeStageAndUnlockNext,
  computeStartDateToAlignStageWithToday,
  createDefaultCustomConfig,
  DAILY_KANJI_TARGET,
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
  type DailyMinutesTarget,
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
  const [viewTab, setViewTab] = useState<RoadmapMode | 'overview'>(() =>
    loadStageRoadmapState(user?.id).activeMode,
  );
  const [stageLayout, setStageLayout] = useState<'map' | 'days'>('map');
  const [notifPermission, setNotifPermission] = useState<BrowserNotificationState>(() =>
    getBrowserNotificationPermission(),
  );
  const [isStandalone, setIsStandalone] = useState(() => isRunningStandalone());
  const [webPushActive, setWebPushActive] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(
    () => searchParams.get('stage') || null,
  );
  const [builderOpen, setBuilderOpen] = useState(() => searchParams.get('create') === '1');
  const [builderIsNew, setBuilderIsNew] = useState(() => searchParams.get('create') === '1');
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [selectedCatalogKey, setSelectedCatalogKey] = useState('');
  const [selectedStudioLessonId, setSelectedStudioLessonId] = useState('');
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [customTaskSkill, setCustomTaskSkill] = useState<StageSkill>('vocab');
  const [stageTitleDraft, setStageTitleDraft] = useState<{ stageId: string; value: string } | null>(
    null,
  );
  const [chunkTitleDraft, setChunkTitleDraft] = useState<{ chunkNum: number; value: string } | null>(
    null,
  );
  const [importModalOpen, setImportModalOpen] = useState(() =>
    Boolean(searchParams.get('import')),
  );
  const [importCodeInput, setImportCodeInput] = useState(
    () => searchParams.get('import') ?? '',
  );
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [proPaywallOpen, setProPaywallOpen] = useState(false);
  const [gcalModalOpen, setGcalModalOpen] = useState(false);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [gcalProgress, setGcalProgress] = useState<{ done: number; total: number } | null>(null);
  const [gcalResult, setGcalResult] = useState<GoogleCalendarSyncResult | null>(null);
  const [lockTestCountdown, setLockTestCountdown] = useState<number>(0);
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
    const onPwaChange = () => setIsStandalone(isRunningStandalone());
    window.addEventListener(STAGE_ROADMAP_SYNC_EVENT, bump);
    window.addEventListener(DAILY_STAGE_ACTIVITY_SYNC_EVENT, bump);
    window.addEventListener(ONLINE_TIME_SYNC_EVENT, bump);
    window.addEventListener(CUSTOM_STUDIO_SYNC_EVENT, bump);
    window.addEventListener(VOCAB_TEXTBOOK_SYNC_EVENT, bump);
    window.addEventListener(PWA_INSTALL_CHANGE_EVENT, onPwaChange);
    void isWebPushSubscribedOnDevice().then(setWebPushActive);
    return () => {
      window.removeEventListener(STAGE_ROADMAP_SYNC_EVENT, bump);
      window.removeEventListener(DAILY_STAGE_ACTIVITY_SYNC_EVENT, bump);
      window.removeEventListener(ONLINE_TIME_SYNC_EVENT, bump);
      window.removeEventListener(CUSTOM_STUDIO_SYNC_EVENT, bump);
      window.removeEventListener(VOCAB_TEXTBOOK_SYNC_EVENT, bump);
      window.removeEventListener(PWA_INSTALL_CHANGE_EVENT, onPwaChange);
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
      totalStages: getRecommendedFixedStageCount(activeLevel, activeBook.id),
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

  const googleCalendarUrl = useMemo(
    () =>
      buildOneTapStageGoogleCalendarUrl({
        level: activeLevel,
        textbookTitle: activeBook.title,
        mode: roadmapState.activeMode,
        reminderTime: effectiveSettings.reminderTime,
        studyWeekdays: effectiveSettings.studyWeekdays,
        dailyMinutesTarget: effectiveSettings.dailyMinutesTarget,
        startDate:
          roadmapState.activeMode === 'custom' && roadmapState.customConfig
            ? roadmapState.customConfig.startDate
            : roadmapState.fixedStartDate,
      }),
    [activeBook.title, activeLevel, effectiveSettings, roadmapState],
  );

  const updateState = (next: UserStageRoadmapState) => {
    saveStageRoadmapState(next, user?.id);
    setSyncVersion((v) => v + 1);
  };

  const handleModeChange = (nextTab: RoadmapMode | 'overview') => {
    if (nextTab === 'overview') {
      setViewTab('overview');
      return;
    }
    if (nextTab === 'custom' && !roadmapState.customConfig) {
      setDraftConfig(createDefaultCustomConfig(activeLevel, user?.id, activeBook.id));
      setBuilderOpen(true);
      return;
    }
    setViewTab(nextTab);
    updateState({ ...roadmapState, activeMode: nextTab });
  };

  const handleOpenBuilder = (createNew = false) => {
    setBuilderIsNew(createNew || !roadmapState.customConfig);
    setDraftConfig(
      !createNew && roadmapState.customConfig
        ? roadmapState.customConfig
        : createDefaultCustomConfig(activeLevel, user?.id, activeBook.id),
    );
    setBuilderOpen(true);
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

  const handleAddCatalogTaskToStage = (stage: RoadmapStage) => {
    if (!selectedCatalogKey || !roadmapState.customConfig) return;
    const preset = curriculumCatalog.find((p) => p.key === selectedCatalogKey);
    if (!preset) return;
    const newTask: StageTask = {
      id: `${stage.id}-preset-${Date.now()}`,
      title: preset.title,
      subtitle: preset.subtitle,
      skill: preset.skill,
      minutes: preset.minutes,
      to: preset.to,
      isCustomAdded: true,
    };
    updateActiveCustomConfig((cfg) => {
      const prevOv = cfg.stageOverrides?.[stage.stageNumber];
      return {
        ...cfg,
        stageOverrides: {
          ...(cfg.stageOverrides ?? {}),
          [stage.stageNumber]: {
            ...prevOv,
            extraTasks: [...(prevOv?.extraTasks ?? []), newTask],
          },
        },
      };
    });
    setSelectedCatalogKey('');
    toast({ title: `Đã gắn "${preset.title}" vào Màn ${stage.stageNumber}`, tone: 'success' });
  };

  const handleAddStudioLessonToStage = (stage: RoadmapStage) => {
    if (!selectedStudioLessonId || !roadmapState.customConfig) return;
    const lesson = studioState.lessons.find((l) => l.id === selectedStudioLessonId);
    if (!lesson) return;
    const count =
      lesson.kind === 'vocab'
        ? (lesson.vocabItems?.length ?? 0)
        : lesson.kind === 'grammar'
          ? (lesson.grammarItems?.length ?? 0)
          : (lesson.kanjiItems?.length ?? 0);
    const kindLabel =
      lesson.kind === 'vocab' ? 'Từ vựng' : lesson.kind === 'grammar' ? 'Ngữ pháp' : 'Kanji';
    const newTask: StageTask = {
      id: `${stage.id}-studio-${Date.now()}`,
      title: `[Tự tạo] ${lesson.title}`,
      subtitle:
        lesson.kind === 'vocab'
          ? `Bài Từ vựng tự soạn (${count} từ) — mở chơi ngay trên 6 Mini-game & Studio.`
          : `Bài ${kindLabel} tự soạn (${count} mục) — học ngay bằng Flashcard & Quiz trong Studio.`,
      skill: lesson.kind === 'kanji' ? 'kanji' : lesson.kind === 'grammar' ? 'grammar' : 'vocab',
      minutes: 5,
      to:
        lesson.kind === 'vocab'
          ? `/games?customLesson=${encodeURIComponent(lesson.id)}`
          : `/studio?lesson=${encodeURIComponent(lesson.id)}`,
      isCustomAdded: true,
    };
    updateActiveCustomConfig((cfg) => {
      const prevOv = cfg.stageOverrides?.[stage.stageNumber];
      return {
        ...cfg,
        stageOverrides: {
          ...(cfg.stageOverrides ?? {}),
          [stage.stageNumber]: {
            ...prevOv,
            extraTasks: [...(prevOv?.extraTasks ?? []), newTask],
          },
        },
      };
    });
    setSelectedStudioLessonId('');
    toast({
      title: `Đã gắn bài tự tạo "${lesson.title}" vào Màn ${stage.stageNumber}`,
      tone: 'success',
    });
  };

  const handleRemoveTaskFromStage = (stage: RoadmapStage, task: StageTask) => {
    if (!roadmapState.customConfig) return;
    updateActiveCustomConfig((cfg) => {
      const prevOv = cfg.stageOverrides?.[stage.stageNumber];
      if (task.isCustomAdded) {
        return {
          ...cfg,
          stageOverrides: {
            ...(cfg.stageOverrides ?? {}),
            [stage.stageNumber]: {
              ...prevOv,
              extraTasks: (prevOv?.extraTasks ?? []).filter((t) => t.id !== task.id),
            },
          },
        };
      }
      const nextRemoved = Array.from(new Set([...(prevOv?.removedTaskIds ?? []), task.id]));
      return {
        ...cfg,
        stageOverrides: {
          ...(cfg.stageOverrides ?? {}),
          [stage.stageNumber]: {
            ...prevOv,
            removedTaskIds: nextRemoved,
          },
        },
      };
    });
    toast({ title: `Đã gỡ nhiệm vụ khỏi Màn ${stage.stageNumber}`, tone: 'info' });
  };

  const handleRenameStage = (stage: RoadmapStage, nextTitle: string) => {
    if (!roadmapState.customConfig || !nextTitle.trim()) return;
    updateActiveCustomConfig((cfg) => {
      const prevOv = cfg.stageOverrides?.[stage.stageNumber];
      return {
        ...cfg,
        stageOverrides: {
          ...(cfg.stageOverrides ?? {}),
          [stage.stageNumber]: {
            ...prevOv,
            title: nextTitle.trim(),
          },
        },
      };
    });
    setStageTitleDraft(null);
    toast({ title: `Đã đổi tên Màn ${stage.stageNumber}`, tone: 'success' });
  };

  const handleRenameChunk = (chunkNumber: number, nextTitle: string) => {
    if (!roadmapState.customConfig || !nextTitle.trim()) return;
    updateActiveCustomConfig((cfg) => ({
      ...cfg,
      chunkTitles: {
        ...(cfg.chunkTitles ?? {}),
        [chunkNumber]: nextTitle.trim(),
      },
    }));
    setChunkTitleDraft(null);
    toast({ title: `Đã đổi tên Chặng ${chunkNumber}`, tone: 'success' });
  };

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

  const handleSendTestNotification = async () => {
    let perm = getBrowserNotificationPermission();
    if (perm !== 'granted') {
      perm = await requestBrowserNotificationPermission();
      setNotifPermission(perm);
    }
    if (perm !== 'granted') {
      toast({
        title:
          perm === 'unsupported'
            ? 'Trình duyệt này chưa hỗ trợ Web Notification.'
            : 'Trình duyệt đang chặn thông báo — hãy cho phép quyền Thông báo trên thanh địa chỉ trình duyệt.',
        tone: 'warning',
      });
      return;
    }
    const ok = await dispatchStudyReminderNotification({
      title: `Nihongo 問 · Chuông nhắc học ${activeLevel} hoạt động tốt!`,
      body: activeStage
        ? `Hôm nay: Màn ${activeStage.stageNumber} (${activeStage.title}) · Mục tiêu ${effectiveSettings.dailyMinutesTarget} phút/ngày.`
        : `Hệ thống sẽ nhắc lúc ${effectiveSettings.reminderTime} và lặp mỗi ${effectiveSettings.repeatIntervalMinutes}p nếu chưa xong Màn.`,
      tag: `nihongo-test-notif-${Date.now()}`,
    });
    toast({
      title: ok
        ? 'Đã gửi thông báo thử nghiệm! Hãy kiểm tra góc màn hình hoặc thanh thông báo thiết bị.'
        : 'Không thể hiển thị thông báo thử nghiệm.',
      tone: ok ? 'success' : 'warning',
    });
  };

  useEffect(() => {
    if (lockTestCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setLockTestCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockTestCountdown]);

  const handleLockscreenTestNotification = async () => {
    const res = await scheduleDelayedLockscreenTestNotification(
      {
        title: `🇯🇵 Nihongo 問 · Test màn hình khóa thành công (${activeLevel})!`,
        body: activeStage
          ? `Thông báo đã gửi khi khóa màn hình! Hôm nay: Màn ${activeStage.stageNumber}.`
          : 'Thông báo đã gửi thành công ngay cả khi tắt màn hình chờ!',
      },
      15,
    );
    setNotifPermission(getBrowserNotificationPermission());
    if (!res.ok) {
      toast({
        title:
          res.mode === 'unsupported'
            ? 'Trình duyệt này chưa hỗ trợ thông báo (trên iPhone cần Cài App ra Màn hình chính trước).'
            : 'Bạn cần cho phép quyền Thông báo để test màn hình khóa.',
        tone: 'warning',
      });
      return;
    }
    setLockTestCountdown(15);
    toast({
      title: '⏳ Đếm ngược 15 giây — Hãy KHÓA MÀN HÌNH điện thoại ngay bây giờ để kiểm tra chuông!',
      description:
        res.mode === 'service-worker'
          ? 'Đang chạy qua Service Worker nền. Đợi 15 giây xem thông báo có sáng màn hình khóa không nhé!'
          : 'Đang hẹn giờ trên trình duyệt (để kêu ngay cả khi vuốt tắt app, hãy đồng bộ thêm Google Calendar).',
      tone: 'info',
    });
  };

  const runGoogleCalendarSync = async (allowConsentRedirect: boolean) => {
    setGcalModalOpen(true);
    setGcalSyncing(true);
    setGcalResult(null);
    setGcalProgress({ done: 0, total: Math.min(60, stages.length) });

    const completedSet = new Set(Object.keys(roadmapState.completedStages));
    const res = await syncRoadmapStagesToGoogleCalendar({
      stages,
      completedStageIds: completedSet,
      level: activeLevel,
      bookTitle: activeBook.title,
      reminderTime: effectiveSettings.reminderTime,
      dailyMinutesTarget: effectiveSettings.dailyMinutesTarget,
      onProgress: (done, total) => setGcalProgress({ done, total }),
    });

    setGcalSyncing(false);

    if (res.needsReauth && allowConsentRedirect) {
      toast({
        title: 'Đang chuyển sang Google để cấp quyền ghi Lịch (chỉ 1 lần)...',
        tone: 'info',
      });
      const authRes = await requestGoogleCalendarConsent();
      if (!authRes.ok) {
        setGcalResult({
          ...res,
          errorMessage: authRes.error || res.errorMessage,
        });
      }
      return;
    }

    setGcalResult(res);
    if (res.ok) {
      toast({
        title: `🎉 Đã đồng bộ ${res.created + res.updated} ngày học chi tiết lên Google Calendar!`,
        tone: 'success',
      });
    } else if (res.errorMessage) {
      toast({ title: res.errorMessage, tone: 'warning' });
    }
  };

  useEffect(() => {
    if (!user || stages.length === 0) return;
    if (!consumeGoogleCalendarSyncPending()) return;
    const timer = window.setTimeout(() => {
      void runGoogleCalendarSync(false);
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, stages.length]);

  const handleToggleNotificationEnforcement = async () => {
    const needsPermissionOrPush =
      !roadmapState.notificationsEnabled ||
      notifPermission !== 'granted' ||
      (isWebPushConfigured() && !webPushActive);

    if (needsPermissionOrPush) {
      const perm = await requestBrowserNotificationPermission();
      setNotifPermission(perm);
      updateState({ ...roadmapState, notificationsEnabled: true });

      let pushSynced = false;
      if (perm === 'granted' && user?.id && isWebPushConfigured()) {
        const res = await subscribeAndSyncWebPush({
          userId: user.id,
          notificationsEnabled: true,
          reminderTime: effectiveSettings.reminderTime,
          repeatIntervalMinutes: effectiveSettings.repeatIntervalMinutes,
          studyWeekdays: effectiveSettings.studyWeekdays,
          dailyMinutesTarget: effectiveSettings.dailyMinutesTarget,
          lastCompletedDate: enforcement.isCompletedToday ? todayKey : null,
          activeStageLabel: activeStage ? `Màn ${activeStage.stageNumber}` : undefined,
        });
        pushSynced = res.ok;
        if (res.ok) setWebPushActive(true);
      }

      toast({
        title: pushSynced
          ? `Đã bật Web Push chạy nền mỗi ${effectiveSettings.repeatIntervalMinutes}p (vuốt tắt app vẫn nhắc!)`
          : perm === 'granted'
            ? `Đã bật thông báo lặp mỗi ${effectiveSettings.repeatIntervalMinutes} phút cho tới khi xong Màn`
            : perm === 'denied'
              ? 'Trình duyệt đang chặn thông báo — hãy bật lại trong cài đặt trang web để nhận chuông.'
              : 'Đã bật thanh nhắc học trên web.',
        tone: perm === 'denied' ? 'warning' : 'success',
      });
    } else {
      updateState({ ...roadmapState, notificationsEnabled: false });
      toast({ title: 'Đã tạm tắt nhắc lặp hằng ngày', tone: 'info' });
    }
  };

  const handleOneTapInstallPwa = async () => {
    const outcome = await triggerOneTapPwaInstall();
    if (outcome === 'accepted') {
      toast({ title: 'Đã cài đặt Nihongo 問 ra màn hình chính!', tone: 'success' });
    } else if (outcome === 'already-installed') {
      toast({ title: 'Ứng dụng đã được cài đặt trên thiết bị này.', tone: 'info' });
    } else if (outcome === 'ios-guide' || outcome === 'unavailable') {
      setIosGuideOpen(true);
    }
  };

  const handleToggleTask = (taskId: string) => {
    const exists = roadmapState.completedTaskIds.includes(taskId);
    const nextTaskIds = exists
      ? roadmapState.completedTaskIds.filter((id) => id !== taskId)
      : [...roadmapState.completedTaskIds, taskId];
    updateState({ ...roadmapState, completedTaskIds: nextTaskIds });
  };

  const handleAddCustomTaskToStage = (stage: RoadmapStage) => {
    if (!customTaskTitle.trim() || !roadmapState.customConfig) return;
    const lvlLower = activeLevel.toLowerCase();
    const skillTargetMap: Record<StageSkill, string> = {
      vocab: `/vocabulary/${lvlLower}/book/${activeBook.id}`,
      kanji: '/kanji',
      grammar: '/grammar',
      quiz: `/vocabulary/quiz?level=${activeLevel}&book=${activeBook.id}`,
      reading: `/jlpt/reading-short?level=${activeLevel === 'N2' || activeLevel === 'N1' ? 'N3' : activeLevel}`,
      listening: `/jlpt/listening?level=${activeLevel === 'N2' || activeLevel === 'N1' ? 'N3' : activeLevel}`,
      review: '/grammar/mistakes',
    };
    const newTask: StageTask = {
      id: `${stage.id}-custom-${Date.now()}`,
      title: customTaskTitle.trim(),
      subtitle: 'Nhiệm vụ bạn tự thêm vào Màn này.',
      skill: customTaskSkill,
      minutes: 5,
      to: skillTargetMap[customTaskSkill],
      isCustomAdded: true,
    };
    updateActiveCustomConfig((cfg) => {
      const existingOverride = cfg.stageOverrides?.[stage.stageNumber];
      return {
        ...cfg,
        stageOverrides: {
          ...(cfg.stageOverrides ?? {}),
          [stage.stageNumber]: {
            ...existingOverride,
            extraTasks: [...(existingOverride?.extraTasks ?? []), newTask],
          },
        },
      };
    });
    setCustomTaskTitle('');
    toast({ title: `Đã thêm nhiệm vụ vào Màn ${stage.stageNumber}`, tone: 'success' });
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
            Bạn đang xem Bản đồ Màn học ở chế độ khách. Đăng nhập để lưu tiến độ mở khóa Màn &amp; đồng bộ trên mọi thiết bị.
          </span>
          <Link
            to="/login"
            className={buttonStyles({ variant: 'primary', size: 'sm' })}
          >
            Đăng nhập ngay
          </Link>
        </Notice>
      )}
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Lộ trình học tập' },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span>Lộ trình &amp; Bản đồ Màn học</span>
            <Badge tone="primary">
              JLPT {activeLevel} · {activeBook.shortTitle}
            </Badge>
            {webPushActive && roadmapState.notificationsEnabled && (
              <Badge tone="success">Web Push nền ✓</Badge>
            )}
          </span>
        }
        description="Lộ trình chuẩn 20–30 phút/ngày gồm 4 Chặng: Nạp Từ/Kanji → Đọc hiểu Tips & Dấu hiệu → Thực chiến Bài tập → Mini-Test Chốt Màn."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={
                isStandalone ? (
                  <CheckCircle2 className="size-4 text-success-fg" aria-hidden />
                ) : (
                  <Smartphone className="size-4 text-primary-fg" aria-hidden />
                )
              }
              onClick={() => void handleOneTapInstallPwa()}
            >
              {isStandalone ? 'Đã cài App' : 'Cài App (1 chạm)'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Calendar className="size-4 text-primary-fg" aria-hidden />}
              onClick={() => {
                setGcalResult(null);
                setGcalModalOpen(true);
              }}
            >
              Đồng bộ GG Cal
            </Button>
            <Button
              type="button"
              variant={
                roadmapState.notificationsEnabled && notifPermission === 'granted'
                  ? 'soft'
                  : 'secondary'
              }
              size="sm"
              leftIcon={
                roadmapState.notificationsEnabled ? (
                  <Bell className="size-4" aria-hidden />
                ) : (
                  <BellOff className="size-4" aria-hidden />
                )
              }
              onClick={() => void handleToggleNotificationEnforcement()}
            >
              {!roadmapState.notificationsEnabled
                ? 'Bật nhắc học'
                : notifPermission !== 'granted'
                  ? 'Cấp quyền chuông'
                  : `Đang nhắc mỗi ${effectiveSettings.repeatIntervalMinutes}p`}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleSendTestNotification()}
              title="Gửi thử ngay 1 thông báo lên thiết bị"
            >
              🔔 Test ngay
            </Button>
            <Button
              type="button"
              variant={lockTestCountdown > 0 ? 'primary' : 'secondary'}
              size="sm"
              disabled={lockTestCountdown > 0}
              onClick={() => void handleLockscreenTestNotification()}
              title="Hẹn 15 giây rồi khóa màn hình điện thoại để kiểm tra thông báo màn hình khóa"
            >
              {lockTestCountdown > 0
                ? `🔒 Khóa máy ngay (${lockTestCountdown}s)`
                : '🔒 Test tắt màn hình (15s)'}
            </Button>
          </div>
        }
      />

      {/* Mode Switcher + Inline Quick Settings */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs
              aria-label="Chế độ lộ trình"
              variant="pill"
              value={viewTab}
              onChange={handleModeChange}
              className="max-w-full shrink-0"
              items={[
                { value: 'fixed', label: 'Lộ trình cố định' },
                { value: 'custom', label: 'Lộ trình tự tạo' },
                { value: 'overview', label: 'Tổng quan' },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Plus className="size-4" aria-hidden />}
              onClick={() => handleOpenBuilder(true)}
            >
              Tạo lộ trình mới
            </Button>
            <Link
              to="/studio"
              className={buttonStyles({ variant: 'soft', size: 'sm' })}
            >
              <Sparkles className="size-4" aria-hidden />
              <span>Studio Tự tạo bài</span>
            </Link>
            <Link
              to="/studio?tab=canvas"
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              <MapIcon className="size-4 text-primary-fg" aria-hidden />
              <span>Vẽ bản đồ tự do</span>
            </Link>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Download className="size-4" aria-hidden />}
              onClick={() => setImportModalOpen(true)}
            >
              Nhập mã lộ trình
            </Button>
            {roadmapState.customConfig && viewTab === 'custom' && (
              <>
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  leftIcon={
                    proUnlocked ? (
                      <Share className="size-4" aria-hidden />
                    ) : (
                      <Lock className="size-3.5" aria-hidden />
                    )
                  }
                  onClick={handleClickShareRoadmap}
                >
                  Chia sẻ lộ trình {!proUnlocked && '[PRO]'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Settings2 className="size-4" aria-hidden />}
                  onClick={() => handleOpenBuilder(false)}
                >
                  Cấu hình
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<CalendarPlus className="size-4" aria-hidden />}
              onClick={handleShiftScheduleOneDay}
            >
              Dời lịch +1 ngày
            </Button>
            {activeStage && activeStage.scheduledDate !== todayKey && (
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={handleSyncScheduleToToday}
              >
                Đồng bộ về Hôm nay
              </Button>
            )}
          </div>
        </div>

        {/* Multi-Roadmap Selector Strip (Admin-style plan switcher in Custom mode) */}
        {viewTab === 'custom' && roadmapState.customRoadmaps.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
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
            {roadmapState.customConfig && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="size-3.5 text-danger-fg" aria-hidden />}
                onClick={() => handleDeleteCustomRoadmap(roadmapState.customConfig!.id)}
              >
                Xóa lộ trình này
              </Button>
            )}
          </div>
        )}

        {/* User's Visual Canvas Roadmaps Quick Strip */}
        {studioState.visualRoadmaps.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <MapIcon className="size-3.5 text-primary-fg" aria-hidden />
                Bản đồ tự vẽ (Canvas):
              </span>
              {studioState.visualRoadmaps.map((vm) => (
                <Link
                  key={vm.id}
                  to={`/studio?tab=canvas&map=${encodeURIComponent(vm.id)}`}
                  className={buttonStyles({ variant: 'soft', size: 'sm', className: 'h-7 px-2.5 text-xs' })}
                >
                  <span>{vm.name}</span>
                  <Badge tone="neutral" className="px-1.5 py-0 text-[10px]">
                    {vm.completedNodeIds.length}/{vm.nodes.length} node
                  </Badge>
                </Link>
              ))}
            </div>
            <Link
              to="/studio?tab=canvas"
              className="text-xs font-semibold text-primary-fg hover:underline"
            >
              Mở Studio vẽ bản đồ →
            </Link>
          </div>
        )}

        {/* Unified Schedule, Reminder & Study Weekdays Bar (works in BOTH Fixed & Custom modes) */}
        {viewTab !== 'overview' && (
          <div className="space-y-3 border-t border-line pt-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Ngày bắt đầu lộ trình" htmlFor="active-start-date">
                <Input
                  id="active-start-date"
                  type="date"
                  value={
                    viewTab === 'custom' && roadmapState.customConfig
                      ? roadmapState.customConfig.startDate
                      : roadmapState.fixedStartDate
                  }
                  onChange={(e) => {
                    const nextDate = e.target.value || todayKey;
                    if (viewTab === 'custom' && roadmapState.customConfig) {
                      updateActiveCustomConfig((cfg) => ({ ...cfg, startDate: nextDate }));
                    } else {
                      updateState({ ...roadmapState, fixedStartDate: nextDate });
                    }
                  }}
                />
              </Field>
              <Field label="Thời gian online tối thiểu/ngày" htmlFor="active-min-minutes">
                <Select
                  id="active-min-minutes"
                  value={
                    viewTab === 'custom' && roadmapState.customConfig
                      ? roadmapState.customConfig.dailyMinutesTarget
                      : roadmapState.fixedDailyMinutesTarget
                  }
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    const nextTarget: DailyMinutesTarget =
                      raw === 10 || raw === 15 || raw === 20 || raw === 25 || raw === 30
                        ? raw
                        : 25;
                    if (viewTab === 'custom' && roadmapState.customConfig) {
                      updateActiveCustomConfig((cfg) => ({ ...cfg, dailyMinutesTarget: nextTarget }));
                    } else {
                      updateState({ ...roadmapState, fixedDailyMinutesTarget: nextTarget });
                    }
                  }}
                >
                  <option value={25}>25 phút / ngày (Chuẩn 4 Chặng · Khuyến nghị)</option>
                  <option value={20}>20 phút / ngày (Gọn · Đủ đọc hiểu & Quiz)</option>
                  <option value={30}>30 phút / ngày (Chuyên sâu · 5 Kỹ năng)</option>
                  <option value={15}>15 phút / ngày (Ngày bận rộn)</option>
                  <option value={10}>10 phút / ngày (Duy trì tối thiểu)</option>
                </Select>
              </Field>
              <Field label="Giờ bắt đầu nhắc mỗi ngày" htmlFor="active-reminder-time">
                <Input
                  id="active-reminder-time"
                  type="time"
                  value={
                    viewTab === 'custom' && roadmapState.customConfig
                      ? roadmapState.customConfig.reminderTime
                      : roadmapState.fixedReminderTime
                  }
                  onChange={(e) => {
                    const nextTime = e.target.value || '20:00';
                    if (viewTab === 'custom' && roadmapState.customConfig) {
                      updateActiveCustomConfig((cfg) => ({ ...cfg, reminderTime: nextTime }));
                    } else {
                      updateState({ ...roadmapState, fixedReminderTime: nextTime });
                    }
                  }}
                />
              </Field>
              <Field label="Nhắc lặp lại nếu chưa xong" htmlFor="active-repeat-interval">
                <Select
                  id="active-repeat-interval"
                  value={
                    viewTab === 'custom' && roadmapState.customConfig
                      ? roadmapState.customConfig.repeatIntervalMinutes
                      : roadmapState.fixedRepeatIntervalMinutes
                  }
                  onChange={(e) => {
                    const nextRepeat = Number(e.target.value) as RepeatMinutesOption;
                    if (viewTab === 'custom' && roadmapState.customConfig) {
                      updateActiveCustomConfig((cfg) => ({
                        ...cfg,
                        repeatIntervalMinutes: nextRepeat,
                      }));
                    } else {
                      updateState({ ...roadmapState, fixedRepeatIntervalMinutes: nextRepeat });
                    }
                  }}
                >
                  {REPEAT_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      Mỗi {m} phút
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface/55 px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-fg">Các ngày học trong tuần:</span>
                {ALL_DAYS_ORDERED.map((d) => {
                  const activeDays = effectiveSettings.studyWeekdays;
                  const isDaySelected = activeDays.includes(d.day);
                  return (
                    <Chip
                      key={d.day}
                      selected={isDaySelected}
                      onClick={() => {
                        const nextDays = isDaySelected
                          ? activeDays.filter((x) => x !== d.day)
                          : [...activeDays, d.day];
                        if (nextDays.length === 0) {
                          toast({
                            title: 'Cần chọn ít nhất 1 ngày học trong tuần.',
                            tone: 'warning',
                          });
                          return;
                        }
                        if (viewTab === 'custom' && roadmapState.customConfig) {
                          updateActiveCustomConfig((cfg) => ({ ...cfg, studyWeekdays: nextDays }));
                        } else {
                          updateState({ ...roadmapState, fixedStudyWeekdays: nextDays });
                        }
                      }}
                    >
                      {d.shortLabel}
                    </Chip>
                  );
                })}
              </div>
              <span className="text-xs text-muted tabular">
                {effectiveSettings.studyWeekdays.length} buổi/tuần · Dự kiến về đích:{' '}
                <strong className="text-fg">{roadmapForecast.estimatedCompletionLabel}</strong>
              </span>
            </div>
          </div>
        )}
      </Card>

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
                  ? '✓ Đã hoàn thành mục tiêu hôm nay — Đã tắt nhắc'
                  : `Màn hiện tại: Màn ${activeStage?.stageNumber ?? 1}`}
              </Badge>
              <Badge tone="neutral">
                <Clock className="size-3" aria-hidden />
                <span className="tabular">
                  Online hôm nay: {formatMmSs(todayOnlineSeconds)} / {effectiveSettings.dailyMinutesTarget}:00
                </span>
              </Badge>
              {notifPermission !== 'granted' && roadmapState.notificationsEnabled && (
                <Badge tone="warning">Cấp quyền thông báo để nhận chuông</Badge>
              )}
            </div>
            <h2 className="text-base font-bold text-fg">
              {activeStage
                ? `Màn ${activeStage.stageNumber}: ${activeStage.title}`
                : 'Bạn đã chinh phục toàn bộ bản đồ lộ trình!'}
            </h2>
            <p className="text-xs text-muted sm:text-sm">
              {enforcement.isCompletedToday
                ? 'Chuỗi học hôm nay đã được ghi nhận và toàn bộ nhắc nhở trong ngày đã tự động tắt.'
                : onlineMet
                  ? 'Bạn đã online đủ thời gian tối thiểu! Hãy mở Màn hiện tại và bấm Hoàn thành để mở khóa Màn kế tiếp.'
                  : `Còn thiếu ${formatMmSs(remainingSeconds)} online trên web để đủ điều kiện mở khóa Màn kế tiếp và tắt nhắc ngày hôm nay.`}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {activeStage && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="size-4" aria-hidden />}
                onClick={() => setSelectedStageId(activeStage.id)}
              >
                Mở Màn {activeStage.stageNumber}
              </Button>
            )}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Thời gian online hôm nay (tối thiểu {effectiveSettings.dailyMinutesTarget} phút)</span>
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
                Tiến độ toàn lộ trình ·{' '}
                <strong className="text-fg">
                  {roadmapForecast.isCompleted
                    ? 'Đã hoàn thành!'
                    : `Dự kiến xong: ${roadmapForecast.estimatedCompletionLabel} (~${roadmapForecast.estimatedWeeks} tuần)`}
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
        {activeLevel === 'N5' && viewTab !== 'overview' && (
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface/65 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="sakura">Điểm xuất phát N5</Badge>
                <span className="text-xs font-bold text-fg">
                  {(
                    roadmapState.activeMode === 'custom' && roadmapState.customConfig
                      ? Boolean(roadmapState.customConfig.includeKanaStarter)
                      : Boolean(roadmapState.fixedIncludeKanaStarter)
                  )
                    ? 'Đang bật Chặng 0: Học Bảng chữ cái Hiragana & Katakana (5 màn khởi động)'
                    : 'Đang bỏ qua Bảng chữ cái · Vào thẳng Bài 1 giáo trình N5'}
                </span>
              </div>
              <p className="text-xs text-muted">
                Người mới từ con số 0 nên bật 5 màn Hiragana &amp; Katakana trước; nếu đã thuộc mặt chữ Kana có thể bỏ qua để học ngay Bài 1.
              </p>
            </div>
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
                Đã thuộc Kana (Vào Bài 1)
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
                + Học Bảng chữ cái trước (5 màn)
              </Chip>
            </div>
          </div>
        )}
      </Card>

      {/* 7-Stage Visual Study Timeline Strip */}
      {viewTab !== 'overview' && stages.length > 0 && (() => {
        const activeIdx = activeStage ? Math.max(0, stages.findIndex((s) => s.id === activeStage.id)) : 0;
        const startIdx = Math.max(0, activeIdx - 1);
        const timelineSlice = stages.slice(startIdx, startIdx + 7);
        return (
          <Card padding="md" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary-fg" aria-hidden />
                <h3 className="text-sm font-bold text-fg">
                  Timeline Lịch Học Theo Ngày ({timelineSlice.length} màn gần nhất)
                </h3>
                <Badge tone="neutral">{activeBook.shortTitle}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>
                  Nhắc lúc <strong className="text-fg">{effectiveSettings.reminderTime}</strong> (lặp{' '}
                  {effectiveSettings.repeatIntervalMinutes}p)
                </span>
                {activeStage && activeStage.scheduledDate !== todayKey && (
                  <button
                    type="button"
                    onClick={handleSyncScheduleToToday}
                    className="cursor-pointer font-semibold text-primary-fg hover:underline"
                  >
                    Đồng bộ Màn {activeStage.stageNumber} về Hôm nay →
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-7">
              {timelineSlice.map((st) => {
                const completion = roadmapState.completedStages[st.id];
                const unlocked = isStageUnlocked(st, stages, roadmapState.completedStages);
                const isCurrent = activeStage?.id === st.id && !completion;
                const isTodayDate = st.scheduledDate === todayKey;
                const isLate = !completion && st.scheduledDate < todayKey;
                return (
                  <button
                    key={st.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => unlocked && setSelectedStageId(st.id)}
                    className={cn(
                      'flex flex-col justify-between gap-2 rounded-xl border p-2.5 text-left transition-all duration-150',
                      completion
                        ? 'cursor-pointer border-success-line bg-success-soft/35 hover:border-success-fg'
                        : isCurrent
                          ? 'cursor-pointer border-primary bg-primary-soft/45 ring-2 ring-primary/20 shadow-card'
                          : unlocked
                            ? 'cursor-pointer border-line bg-surface-2/60 hover:border-primary/60'
                            : 'cursor-not-allowed border-line bg-surface-2/35 opacity-75',
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="tabular text-[11px] font-bold text-primary-fg">
                          {formatShortDayMonth(st.scheduledDate)}
                        </span>
                        {completion ? (
                          <Badge tone="success" className="px-1.5 py-0 text-[10px]">
                            ✓ {completion.stars}★
                          </Badge>
                        ) : isCurrent ? (
                          <Badge tone="primary" className="px-1.5 py-0 text-[10px]">
                            {isTodayDate ? 'Hôm nay' : 'Đang học'}
                          </Badge>
                        ) : isLate ? (
                          <Badge tone="warning" className="px-1.5 py-0 text-[10px]">
                            Trễ lịch
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted">Màn {st.stageNumber}</span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs font-semibold text-fg">
                        Màn {st.stageNumber}: {st.title}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 border-t border-line/60 pt-1.5">
                      {st.tasks.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted ring-1 ring-line"
                        >
                          {STAGE_SKILL_META[t.skill].label}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* Unified View: Stage Map (Fixed/Custom) OR 4-Phase JLPT Overview */}
      {viewTab === 'overview' ? (
        (() => {
          const overviewSpec = STUDY_ROADMAPS[activeLevel];
          const toolQuery = buildVocabToolQuery(activeLevel, activeBook.id);
          const lvlLower = activeLevel.toLowerCase();
          const jlptQuery =
            activeLevel === 'N5' || activeLevel === 'N4' || activeLevel === 'N3'
              ? `?level=${activeLevel}`
              : '';
          const resolveOverviewHref = (rawTo: string) => {
            if (rawTo === `/vocabulary/${lvlLower}`) return `/vocabulary/${lvlLower}/book/${activeBook.id}`;
            if (rawTo === `/flashcard/${lvlLower}`) return `/flashcard/${lvlLower}/book/${activeBook.id}`;
            if (
              rawTo === '/vocabulary/quiz' ||
              rawTo === '/vocabulary/writing' ||
              rawTo === '/vocabulary/review' ||
              rawTo === '/vocabulary/unmastered'
            ) {
              return `${rawTo}${toolQuery}`;
            }
            if (rawTo.startsWith('/jlpt/') && jlptQuery && !rawTo.includes('?')) {
              return `${rawTo}${jlptQuery}`;
            }
            return rawTo;
          };
          return (
            <div className="space-y-4">
              <Card padding="lg" className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">JLPT {overviewSpec.level}</Badge>
                  <Badge tone="neutral">{overviewSpec.japaneseLabel}</Badge>
                  <Badge tone="neutral">{overviewSpec.durationWeeks} · {overviewSpec.dailyMinutes}</Badge>
                </div>
                <h2 className="text-lg font-bold text-fg">{overviewSpec.title}</h2>
                <p className="text-sm text-muted">{overviewSpec.summary}</p>
                <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted">
                  <span>Từ vựng: <strong className="text-fg">{overviewSpec.vocabTarget}</strong></span>
                  <span>Kanji: <strong className="text-fg">{overviewSpec.kanjiTarget}</strong></span>
                  <span>Ngữ pháp: <strong className="text-fg">{overviewSpec.grammarTarget}</strong></span>
                </div>
              </Card>
              {overviewSpec.phases.map((phase) => (
                <Card key={phase.id} padding="lg" className="space-y-3">
                  <div className="flex items-start gap-3 border-b border-line pb-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-bold text-primary-fg">
                      {phase.phaseNumber}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-fg">{phase.title}</h3>
                      <p className="text-xs text-muted sm:text-sm">{phase.subtitle}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {phase.steps.map((step) => (
                      <li
                        key={step.id}
                        className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-fg">{step.title}</span>
                            <Badge tone="primary">{step.skill}</Badge>
                            <span className="text-xs text-muted">{step.durationLabel}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted">{step.description}</p>
                        </div>
                        <Link
                          to={resolveOverviewHref(step.to)}
                          className={buttonStyles({ variant: 'soft', size: 'sm', className: 'shrink-0 self-end sm:self-center' })}
                        >
                          Học ngay
                          <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          );
        })()
      ) : (
      <div className="space-y-4">
        {/* View Switcher: Game Map vs Clean 2-Column Day Cards (Mokumoku Style) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">
            Các bài học ({stages.length} ngày · {completedCount} đã xong)
          </p>
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
              🗺️ Bản đồ Màn
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
              📅 Danh sách Ngày
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

          const chunkSubtitle = chunk[0]?.chunkTitle;
          return (
            <Card key={chunkNum} padding="lg" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div>
                  <p className="text-xs font-bold tracking-wider text-primary-fg uppercase">
                    {chunkNum === 0
                      ? `Chặng Khởi Động · Màn ${firstNum}–${lastNum}`
                      : `Chặng ${chunkNum} · Màn ${firstNum}–${lastNum}`}
                  </p>
                  <h3 className="text-base font-bold text-fg sm:text-lg">
                    {chunkSubtitle ?? `Màn ${firstNum}–${lastNum}`}
                  </h3>
                </div>
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
                  const allTasksChecked = selectedStage.tasks.every(
                    (t) =>
                      roadmapState.completedTaskIds.includes(t.id) ||
                      (isActiveSelected && todayAutoSkills.has(t.skill)),
                  );
                  const bossRecord = passedBossStages[selectedStage.id] ?? null;
                  const hasMasteryQuiz = Boolean(
                    selectedStageBriefing && selectedStageBriefing.masteryQuestions.length > 0,
                  );
                  const bossSatisfied = !hasMasteryQuiz || Boolean(bossRecord);
                  const canComplete =
                    Boolean(bossRecord?.isJumpPass) ||
                    (onlineMet && allTasksChecked && bossSatisfied);
                  return (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={!canComplete}
                      leftIcon={<Sparkles className="size-4" aria-hidden />}
                      onClick={() => void handleCompleteStage(selectedStage)}
                    >
                      {canComplete
                        ? `Hoàn thành & Mở khóa Màn ${selectedStage.stageNumber + 1}`
                        : !allTasksChecked
                          ? 'Hoàn thành Chặng 1 → 3 trước'
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
              const orderedTasks = [...studyTasks, ...practiceTasks];

              const isBriefingUnderstood =
                stageCompleted || understoodStageIds.includes(selectedStage.id);
              const isGateSkipped =
                stageCompleted || skippedGateStageIds.includes(selectedStage.id);
              const allStudyTasksDone = studyTasks.every(isTaskDone);
              const allPracticeTasksDone = practiceTasks.every(isTaskDone);
              const bossRecord = passedBossStages[selectedStage.id] ?? null;

              const isPracticeUnlocked =
                stageCompleted ||
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

                const isWritingTask = task.to.startsWith('/vocabulary/writing');
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
                      ) : (
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
                      )}
                      {roadmapState.activeMode === 'custom' && roadmapState.customConfig && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Gỡ nhiệm vụ ${task.title}`}
                          title="Gỡ nhiệm vụ khỏi Màn này"
                          onClick={() => handleRemoveTaskFromStage(selectedStage, task)}
                        >
                          <Trash2 className="size-3.5 text-danger-fg" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              };

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
                  {selectedStageBriefing && (
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
                  {selectedStageBriefing && selectedStageBriefing.masteryQuestions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-fg">
                        {bossRecord ? (
                          <Trophy className="size-3.5 text-success-fg" aria-hidden />
                        ) : isBossUnlocked ? (
                          <Award className="size-3.5 text-sakura" aria-hidden />
                        ) : (
                          <Lock className="size-3.5 text-muted" aria-hidden />
                        )}
                        🏆 Chặng 4 · Chốt Màn ({selectedStageBriefing.masteryQuestions.length} câu)
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

            {/* Admin-Style Stage Editor when in Custom Mode */}
            {roadmapState.activeMode === 'custom' && roadmapState.customConfig && (
              <div className="space-y-3 rounded-xl border border-dashed border-line-strong bg-surface-2/40 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-primary-fg uppercase">
                    Chỉnh sửa Màn {selectedStage.stageNumber} (Chế độ tự biên soạn)
                  </p>
                </div>

                {/* Rename Stage */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={
                      stageTitleDraft?.stageId === selectedStage.id
                        ? stageTitleDraft.value
                        : selectedStage.title
                    }
                    onChange={(e) =>
                      setStageTitleDraft({ stageId: selectedStage.id, value: e.target.value })
                    }
                    placeholder={`Đặt tên riêng cho Màn ${selectedStage.stageNumber}...`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={
                      stageTitleDraft?.stageId !== selectedStage.id ||
                      !stageTitleDraft.value.trim() ||
                      stageTitleDraft.value.trim() === selectedStage.title
                    }
                    leftIcon={<Pencil className="size-3.5" aria-hidden />}
                    onClick={() =>
                      stageTitleDraft &&
                      handleRenameStage(selectedStage, stageTitleDraft.value)
                    }
                  >
                    Đổi tên Màn
                  </Button>
                </div>

                {/* Rename Chunk (Chặng) */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={
                      chunkTitleDraft?.chunkNum === selectedStage.chunkNumber
                        ? chunkTitleDraft.value
                        : (selectedStage.chunkTitle ??
                            `Chặng ${selectedStage.chunkNumber}`)
                    }
                    onChange={(e) =>
                      setChunkTitleDraft({
                        chunkNum: selectedStage.chunkNumber,
                        value: e.target.value,
                      })
                    }
                    placeholder={`Đặt tên riêng cho Chặng ${selectedStage.chunkNumber}...`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={
                      chunkTitleDraft?.chunkNum !== selectedStage.chunkNumber ||
                      !chunkTitleDraft.value.trim()
                    }
                    leftIcon={<Pencil className="size-3.5" aria-hidden />}
                    onClick={() =>
                      chunkTitleDraft &&
                      handleRenameChunk(selectedStage.chunkNumber, chunkTitleDraft.value)
                    }
                  >
                    Đổi tên Chặng {selectedStage.chunkNumber}
                  </Button>
                </div>

                {/* Pick User's Custom Lesson from Creator Studio */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  {studioState.lessons.length > 0 ? (
                    <>
                      <Select
                        aria-label="Chọn bài tự tạo từ Studio"
                        value={selectedStudioLessonId}
                        onChange={(e) => setSelectedStudioLessonId(e.target.value)}
                        className="flex-1"
                      >
                        <option value="">
                          -- Chọn bài tự tạo trong Studio để gắn vào Màn --
                        </option>
                        {studioState.lessons.map((lesson) => {
                          const count =
                            lesson.kind === 'vocab'
                              ? (lesson.vocabItems?.length ?? 0)
                              : lesson.kind === 'grammar'
                                ? (lesson.grammarItems?.length ?? 0)
                                : (lesson.kanjiItems?.length ?? 0);
                          const kindLabel =
                            lesson.kind === 'vocab'
                              ? 'Từ vựng'
                              : lesson.kind === 'grammar'
                                ? 'Ngữ pháp'
                                : 'Kanji';
                          return (
                            <option key={lesson.id} value={lesson.id}>
                              ★ [{kindLabel} · {lesson.level}] {lesson.title} ({count} mục)
                            </option>
                          );
                        })}
                      </Select>
                      <Button
                        type="button"
                        variant="soft"
                        size="sm"
                        disabled={!selectedStudioLessonId}
                        leftIcon={<Sparkles className="size-4" aria-hidden />}
                        onClick={() => handleAddStudioLessonToStage(selectedStage)}
                      >
                        Gắn bài tự tạo
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface/60 px-3 py-2 text-xs text-muted">
                      <span>Bạn chưa tự soạn bài nào trong Studio (Từ vựng / Ngữ pháp / Kanji).</span>
                      <Link
                        to="/studio"
                        onClick={() => setSelectedStageId(null)}
                        className="font-semibold text-primary-fg hover:underline"
                      >
                        + Mở Studio tự tạo bài →
                      </Link>
                    </div>
                  )}
                </div>

                {/* Pick Real Lesson / Unit from Book Catalog */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select
                    aria-label="Chọn bài học thật từ kho sách"
                    value={selectedCatalogKey}
                    onChange={(e) => setSelectedCatalogKey(e.target.value)}
                    className="flex-1"
                  >
                    <option value="">-- Chọn bài học thật từ kho sách để gắn vào Màn --</option>
                    {Array.from(new Set(curriculumCatalog.map((p) => p.group))).map((group) => (
                      <optgroup key={group} label={group}>
                        {curriculumCatalog
                          .filter((p) => p.group === group)
                          .map((preset) => (
                            <option key={preset.key} value={preset.key}>
                              {preset.title} (~{preset.minutes}p)
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={!selectedCatalogKey}
                    leftIcon={<Plus className="size-4" aria-hidden />}
                    onClick={() => handleAddCatalogTaskToStage(selectedStage)}
                  >
                    Gắn bài này
                  </Button>
                </div>

                {/* Or add custom free-text task */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={customTaskTitle}
                    onChange={(e) => setCustomTaskTitle(e.target.value)}
                    placeholder="Hoặc nhập tên nhiệm vụ tự do (VD: Chép 10 dòng Kanji)..."
                    className="flex-1"
                  />
                  <Select
                    value={customTaskSkill}
                    onChange={(e) => setCustomTaskSkill(e.target.value as StageSkill)}
                    className="sm:w-36"
                  >
                    {ALL_SKILLS.map((sk) => (
                      <option key={sk} value={sk}>
                        {STAGE_SKILL_META[sk].label}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!customTaskTitle.trim()}
                    leftIcon={<Plus className="size-4" aria-hidden />}
                    onClick={() => handleAddCustomTaskToStage(selectedStage)}
                  >
                    Thêm tự do
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Custom Roadmap Builder Modal */}
      <Modal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        size="lg"
        title="Tự tạo lộ trình theo ngày & Màn"
        description="Tùy chỉnh giáo trình, số ngày học, mốc online 20–30 phút/ngày và kỹ năng muốn luyện — hệ thống tự sinh bản đồ Chặng & Màn chuẩn 4 Chặng."
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
                  const recommendedTotal = getRecommendedFixedStageCount(nextLvl, nextBook.id);
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Tối thiểu online/ngày" htmlFor="custom-min-minutes">
              <Select
                id="custom-min-minutes"
                value={draftConfig.dailyMinutesTarget}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  const nextTarget: DailyMinutesTarget =
                    raw === 10 || raw === 15 || raw === 20 || raw === 25 || raw === 30 ? raw : 25;
                  setDraftConfig({
                    ...draftConfig,
                    dailyMinutesTarget: nextTarget,
                  });
                }}
              >
                <option value={25}>25 phút / ngày (Chuẩn 4 Chặng)</option>
                <option value={20}>20 phút / ngày (Gọn)</option>
                <option value={30}>30 phút / ngày (Chuyên sâu)</option>
                <option value={15}>15 phút / ngày</option>
                <option value={10}>10 phút / ngày</option>
              </Select>
            </Field>
            <Field label="Tổng số Màn" htmlFor="custom-total-stages">
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
                <option value={10}>10 Màn (1 Chặng — Ôn cấp tốc)</option>
                <option value={20}>20 Màn (2 Chặng — Chuẩn Shin Kanzen / Mimi / Sou Matome)</option>
                <option value={30}>30 Màn (3 Chặng — Chuẩn Minna II N4)</option>
                <option value={60}>60 Màn (6 Chặng — Trọn bộ 25 bài Minna I)</option>
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
            <p className="text-sm font-medium text-fg">Các ngày học trong tuần</p>
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

      {/* PWA 1-Tap Install Guide Modal (for iOS Safari / browsers without beforeinstallprompt) */}
      <Modal
        open={iosGuideOpen}
        onClose={() => setIosGuideOpen(false)}
        size="sm"
        title="Cài Nihongo 問 như App Store (10 giây)"
        description="Không cần tải file .ics hay qua App Store — cài trực tiếp ra màn hình chính để mở toàn màn hình và nhận nhắc học."
        footer={
          <Button type="button" variant="primary" onClick={() => setIosGuideOpen(false)}>
            Đã hiểu
          </Button>
        }
      >
        <div className="space-y-3 text-sm text-fg">
          <Notice tone="info">
            <span className="font-semibold">Trên iPhone / iPad (Safari):</span>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-muted">
              <li>
                Bấm biểu tượng <strong className="text-fg">Chia sẻ</strong>{' '}
                <Share className="inline size-3.5 text-primary-fg" aria-hidden /> ở thanh dưới Safari.
              </li>
              <li>
                Chọn <strong className="text-fg">Thêm vào MH chính (Add to Home Screen)</strong> ➔ Bấm{' '}
                <strong className="text-fg">Thêm</strong>.
              </li>
            </ol>
          </Notice>
          <Notice tone="info">
            <span className="font-semibold">Trên Android / Laptop (Chrome, Edge):</span>
            <p className="mt-1 text-xs text-muted">
              Bấm biểu tượng <Download className="inline size-3.5 text-primary-fg" aria-hidden />{' '}
              <strong className="text-fg">Cài đặt ứng dụng</strong> trên thanh địa chỉ trình duyệt (hoặc menu ⋮ ➔ Cài đặt ứng dụng).
            </p>
          </Notice>
        </div>
      </Modal>

      {/* Import Shared Roadmap Modal (FREE for all users) */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        size="md"
        title="Nhập mã lộ trình được chia sẻ"
        description="Dán mã lộ trình (bắt đầu bằng NIHON-...) hoặc đường link chia sẻ từ giáo viên / bạn bè để thêm ngay vào danh sách lộ trình của bạn (Hoàn toàn miễn phí)."
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
              Nhập &amp; Bắt đầu học
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Mã lộ trình hoặc Link chia sẻ" htmlFor="import-roadmap-code">
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
        title="Mở khóa Chia sẻ Lộ trình — Gói PRO Creator"
        description="Tự tạo lộ trình học cho cá nhân là miễn phí 100%. Để xuất mã & chia sẻ lộ trình cho học viên, bạn bè hoặc nhóm học tập, hãy nâng cấp gói PRO Creator."
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
        description="Gửi Mã lộ trình hoặc Link trực tiếp bên dưới cho bạn bè / học viên. Người nhận có thể nhập và học theo lộ trình này hoàn toàn miễn phí!"
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

          <Field label="1. Mã chia sẻ lộ trình (Dùng cho nút Nhập mã lộ trình)" htmlFor="share-code-box">
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

          <Field label="2. Link chia sẻ 1 chạm (Bấm vào là mở thẳng hộp thoại nhập)" htmlFor="share-url-box">
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

      {/* Google Calendar 1-Tap Full-Roadmap Sync Modal */}
      <Modal
        open={gcalModalOpen}
        onClose={() => !gcalSyncing && setGcalModalOpen(false)}
        size="md"
        title="Đồng bộ lịch học lên Google Calendar"
        description={`Điền chi tiết từng ngày (${activeLevel} · ${activeBook.shortTitle}) kèm chuông báo điện thoại ngay cả khi tắt máy chờ hoặc đóng app.`}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={gcalSyncing}
              onClick={() => setGcalModalOpen(false)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={gcalSyncing}
              leftIcon={<Calendar className="size-4" aria-hidden />}
              onClick={() => void runGoogleCalendarSync(true)}
            >
              {gcalSyncing ? 'Đang đồng bộ...' : 'Đồng bộ từng ngày (1 chạm)'}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5 text-sm">
          <div className="rounded-xl border border-line bg-surface-2/60 p-3.5 space-y-1.5 text-xs sm:text-sm">
            <p className="font-semibold text-fg">
              Lịch sẽ được tự động fill vào Google Calendar của bạn:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>
                Số ngày đồng bộ:{' '}
                <strong className="text-fg">
                  {Math.min(
                    60,
                    stages.filter(
                      (s) => !roadmapState.completedStages[s.id] && s.scheduledDate >= todayKey,
                    ).length,
                  )}{' '}
                  ngày học riêng biệt
                </strong>{' '}
                (mỗi ngày ghi rõ tên Màn, danh sách bài &amp; link vào học ngay)
              </li>
              <li>
                Giờ học:{' '}
                <strong className="text-fg">
                  {effectiveSettings.reminderTime} ({effectiveSettings.dailyMinutesTarget} phút/ngày)
                </strong>
              </li>
              <li>
                Báo chuông điện thoại:{' '}
                <strong className="text-fg">Tự động báo trước 10 phút &amp; đúng giờ</strong> (kêu thật kể cả khi khóa màn hình chờ &amp; vuốt tắt app!)
              </li>
              <li>
                Đồng bộ lại nhiều lần sẽ <strong className="text-fg">tự cập nhật</strong>, không tạo lịch trùng.
              </li>
            </ul>
          </div>

          {gcalSyncing && gcalProgress && (
            <div className="space-y-1.5 rounded-xl border border-primary/35 bg-primary-soft/20 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-primary-fg">
                <span>Đang ghi lịch từng ngày lên Google Calendar...</span>
                <span className="tabular">
                  {gcalProgress.done}/{gcalProgress.total}
                </span>
              </div>
              <ProgressBar
                value={gcalProgress.done}
                max={Math.max(1, gcalProgress.total)}
                size="sm"
                tone="primary"
                label="Tiến độ đồng bộ Google Calendar"
              />
            </div>
          )}

          {gcalResult && (
            <Notice tone={gcalResult.ok ? 'success' : 'warning'}>
              <p className="font-bold">
                {gcalResult.ok
                  ? `🎉 Hoàn tất! Đã tạo mới ${gcalResult.created} ngày & cập nhật ${gcalResult.updated} ngày lên Google Calendar.`
                  : 'Chưa đồng bộ được qua API'}
              </p>
              {gcalResult.errorMessage && (
                <p className="mt-1 text-xs leading-relaxed">{gcalResult.errorMessage}</p>
              )}
              {gcalResult.ok && (
                <p className="mt-1 text-xs">
                  Hãy mở app Google Calendar trên điện thoại — toàn bộ các ngày học kèm link vào bài đã hiển thị sẵn!
                </p>
              )}
            </Notice>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs">
            <Button
              type="button"
              variant="soft"
              size="sm"
              leftIcon={<Download className="size-3.5" aria-hidden />}
              onClick={() => {
                const completedSet = new Set(Object.keys(roadmapState.completedStages));
                const res = downloadRoadmapIcsFile({
                  stages,
                  completedStageIds: completedSet,
                  level: activeLevel,
                  bookTitle: activeBook.title,
                  reminderTime: effectiveSettings.reminderTime,
                  dailyMinutesTarget: effectiveSettings.dailyMinutesTarget,
                });
                toast({
                  title:
                    res.count > 0
                      ? `Đã tải ${res.filename} (${res.count} ngày học)! Mở file để thêm vào Lịch điện thoại.`
                      : 'Bạn đã hoàn thành hết các Màn trong lộ trình này rồi!',
                  tone: res.count > 0 ? 'success' : 'info',
                });
              }}
            >
              Tải file lịch chi tiết (.ics)
            </Button>
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary-fg hover:underline"
            >
              Mở nhanh lịch lặp (URL)
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};
