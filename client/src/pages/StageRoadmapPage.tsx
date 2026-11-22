import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  BellOff,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  ExternalLink,
  Lock,
  Pencil,
  Plus,
  Settings2,
  Share,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
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
  getVocabTextbooksForLevel,
  resolveActiveVocabTextbook,
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
  getBrowserNotificationPermission,
  isRunningStandalone,
  isWebPushConfigured,
  isWebPushSubscribedOnDevice,
  PWA_INSTALL_CHANGE_EVENT,
  requestBrowserNotificationPermission,
  subscribeAndSyncWebPush,
  triggerOneTapPwaInstall,
  type BrowserNotificationState,
} from '../services/pwaReminderService';
import {
  buildCurriculumTaskCatalog,
  buildOneTapStageGoogleCalendarUrl,
  calculateRoadmapForecast,
  completeStageAndUnlockNext,
  createDefaultCustomConfig,
  DAILY_STAGE_ACTIVITY_SYNC_EVENT,
  decodeRoadmapShareCode,
  deriveAutoCompletedSkillsToday,
  encodeRoadmapShareCode,
  formatMmSs,
  formatShortDayMonth,
  generateStageMap,
  getActiveStageForMap,
  getEffectiveReminderSettings,
  getRecommendedFixedStageCount,
  isDailyEnforcementPending,
  isProCreatorUnlocked,
  isStageUnlocked,
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
  const chunks: RoadmapStage[][] = [];
  for (let i = 0; i < stages.length; i += chunkSize) {
    chunks.push(stages.slice(i, i + chunkSize));
  }
  return chunks;
}

