import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  PenLine,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Wand2,
  Zap,
  Eye,
} from 'lucide-react';
import {
  Badge,
  Button,
  Chip,
  Field,
  IconButton,
  Input,
  Modal,
  Notice,
  Select,
  Textarea,
  useToast,
} from '../ui';
import { cn } from '../../lib/cn';
import type { CmsSnapshot } from '../../services/adminCmsService';
import {
  CUSTOM_ROLE_META,
  resolveLessonRole,
  type CustomLesson,
} from '../../services/customStudioService';
import {
  ALL_DAYS_ORDERED,
} from '../../services/notificationService';
import {
  buildCurriculumTaskCatalog,
  calculateRoadmapForecast,
  createDefaultCustomConfig,
  getRecommendedFixedStageCount,
  getStageCountForDailyMinutes,
  STAGE_SKILL_META,
  type CurriculumTaskPreset,
  type CustomRoadmapConfig,
  type CustomStageOverride,
  type DailyMinutesTarget,
  type RepeatMinutesOption,
  type RoadmapStage,
  type StageSkill,
  type StageTask,
  type TotalStagesOption,
} from '../../services/stageRoadmapService';
import {
  buildAiRoadmapPrompt,
  parseAndValidateRoadmapJson,
  SAMPLE_AI_ROADMAP_JSON,
} from '../../services/roadmapJsonService';
import {
} from '../../data/roadmapTemplates';
import {
  getVocabTextbooksForLevel,
  resolveActiveVocabTextbook,
} from '../../data/vocabTextbooks';
import { SchedulePicker } from './SchedulePicker';
import { CreateQuizModal } from './CreateQuizModal';
import { LessonDetailModal } from './LessonDetailModal';
import {
  describeCatalogLesson,
  describeCustomLesson,
  type LessonDetail,
} from '../../utils/lessonDetails';
import type { StudyLevel } from '../../services/userLevelService';

export type WizardInitialMode = 'choose' | 'composer' | 'ai' | 'quick';

interface ComposerStageDraft {
  id: string;
  title: string;
  tasks: StageTask[];
}

interface CreateRoadmapWizardModalProps {
  open: boolean;
  initialMode?: WizardInitialMode;
  /** When provided, opens the 2-step Composer pre-filled to edit this roadmap in place (preserving progress). */
  editingConfig?: CustomRoadmapConfig | null;
  editingStages?: RoadmapStage[];
  onClose: () => void;
  defaultLevel: StudyLevel;
  defaultTextbookId: string;
  userId?: string | null;
  todayKey: string;
  cmsSnapshot: CmsSnapshot;
  studioLessons: CustomLesson[];
  onSaveStudioLesson: (lesson: CustomLesson) => void;
  onDeleteStudioLesson: (lessonId: string) => void;
  onCommitRoadmap: (payload: {
    config: CustomRoadmapConfig;
    lessons: CustomLesson[];
  }) => void;
}

const LEVELS: StudyLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const MINUTE_OPTIONS: DailyMinutesTarget[] = [10, 15, 20, 25, 30];
const REPEAT_OPTIONS: RepeatMinutesOption[] = [5, 10, 15];
const AI_STAGE_COUNTS = [3, 5, 7, 10, 15, 20];
const WEEKDAY_PRESETS: ReadonlyArray<{ label: string; days: number[] }> = [
  { label: 'Cả tuần', days: [1, 2, 3, 4, 5, 6, 0] },
  { label: 'Thứ 2 – Thứ 6', days: [1, 2, 3, 4, 5] },
  { label: 'T2, T4, T6', days: [1, 3, 5] },
];

type AppActivityFilter =
  | 'all'
  | 'vocab'
  | 'flashcard'
  | 'quiz'
  | 'minigame'
  | 'kanji'
  | 'reading'
  | 'listening'
  | 'grammar';

const APP_ACTIVITY_FILTERS: ReadonlyArray<{ value: AppActivityFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'vocab', label: 'Từ vựng' },
  { value: 'flashcard', label: 'Flashcard' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'minigame', label: 'Mini-game' },
  { value: 'kanji', label: 'Chữ Hán' },
  { value: 'reading', label: 'Đọc hiểu' },
  { value: 'listening', label: 'Nghe hiểu' },
  { value: 'grammar', label: 'Ngữ pháp' },
];



function getLessonCategoryMeta(lesson: CustomLesson): {
  label: string;
  tone: 'primary' | 'sakura' | 'success' | 'warning' | 'neutral';
  skill: StageSkill;
  unitWord: string;
} {
  const role = resolveLessonRole(lesson);
  const roleMeta = CUSTOM_ROLE_META[role];
  if (lesson.kind === 'quiz') {
    return {
      label: `Quiz · ${roleMeta.label}`,
      tone: roleMeta.tone,
      skill: roleMeta.stageSkill,
      unitWord: 'câu',
    };
  }
  if (lesson.kind === 'grammar') {
    return { label: 'Ngữ pháp', tone: 'sakura', skill: 'grammar', unitWord: 'mẫu' };
  }
  if (lesson.kind === 'kanji') {
    return { label: 'Chữ Hán', tone: 'warning', skill: 'kanji', unitWord: 'chữ' };
  }
  return { label: 'Từ vựng', tone: 'primary', skill: 'vocab', unitWord: 'từ' };
}

function getLessonItemCount(lesson: CustomLesson): number {
  if (lesson.kind === 'quiz') return lesson.quizItems?.length ?? 0;
  if (lesson.kind === 'grammar') return lesson.grammarItems?.length ?? 0;
  if (lesson.kind === 'kanji') return lesson.kanjiItems?.length ?? 0;
  return lesson.vocabItems?.length ?? 0;
}

function getPresetActivityKind(preset: CurriculumTaskPreset): Exclude<AppActivityFilter, 'all'> {
  if (preset.key.startsWith('vocab-fc-') || preset.to.startsWith('/flashcard/')) return 'flashcard';
  if (preset.key.startsWith('minigame-') || preset.to.startsWith('/games')) return 'minigame';
  if (preset.skill === 'quiz') return 'quiz';
  if (preset.skill === 'kanji') return 'kanji';
  if (preset.skill === 'reading') return 'reading';
  if (preset.skill === 'listening') return 'listening';
  if (preset.skill === 'grammar') return 'grammar';
  return 'vocab';
}

