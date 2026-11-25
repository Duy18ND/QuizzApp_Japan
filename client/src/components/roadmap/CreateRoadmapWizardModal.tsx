import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FolderPlus,
  PenLine,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';
import {
  Badge,
  Button,
  Chip,
  Field,
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
  parseBulkVocabText,
  resolveLessonRole,
  type CustomLesson,
  type CustomLessonKind,
  type CustomLessonRole,
  type CustomQuizEntry,
} from '../../services/customStudioService';
import {
  ALL_DAYS_ORDERED,
} from '../../services/notificationService';
import {
  buildCurriculumTaskCatalog,
  calculateRoadmapForecast,
  createDefaultCustomConfig,
  DAILY_PACE_PRESETS,
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
  buildConfigFromCommunityEntry,
  COMMUNITY_ROADMAP_GALLERY,
  ROADMAP_QUICK_TEMPLATES,
  type CommunityRoadmapEntry,
  type RoadmapQuickTemplate,
} from '../../data/roadmapTemplates';
import {
  getVocabTextbooksForLevel,
  resolveActiveVocabTextbook,
} from '../../data/vocabTextbooks';
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
  onRequestCreateQuiz?: () => void;
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

type MyLibraryRoleFilter = 'all' | CustomLessonRole;

const MY_LIBRARY_ROLE_FILTERS: ReadonlyArray<{ value: MyLibraryRoleFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'vocab', label: 'Từ vựng' },
  { value: 'kanji', label: 'Chữ Hán' },
  { value: 'grammar', label: 'Ngữ pháp' },
  { value: 'reading', label: 'Đọc hiểu' },
  { value: 'listening', label: 'Nghe hiểu' },
  { value: 'mixed', label: 'Tổng hợp' },
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