export const StageRoadmapPage: React.FC = () => {
  const { user, studyLevel, studyTextbookId } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const cmsSnapshot = useCurriculumSnapshot();
  const quizHistory = useQuizHistory();
  const kanjiProgress = useAppSelector((state) => state.kanji.progress);

  const [syncVersion, setSyncVersion] = useState(0);
  const [viewTab, setViewTab] = useState<RoadmapMode | 'overview'>(() =>
    loadStageRoadmapState(user?.id).activeMode,
  );
  const [notifPermission, setNotifPermission] = useState<BrowserNotificationState>(() =>
    getBrowserNotificationPermission(),
  );
  const [isStandalone, setIsStandalone] = useState(() => isRunningStandalone());
  const [webPushActive, setWebPushActive] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(() => searchParams.get('create') === '1');
  const [builderIsNew, setBuilderIsNew] = useState(() => searchParams.get('create') === '1');
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [selectedCatalogKey, setSelectedCatalogKey] = useState('');
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
  const [draftConfig, setDraftConfig] = useState<CustomRoadmapConfig>(() =>
    createDefaultCustomConfig(studyLevel ?? 'N3', user?.id, studyTextbookId),
  );

  useEffect(() => {
    if (searchParams.get('create') === '1' || searchParams.get('import')) {
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      next.delete('import');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const bump = () => setSyncVersion((v) => v + 1);
    const onPwaChange = () => setIsStandalone(isRunningStandalone());
    window.addEventListener(STAGE_ROADMAP_SYNC_EVENT, bump);
    window.addEventListener(DAILY_STAGE_ACTIVITY_SYNC_EVENT, bump);
    window.addEventListener(ONLINE_TIME_SYNC_EVENT, bump);
    window.addEventListener(PWA_INSTALL_CHANGE_EVENT, onPwaChange);
    void isWebPushSubscribedOnDevice().then(setWebPushActive);
    return () => {
      window.removeEventListener(STAGE_ROADMAP_SYNC_EVENT, bump);
      window.removeEventListener(DAILY_STAGE_ACTIVITY_SYNC_EVENT, bump);
      window.removeEventListener(ONLINE_TIME_SYNC_EVENT, bump);
      window.removeEventListener(PWA_INSTALL_CHANGE_EVENT, onPwaChange);
    };
  }, []);

  const roadmapState = useMemo(
    () => (syncVersion >= 0 ? loadStageRoadmapState(user?.id) : loadStageRoadmapState(user?.id)),
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

  const activeLevel: StudyLevel =
    roadmapState.activeMode === 'custom' && roadmapState.customConfig
      ? roadmapState.customConfig.level
      : (studyLevel ?? 'N3');

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
      });
    }
    return generateStageMap({
      mode: 'fixed',
      level: studyLevel ?? 'N3',
      textbookId: studyTextbookId,
      userId: user?.id,
      snapshot: cmsSnapshot,
      startDate: roadmapState.fixedStartDate,
      dailyMinutesTarget: roadmapState.fixedDailyMinutesTarget,
      totalStages: getRecommendedFixedStageCount(studyLevel ?? 'N3', studyTextbookId),
    });
  }, [cmsSnapshot, roadmapState, studyLevel, studyTextbookId, user?.id]);

  const stageChunks = useMemo(() => chunkStages(stages, 10), [stages]);
  const activeStage = useMemo(
    () => getActiveStageForMap(stages, roadmapState.completedStages),
    [stages, roadmapState.completedStages],
  );
  const selectedStage = useMemo(
    () => stages.find((s) => s.id === selectedStageId) ?? null,
    [stages, selectedStageId],
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

  const draftForecast = useMemo(
    () =>
      calculateRoadmapForecast({
        totalStages: draftConfig.totalStages,
        completedCount: 0,
        startDate: draftConfig.startDate,
        studyWeekdays: draftConfig.studyWeekdays,
        todayKey,
      }),
    [draftConfig.startDate, draftConfig.studyWeekdays, draftConfig.totalStages, todayKey],
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
      setDraftConfig(createDefaultCustomConfig(studyLevel ?? 'N3', user?.id, studyTextbookId));
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
        : createDefaultCustomConfig(studyLevel ?? 'N3', user?.id, studyTextbookId),
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
    return encodeRoadmapShareCode(roadmapState.customConfig, user?.displayName);
  }, [roadmapState.customConfig, user?.displayName]);

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
      title: `Đã nhập lộ trình "${parsed.name}" (${parsed.totalStages} màn)!`,
      tone: 'success',
    });
  };

  const handleShiftScheduleOneDay = () => {
    if (roadmapState.activeMode === 'custom' && roadmapState.customConfig) {
      updateState({
        ...roadmapState,
        customConfig: {
          ...roadmapState.customConfig,
          startDate: addDaysToDateKey(roadmapState.customConfig.startDate, 1),
        },
      });
    } else {
      updateState({
        ...roadmapState,
        fixedStartDate: addDaysToDateKey(roadmapState.fixedStartDate, 1),
      });
    }
    toast({ title: 'Đã dời lịch các màn thêm 1 ngày', tone: 'info' });
  };

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
        description="Hoàn thành nhiệm vụ Màn và online tối thiểu 10–15 phút/ngày để mở khóa Màn tiếp theo và tự động tắt nhắc hôm nay."
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
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              <Calendar className="size-4 text-primary-fg" aria-hidden />
              <span>Google Calendar</span>
              <ExternalLink className="size-3.5 text-muted" aria-hidden />
            </a>
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
          </div>
        }
      />

      {/* Mode Switcher + Inline Quick Settings */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            aria-label="Chế độ lộ trình"
            variant="pill"
            value={viewTab}
            onChange={handleModeChange}
            items={[
              { value: 'fixed', label: 'Lộ trình cố định' },
              { value: 'custom', label: 'Lộ trình tự tạo' },
              { value: 'overview', label: 'Tổng quan 4 giai đoạn' },
            ]}
          />
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

        {/* Fixed-mode compact settings bar */}
        {viewTab === 'fixed' && (
          <div className="grid grid-cols-1 gap-3 border-t border-line pt-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Ngày bắt đầu lộ trình" htmlFor="fixed-start-date">
              <Input
                id="fixed-start-date"
                type="date"
                value={roadmapState.fixedStartDate}
                onChange={(e) =>
                  updateState({ ...roadmapState, fixedStartDate: e.target.value || todayKey })
                }
              />
            </Field>
            <Field label="Thời gian online tối thiểu/ngày" htmlFor="fixed-min-minutes">
              <Select
                id="fixed-min-minutes"
                value={roadmapState.fixedDailyMinutesTarget}
                onChange={(e) =>
                  updateState({
                    ...roadmapState,
                    fixedDailyMinutesTarget: Number(e.target.value) === 15 ? 15 : 10,
                  })
                }
              >
                <option value={10}>10 phút / ngày (Khuyến nghị)</option>
                <option value={15}>15 phút / ngày (Tập trung cao)</option>
              </Select>
            </Field>
            <Field label="Giờ bắt đầu nhắc mỗi ngày" htmlFor="fixed-reminder-time">
              <Input
                id="fixed-reminder-time"
                type="time"
                value={roadmapState.fixedReminderTime}
                onChange={(e) =>
                  updateState({ ...roadmapState, fixedReminderTime: e.target.value || '20:00' })
                }
              />
            </Field>
            <Field label="Nhắc lặp lại nếu chưa xong" htmlFor="fixed-repeat-interval">
              <Select
                id="fixed-repeat-interval"
                value={roadmapState.fixedRepeatIntervalMinutes}
                onChange={(e) =>
                  updateState({
                    ...roadmapState,
                    fixedRepeatIntervalMinutes: Number(e.target.value) as RepeatMinutesOption,
                  })
                }
              >
                {REPEAT_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    Mỗi {m} phút
                  </option>
                ))}
              </Select>
            </Field>
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
      </Card>

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
      <div className="space-y-5">
        {stageChunks.map((chunk, chunkIdx) => {
          const chunkNum = chunkIdx + 1;
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
                    Chặng {chunkNum} · Màn {firstNum}–{lastNum}
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
            ? `Ngày dự kiến: ${formatVietnameseDateWithWeekday(selectedStage.scheduledDate)} · ${selectedStage.theme}`
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
                  const canComplete = onlineMet && allTasksChecked;
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
                        : !onlineMet
                          ? `Còn thiếu ${formatMmSs(remainingSeconds)} online`
                          : 'Hoàn thành đủ nhiệm vụ bên trên'}
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
            <div className="rounded-xl border border-line bg-surface-2/60 p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 font-semibold text-fg">
                  <Clock className="size-4 text-primary-fg" aria-hidden />
                  Điều kiện 1: Online tối thiểu {selectedStage.minOnlineMinutes} phút hôm nay
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

            {/* Condition 2: Stage Tasks */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                Điều kiện 2: Nhiệm vụ của Màn {selectedStage.stageNumber}
              </p>
              <ul className="space-y-2">
                {selectedStage.tasks.map((task) => {
                  const manualDone = roadmapState.completedTaskIds.includes(task.id);
                  const autoDone =
                    activeStage?.id === selectedStage.id && todayAutoSkills.has(task.skill);
                  const done = manualDone || autoDone;
                  const skillMeta = STAGE_SKILL_META[task.skill];
                  return (
                    <li
                      key={task.id}
                      className={cn(
                        'flex flex-col gap-2.5 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between',
                        done
                          ? 'border-success-line bg-success-soft/45'
                          : 'border-line bg-surface-2/50',
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                          aria-pressed={done}
                          aria-label={
                            done
                              ? `Bỏ đánh dấu ${task.title}`
                              : `Đánh dấu hoàn thành ${task.title}`
                          }
                          className={cn(
                            'mt-0.5 shrink-0 cursor-pointer rounded-full transition-colors',
                            done ? 'text-success-fg' : 'text-muted hover:text-primary-fg',
                          )}
                        >
                          {done ? (
                            <CheckCircle2 className="size-5" />
                          ) : (
                            <Circle className="size-5" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                'text-sm font-semibold',
                                done ? 'text-muted line-through' : 'text-fg',
                              )}
                            >
                              {task.title}
                            </span>
                            <Badge tone={skillMeta.tone}>{skillMeta.label}</Badge>
                            {autoDone && (
                              <Badge tone="success">✓ Tự động</Badge>
                            )}
                            <span className="text-xs text-muted">~{task.minutes}p</span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted">{task.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
                        <Link
                          to={task.to}
                          onClick={() => setSelectedStageId(null)}
                          className={buttonStyles({
                            variant: done ? 'secondary' : 'soft',
                            size: 'sm',
                          })}
                        >
                          {done ? 'Ôn lại' : 'Học ngay'}
                          <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
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
                })}
              </ul>
            </div>

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
        description="Tùy chỉnh giáo trình, số ngày học, mốc online 10–15 phút/ngày và kỹ năng muốn luyện — hệ thống tự sinh bản đồ Chặng & Màn."
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
                  setDraftConfig({
                    ...draftConfig,
                    level: nextLvl,
                    textbookId: nextBook.id,
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
                onChange={(e) =>
                  setDraftConfig({ ...draftConfig, textbookId: e.target.value })
                }
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
                onChange={(e) =>
                  setDraftConfig({
                    ...draftConfig,
                    dailyMinutesTarget: Number(e.target.value) === 15 ? 15 : 10,
                  })
                }
              >
                <option value={10}>10 phút / ngày</option>
                <option value={15}>15 phút / ngày</option>
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
                <option value={20}>20 Màn (2 Chặng — 3 tuần)</option>
                <option value={30}>30 Màn (3 Chặng — 1 tháng)</option>
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
                {draftConfig.totalStages} màn · {draftForecast.daysPerWeek} ngày/tuần (~{draftForecast.estimatedWeeks} tuần)
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
            <Button
              type="button"
              variant="soft"
              onClick={() => {
                setProCreatorDemoUnlocked(user?.id, true);
                setSyncVersion((v) => v + 1);
                setProPaywallOpen(false);
                setShareModalOpen(true);
                toast({
                  title: 'Đã bật chế độ Dùng thử PRO Creator trên thiết bị này!',
                  tone: 'success',
                });
              }}
            >
              Bật thử quyền PRO (Demo/Test)
            </Button>
            <Button
              type="button"
              variant="primary"
              leftIcon={<Sparkles className="size-4" aria-hidden />}
              onClick={() =>
                toast({
                  title: 'Cổng nạp tiền tự động (VietQR / SePay) đang được tích hợp và sẽ mở sớm!',
                  tone: 'info',
                })
              }
            >
              Nạp tiền mở khóa PRO (Sắp ra mắt)
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
              Gợi ý cho chủ dự án: Bạn có thể bấm nút <strong className="text-fg">“Bật thử quyền PRO (Demo/Test)”</strong> bên dưới để kiểm thử ngay lập tức toàn bộ luồng Tạo Mã &amp; Link chia sẻ trước khi kết nối cổng nạp tiền thật.
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
    </PageContainer>
  );
};