function getPresetDisplayBadge(preset: CurriculumTaskPreset): {
  label: string;
  tone: 'primary' | 'sakura' | 'success' | 'warning' | 'neutral';
} {
  const kind = getPresetActivityKind(preset);
  if (kind === 'flashcard') return { label: 'Flashcard', tone: 'primary' };
  if (kind === 'minigame') return { label: 'Mini-game', tone: 'sakura' };
  return STAGE_SKILL_META[preset.skill];
}

function createInitialComposerStages(): ComposerStageDraft[] {
  return [
    { id: 'cs-1', title: 'Buổi 1', tasks: [] },
    { id: 'cs-2', title: 'Buổi 2', tasks: [] },
    { id: 'cs-3', title: 'Buổi 3', tasks: [] },
  ];
}


export const CreateRoadmapWizardModal: React.FC<CreateRoadmapWizardModalProps> = ({
  open,
  initialMode = 'composer',
  editingConfig = null,
  editingStages = [],
  onClose,
  defaultLevel,
  defaultTextbookId,
  userId,
  todayKey,
  cmsSnapshot,
  studioLessons,
  onSaveStudioLesson,
  onDeleteStudioLesson,
  onCommitRoadmap,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Dialogs stacked on top of the composer, so the plan being built is never lost
  const [detail, setDetail] = useState<LessonDetail | null>(null);
  const [quizEditor, setQuizEditor] = useState<{ lesson: CustomLesson | null } | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<CustomLesson | null>(null);
  const isEditing = Boolean(editingConfig);

  const [mode, setMode] = useState<WizardInitialMode>(initialMode);
  const [wasOpen, setWasOpen] = useState(false);

  // --- FLOW A: 2-STEP COMPOSER (STEP 1: MY LIBRARY + APP LIBRARY -> STEP 2: SCHEDULE) ---
  const [composerStep, setComposerStep] = useState<'content' | 'schedule'>('content');
  const [compStages, setCompStages] = useState<ComposerStageDraft[]>(createInitialComposerStages);
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [sourceTab, setSourceTab] = useState<'my-library' | 'app-library'>('my-library');

  // My Library filter & inline Quick Creator (creates reusable CustomLesson with Role)

  // App Library filters
  const [pickerLevel, setPickerLevel] = useState<StudyLevel>(defaultLevel);
  const [pickerBookId, setPickerBookId] = useState<string>(defaultTextbookId);
  const [pickerActivity, setPickerActivity] = useState<AppActivityFilter>('all');
  const [pickerSearch, setPickerSearch] = useState('');

  // Step 2: Schedule settings (filled AFTER content is chosen!)
  const [compName, setCompName] = useState(`Lộ trình riêng ${defaultLevel}`);
  const [compStartDate, setCompStartDate] = useState(todayKey);
  const [compMinutes, setCompMinutes] = useState<DailyMinutesTarget>(15);
  const [compWeekdays, setCompWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [compReminderTime, setCompReminderTime] = useState('20:00');
  const [compRepeatMinutes, setCompRepeatMinutes] = useState<RepeatMinutesOption>(10);
  const [compNotificationsEnabled, setCompNotificationsEnabled] = useState(true);

  // --- FLOW B: CHATGPT / GEMINI HELPER ---
  const [aiTopic, setAiTopic] = useState('Tiếng Nhật giao tiếp quán ăn & mua sắm');
  const [aiLevel, setAiLevel] = useState<StudyLevel>(defaultLevel);
  const [aiStagesCount, setAiStagesCount] = useState<number>(5);
  const [aiMinutes, setAiMinutes] = useState<DailyMinutesTarget>(15);
  const [aiIncludeVocab, setAiIncludeVocab] = useState(true);
  const [aiIncludeGrammar, setAiIncludeGrammar] = useState(true);
  const [aiIncludeKanji, setAiIncludeKanji] = useState(false);
  const [aiIncludeQuizzes, setAiIncludeQuizzes] = useState(true);
  const [showRawPrompt, setShowRawPrompt] = useState(false);
  const [aiPasteText, setAiPasteText] = useState('');

  // --- FLOW C: QUICK TEXTBOOK / COMMUNITY ---
  const [quickConfig, setQuickConfig] = useState<CustomRoadmapConfig>(() =>
    createDefaultCustomConfig(defaultLevel, userId, defaultTextbookId, todayKey),
  );

  // Reset modal view cleanly on open (and pre-fill if editing an existing roadmap)
  if (open && !wasOpen) {
    setWasOpen(true);
    setComposerStep('content');
    setSourceTab('my-library');
    setActiveStageIdx(0);

    if (editingConfig) {
      setMode('composer');
      setCompName(editingConfig.name);
      setCompStartDate(editingConfig.startDate || todayKey);
      setCompMinutes(editingConfig.dailyMinutesTarget);
      setCompWeekdays(
        editingConfig.studyWeekdays.length > 0
          ? [...editingConfig.studyWeekdays]
          : [1, 2, 3, 4, 5, 6, 0],
      );
      setCompReminderTime(editingConfig.reminderTime || '20:00');
      setCompRepeatMinutes(editingConfig.repeatIntervalMinutes || 10);
      setCompNotificationsEnabled(editingConfig.notificationsEnabled !== false);
      setPickerLevel(editingConfig.level);
      setPickerBookId(
        resolveActiveVocabTextbook(editingConfig.level, userId, editingConfig.textbookId).id,
      );

      const stageCount = Math.max(1, editingConfig.totalStages || editingStages.length || 1);
      const hydratedStages: ComposerStageDraft[] = Array.from({ length: stageCount }, (_, idx) => {
        const num = idx + 1;
        const ov = editingConfig.stageOverrides?.[num];
        const generated = editingStages.find((s) => s.stageNumber === num);
        const tasks = ov?.replaceBaseTasks
          ? [...(ov.extraTasks ?? [])]
          : generated
            ? [...generated.tasks]
            : [...(ov?.extraTasks ?? [])];
        return {
          id: `edit-cs-${num}`,
          title: ov?.title?.trim() || generated?.title || `Buổi ${num}`,
          tasks,
        };
      });
      setCompStages(hydratedStages);
    } else {
      setMode(initialMode);
      setCompName(`Lộ trình riêng ${defaultLevel}`);
      setCompStartDate(todayKey);
      setCompMinutes(15);
      setCompWeekdays([1, 2, 3, 4, 5, 6, 0]);
      setCompReminderTime('20:00');
      setCompRepeatMinutes(10);
      setCompNotificationsEnabled(true);
      setCompStages(createInitialComposerStages());
      setPickerLevel(defaultLevel);
      setPickerBookId(resolveActiveVocabTextbook(defaultLevel, userId, defaultTextbookId).id);
      setAiLevel(defaultLevel);
      setQuickConfig(createDefaultCustomConfig(defaultLevel, userId, defaultTextbookId, todayKey));
    }
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const pickerBooks = useMemo(() => getVocabTextbooksForLevel(pickerLevel), [pickerLevel]);
  const effectivePickerBookId = pickerBooks.some((b) => b.id === pickerBookId)
    ? pickerBookId
    : pickerBooks[0]?.id ?? defaultTextbookId;

  const pickerCatalog = useMemo(
    () =>
      buildCurriculumTaskCatalog({
        snapshot: cmsSnapshot,
        level: pickerLevel,
        textbookId: effectivePickerBookId,
        userId,
      }),
    [cmsSnapshot, pickerLevel, effectivePickerBookId, userId],
  );

  const filteredCatalog = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return pickerCatalog.filter((item) => {
      if (pickerActivity !== 'all' && getPresetActivityKind(item) !== pickerActivity) return false;
      if (q && !item.title.toLowerCase().includes(q) && !item.group.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [pickerCatalog, pickerActivity, pickerSearch]);

  const safeStageIdx = Math.min(activeStageIdx, Math.max(0, compStages.length - 1));
  const currentCompStage = compStages[safeStageIdx];
  const nonEmptyCompStages = compStages.filter((st) => st.tasks.length > 0);
  const totalCompTasks = compStages.reduce((sum, st) => sum + st.tasks.length, 0);

  const compForecast = useMemo(
    () =>
      calculateRoadmapForecast({
        totalStages: Math.max(1, nonEmptyCompStages.length),
        completedCount: 0,
        startDate: compStartDate,
        studyWeekdays: compWeekdays,
        todayKey,
      }),
    [nonEmptyCompStages.length, compStartDate, compWeekdays, todayKey],
  );

  const aiGeneratedPrompt = useMemo(
    () =>
      buildAiRoadmapPrompt({
        topic: aiTopic,
        level: aiLevel,
        stageCount: aiStagesCount,
        dailyMinutesTarget: aiMinutes,
        includeVocab: aiIncludeVocab,
        includeGrammar: aiIncludeGrammar,
        includeKanji: aiIncludeKanji,
        includeQuizzes: aiIncludeQuizzes,
        vocabPerStage: 6,
        quizzesPerStage: 5,
      }),
    [
      aiTopic,
      aiLevel,
      aiStagesCount,
      aiMinutes,
      aiIncludeVocab,
      aiIncludeGrammar,
      aiIncludeKanji,
      aiIncludeQuizzes,
    ],
  );

  const aiParsed = useMemo(() => {
    if (!aiPasteText.trim()) return null;
    return parseAndValidateRoadmapJson(aiPasteText, {
      levelFallback: aiLevel,
      textbookId: resolveActiveVocabTextbook(aiLevel, userId).id,
      todayKey,
      catalog: pickerCatalog,
    });
  }, [aiPasteText, aiLevel, userId, todayKey, pickerCatalog]);

  const quickForecast = useMemo(
    () =>
      calculateRoadmapForecast({
        totalStages:
          quickConfig.totalStages +
          (quickConfig.level === 'N5' && quickConfig.includeKanaStarter ? 5 : 0),
        completedCount: 0,
        startDate: quickConfig.startDate,
        studyWeekdays: quickConfig.studyWeekdays,
        todayKey,
      }),
    [quickConfig, todayKey],
  );

  const handleCopy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: msg, tone: 'success' });
    } catch {
      toast({ title: 'Hãy chọn văn bản và nhấn Ctrl+C để sao chép.', tone: 'warning' });
    }
  };

  // --- MY LIBRARY: TOGGLE EXISTING CUSTOM LESSON INTO ACTIVE STAGE ---
  const buildStageTaskFromStudioLesson = (lesson: CustomLesson): StageTask => {
    const meta = getLessonCategoryMeta(lesson);
    const count = getLessonItemCount(lesson);
    return {
      id: `comp-my-${lesson.id}-${Date.now().toString(36)}`,
      title: `${lesson.title} (${count} ${meta.unitWord})`,
      subtitle:
        lesson.kind === 'quiz'
          ? `Bộ ${meta.label} tự tạo (${count} câu) — chấm điểm & giải thích ngay.`
          : `Bài ${meta.label} từ Kho bài của tôi (${count} ${meta.unitWord}).`,
      skill: meta.skill,
      minutes: Math.max(3, Math.min(12, Math.ceil(count * 0.7))),
      to: `/studio?lesson=${encodeURIComponent(lesson.id)}`,
      isCustomAdded: true,
    };
  };

  const handleToggleMyLessonInStage = (lesson: CustomLesson) => {
    if (!currentCompStage) return;
    const lessonUrl = `/studio?lesson=${encodeURIComponent(lesson.id)}`;
    setCompStages((prev) =>
      prev.map((st, idx) => {
        if (idx !== safeStageIdx) return st;
        const exists = st.tasks.some((t) => t.to === lessonUrl);
        if (exists) {
          return { ...st, tasks: st.tasks.filter((t) => t.to !== lessonUrl) };
        }
        return { ...st, tasks: [...st.tasks, buildStageTaskFromStudioLesson(lesson)] };
      }),
    );
  };

  // --- MY LIBRARY: CREATE NEW REUSABLE LESSON WITH CATEGORY ---
  const handleToggleAppPresetInStage = (preset: CurriculumTaskPreset) => {
    if (!currentCompStage) return;
    setCompStages((prev) =>
      prev.map((st, idx) => {
        if (idx !== safeStageIdx) return st;
        const exists = st.tasks.some((t) => t.to === preset.to && t.title === preset.title);
        if (exists) {
          return {
            ...st,
            tasks: st.tasks.filter((t) => !(t.to === preset.to && t.title === preset.title)),
          };
        }
        const nextTask: StageTask = {
          id: `comp-${st.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          title: preset.title,
          subtitle: preset.subtitle,
          skill: preset.skill,
          minutes: preset.minutes,
          to: preset.to,
          isCustomAdded: true,
        };
        return { ...st, tasks: [...st.tasks, nextTask] };
      }),
    );
  };

  const handleSaveComposerRoadmap = () => {
    if (nonEmptyCompStages.length === 0) {
      toast({
        title: 'Hãy thêm ít nhất 1 bài từ Kho bài của tôi hoặc Kho bài của App vào một Buổi!',
        tone: 'warning',
      });
      return;
    }

    const overrides: Record<number, CustomStageOverride> = {};
    const usedSkills = new Set<StageSkill>();
    nonEmptyCompStages.forEach((st, idx) => {
      st.tasks.forEach((t) => usedSkills.add(t.skill));
      overrides[idx + 1] = {
        title: st.title.trim() || `Buổi ${idx + 1}`,
        theme: `Buổi ${idx + 1}/${nonEmptyCompStages.length} · Lộ trình tự ghép`,
        extraTasks: st.tasks,
        replaceBaseTasks: true,
      };
    });

    const cleanName = compName.trim() || `Lộ trình riêng · ${pickerLevel}`;
    const config: CustomRoadmapConfig = {
      ...(editingConfig ?? {}),
      id: editingConfig?.id || `custom-comp-${Date.now().toString(36)}`,
      name: cleanName,
      level: pickerLevel,
      textbookId: effectivePickerBookId,
      startDate: compStartDate || todayKey,
      dailyMinutesTarget: compMinutes,
      totalStages: nonEmptyCompStages.length,
      studyWeekdays: compWeekdays.length > 0 ? compWeekdays : [1, 2, 3, 4, 5, 6, 0],
      skills: usedSkills.size > 0 ? Array.from(usedSkills) : ['vocab', 'quiz'],
      reminderTime: compReminderTime || '20:00',
      repeatIntervalMinutes: compRepeatMinutes,
      notificationsEnabled: compNotificationsEnabled,
      stageOverrides: overrides,
      chunkTitles: { ...(editingConfig?.chunkTitles ?? {}), 1: cleanName },
      authorName: editingConfig?.authorName || 'Tự ghép từ Kho bài riêng & Kho App',
      includeKanaStarter: editingConfig ? Boolean(editingConfig.includeKanaStarter) : false,
    };

    onCommitRoadmap({ config, lessons: [] });
    setCompStages(createInitialComposerStages());
    setActiveStageIdx(0);
    setComposerStep('content');
    onClose();
  };

  const handleSaveAiRoadmap = () => {
    if (!aiParsed || !aiParsed.ok) return;
    onCommitRoadmap({ config: aiParsed.config, lessons: aiParsed.lessons });
    setAiPasteText('');
    onClose();
  };

  const handleSaveQuickRoadmap = () => {
    const clean: CustomRoadmapConfig = {
      ...quickConfig,
      id: `custom-quick-${Date.now().toString(36)}`,
      name: quickConfig.name.trim() || `Lộ trình ${quickConfig.level}`,
      studyWeekdays:
        quickConfig.studyWeekdays.length > 0
          ? quickConfig.studyWeekdays
          : [1, 2, 3, 4, 5, 6, 0],
      skills:
        quickConfig.skills.length > 0 ? quickConfig.skills : ['vocab', 'quiz', 'review'],
    };
    onCommitRoadmap({ config: clean, lessons: [] });
    onClose();
  };

  const handleReadFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAiPasteText(typeof reader.result === 'string' ? reader.result : '');
      toast({ title: `Đã mở file "${file.name}"`, tone: 'info' });
    };
    reader.readAsText(file, 'utf-8');
    ev.target.value = '';
  };

  const modalTitle =
    mode === 'choose'
      ? 'Tạo lộ trình'
      : mode === 'composer'
        ? isEditing
          ? 'Sửa lộ trình'
          : 'Tự ghép bài'
        : mode === 'ai'
          ? 'Nhờ AI soạn'
          : 'Theo bài có sẵn';

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={modalTitle}
      footer={
        mode === 'choose' ? (
          <Button type="button" variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        ) : mode === 'composer' ? (
          composerStep === 'content' ? (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={totalCompTasks === 0}
                rightIcon={<ArrowRight className="size-4" aria-hidden />}
                onClick={() => setComposerStep('schedule')}
              >
                Tiếp tục ({totalCompTasks} bài)
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                leftIcon={<ArrowLeft className="size-4" aria-hidden />}
                onClick={() => setComposerStep('content')}
              >
                Quay lại
              </Button>
              <Button
                type="button"
                variant="primary"
                leftIcon={<Sparkles className="size-4" aria-hidden />}
                onClick={handleSaveComposerRoadmap}
              >
                {isEditing ? 'Lưu' : 'Tạo lộ trình'}
              </Button>
            </>
          )
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              leftIcon={<ArrowLeft className="size-4" aria-hidden />}
              onClick={() => setMode('choose')}
            >
              Quay lại
            </Button>
            {mode === 'ai' && (
              <Button
                type="button"
                variant="primary"
                disabled={!aiParsed || !aiParsed.ok}
                leftIcon={<Sparkles className="size-4" aria-hidden />}
                onClick={handleSaveAiRoadmap}
              >
                Tạo lộ trình
              </Button>
            )}
            {mode === 'quick' && (
              <Button
                type="button"
                variant="primary"
                leftIcon={<Sparkles className="size-4" aria-hidden />}
                onClick={handleSaveQuickRoadmap}
              >
                Tạo lộ trình
              </Button>
            )}
          </>
        )
      }
    >
      {/* STEP 0: pick a way */}
      {mode === 'choose' && (
        <div className="grid gap-2">
          {(
            [
              {
                key: 'quick',
                icon: <Zap className="size-5" aria-hidden />,
                title: 'Theo bài có sẵn',
                hint: 'Chọn trình độ và thời gian học mỗi ngày.',
                go: () => setMode('quick'),
              },
              {
                key: 'composer',
                icon: <PenLine className="size-5" aria-hidden />,
                title: 'Tự ghép bài',
                hint: 'Chọn bài cho từng buổi.',
                go: () => {
                  setComposerStep('content');
                  setMode('composer');
                },
              },
              {
                key: 'ai',
                icon: <Wand2 className="size-5" aria-hidden />,
                title: 'Nhờ AI soạn',
                hint: 'Dùng ChatGPT hoặc Gemini.',
                go: () => setMode('ai'),
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={opt.go}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-3 text-left transition-colors hover:border-primary hover:bg-primary-soft/30"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-fg">
                {opt.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-fg">{opt.title}</span>
                <span className="block text-xs text-muted">{opt.hint}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {/* FLOW A: 2-STEP COMPOSER */}
      {mode === 'composer' && currentCompStage && (
        <div className="space-y-4">
          {/* Crisp 2-Step Progress Indicator */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setComposerStep('content')}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors',
                composerStep === 'content'
                  ? 'border-primary bg-primary-soft/60 text-primary-fg'
                  : 'border-success-line bg-success-soft/30 text-success-fg',
              )}
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-on-primary">
                1
              </span>
              <span className="truncate">Chọn bài</span>
            </button>
            <button
              type="button"
              disabled={totalCompTasks === 0}
              onClick={() => totalCompTasks > 0 && setComposerStep('schedule')}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors',
                composerStep === 'schedule'
                  ? 'border-primary bg-primary-soft/60 text-primary-fg'
                  : totalCompTasks > 0
                    ? 'cursor-pointer border-line bg-surface-2/60 text-fg hover:border-primary/50'
                    : 'cursor-not-allowed border-line bg-surface-2/30 text-muted opacity-65',
              )}
            >
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                  composerStep === 'schedule'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface text-muted ring-1 ring-line',
                )}
              >
                2
              </span>
              <span className="truncate">Đặt lịch</span>
            </button>
          </div>

          {/* STEP 1: CONTENT FIRST (VISUAL STAGE CHAIN + MY QUIZZES BY ROLE + APP LIBRARY) */}
          {composerStep === 'content' ? (
            <div className="space-y-3">
              {/* Visual Connected Stage Chain */}
              <div className="flex flex-wrap items-center gap-1.5">
                {compStages.map((st, idx) => {
                  const active = idx === safeStageIdx;
                  return (
                    <React.Fragment key={st.id}>
                      {idx > 0 && (
                        <ArrowRight className="size-3.5 shrink-0 text-muted" aria-hidden />
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveStageIdx(idx)}
                        className={cn(
                          'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
                          active
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-line bg-surface text-fg hover:border-primary/60',
                        )}
                      >
                        <span>Buổi {idx + 1}</span>
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0 text-[10px] tabular',
                            active ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-2 text-muted',
                          )}
                        >
                          {st.tasks.length}
                        </span>
                      </button>
                    </React.Fragment>
                  );
                })}
                {compStages.length < 30 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="soft"
                    leftIcon={<Plus className="size-3.5" aria-hidden />}
                    onClick={() => {
                      const nextNum = compStages.length + 1;
                      setCompStages((prev) => [
                        ...prev,
                        { id: `cs-${Date.now()}`, title: `Buổi ${nextNum}`, tasks: [] },
                      ]);
                      setActiveStageIdx(compStages.length);
                    }}
                  >
                    Thêm buổi
                  </Button>
                )}
              </div>

              {/* Active Stage Box */}
              <div className="space-y-3 rounded-xl border border-line bg-surface p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    aria-label="Tên buổi học"
                    value={currentCompStage.title}
                    onChange={(e) =>
                      setCompStages((prev) =>
                        prev.map((st, idx) =>
                          idx === safeStageIdx ? { ...st, title: e.target.value } : st,
                        ),
                      )
                    }
                    placeholder={`Đặt tên cho Buổi ${safeStageIdx + 1}...`}
                    className="flex-1"
                  />
                  {compStages.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      leftIcon={<Trash2 className="size-3.5 text-danger-fg" aria-hidden />}
                      onClick={() => {
                        setCompStages((prev) => prev.filter((_, idx) => idx !== safeStageIdx));
                        setActiveStageIdx((i) => Math.max(0, i - 1));
                      }}
                    >
                      Xóa buổi
                    </Button>
                  )}
                </div>

                {/* Selected Tasks inside this Buổi */}
                {currentCompStage.tasks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted">
                    Chưa có bài. Chọn bài ở danh sách bên dưới.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {currentCompStage.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2/60 px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <Badge tone={STAGE_SKILL_META[task.skill].tone}>
                            {STAGE_SKILL_META[task.skill].label}
                          </Badge>
                          <span className="truncate font-semibold text-fg">{task.title}</span>
                        </div>
                        <button
                          type="button"
                          aria-label={`Bỏ ${task.title}`}
                          onClick={() =>
                            setCompStages((prev) =>
                              prev.map((st, idx) =>
                                idx === safeStageIdx
                                  ? { ...st, tasks: st.tasks.filter((t) => t.id !== task.id) }
                                  : st,
                              ),
                            )
                          }
                          className="shrink-0 cursor-pointer rounded p-1 text-muted hover:text-danger-fg"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Two Equal Content Sources: MY LIBRARY vs APP LIBRARY */}
                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={sourceTab === 'my-library' ? 'primary' : 'secondary'}
                    leftIcon={<Star className="size-3.5" aria-hidden />}
                    onClick={() => setSourceTab('my-library')}
                  >
                    Bài của tôi ({studioLessons.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={sourceTab === 'app-library' ? 'primary' : 'secondary'}
                    leftIcon={<BookOpen className="size-3.5" aria-hidden />}
                    onClick={() => setSourceTab('app-library')}
                  >
                    Bài có sẵn
                  </Button>
                </div>

                {/* SOURCE 1: MY LIBRARY (FILTERED BY ROLE: Từ vựng, Chữ Hán, Ngữ pháp, Đọc hiểu, Nghe hiểu, Tổng hợp) */}
                {sourceTab === 'my-library' ? (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="soft"
                        leftIcon={<Plus className="size-3.5" aria-hidden />}
                        onClick={() => setQuizEditor({ lesson: null })}
                      >
                        Tạo quiz mới
                      </Button>
                    </div>

                    {/* Reusable My Library Cards (Same clean card style as App Library!) */}
                    {studioLessons.length === 0 ? (
                      <div className="space-y-2 rounded-xl border border-dashed border-line bg-surface-2/35 p-4 text-center">
                        <p className="text-xs text-muted">Bạn chưa có bài tự tạo.</p>
                      </div>
                    ) : (
                      <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                        {studioLessons.map((lesson) => {
                          const meta = getLessonCategoryMeta(lesson);
                          const count = getLessonItemCount(lesson);
                          const lessonUrl = `/studio?lesson=${encodeURIComponent(lesson.id)}`;
                          const added = currentCompStage.tasks.some((t) => t.to === lessonUrl);
                          return (
                            <div
                              key={lesson.id}
                              className={cn(
                                'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors',
                                added
                                  ? 'border-success-line bg-success-soft/30'
                                  : 'border-line bg-surface-2/40 hover:border-primary/50',
                              )}
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge tone={meta.tone}>{meta.label}</Badge>
                                  <span className="font-semibold text-fg">
                                    {lesson.title} ({count} {meta.unitWord})
                                  </span>
                                </div>
                                <p className="truncate text-[11px] text-muted">
                                  JLPT {lesson.level}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-0.5">
                                <IconButton
                                  size="sm"
                                  aria-label={`Xem chi tiết ${lesson.title}`}
                                  title="Xem chi tiết"
                                  onClick={() => setDetail(describeCustomLesson(lesson))}
                                >
                                  <Eye className="size-4" aria-hidden />
                                </IconButton>
                                {lesson.kind === 'quiz' ? (
                                  <IconButton
                                    size="sm"
                                    aria-label={`Sửa ${lesson.title}`}
                                    title="Sửa"
                                    onClick={() => setQuizEditor({ lesson })}
                                  >
                                    <PenLine className="size-4" aria-hidden />
                                  </IconButton>
                                ) : (
                                  <a
                                    href={`#/studio?lesson=${encodeURIComponent(lesson.id)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Sửa ${lesson.title} (mở tab mới)`}
                                    title="Sửa ở trang Tự tạo bài (tab mới)"
                                    className="grid size-8 place-items-center rounded-lg text-muted hover:bg-primary-soft hover:text-primary-fg"
                                  >
                                    <PenLine className="size-4" aria-hidden />
                                  </a>
                                )}
                                <IconButton
                                  size="sm"
                                  aria-label={`Xóa ${lesson.title}`}
                                  title="Xóa"
                                  onClick={() => setLessonToDelete(lesson)}
                                >
                                  <Trash2 className="size-4 text-danger-fg" aria-hidden />
                                </IconButton>
                              <Button
                                type="button"
                                size="sm"
                                variant={added ? 'secondary' : 'soft'}
                                leftIcon={
                                  added ? (
                                    <Check className="size-3.5 text-success-fg" aria-hidden />
                                  ) : (
                                    <Plus className="size-3.5" aria-hidden />
                                  )
                                }
                                onClick={() => handleToggleMyLessonInStage(lesson)}
                              >
                                {added ? 'Đã thêm' : 'Thêm'}
                              </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* SOURCE 2: APP LIBRARY */
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                      <div className="sm:col-span-3">
                        <Select
                          aria-label="Chọn cấp độ giáo trình"
                          value={pickerLevel}
                          onChange={(e) => {
                            const nextLvl = e.target.value as StudyLevel;
                            setPickerLevel(nextLvl);
                            setPickerBookId(resolveActiveVocabTextbook(nextLvl, userId).id);
                          }}
                        >
                          {LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              JLPT {lvl}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="sm:col-span-4">
                        <Select
                          aria-label="Loại bài tập"
                          value={pickerActivity}
                          onChange={(e) => setPickerActivity(e.target.value as AppActivityFilter)}
                        >
                          {APP_ACTIVITY_FILTERS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.value === 'all' ? 'Mọi loại bài' : f.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="sm:col-span-5">
                        <Input
                          aria-label="Tìm bài học"
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder="Tìm bài..."
                        />
                      </div>
                    </div>

                    <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                      {filteredCatalog.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted">
                          Không có bài phù hợp.
                        </p>
                      ) : (
                        filteredCatalog.map((preset) => {
                          const added = currentCompStage.tasks.some(
                            (t) => t.to === preset.to && t.title === preset.title,
                          );
                          const displayBadge = getPresetDisplayBadge(preset);
                          return (
                            <div
                              key={preset.key}
                              className={cn(
                                'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors',
                                added
                                  ? 'border-success-line bg-success-soft/30'
                                  : 'border-line bg-surface-2/40 hover:border-primary/50',
                              )}
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge tone={displayBadge.tone}>{displayBadge.label}</Badge>
                                  <span className="font-semibold text-fg">{preset.title}</span>
                                </div>
                                <p className="truncate text-[11px] text-muted">{preset.group}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-0.5">
                                <IconButton
                                  size="sm"
                                  aria-label={`Xem chi tiết ${preset.title}`}
                                  title="Xem chi tiết"
                                  onClick={() => setDetail(describeCatalogLesson(preset, pickerLevel, cmsSnapshot))}
                                >
                                  <Eye className="size-4" aria-hidden />
                                </IconButton>
                              <Button
                                type="button"
                                size="sm"
                                variant={added ? 'secondary' : 'soft'}
                                leftIcon={
                                  added ? (
                                    <Check className="size-3.5 text-success-fg" aria-hidden />
                                  ) : (
                                    <Plus className="size-3.5" aria-hidden />
                                  )
                                }
                                onClick={() => handleToggleAppPresetInStage(preset)}
                              >
                                {added ? 'Đã thêm' : 'Thêm'}
                              </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STEP 2: SCHEDULE (NAME, START DATE, TIME, WEEKDAYS) */
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Tên lộ trình" htmlFor="comp-step2-name">
                  <Input
                    id="comp-step2-name"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    placeholder="VD: Ôn thi N5 · Quiz & Từ vựng riêng"
                  />
                </Field>
                <Field label="Ngày bắt đầu học" htmlFor="comp-step2-date">
                  <Input
                    id="comp-step2-date"
                    type="date"
                    value={compStartDate}
                    onChange={(e) => setCompStartDate(e.target.value || todayKey)}
                  />
                </Field>
                <Field label="Phút mỗi ngày" htmlFor="comp-step2-minutes">
                  <Select
                    id="comp-step2-minutes"
                    value={compMinutes}
                    onChange={(e) => setCompMinutes(Number(e.target.value) as DailyMinutesTarget)}
                  >
                    {MINUTE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} phút / ngày
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Giờ nhắc" htmlFor="comp-step2-time">
                  <div className="flex gap-2">
                    <Input
                      id="comp-step2-time"
                      type="time"
                      value={compReminderTime}
                      onChange={(e) => setCompReminderTime(e.target.value || '20:00')}
                      className="flex-1"
                    />
                    <div className="w-28">
                      <Select
                        aria-label="Chu kỳ nhắc lặp"
                        value={compRepeatMinutes}
                        onChange={(e) =>
                          setCompRepeatMinutes(Number(e.target.value) as RepeatMinutesOption)
                        }
                      >
                        {REPEAT_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            Lặp {r}p
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </Field>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-fg">Ngày học</span>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAY_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setCompWeekdays([...p.days])}
                        className="cursor-pointer rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-muted hover:border-primary hover:text-primary-fg"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS_ORDERED.map((d) => {
                    const active = compWeekdays.includes(d.day);
                    return (
                      <Chip
                        key={d.day}
                        selected={active}
                        onClick={() => {
                          const next = active
                            ? compWeekdays.filter((x) => x !== d.day)
                            : [...compWeekdays, d.day];
                          if (next.length > 0) setCompWeekdays(next);
                        }}
                      >
                        {d.shortLabel}
                      </Chip>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
                <p className="text-sm font-medium text-fg">Nhắc học</p>
                <div className="flex gap-1.5">
                  <Chip
                    selected={compNotificationsEnabled}
                    onClick={() => setCompNotificationsEnabled(true)}
                  >
                    Bật
                  </Chip>
                  <Chip
                    selected={!compNotificationsEnabled}
                    onClick={() => setCompNotificationsEnabled(false)}
                  >
                    Tắt
                  </Chip>
                </div>
              </div>

              <Notice tone="info">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>
                    Dự kiến hoàn thành:{' '}
                    <strong className="text-fg">{compForecast.estimatedCompletionLabel}</strong>
                  </span>
                  <span className="text-muted tabular">
                    {nonEmptyCompStages.length} buổi · {compWeekdays.length} ngày/tuần ·{' '}
                    {compNotificationsEnabled ? `Nhắc lúc ${compReminderTime}` : 'Tắt thông báo'}
                  </span>
                </div>
              </Notice>
            </div>
          )}
        </div>
      )}

      {/* FLOW B: SIMPLE 2-STEP CHATGPT / GEMINI HELPER (ZERO JSON JARGON) */}
      {mode === 'ai' && (
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-line bg-surface-2/45 p-3.5">
            <div className="flex items-center gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-on-primary">
                1
              </span>
              <h3 className="text-sm font-bold text-fg">
                Gửi yêu cầu cho AI
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <Field label="Chủ đề" htmlFor="wiz-ai-topic">
                  <Input
                    id="wiz-ai-topic"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="VD: Tiếng Nhật quán ăn, IT BrSE, ôn Minna Bài 8–12..."
                  />
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field label="Trình độ" htmlFor="wiz-ai-level">
                  <Select
                    id="wiz-ai-level"
                    value={aiLevel}
                    onChange={(e) => setAiLevel(e.target.value as StudyLevel)}
                  >
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        JLPT {lvl}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field label="Số buổi" htmlFor="wiz-ai-stages">
                  <Select
                    id="wiz-ai-stages"
                    value={aiStagesCount}
                    onChange={(e) => setAiStagesCount(Number(e.target.value))}
                  >
                    {AI_STAGE_COUNTS.map((n) => (
                      <option key={n} value={n}>
                        {n} buổi
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted">Mỗi buổi gồm:</span>
              <Chip selected={aiIncludeVocab} onClick={() => setAiIncludeVocab((v) => !v)}>
                Từ vựng
              </Chip>
              <Chip selected={aiIncludeGrammar} onClick={() => setAiIncludeGrammar((v) => !v)}>
                Ngữ pháp
              </Chip>
              <Chip selected={aiIncludeKanji} onClick={() => setAiIncludeKanji((v) => !v)}>
                Chữ Hán
              </Chip>
              <Chip selected={aiIncludeQuizzes} onClick={() => setAiIncludeQuizzes((v) => !v)}>
                Quiz 4 đáp án
              </Chip>
              <div className="ml-auto w-36">
                <Select
                  aria-label="Thời lượng mỗi ngày"
                  value={aiMinutes}
                  onChange={(e) => setAiMinutes(Number(e.target.value) as DailyMinutesTarget)}
                  className="h-8 text-xs"
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}p / ngày
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<ClipboardCopy className="size-4" aria-hidden />}
                onClick={() =>
                  void handleCopy(
                    aiGeneratedPrompt,
                    'Đã copy yêu cầu! Bây giờ dán vào ChatGPT hoặc Gemini rồi copy câu trả lời về Bước 2.',
                  )
                }
              >
                Copy yêu cầu
              </Button>
              <a
                href="https://chatgpt.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:border-primary hover:text-primary-fg"
              >
                Mở ChatGPT
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
              <a
                href="https://gemini.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:border-primary hover:text-primary-fg"
              >
                Mở Gemini
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
              <button
                type="button"
                onClick={() => setShowRawPrompt((v) => !v)}
                className="ml-auto cursor-pointer text-xs font-medium text-muted underline-offset-2 hover:text-fg hover:underline"
              >
                {showRawPrompt ? 'Ẩn câu lệnh mẫu' : 'Xem yêu cầu'}
              </button>
            </div>

            {showRawPrompt && (
              <Textarea
                readOnly
                rows={5}
                value={aiGeneratedPrompt}
                className="font-mono text-xs"
              />
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-line bg-surface-2/45 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-on-primary">
                  2
                </span>
                <h3 className="text-sm font-bold text-fg">
                  Dán câu trả lời
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  leftIcon={<Wand2 className="size-3.5" aria-hidden />}
                  onClick={() => {
                    setAiPasteText(SAMPLE_AI_ROADMAP_JSON);
                    toast({
                      title: 'Đã nạp thử mẫu 3 buổi Quán ăn N5 — bấm "Tạo & Học ngay" để trải nghiệm!',
                      tone: 'success',
                    });
                  }}
                >
                  Dùng thử mẫu
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  leftIcon={<Upload className="size-3.5" aria-hidden />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Mở file
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json,text/plain"
                  onChange={handleReadFile}
                  className="hidden"
                />
              </div>
            </div>

            <Textarea
              id="wiz-ai-paste"
              rows={4}
              value={aiPasteText}
              onChange={(e) => setAiPasteText(e.target.value)}
              placeholder="Dán câu trả lời của AI vào đây"
              className="text-xs leading-relaxed"
            />

            {aiParsed && !aiParsed.ok && (
              <Notice tone="warning">
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-fg">
                    Kết quả AI dán vào đang thiếu vài chỗ ({aiParsed.errors.length} lỗi):
                  </p>
                  <ul className="list-disc space-y-0.5 pl-4 text-muted">
                    {aiParsed.errors.slice(0, 4).map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                  {aiParsed.fixPrompt && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      leftIcon={<ClipboardCopy className="size-3.5" aria-hidden />}
                      onClick={() =>
                        void handleCopy(
                          aiParsed.fixPrompt,
                          'Đã copy câu nhắc — gửi lại cho AI để sửa tự động nhé!',
                        )
                      }
                    >
                      Copy câu nhắc để AI sửa giúp
                    </Button>
                  )}
                </div>
              </Notice>
            )}

            {aiParsed && aiParsed.ok && (
              <div className="space-y-2.5 rounded-xl border border-success-line bg-success-soft/30 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="success">
                    <CheckCircle2 className="mr-1 inline size-3" aria-hidden />
                    Sẵn sàng học ngay!
                  </Badge>
                  <Badge tone="primary">JLPT {aiParsed.preview.level}</Badge>
                  <Badge tone="neutral" className="tabular">
                    {aiParsed.preview.stageCount} buổi · {aiParsed.preview.totalVocab} từ ·{' '}
                    {aiParsed.preview.totalQuizzes} câu Quiz
                  </Badge>
                </div>
                <p className="text-sm font-bold text-fg">{aiParsed.preview.name}</p>
                <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                  {aiParsed.preview.stages.map((st) => (
                    <div
                      key={st.stageNumber}
                      className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs"
                    >
                      <span className="truncate font-semibold text-fg">
                        Buổi {st.stageNumber}: {st.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted tabular">
                        {[
                          st.vocabCount > 0 ? `${st.vocabCount} từ` : null,
                          st.grammarCount > 0 ? `${st.grammarCount} ngữ pháp` : null,
                          st.quizCount > 0 ? `${st.quizCount} quiz` : null,
                          st.appTaskCount > 0 ? `${st.appTaskCount} bài App` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOW C: QUICK TEXTBOOK SCHEDULE OR COMMUNITY GALLERY */}
      {mode === 'quick' && (
        <div className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_6.5rem] gap-2">
                <Field label="Tên lộ trình" htmlFor="wiz-quick-name">
                  <Input
                    id="wiz-quick-name"
                    value={quickConfig.name}
                    onChange={(e) => setQuickConfig({ ...quickConfig, name: e.target.value })}
                  />
                </Field>
                <Field label="Trình độ" htmlFor="wiz-quick-level">
                  <Select
                    id="wiz-quick-level"
                    value={quickConfig.level}
                    onChange={(e) => {
                      const nextLvl = e.target.value as StudyLevel;
                      const nextBook = resolveActiveVocabTextbook(nextLvl, userId);
                      setQuickConfig({
                        ...quickConfig,
                        level: nextLvl,
                        textbookId: nextBook.id,
                        totalStages: getRecommendedFixedStageCount(
                          nextLvl,
                          nextBook.id,
                          quickConfig.dailyMinutesTarget,
                        ),
                        name: `Lộ trình ${nextLvl}`,
                      });
                    }}
                  >
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <SchedulePicker
                idPrefix="wiz-quick"
                minutes={quickConfig.dailyMinutesTarget}
                onMinutesChange={(minutes) =>
                  setQuickConfig({
                    ...quickConfig,
                    dailyMinutesTarget: minutes,
                    totalStages: getStageCountForDailyMinutes(minutes) as TotalStagesOption,
                  })
                }
                startDate={quickConfig.startDate}
                onStartDateChange={(date) => setQuickConfig({ ...quickConfig, startDate: date })}
                weekdays={quickConfig.studyWeekdays}
                onWeekdaysChange={(days) => setQuickConfig({ ...quickConfig, studyWeekdays: days })}
              />

              <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-fg">
                {quickConfig.totalStages} buổi · xong {quickForecast.estimatedCompletionLabel}
              </p>
            </div>
        </div>
      )}
    </Modal>

    <LessonDetailModal detail={detail} onClose={() => setDetail(null)} />

    <CreateQuizModal
      open={open && Boolean(quizEditor)}
      editingLesson={quizEditor?.lesson ?? null}
      defaultLevel={pickerLevel}
      onClose={() => setQuizEditor(null)}
      onSaveQuiz={(lesson) => {
        onSaveStudioLesson(lesson);
        // keep sessions that already contain this quiz in step with its new name
        const url = `/studio?lesson=${encodeURIComponent(lesson.id)}`;
        setCompStages((prev) =>
          prev.map((st) => ({
            ...st,
            tasks: st.tasks.map((t) => (t.to === url ? { ...t, title: lesson.title } : t)),
          })),
        );
        toast({ title: `Đã lưu "${lesson.title}"`, tone: 'success' });
      }}
    />

    <Modal
      open={open && Boolean(lessonToDelete)}
      onClose={() => setLessonToDelete(null)}
      size="sm"
      title="Xóa bài này?"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => setLessonToDelete(null)}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (!lessonToDelete) return;
              const url = `/studio?lesson=${encodeURIComponent(lessonToDelete.id)}`;
              setCompStages((prev) =>
                prev.map((st) => ({ ...st, tasks: st.tasks.filter((t) => t.to !== url) })),
              );
              onDeleteStudioLesson(lessonToDelete.id);
              setLessonToDelete(null);
            }}
          >
            Xóa
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg">{lessonToDelete?.title}</p>
      <p className="mt-1 text-xs text-muted">Bài sẽ bị gỡ khỏi các buổi đang dùng nó.</p>
    </Modal>
    </>
  );
};