function createEmptyQuizRow(idx: number): CustomQuizEntry {
  return {
    id: `wiz-q-${Date.now()}-${idx}`,
    prompt: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  };
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
  onRequestCreateQuiz,
  onCommitRoadmap,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isEditing = Boolean(editingConfig);

  const [mode, setMode] = useState<WizardInitialMode>(initialMode);
  const [wasOpen, setWasOpen] = useState(false);

  // --- FLOW A: 2-STEP COMPOSER (STEP 1: MY LIBRARY + APP LIBRARY -> STEP 2: SCHEDULE) ---
  const [composerStep, setComposerStep] = useState<'content' | 'schedule'>('content');
  const [compStages, setCompStages] = useState<ComposerStageDraft[]>(createInitialComposerStages);
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [sourceTab, setSourceTab] = useState<'my-library' | 'app-library'>('my-library');

  // My Library filter & inline Quick Creator (creates reusable CustomLesson with Role)
  const [myRoleFilter, setMyRoleFilter] = useState<MyLibraryRoleFilter>('all');
  const [creatingInLibrary, setCreatingInLibrary] = useState(false);
  const [newItemCategory, setNewItemCategory] = useState<CustomLessonKind>('quiz');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemLevel, setNewItemLevel] = useState<StudyLevel>(defaultLevel);
  const [autoAttachToStage, setAutoAttachToStage] = useState(true);
  const [newQuizRows, setNewQuizRows] = useState<CustomQuizEntry[]>(() => [createEmptyQuizRow(1)]);
  const [newVocabBulkText, setNewVocabBulkText] = useState('');
  const [newGrammarStructure, setNewGrammarStructure] = useState('');
  const [newGrammarMeaning, setNewGrammarMeaning] = useState('');
  const [newGrammarExample, setNewGrammarExample] = useState('');
  const [newKanjiBulkText, setNewKanjiBulkText] = useState('');

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
  const [quickSubTab, setQuickSubTab] = useState<'schedule' | 'community'>('schedule');
  const [quickConfig, setQuickConfig] = useState<CustomRoadmapConfig>(() =>
    createDefaultCustomConfig(defaultLevel, userId, defaultTextbookId, todayKey),
  );
  const [communityFilter, setCommunityFilter] = useState<'ALL' | 'N5' | 'N4' | 'N3'>('ALL');

  // Reset modal view cleanly on open (and pre-fill if editing an existing roadmap)
  if (open && !wasOpen) {
    setWasOpen(true);
    setComposerStep('content');
    setSourceTab('my-library');
    setMyRoleFilter('all');
    setCreatingInLibrary(false);
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
      setNewItemLevel(editingConfig.level);
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
      setNewItemLevel(defaultLevel);
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

  const filteredMyLessons = useMemo(
    () =>
      studioLessons.filter(
        (lesson) => myRoleFilter === 'all' || resolveLessonRole(lesson) === myRoleFilter,
      ),
    [studioLessons, myRoleFilter],
  );

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
  const handleCreateLessonInMyLibrary = () => {
    const cleanTitle = newItemTitle.trim();
    if (!cleanTitle) {
      toast({ title: 'Vui lòng nhập tên bộ bài / bộ Quiz!', tone: 'warning' });
      return;
    }

    const nowIso = new Date().toISOString();
    const lessonId = `cl-my-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    let created: CustomLesson | null = null;

    if (newItemCategory === 'quiz') {
      const cleanQuiz: CustomQuizEntry[] = newQuizRows
        .map((row) => {
          const opts = row.options.map((o) => o.trim()).filter(Boolean);
          return {
            ...row,
            prompt: row.prompt.trim(),
            options: opts,
            correctIndex: Math.max(0, Math.min(opts.length - 1, row.correctIndex)),
            explanation: row.explanation?.trim() || undefined,
          };
        })
        .filter((row) => row.prompt && row.options.length >= 2);

      if (cleanQuiz.length === 0) {
        toast({ title: 'Hãy nhập ít nhất 1 câu hỏi và tối thiểu 2 đáp án!', tone: 'warning' });
        return;
      }
      created = {
        id: lessonId,
        kind: 'quiz',
        title: cleanTitle,
        level: newItemLevel,
        description: `Bộ Quiz tự tạo (${cleanQuiz.length} câu)`,
        quizItems: cleanQuiz,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    } else if (newItemCategory === 'vocab') {
      const parsedVocab = parseBulkVocabText(newVocabBulkText);
      if (parsedVocab.length === 0) {
        toast({
          title: 'Hãy nhập ít nhất 1 dòng theo dạng: Kanji | Hiragana | Nghĩa (VD: 食べる | たべる | Ăn)',
          tone: 'warning',
        });
        return;
      }
      created = {
        id: lessonId,
        kind: 'vocab',
        title: cleanTitle,
        level: newItemLevel,
        description: `Bộ Từ vựng tự tạo (${parsedVocab.length} từ)`,
        vocabItems: parsedVocab,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    } else if (newItemCategory === 'grammar') {
      if (!newGrammarStructure.trim() || !newGrammarMeaning.trim()) {
        toast({ title: 'Hãy nhập cấu trúc ngữ pháp và nghĩa tiếng Việt!', tone: 'warning' });
        return;
      }
      created = {
        id: lessonId,
        kind: 'grammar',
        title: cleanTitle,
        level: newItemLevel,
        description: 'Mẫu ngữ pháp tự tạo',
        grammarItems: [
          {
            id: `g-${Date.now()}`,
            structure: newGrammarStructure.trim(),
            meaning: newGrammarMeaning.trim(),
            exampleJp: newGrammarExample.trim() || undefined,
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    } else {
      const lines = newKanjiBulkText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const parsedKanji = lines
        .map((line, idx) => {
          const parts = line.split(/\t|\s*\|\s*|\s*;\s*/).map((p) => p.trim());
          if (parts.length < 2 || !parts[0]) return null;
          return {
            id: `k-${Date.now()}-${idx}`,
            kanji: parts[0],
            hanViet: parts.length >= 3 ? parts[1].toUpperCase() : '',
            meaning: parts.length >= 3 ? parts[2] : parts[1],
            reading: parts[3] || undefined,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      if (parsedKanji.length === 0) {
        toast({
          title: 'Hãy nhập ít nhất 1 dòng theo dạng: Chữ Hán | Hán Việt | Nghĩa (VD: 食 | THỰC | Ăn)',
          tone: 'warning',
        });
        return;
      }
      created = {
        id: lessonId,
        kind: 'kanji',
        title: cleanTitle,
        level: newItemLevel,
        description: `Bộ Chữ Hán tự tạo (${parsedKanji.length} chữ)`,
        kanjiItems: parsedKanji,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    }

    onSaveStudioLesson(created);

    if (autoAttachToStage && currentCompStage) {
      const task = buildStageTaskFromStudioLesson(created);
      setCompStages((prev) =>
        prev.map((st, idx) =>
          idx === safeStageIdx ? { ...st, tasks: [...st.tasks, task] } : st,
        ),
      );
    }

    // Reset quick form & show it in My Library list
    setNewItemTitle('');
    setNewQuizRows([createEmptyQuizRow(1)]);
    setNewVocabBulkText('');
    setNewGrammarStructure('');
    setNewGrammarMeaning('');
    setNewGrammarExample('');
    setNewKanjiBulkText('');
    setCreatingInLibrary(false);
    setMyRoleFilter('all');
    toast({
      title: autoAttachToStage && currentCompStage
        ? `Đã lưu "${created.title}" vào Kho bài của tôi & thêm vào ${currentCompStage.title}!`
        : `Đã lưu "${created.title}" vào Kho bài của tôi!`,
      tone: 'success',
    });
  };

  // --- APP LIBRARY: TOGGLE PRESET INTO ACTIVE STAGE ---
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

  const handleApplyQuickTemplate = (tpl: RoadmapQuickTemplate) => {
    const nextBook = resolveActiveVocabTextbook(quickConfig.level, userId, quickConfig.textbookId);
    setQuickConfig({
      ...quickConfig,
      name: `${quickConfig.level} · ${tpl.nameSuffix}`,
      textbookId: nextBook.id,
      dailyMinutesTarget: tpl.dailyMinutesTarget,
      totalStages: tpl.totalStages,
      studyWeekdays: [...tpl.studyWeekdays],
      skills: [...tpl.skills],
      includeKanaStarter: quickConfig.level === 'N5' ? Boolean(tpl.includeKanaStarter) : false,
      chunkTitles: tpl.chunkTitles ? { ...tpl.chunkTitles } : {},
    });
    toast({
      title: `Đã chọn mẫu "${tpl.title}" (${tpl.dailyMinutesTarget}p/ngày · ${tpl.totalStages} buổi)`,
      tone: 'info',
    });
  };

  const handlePickCommunity = (entry: CommunityRoadmapEntry) => {
    const config = buildConfigFromCommunityEntry(entry, todayKey);
    onCommitRoadmap({ config, lessons: [] });
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
      ? 'Tạo lộ trình riêng — Chọn cách dễ nhất với bạn'
      : mode === 'composer'
        ? isEditing
          ? composerStep === 'content'
            ? `Sửa lộ trình · Bước 1/2: Sửa & Thêm Buổi / Bài`
            : `Sửa lộ trình · Bước 2/2: Sửa tên & Ngày giờ học`
          : composerStep === 'content'
            ? 'Bước 1/2 · Tạo & Chọn bài vào từng Buổi'
            : 'Bước 2/2 · Đặt tên lộ trình & Ngày giờ học'
        : mode === 'ai'
          ? 'Nhờ ChatGPT / Gemini soạn bài & Quiz hộ'
          : 'Tạo nhanh theo Giáo trình chuẩn & Mẫu sẵn';

  const modalDesc =
    mode === 'choose'
      ? 'Lộ trình riêng chạy tách biệt hoàn toàn, không làm mất tiến độ ở Giáo trình chuẩn.'
      : mode === 'composer'
        ? composerStep === 'content'
          ? 'Tạo bài / Quiz riêng theo danh mục (Category) trong Kho bài của tôi hoặc chọn bài sẵn từ Kho App để gắn vào từng Buổi.'
          : 'Chọn ngày bắt đầu, số phút mỗi ngày, ngày học trong tuần và giờ nhắc học cho lộ trình vừa ghép.'
        : mode === 'ai'
          ? 'Làm đúng 2 bước đơn giản: Copy yêu cầu gửi AI → Dán câu trả lời về là học được ngay.'
          : 'Chọn tốc độ mỗi ngày (10p → 60 buổi · 30p → 30 buổi) hoặc lưu 1 chạm từ Kho Cộng đồng.';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={modalTitle}
      description={modalDesc}
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
                Tiếp tục: Chọn ngày giờ ({totalCompTasks} bài)
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
                Quay lại chọn bài
              </Button>
              <Button
                type="button"
                variant="primary"
                leftIcon={<Sparkles className="size-4" aria-hidden />}
                onClick={handleSaveComposerRoadmap}
              >
                {isEditing ? 'Lưu thay đổi lộ trình' : 'Tạo lộ trình & Học ngay'}
              </Button>
            </>
          )
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              leftIcon={<ArrowLeft className="size-4" aria-hidden />}
              onClick={() => setMode('composer')}
            >
              Về Vẽ lộ trình
            </Button>
            {mode === 'ai' && (
              <Button
                type="button"
                variant="primary"
                disabled={!aiParsed || !aiParsed.ok}
                leftIcon={<Sparkles className="size-4" aria-hidden />}
                onClick={handleSaveAiRoadmap}
              >
                Tạo &amp; Học ngay
              </Button>
            )}
            {mode === 'quick' && quickSubTab === 'schedule' && (
              <Button
                type="button"
                variant="primary"
                leftIcon={<Sparkles className="size-4" aria-hidden />}
                onClick={handleSaveQuickRoadmap}
              >
                Tạo &amp; Học ngay
              </Button>
            )}
          </>
        )
      }
    >
      {/* STEP 0: 3 BIG FRIENDLY CARDS */}
      {mode === 'choose' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setComposerStep('content');
              setMode('composer');
            }}
            className="flex w-full cursor-pointer items-start gap-3.5 rounded-2xl border-2 border-primary/50 bg-primary-soft/25 p-4 text-left transition-colors hover:border-primary hover:bg-primary-soft/45"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary">
              <PenLine className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-fg sm:text-base">
                  1. Tạo bài / Chọn bài trước → Đặt ngày giờ sau
                </span>
                <Badge tone="primary">Khuyên dùng</Badge>
              </div>
              <p className="text-xs leading-relaxed text-muted sm:text-sm">
                Tạo trước <strong className="text-fg">Quiz riêng / Từ vựng / Chữ Hán / Ngữ pháp</strong> theo từng Category trong <strong className="text-fg">Kho bài của tôi</strong>, kết hợp với bài có sẵn của App (Flashcard, Mini-game, Đọc hiểu...), rồi mới xếp lịch ngày giờ học.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode('ai')}
            className="flex w-full cursor-pointer items-start gap-3.5 rounded-2xl border border-line bg-surface-2/60 p-4 text-left transition-colors hover:border-primary hover:bg-primary-soft/25"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sakura-soft text-sakura">
              <Wand2 className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-fg sm:text-base">
                  2. Nhờ ChatGPT / Gemini soạn bài &amp; Quiz hộ
                </span>
                <Badge tone="sakura">Mọi chủ đề</Badge>
              </div>
              <p className="text-xs leading-relaxed text-muted sm:text-sm">
                Muốn học tiếng Nhật quán ăn, IT, du lịch hoặc ôn đề riêng? Chỉ cần bấm{' '}
                <strong className="text-fg">Copy yêu cầu</strong> → gửi ChatGPT/Gemini → dán kết quả về là thành lộ trình học luôn.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode('quick')}
            className="flex w-full cursor-pointer items-start gap-3.5 rounded-2xl border border-line bg-surface-2/60 p-4 text-left transition-colors hover:border-primary hover:bg-primary-soft/25"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success-fg">
              <Zap className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-fg sm:text-base">
                  3. Tạo nhanh theo Giáo trình chuẩn / Kho Cộng đồng
                </span>
                <Badge tone="success">10 giây</Badge>
              </div>
              <p className="text-xs leading-relaxed text-muted sm:text-sm">
                Giữ nguyên bài học theo sách Minna / Soumatome nhưng tùy chỉnh thời lượng mỗi ngày (10p → 60 buổi · 30p → 30 buổi), hoặc chọn 1 chạm từ Kho Cộng đồng.
              </p>
            </div>
          </button>
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
              <span className="truncate">Tạo &amp; Chọn bài vào Buổi</span>
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
              <span className="truncate">Đặt tên &amp; Ngày giờ học</span>
            </button>
          </div>

          {/* STEP 1: CONTENT FIRST (VISUAL STAGE CHAIN + MY QUIZZES BY ROLE + APP LIBRARY) */}
          {composerStep === 'content' ? (
            <div className="space-y-3">
              {/* Compact alternative shortcuts (Quick Book/Community or Full AI Roadmap) */}
              {!isEditing && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/40 px-3 py-2 text-xs">
                  <span className="text-muted">
                    Vẽ từng Buổi &amp; thêm Quiz vừa tạo bên dưới, hoặc:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMode('quick')}
                      className="cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-fg hover:border-primary hover:text-primary-fg"
                    >
                      ⚡ Tạo nhanh theo Sách / Cộng đồng
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('ai')}
                      className="cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-fg hover:border-primary hover:text-primary-fg"
                    >
                      ✨ Nhờ AI tạo cả lộ trình
                    </button>
                  </div>
                </div>
              )}

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
                      Xóa buổi này
                    </Button>
                  )}
                </div>

                {/* Selected Tasks inside this Buổi */}
                {currentCompStage.tasks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line bg-surface-2/40 px-3 py-2.5 text-xs text-muted">
                    <strong className="text-fg">{currentCompStage.title}</strong> chưa có bài nào. Hãy bấm{' '}
                    <strong className="text-fg">+ Thêm</strong> từ <strong className="text-fg">Kho bài của tôi</strong> hoặc{' '}
                    <strong className="text-fg">Kho bài của App</strong> bên dưới.
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
                    Kho bài của tôi ({studioLessons.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={sourceTab === 'app-library' ? 'primary' : 'secondary'}
                    leftIcon={<BookOpen className="size-3.5" aria-hidden />}
                    onClick={() => setSourceTab('app-library')}
                  >
                    Kho bài của App
                  </Button>
                </div>

                {/* SOURCE 1: MY LIBRARY (FILTERED BY ROLE: Từ vựng, Chữ Hán, Ngữ pháp, Đọc hiểu, Nghe hiểu, Tổng hợp) */}
                {sourceTab === 'my-library' ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <span className="block text-[11px] font-semibold text-muted">
                          Lọc Quiz &amp; Bài đã tạo theo Role:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {MY_LIBRARY_ROLE_FILTERS.map((cat) => (
                            <Chip
                              key={cat.value}
                              selected={myRoleFilter === cat.value}
                              onClick={() => setMyRoleFilter(cat.value)}
                            >
                              {cat.label}
                            </Chip>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {onRequestCreateQuiz && (
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            leftIcon={<Plus className="size-3.5" aria-hidden />}
                            onClick={() => {
                              onClose();
                              onRequestCreateQuiz();
                            }}
                          >
                            Mở Modal tạo Quiz
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant={creatingInLibrary ? 'secondary' : 'soft'}
                          leftIcon={<FolderPlus className="size-3.5" aria-hidden />}
                          onClick={() => setCreatingInLibrary((v) => !v)}
                        >
                          {creatingInLibrary ? 'Đóng form nhanh' : '+ Tạo nhanh'}
                        </Button>
                      </div>
                    </div>

                    {/* Inline Reusable Lesson Creator (Saves directly to Kho bài của tôi with Category) */}
                    {creatingInLibrary && (
                      <div className="space-y-3 rounded-xl border border-primary/40 bg-primary-soft/15 p-3">
                        <div className="space-y-1.5">
                          <span className="block text-xs font-bold text-fg">
                            1. Chọn danh mục (Category) cho bài mới:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { value: 'quiz', label: 'Quiz 4 đáp án' },
                                { value: 'vocab', label: 'Từ vựng' },
                                { value: 'grammar', label: 'Ngữ pháp' },
                                { value: 'kanji', label: 'Chữ Hán' },
                              ] as const
                            ).map((c) => (
                              <Chip
                                key={c.value}
                                selected={newItemCategory === c.value}
                                onClick={() => setNewItemCategory(c.value)}
                              >
                                {c.label}
                              </Chip>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                          <div className="sm:col-span-8">
                            <Input
                              aria-label="Tên bộ bài mới"
                              value={newItemTitle}
                              onChange={(e) => setNewItemTitle(e.target.value)}
                              placeholder={
                                newItemCategory === 'quiz'
                                  ? 'Tên bộ Quiz (VD: Quiz Quán ăn N5 · Gọi món)'
                                  : newItemCategory === 'vocab'
                                    ? 'Tên bộ Từ vựng (VD: Từ vựng đi làm IT)'
                                    : newItemCategory === 'grammar'
                                      ? 'Tên bài Ngữ pháp (VD: Mẫu câu xin phép)'
                                      : 'Tên bộ Chữ Hán (VD: 10 chữ Hán siêu thị)'
                              }
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <Select
                              aria-label="Trình độ bài mới"
                              value={newItemLevel}
                              onChange={(e) => setNewItemLevel(e.target.value as StudyLevel)}
                            >
                              {LEVELS.map((lv) => (
                                <option key={lv} value={lv}>
                                  JLPT {lv}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>

                        {newItemCategory === 'quiz' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-fg">
                                Danh sách câu hỏi ({newQuizRows.length} câu · bấm A/B/C/D chọn đáp án đúng)
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                leftIcon={<Plus className="size-3.5" aria-hidden />}
                                onClick={() =>
                                  setNewQuizRows((prev) => [
                                    ...prev,
                                    createEmptyQuizRow(prev.length + 1),
                                  ])
                                }
                              >
                                Thêm câu
                              </Button>
                            </div>
                            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                              {newQuizRows.map((row, rIdx) => (
                                <div
                                  key={row.id}
                                  className="space-y-2 rounded-lg border border-line bg-surface p-2.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-primary-fg">
                                      Câu {rIdx + 1}
                                    </span>
                                    {newQuizRows.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setNewQuizRows((prev) =>
                                            prev.filter((_, i) => i !== rIdx),
                                          )
                                        }
                                        className="cursor-pointer text-muted hover:text-danger-fg"
                                        aria-label={`Xóa câu ${rIdx + 1}`}
                                      >
                                        <Trash2 className="size-3.5" aria-hidden />
                                      </button>
                                    )}
                                  </div>
                                  <Input
                                    value={row.prompt}
                                    onChange={(e) =>
                                      setNewQuizRows((prev) =>
                                        prev.map((it, i) =>
                                          i === rIdx ? { ...it, prompt: e.target.value } : it,
                                        ),
                                      )
                                    }
                                    placeholder="Nhập câu hỏi..."
                                  />
                                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                    {[0, 1, 2, 3].map((optIdx) => (
                                      <div key={optIdx} className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setNewQuizRows((prev) =>
                                              prev.map((it, i) =>
                                                i === rIdx ? { ...it, correctIndex: optIdx } : it,
                                              ),
                                            )
                                          }
                                          className={cn(
                                            'grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-xs font-bold transition-colors',
                                            row.correctIndex === optIdx
                                              ? 'bg-success text-on-primary'
                                              : 'border border-line bg-surface-2 text-muted hover:border-primary',
                                          )}
                                        >
                                          {String.fromCharCode(65 + optIdx)}
                                        </button>
                                        <Input
                                          value={row.options[optIdx] ?? ''}
                                          onChange={(e) =>
                                            setNewQuizRows((prev) =>
                                              prev.map((it, i) => {
                                                if (i !== rIdx) return it;
                                                const opts = [...it.options];
                                                while (opts.length <= optIdx) opts.push('');
                                                opts[optIdx] = e.target.value;
                                                return { ...it, options: opts };
                                              }),
                                            )
                                          }
                                          placeholder={`Đáp án ${String.fromCharCode(65 + optIdx)}${optIdx < 2 ? ' *' : ''}`}
                                          className="flex-1"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <Input
                                    value={row.explanation ?? ''}
                                    onChange={(e) =>
                                      setNewQuizRows((prev) =>
                                        prev.map((it, i) =>
                                          i === rIdx
                                            ? { ...it, explanation: e.target.value }
                                            : it,
                                        ),
                                      )
                                    }
                                    placeholder="Giải thích đáp án (tùy chọn)..."
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {newItemCategory === 'vocab' && (
                          <Field
                            label="Nhập danh sách từ vựng (mỗi dòng 1 từ: Kanji | Hiragana | Nghĩa)"
                            htmlFor="wiz-my-vocab-bulk"
                          >
                            <Textarea
                              id="wiz-my-vocab-bulk"
                              rows={4}
                              value={newVocabBulkText}
                              onChange={(e) => setNewVocabBulkText(e.target.value)}
                              placeholder={'食べる | たべる | Ăn\n飲む | のむ | Uống\nお会計 | おかいけい | Tính tiền'}
                              className="text-xs"
                            />
                          </Field>
                        )}

                        {newItemCategory === 'grammar' && (
                          <div className="space-y-2">
                            <Input
                              value={newGrammarStructure}
                              onChange={(e) => setNewGrammarStructure(e.target.value)}
                              placeholder="Cấu trúc ngữ pháp (VD: V-てもいいですか)"
                            />
                            <Input
                              value={newGrammarMeaning}
                              onChange={(e) => setNewGrammarMeaning(e.target.value)}
                              placeholder="Nghĩa tiếng Việt (VD: Tôi làm V có được không?)"
                            />
                            <Input
                              value={newGrammarExample}
                              onChange={(e) => setNewGrammarExample(e.target.value)}
                              placeholder="Ví dụ tiếng Nhật (tùy chọn)"
                            />
                          </div>
                        )}

                        {newItemCategory === 'kanji' && (
                          <Field
                            label="Nhập danh sách chữ Hán (mỗi dòng: Chữ Hán | Hán Việt | Nghĩa)"
                            htmlFor="wiz-my-kanji-bulk"
                          >
                            <Textarea
                              id="wiz-my-kanji-bulk"
                              rows={4}
                              value={newKanjiBulkText}
                              onChange={(e) => setNewKanjiBulkText(e.target.value)}
                              placeholder={'食 | THỰC | Ăn\n飲 | ẨM | Uống\n駅 | DỊCH | Nhà ga'}
                              className="text-xs"
                            />
                          </Field>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-fg">
                            <input
                              type="checkbox"
                              checked={autoAttachToStage}
                              onChange={(e) => setAutoAttachToStage(e.target.checked)}
                              className="size-4 accent-primary"
                            />
                            <span>Tự động gắn luôn vào {currentCompStage.title}</span>
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            leftIcon={<Check className="size-3.5" aria-hidden />}
                            onClick={handleCreateLessonInMyLibrary}
                          >
                            Lưu vào Kho bài của tôi
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Reusable My Library Cards (Same clean card style as App Library!) */}
                    {filteredMyLessons.length === 0 ? (
                      <div className="space-y-2 rounded-xl border border-dashed border-line bg-surface-2/35 p-4 text-center">
                        <p className="text-xs text-muted">
                          {studioLessons.length === 0
                            ? 'Kho bài của tôi đang trống. Hãy bấm "+ Tạo bài / Quiz mới" ở trên để tạo bài theo Category (Quiz, Từ vựng, Ngữ pháp, Chữ Hán), hoặc chuyển sang tab "Kho bài của App" để chọn bài có sẵn.'
                            : 'Chưa có bài tự tạo nào thuộc danh mục này.'}
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                        {filteredMyLessons.map((lesson) => {
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
                                  Kho bài của tôi · JLPT {lesson.level}
                                </p>
                              </div>
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
                      <div className="sm:col-span-5">
                        <Select
                          aria-label="Chọn sách giáo trình"
                          value={effectivePickerBookId}
                          onChange={(e) => setPickerBookId(e.target.value)}
                        >
                          {pickerBooks.map((book) => (
                            <option key={book.id} value={book.id}>
                              {book.title}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="sm:col-span-4">
                        <Input
                          aria-label="Tìm bài học"
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder="Tìm bài (VD: Bài 3, Đọc)..."
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="block text-[11px] font-semibold text-muted">
                        Lọc theo loại bài tập trong sách đang chọn:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {APP_ACTIVITY_FILTERS.map((f) => (
                          <Chip
                            key={f.value}
                            selected={pickerActivity === f.value}
                            onClick={() => setPickerActivity(f.value)}
                          >
                            {f.label}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                      {filteredCatalog.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted">
                          Không tìm thấy bài phù hợp. Hãy thử đổi bộ lọc loại bài tập hoặc từ khóa.
                        </p>
                      ) : (
                        filteredCatalog.slice(0, 60).map((preset) => {
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
              <div className="rounded-xl border border-success-line bg-success-soft/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-fg">
                    <Calendar className="size-4 text-primary-fg" aria-hidden />
                    <span>
                      Đã chuẩn bị xong {nonEmptyCompStages.length} buổi học ({totalCompTasks} bài tập)
                    </span>
                  </div>
                  <Badge tone="success">Sẵn sàng xếp lịch</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {nonEmptyCompStages.map((st, idx) => (
                    <span
                      key={st.id}
                      className="rounded-lg bg-surface px-2 py-0.5 text-[11px] font-medium text-fg ring-1 ring-line"
                    >
                      Buổi {idx + 1}: {st.title} ({st.tasks.length} bài)
                    </span>
                  ))}
                </div>
              </div>

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
                <Field label="Thời lượng mục tiêu mỗi ngày" htmlFor="comp-step2-minutes">
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
                <Field label="Giờ nhắc học & Nhắc lặp" htmlFor="comp-step2-time">
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
                  <span className="text-sm font-medium text-fg">Các ngày học trong tuần</span>
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
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-fg">
                    Thông báo nhắc học riêng cho lộ trình này
                  </p>
                  <p className="text-[11px] text-muted">
                    Lưu tách biệt với các lộ trình khác — chỉ nhắc khi bạn đang chọn học lộ trình này.
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Chip
                    selected={compNotificationsEnabled}
                    onClick={() => setCompNotificationsEnabled(true)}
                  >
                    Bật nhắc học
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
                Chọn chủ đề &amp; Gửi yêu cầu cho ChatGPT / Gemini
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <Field label="Bạn muốn học chủ đề gì?" htmlFor="wiz-ai-topic">
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
              <div className="ml-auto w-28">
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
                Copy yêu cầu gửi AI
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
                {showRawPrompt ? 'Ẩn câu lệnh mẫu' : 'Xem câu lệnh đã copy'}
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
                  Dán câu trả lời từ AI vào đây
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
                  Thử mẫu 3 buổi có sẵn
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  leftIcon={<Upload className="size-3.5" aria-hidden />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Mở file đã lưu
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
              placeholder="Nhấn Ctrl+V dán nguyên câu trả lời của ChatGPT / Gemini vào đây — App sẽ tự đọc và biến thành các Buổi học + Quiz..."
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={quickSubTab === 'schedule' ? 'primary' : 'secondary'}
              leftIcon={<Zap className="size-3.5" aria-hidden />}
              onClick={() => setQuickSubTab('schedule')}
            >
              Tùy chỉnh lịch theo Sách
            </Button>
            <Button
              type="button"
              size="sm"
              variant={quickSubTab === 'community' ? 'primary' : 'secondary'}
              leftIcon={<Users className="size-3.5" aria-hidden />}
              onClick={() => setQuickSubTab('community')}
            >
              Kho Cộng đồng (Lưu 1 chạm)
            </Button>
          </div>

          {quickSubTab === 'schedule' ? (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ROADMAP_QUICK_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyQuickTemplate(tpl)}
                    className="flex cursor-pointer flex-col gap-1 rounded-xl border border-line bg-surface-2/50 p-2.5 text-left transition-colors hover:border-primary hover:bg-primary-soft/35"
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Tên lộ trình" htmlFor="wiz-quick-name">
                  <Input
                    id="wiz-quick-name"
                    value={quickConfig.name}
                    onChange={(e) => setQuickConfig({ ...quickConfig, name: e.target.value })}
                  />
                </Field>
                <Field label="Trình độ & Giáo trình" htmlFor="wiz-quick-level">
                  <div className="flex gap-2">
                    <div className="w-28">
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
                            name: `Lộ trình ${nextLvl} · ${nextBook.shortTitle}`,
                          });
                        }}
                      >
                        {LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Select
                        aria-label="Giáo trình"
                        value={quickConfig.textbookId}
                        onChange={(e) =>
                          setQuickConfig({ ...quickConfig, textbookId: e.target.value })
                        }
                      >
                        {getVocabTextbooksForLevel(quickConfig.level).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.shortTitle}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </Field>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-fg">
                  Thời lượng học mỗi ngày (tự tính số buổi Timeline):
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {DAILY_PACE_PRESETS.map((preset) => {
                    const selected = quickConfig.dailyMinutesTarget === preset.minutes;
                    return (
                      <button
                        key={preset.minutes}
                        type="button"
                        onClick={() =>
                          setQuickConfig({
                            ...quickConfig,
                            dailyMinutesTarget: preset.minutes,
                            totalStages: getStageCountForDailyMinutes(preset.minutes) as TotalStagesOption,
                          })
                        }
                        className={cn(
                          'flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border p-2 text-left transition-colors',
                          selected
                            ? 'border-primary bg-primary-soft/70 text-primary-fg'
                            : 'border-line bg-surface-2/60 text-fg hover:border-primary/60',
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

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-fg">Ngày học:</span>
                {WEEKDAY_PRESETS.map((p) => {
                  const selected =
                    p.days.length === quickConfig.studyWeekdays.length &&
                    p.days.every((d) => quickConfig.studyWeekdays.includes(d));
                  return (
                    <Chip
                      key={p.label}
                      selected={selected}
                      onClick={() => setQuickConfig({ ...quickConfig, studyWeekdays: [...p.days] })}
                    >
                      {p.label}
                    </Chip>
                  );
                })}
              </div>

              <Notice tone="info">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>
                    Dự kiến xong:{' '}
                    <strong className="text-fg">{quickForecast.estimatedCompletionLabel}</strong>
                  </span>
                  <span className="text-muted tabular">
                    {quickConfig.totalStages} buổi · {quickConfig.studyWeekdays.length} ngày/tuần
                  </span>
                </div>
              </Notice>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'N5', 'N4', 'N3'] as const).map((lvl) => (
                  <Chip
                    key={lvl}
                    selected={communityFilter === lvl}
                    onClick={() => setCommunityFilter(lvl)}
                  >
                    {lvl === 'ALL' ? 'Tất cả' : lvl}
                  </Chip>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {COMMUNITY_ROADMAP_GALLERY.filter(
                  (e) => communityFilter === 'ALL' || e.level === communityFilter,
                ).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col justify-between gap-2.5 rounded-xl border border-line bg-surface-2/55 p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Badge tone="primary">{entry.level}</Badge>
                          <Badge tone="sakura">{entry.tag}</Badge>
                        </div>
                        <span className="text-[11px] text-muted tabular">
                          {entry.learnersCount} người học
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-fg">{entry.name}</h4>
                      <p className="text-xs text-muted">{entry.description}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      fullWidth
                      onClick={() => handlePickCommunity(entry)}
                    >
                      Chọn &amp; Học ngay ({entry.totalStages} buổi)
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
