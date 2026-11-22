import type { CmsSnapshot } from './adminCmsService';
import { getLiveGrammarBooks, getLiveKanjis } from './curriculumStore';
import {
  addDaysToDateKey,
  buildRruleStringForDays,
  DEFAULT_TIMEZONE,
  getLocalDateKey,
  getNowInTimezone,
  getWeekdayForDateKey,
  recordStudyCompletion,
  sanitizeDaysArray,
} from './notificationService';
import { isSupabaseAccountUuid } from './sessionScope';
import { supabase } from './supabaseClient';
import { syncWebPushScheduleToCloud } from './pwaReminderService';
import type { KanjiProgressEntry, QuizHistoryAttemptEntry } from './cloudProgressWriter';
import type { StudyLevel } from './userLevelService';
import {
  buildVocabToolQuery,
  getUnitsForVocabTextbook,
  resolveActiveVocabTextbook,
} from '../data/vocabTextbooks';

export type RoadmapMode = 'fixed' | 'custom';
export type DailyMinutesTarget = 10 | 15;
export type RepeatMinutesOption = 5 | 10 | 15;
export type TotalStagesOption = 10 | 20 | 30 | 60;
export type StageSkill =
  | 'vocab'
  | 'kanji'
  | 'grammar'
  | 'quiz'
  | 'reading'
  | 'listening'
  | 'review';

export interface StageTask {
  id: string;
  title: string;
  subtitle: string;
  skill: StageSkill;
  minutes: number;
  to: string;
  isCustomAdded?: boolean;
}

export interface RoadmapStage {
  stageNumber: number;
  id: string;
  chunkNumber: number;
  chunkTitle?: string;
  title: string;
  theme: string;
  scheduledDate: string; // YYYY-MM-DD
  minOnlineMinutes: DailyMinutesTarget;
  tasks: StageTask[];
}

export interface RoadmapForecast {
  totalStages: number;
  completedCount: number;
  remainingCount: number;
  estimatedCompletionDate: string;
  estimatedCompletionLabel: string;
  estimatedWeeks: number;
  daysPerWeek: number;
  isCompleted: boolean;
}

export interface CustomStageOverride {
  title?: string;
  extraTasks?: StageTask[];
  removedTaskIds?: string[];
}

export interface CustomRoadmapConfig {
  id: string;
  name: string;
  level: StudyLevel;
  textbookId: string;
  startDate: string;
  dailyMinutesTarget: DailyMinutesTarget;
  totalStages: TotalStagesOption;
  studyWeekdays: number[]; // 0 (CN) .. 6 (T7)
  skills: StageSkill[];
  reminderTime: string; // HH:MM
  repeatIntervalMinutes: RepeatMinutesOption;
  stageOverrides?: Record<number, CustomStageOverride>;
  chunkTitles?: Record<number, string>;
  authorName?: string;
}

export interface StageCompletionRecord {
  stageId: string;
  completedAt: string;
  completedDate: string; // YYYY-MM-DD
  stars: 1 | 2 | 3;
  onlineMinutesSpent: number;
}

export interface UserStageRoadmapState {
  activeMode: RoadmapMode;
  fixedStartDate: string;
  fixedDailyMinutesTarget: DailyMinutesTarget;
  fixedReminderTime: string;
  fixedRepeatIntervalMinutes: RepeatMinutesOption;
  notificationsEnabled: boolean;
  customConfig: CustomRoadmapConfig | null;
  customRoadmaps: CustomRoadmapConfig[];
  activeCustomRoadmapId: string | null;
  completedTaskIds: string[];
  completedStages: Record<string, StageCompletionRecord>;
  updatedAt: string;
}

export interface CurriculumTaskPreset {
  key: string;
  group: string;
  title: string;
  subtitle: string;
  skill: StageSkill;
  minutes: number;
  to: string;
}

export const STAGE_ROADMAP_SYNC_EVENT = 'nihonmaster:stage-roadmap-sync';
export const DAILY_STAGE_ACTIVITY_SYNC_EVENT = 'nihonmaster:daily-stage-activity-sync';

const STORAGE_KEY_PREFIX = 'nihonmaster_stage_roadmap_v1:';
const DAILY_ACTIVITY_KEY_PREFIX = 'nihonmaster_daily_stage_activity_v1:';
const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_SKILLS: StageSkill[] = [
  'vocab',
  'kanji',
  'grammar',
  'quiz',
  'reading',
  'listening',
  'review',
];
const VALID_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const VALID_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const STAGE_SKILL_META: Record<
  StageSkill,
  { label: string; tone: 'primary' | 'sakura' | 'success' | 'warning' | 'neutral' }
> = {
  vocab: { label: 'Từ vựng', tone: 'primary' },
  kanji: { label: 'Kanji', tone: 'primary' },
  grammar: { label: 'Ngữ pháp', tone: 'primary' },
  quiz: { label: 'Luyện Quiz', tone: 'warning' },
  reading: { label: 'Đọc hiểu', tone: 'sakura' },
  listening: { label: 'Nghe hiểu', tone: 'sakura' },
  review: { label: 'Tổng ôn & Sửa sai', tone: 'success' },
};

function sanitizeTimeStr(raw: unknown, fallback = '20:00'): string {
  return typeof raw === 'string' && VALID_TIME_RE.test(raw.trim()) ? raw.trim() : fallback;
}

function sanitizeDateStr(raw: unknown, fallback: string): string {
  return typeof raw === 'string' && VALID_DATE_RE.test(raw.trim()) ? raw.trim() : fallback;
}

function sanitizeDailyTarget(raw: unknown): DailyMinutesTarget {
  return Number(raw) === 15 ? 15 : 10;
}

function sanitizeRepeatInterval(raw: unknown): RepeatMinutesOption {
  const n = Number(raw);
  if (n === 5 || n === 10 || n === 15) return n;
  return 10;
}

function sanitizeSkills(raw: unknown): StageSkill[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SKILLS];
  const allowed = new Set<StageSkill>(DEFAULT_SKILLS);
  const clean = Array.from(
    new Set(raw.filter((s): s is StageSkill => typeof s === 'string' && allowed.has(s as StageSkill))),
  );
  return clean.length > 0 ? clean : ['vocab', 'quiz', 'review'];
}

export function createDefaultStageRoadmapState(todayKey = getLocalDateKey()): UserStageRoadmapState {
  return {
    activeMode: 'fixed',
    fixedStartDate: todayKey,
    fixedDailyMinutesTarget: 10,
    fixedReminderTime: '20:00',
    fixedRepeatIntervalMinutes: 10,
    notificationsEnabled: true,
    customConfig: null,
    customRoadmaps: [],
    activeCustomRoadmapId: null,
    completedTaskIds: [],
    completedStages: {},
    updatedAt: new Date(0).toISOString(),
  };
}

export function getRecommendedFixedStageCount(
  level: StudyLevel,
  textbookId?: string | null,
): TotalStagesOption {
  if (level === 'N5' && (!textbookId || textbookId === 'minna-n5')) {
    return 60;
  }
  if (level === 'N4' && (!textbookId || textbookId === 'minna-n4')) {
    return 30;
  }
  return 20;
}

export function createDefaultCustomConfig(
  level: StudyLevel,
  userId?: string | null,
  explicitBookId?: string | null,
  todayKey = getLocalDateKey(),
): CustomRoadmapConfig {
  const book = resolveActiveVocabTextbook(level, userId, explicitBookId);
  const recommendedStages = getRecommendedFixedStageCount(level, book.id);
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: `Lộ trình ${level} · ${book.shortTitle}`,
    level,
    textbookId: book.id,
    startDate: todayKey,
    dailyMinutesTarget: 10,
    totalStages: recommendedStages,
    studyWeekdays: [...ALL_WEEKDAYS],
    skills: [...DEFAULT_SKILLS],
    reminderTime: '20:00',
    repeatIntervalMinutes: 10,
    stageOverrides: {},
  };
}

function sanitizeSingleCustomConfig(
  raw: unknown,
  todayKey: string,
  fallbackId: string,
): CustomRoadmapConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const c = raw as Record<string, unknown>;
  const rawLevel = typeof c.level === 'string' ? c.level.toUpperCase() : 'N3';
  const level: StudyLevel =
    rawLevel === 'N5' ||
    rawLevel === 'N4' ||
    rawLevel === 'N3' ||
    rawLevel === 'N2' ||
    rawLevel === 'N1'
      ? rawLevel
      : 'N3';
  const book = resolveActiveVocabTextbook(
    level,
    null,
    typeof c.textbookId === 'string' ? c.textbookId : null,
  );
  const totalRaw = Number(c.totalStages);
  const totalStages: TotalStagesOption =
    totalRaw === 10 || totalRaw === 20 || totalRaw === 30 || totalRaw === 60 ? totalRaw : 20;
  const rawOverrides =
    c.stageOverrides && typeof c.stageOverrides === 'object' && !Array.isArray(c.stageOverrides)
      ? (c.stageOverrides as Record<number, CustomStageOverride>)
      : {};
  const rawChunkTitles =
    c.chunkTitles && typeof c.chunkTitles === 'object' && !Array.isArray(c.chunkTitles)
      ? (c.chunkTitles as Record<number, string>)
      : {};
  const id =
    typeof c.id === 'string' && c.id.trim() ? c.id.trim().slice(0, 64) : fallbackId;
  return {
    id,
    name:
      typeof c.name === 'string' && c.name.trim()
        ? c.name.trim().slice(0, 80)
        : `Lộ trình ${level} · ${book.shortTitle}`,
    level,
    textbookId: book.id,
    startDate: sanitizeDateStr(c.startDate, todayKey),
    dailyMinutesTarget: sanitizeDailyTarget(c.dailyMinutesTarget),
    totalStages,
    studyWeekdays: sanitizeDaysArray(c.studyWeekdays, ALL_WEEKDAYS),
    skills: sanitizeSkills(c.skills),
    reminderTime: sanitizeTimeStr(c.reminderTime, '20:00'),
    repeatIntervalMinutes: sanitizeRepeatInterval(c.repeatIntervalMinutes),
    stageOverrides: rawOverrides,
    chunkTitles: rawChunkTitles,
    authorName:
      typeof c.authorName === 'string' && c.authorName.trim()
        ? c.authorName.trim().slice(0, 48)
        : undefined,
  };
}

export function sanitizeStageRoadmapState(
  raw: unknown,
  todayKey = getLocalDateKey(),
): UserStageRoadmapState {
  const base = createDefaultStageRoadmapState(todayKey);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const obj = raw as Record<string, unknown>;

  const list: CustomRoadmapConfig[] = [];
  const seenIds = new Set<string>();
  if (Array.isArray(obj.customRoadmaps)) {
    obj.customRoadmaps.forEach((item, idx) => {
      const clean = sanitizeSingleCustomConfig(item, todayKey, `custom-plan-${idx + 1}`);
      if (clean && !seenIds.has(clean.id)) {
        seenIds.add(clean.id);
        list.push(clean);
      }
    });
  }
  const legacySingle = sanitizeSingleCustomConfig(obj.customConfig, todayKey, 'custom-plan-1');
  if (legacySingle && !seenIds.has(legacySingle.id)) {
    seenIds.add(legacySingle.id);
    list.unshift(legacySingle);
  }

  const rawActiveId =
    typeof obj.activeCustomRoadmapId === 'string' ? obj.activeCustomRoadmapId.trim() : null;
  const activeCustom =
    (rawActiveId ? list.find((item) => item.id === rawActiveId) : undefined) ?? list[0] ?? null;

  const completedTaskIds = Array.isArray(obj.completedTaskIds)
    ? Array.from(
        new Set(
          obj.completedTaskIds.filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
        ),
      )
    : [];

  const completedStages: Record<string, StageCompletionRecord> = {};
  if (
    obj.completedStages &&
    typeof obj.completedStages === 'object' &&
    !Array.isArray(obj.completedStages)
  ) {
    for (const [key, val] of Object.entries(obj.completedStages as Record<string, unknown>)) {
      if (!val || typeof val !== 'object') continue;
      const rec = val as Record<string, unknown>;
      const starsNum = Number(rec.stars);
      completedStages[key] = {
        stageId: typeof rec.stageId === 'string' ? rec.stageId : key,
        completedAt: typeof rec.completedAt === 'string' ? rec.completedAt : new Date().toISOString(),
        completedDate: sanitizeDateStr(rec.completedDate, todayKey),
        stars: starsNum === 1 || starsNum === 2 || starsNum === 3 ? starsNum : 3,
        onlineMinutesSpent: Math.max(0, Math.round(Number(rec.onlineMinutesSpent) || 0)),
      };
    }
  }

  return {
    activeMode: obj.activeMode === 'custom' && activeCustom ? 'custom' : 'fixed',
    fixedStartDate: sanitizeDateStr(obj.fixedStartDate, todayKey),
    fixedDailyMinutesTarget: sanitizeDailyTarget(obj.fixedDailyMinutesTarget),
    fixedReminderTime: sanitizeTimeStr(obj.fixedReminderTime, '20:00'),
    fixedRepeatIntervalMinutes: sanitizeRepeatInterval(obj.fixedRepeatIntervalMinutes),
    notificationsEnabled: obj.notificationsEnabled !== false,
    customConfig: activeCustom,
    customRoadmaps: list,
    activeCustomRoadmapId: activeCustom?.id ?? null,
    completedTaskIds,
    completedStages,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
  };
}

export function loadStageRoadmapState(userId?: string | null): UserStageRoadmapState {
  const owner = userId || 'guest';
  if (typeof window === 'undefined') return createDefaultStageRoadmapState();
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${owner}`);
    if (!raw) return createDefaultStageRoadmapState();
    return sanitizeStageRoadmapState(JSON.parse(raw));
  } catch {
    return createDefaultStageRoadmapState();
  }
}

export function saveStageRoadmapState(
  next: UserStageRoadmapState,
  userId?: string | null,
): UserStageRoadmapState {
  const owner = userId || 'guest';
  const stamped: UserStageRoadmapState = {
    ...sanitizeStageRoadmapState(next),
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${owner}`, JSON.stringify(stamped));
    } catch {
      // Ignore storage quota errors
    }
    try {
      window.dispatchEvent(
        new CustomEvent<{ state: UserStageRoadmapState; userId: string }>(
          STAGE_ROADMAP_SYNC_EVENT,
          { detail: { state: stamped, userId: owner } },
        ),
      );
    } catch {
      // Ignore event errors
    }
  }

  if (supabase && userId && isSupabaseAccountUuid(userId)) {
    void supabase.auth
      .updateUser({
        data: {
          stage_roadmap_v1: stamped,
        },
      })
      .catch(() => {
        // Non-blocking cloud backup
      });

    const effective = getEffectiveReminderSettings(stamped);
    const completedDates = Object.values(stamped.completedStages)
      .map((rec) => rec.completedDate)
      .filter(Boolean)
      .sort();
    const lastCompletedDate = completedDates[completedDates.length - 1] ?? null;

    void syncWebPushScheduleToCloud({
      userId,
      notificationsEnabled: effective.enabled,
      reminderTime: effective.reminderTime,
      repeatIntervalMinutes: effective.repeatIntervalMinutes,
      studyWeekdays: effective.studyWeekdays,
      dailyMinutesTarget: effective.dailyMinutesTarget,
      lastCompletedDate,
    });
  }

  return stamped;
}

export function recordDailyStageSkillActivity(
  skill: StageSkill,
  userId?: string | null,
  dateKey = getLocalDateKey(),
): void {
  if (typeof window === 'undefined') return;
  const owner = userId || 'guest';
  const key = `${DAILY_ACTIVITY_KEY_PREFIX}${owner}:${dateKey}`;
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const existing = Array.isArray(parsed)
      ? parsed.filter((s): s is StageSkill => typeof s === 'string')
      : [];
    if (existing.includes(skill)) return;
    const next = [...existing, skill];
    window.localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent(DAILY_STAGE_ACTIVITY_SYNC_EVENT, {
        detail: { skill, userId: owner, dateKey },
      }),
    );
  } catch {
    // Ignore storage errors
  }
}

export function loadDailyStageSkillActivities(
  userId?: string | null,
  dateKey = getLocalDateKey(),
): StageSkill[] {
  if (typeof window === 'undefined') return [];
  const owner = userId || 'guest';
  try {
    const raw = window.localStorage.getItem(`${DAILY_ACTIVITY_KEY_PREFIX}${owner}:${dateKey}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is StageSkill => typeof s === 'string') as StageSkill[];
  } catch {
    return [];
  }
}

export function deriveAutoCompletedSkillsToday(options: {
  userId?: string | null;
  quizHistory: QuizHistoryAttemptEntry[];
  kanjiProgress: Record<string, KanjiProgressEntry>;
  todayKey?: string;
}): Set<StageSkill> {
  const todayKey = options.todayKey ?? getLocalDateKey();
  const skills = new Set<StageSkill>(loadDailyStageSkillActivities(options.userId, todayKey));

  for (const attempt of options.quizHistory) {
    const attemptDate = getLocalDateKey(new Date(attempt.createdAt));
    if (attemptDate !== todayKey) continue;
    const qt = (attempt.quizType || '').toLowerCase();
    if (qt.includes('writing')) {
      skills.add('vocab');
    } else if (qt.includes('grammar')) {
      skills.add('grammar');
    } else if (qt.includes('reading') || qt.includes('star')) {
      skills.add('reading');
    } else if (qt.includes('listening')) {
      skills.add('listening');
    } else if (qt.includes('jlpt-kanji')) {
      skills.add('kanji');
    } else if (qt.includes('jlpt-full')) {
      skills.add('quiz');
      skills.add('reading');
      skills.add('listening');
    } else if (qt.includes('mistake') || qt.includes('review')) {
      skills.add('review');
    } else {
      skills.add('quiz');
    }
  }

  for (const entry of Object.values(options.kanjiProgress)) {
    if (!entry?.lastPracticedAt) continue;
    const practicedDate = getLocalDateKey(new Date(entry.lastPracticedAt));
    if (practicedDate === todayKey) {
      skills.add('kanji');
      break;
    }
  }

  return skills;
}

export function hydrateStageRoadmapFromMetadata(
  meta: Record<string, unknown> | undefined | null,
  userId: string,
): void {
  if (!meta || !meta.stage_roadmap_v1 || typeof window === 'undefined') return;
  const remote = sanitizeStageRoadmapState(meta.stage_roadmap_v1);
  const local = loadStageRoadmapState(userId);
  const remoteTs = Date.parse(remote.updatedAt) || 0;
  const localTs = Date.parse(local.updatedAt) || 0;
  if (remoteTs > localTs) {
    try {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(remote));
      window.dispatchEvent(
        new CustomEvent(STAGE_ROADMAP_SYNC_EVENT, { detail: { state: remote, userId } }),
      );
    } catch {
      // Ignore
    }
  }
}

function generateScheduledDates(
  startDate: string,
  count: number,
  allowedWeekdays: number[],
): string[] {
  const allowed = new Set(
    allowedWeekdays.length > 0 ? allowedWeekdays : ALL_WEEKDAYS,
  );
  const dates: string[] = [];
  let cursor = startDate;
  let guard = 0;
  while (dates.length < count && guard < count * 10 + 14) {
    const wd = getWeekdayForDateKey(cursor);
    if (allowed.has(wd)) {
      dates.push(cursor);
    }
    cursor = addDaysToDateKey(cursor, 1);
    guard += 1;
  }
  return dates;
}

const MINNA_N5_CHUNK_TITLES: Record<number, string> = {
  1: 'Bài 1–4 · Nhập môn, Địa điểm & Giờ giấc',
  2: 'Bài 5–8 · Di chuyển, Hành động, Cho–Nhận & Tính từ',
  3: 'Bài 9–12 · Sở thích, Tồn tại, Lượng từ & So sánh',
  4: 'Bài 13–16 · Mong muốn, Thể て, Xin phép & Nối câu',
  5: 'Bài 17–21 · Thể ない/る/た, Thể thông thường & Ý kiến',
  6: 'Bài 22–25 & Thi thử Toàn bộ JLPT N5 (Về đích)',
};

type MinnaStageSlot =
  | { kind: 'lesson-a'; lessonNum: number }
  | { kind: 'lesson-b'; lessonNum: number }
  | { kind: 'lesson-ab'; lessonNum: number }
  | { kind: 'jlpt-practice'; chunkNum: number; label: string; useMediumReading?: boolean }
  | { kind: 'chunk-review'; chunkNum: number; label: string }
  | { kind: 'final-exam' };

const MINNA_N5_60_SLOTS: MinnaStageSlot[] = [
  // Chặng 1: Bài 1–4
  { kind: 'lesson-a', lessonNum: 1 },
  { kind: 'lesson-b', lessonNum: 1 },
  { kind: 'lesson-a', lessonNum: 2 },
  { kind: 'lesson-b', lessonNum: 2 },
  { kind: 'lesson-a', lessonNum: 3 },
  { kind: 'lesson-b', lessonNum: 3 },
  { kind: 'lesson-a', lessonNum: 4 },
  { kind: 'lesson-b', lessonNum: 4 },
  { kind: 'jlpt-practice', chunkNum: 1, label: 'Đọc – Nghe cơ bản Chặng 1 (Bài 1–4)' },
  { kind: 'chunk-review', chunkNum: 1, label: 'Tổng ôn & Khóa kiến thức Bài 1–4' },
  // Chặng 2: Bài 5–8
  { kind: 'lesson-a', lessonNum: 5 },
  { kind: 'lesson-b', lessonNum: 5 },
  { kind: 'lesson-a', lessonNum: 6 },
  { kind: 'lesson-b', lessonNum: 6 },
  { kind: 'lesson-a', lessonNum: 7 },
  { kind: 'lesson-b', lessonNum: 7 },
  { kind: 'lesson-a', lessonNum: 8 },
  { kind: 'lesson-b', lessonNum: 8 },
  { kind: 'jlpt-practice', chunkNum: 2, label: 'Thực chiến Đọc – Nghe Chặng 2 (Bài 5–8)' },
  { kind: 'chunk-review', chunkNum: 2, label: 'Tổng ôn & Khóa kiến thức Bài 5–8' },
  // Chặng 3: Bài 9–12
  { kind: 'lesson-a', lessonNum: 9 },
  { kind: 'lesson-b', lessonNum: 9 },
  { kind: 'lesson-a', lessonNum: 10 },
  { kind: 'lesson-b', lessonNum: 10 },
  { kind: 'lesson-a', lessonNum: 11 },
  { kind: 'lesson-b', lessonNum: 11 },
  { kind: 'lesson-a', lessonNum: 12 },
  { kind: 'lesson-b', lessonNum: 12 },
  { kind: 'jlpt-practice', chunkNum: 3, label: 'Đọc – Nghe – Hái sao (★) Chặng 3 (Bài 9–12)' },
  { kind: 'chunk-review', chunkNum: 3, label: 'Tổng ôn & Khóa kiến thức Bài 9–12' },
  // Chặng 4: Bài 13–16
  { kind: 'lesson-a', lessonNum: 13 },
  { kind: 'lesson-b', lessonNum: 13 },
  { kind: 'lesson-a', lessonNum: 14 },
  { kind: 'lesson-b', lessonNum: 14 },
  { kind: 'lesson-a', lessonNum: 15 },
  { kind: 'lesson-b', lessonNum: 15 },
  { kind: 'lesson-a', lessonNum: 16 },
  { kind: 'lesson-b', lessonNum: 16 },
  { kind: 'jlpt-practice', chunkNum: 4, label: 'Thực chiến Đọc – Nghe Thể て (Bài 13–16)' },
  { kind: 'chunk-review', chunkNum: 4, label: 'Tổng ôn & Khóa kiến thức Bài 13–16' },
  // Chặng 5: Bài 17–21
  { kind: 'lesson-a', lessonNum: 17 },
  { kind: 'lesson-b', lessonNum: 17 },
  { kind: 'lesson-a', lessonNum: 18 },
  { kind: 'lesson-b', lessonNum: 18 },
  { kind: 'lesson-a', lessonNum: 19 },
  { kind: 'lesson-b', lessonNum: 19 },
  { kind: 'lesson-a', lessonNum: 20 },
  { kind: 'lesson-b', lessonNum: 20 },
  { kind: 'lesson-ab', lessonNum: 21 },
  { kind: 'chunk-review', chunkNum: 5, label: 'Tổng ôn & Khóa kiến thức Bài 17–21' },
  // Chặng 6: Bài 22–25 & Thi thử N5
  { kind: 'lesson-a', lessonNum: 22 },
  { kind: 'lesson-b', lessonNum: 22 },
  { kind: 'lesson-a', lessonNum: 23 },
  { kind: 'lesson-b', lessonNum: 23 },
  { kind: 'lesson-a', lessonNum: 24 },
  { kind: 'lesson-b', lessonNum: 24 },
  { kind: 'lesson-a', lessonNum: 25 },
  { kind: 'lesson-b', lessonNum: 25 },
  { kind: 'jlpt-practice', chunkNum: 6, label: 'Đọc Trung văn · Nghe hiểu · Hái sao N5', useMediumReading: true },
  { kind: 'final-exam' },
];

export function generateStageMap(options: {
  mode: RoadmapMode;
  level: StudyLevel;
  textbookId?: string | null;
  userId?: string | null;
  snapshot: CmsSnapshot;
  startDate: string;
  dailyMinutesTarget: DailyMinutesTarget;
  totalStages?: TotalStagesOption;
  studyWeekdays?: number[];
  skills?: StageSkill[];
  stageOverrides?: Record<number, CustomStageOverride>;
  chunkTitles?: Record<number, string>;
}): RoadmapStage[] {
  const {
    mode,
    level,
    textbookId,
    userId,
    snapshot,
    startDate,
    dailyMinutesTarget,
    totalStages = 20,
    studyWeekdays = ALL_WEEKDAYS,
    skills = DEFAULT_SKILLS,
    stageOverrides = {},
    chunkTitles = {},
  } = options;

  const book = resolveActiveVocabTextbook(level, userId, textbookId);
  const levelLower = level.toLowerCase();
  const bookUnits = getUnitsForVocabTextbook(snapshot, level, book);
  const availableUnits = bookUnits.filter((u) => u.totalWords > 0);
  const grammarBooks = getLiveGrammarBooks(snapshot).filter((b) => b.level === level);
  const fallbackGrammarBooks = grammarBooks.length > 0 ? grammarBooks : getLiveGrammarBooks(snapshot);
  const grammarChapters = fallbackGrammarBooks.flatMap((b) =>
    b.chapters.map((c) => ({ bookId: b.id, bookTitle: b.title, chapter: c })),
  );
  const levelKanjiCount = getLiveKanjis(snapshot).filter((k) => k.jlptLevel === level).length;
  const toolQuery = buildVocabToolQuery(level, book.id);
  const jlptQuery = level === 'N5' || level === 'N4' || level === 'N3' ? `?level=${level}` : '';
  const allowedSkills = new Set<StageSkill>(skills.length > 0 ? skills : DEFAULT_SKILLS);
  const scheduledDates = generateScheduledDates(startDate, totalStages, studyWeekdays);
  const modePrefix = mode === 'custom' ? `custom-${levelLower}-${book.id}` : `fixed-${levelLower}-${book.id}`;

  const getUnitAt = (idx: number) => {
    const pool = availableUnits.length > 0 ? availableUnits : bookUnits;
    if (pool.length === 0) return null;
    return pool[idx % pool.length];
  };

  const getGrammarAt = (idx: number) => {
    if (grammarChapters.length === 0) return null;
    return grammarChapters[idx % grammarChapters.length];
  };

  const useMinna60Curriculum =
    level === 'N5' && book.id === 'minna-n5' && totalStages === 60;

  const stages: RoadmapStage[] = [];

  for (let i = 0; i < totalStages; i += 1) {
    const stageNumber = i + 1;
    const chunkNumber = Math.floor(i / 10) + 1;
    const stageId = `${modePrefix}-s${stageNumber}`;
    const candidateTasks: StageTask[] = [];
    let theme = '';
    let title = '';
    const totalChunks = Math.max(1, Math.ceil(totalStages / 10));
    const customChunkTitle = chunkTitles[chunkNumber]?.trim();
    const defaultGenericChunkTitle =
      chunkNumber === totalChunks
        ? `Chặng ${chunkNumber} · Thực chiến 5 kỹ năng & Về đích JLPT ${level}`
        : `Chặng ${chunkNumber} · Chu kỳ 5 kỹ năng (${book.shortTitle})`;
    const chunkTitle =
      customChunkTitle ||
      (useMinna60Curriculum
        ? MINNA_N5_CHUNK_TITLES[chunkNumber]
        : defaultGenericChunkTitle);

    const buildLessonPaths = (lessonIdx: number) => {
      const unit = getUnitAt(lessonIdx);
      const unitLabel = unit ? unit.name : `Bài ${lessonIdx + 1} (${book.shortTitle})`;
      const unitPath = unit
        ? `/vocabulary/${levelLower}/book/${book.id}/${unit.dbUnitId ?? unit.id}`
        : `/vocabulary/${levelLower}/book/${book.id}`;
      const flashcardPath = unit
        ? `/flashcard/${levelLower}/book/${book.id}/${unit.dbUnitId ?? unit.id}`
        : `/flashcard/${levelLower}/book/${book.id}`;
      const quickQuizParams = new URLSearchParams({ level, book: book.id });
      if (unit) {
        quickQuizParams.set('unit', String(unit.id));
        if (unit.dbUnitId) quickQuizParams.set('unitDbId', unit.dbUnitId);
        if (unit.totalWords > 0) quickQuizParams.set('autoStart', '1');
      }
      const quizPath = `/vocabulary/quiz?${quickQuizParams.toString()}`;
      const grammarRef = getGrammarAt(lessonIdx);
      const grammarPath = grammarRef
        ? `/grammar/${grammarRef.bookId}/${grammarRef.chapter.id}`
        : '/grammar';
      const grammarLabel = grammarRef ? grammarRef.chapter.title : `Ngữ pháp Bài ${lessonIdx + 1}`;
      return { unitLabel, unitPath, flashcardPath, quizPath, grammarPath, grammarLabel };
    };

    if (useMinna60Curriculum) {
      const slot = MINNA_N5_60_SLOTS[i];
      if (slot.kind === 'lesson-a') {
        const { unitLabel, unitPath, flashcardPath } = buildLessonPaths(slot.lessonNum - 1);
        title = `Nạp Từ vựng & Kanji · ${unitLabel}`;
        theme = `Minna I — Bài ${slot.lessonNum} (Ngày 1/2: Nạp mặt chữ & phát âm)`;
        if (allowedSkills.has('vocab')) {
          candidateTasks.push({
            id: `${stageId}-t1`,
            title: `Đọc từ vựng ${unitLabel}`,
            subtitle: 'Nghe phát âm, đọc nghĩa tiếng Việt và đánh dấu ★ các từ dễ quên.',
            skill: 'vocab',
            minutes: 5,
            to: unitPath,
          });
          candidateTasks.push({
            id: `${stageId}-t2`,
            title: `Lật thẻ Flashcard · ${unitLabel}`,
            subtitle: 'Kiểm tra phản xạ Hiragana/Kanji ↔ nghĩa Việt.',
            skill: 'vocab',
            minutes: 4,
            to: flashcardPath,
          });
        }
        if (allowedSkills.has('kanji')) {
          candidateTasks.push({
            id: `${stageId}-t3`,
            title: `Học 4–5 chữ Kanji N5 (Nhóm Bài ${slot.lessonNum})`,
            subtitle: `Luyện Hán Việt, âm On-Kun và nét viết trong kho ${levelKanjiCount || 112} Kanji N5.`,
            skill: 'kanji',
            minutes: 5,
            to: '/kanji',
          });
        }
      } else if (slot.kind === 'lesson-b') {
        const { unitLabel, quizPath, grammarPath, grammarLabel } = buildLessonPaths(slot.lessonNum - 1);
        title = `Quiz 24h & Ngữ pháp · Bài ${slot.lessonNum}`;
        theme = `Minna I — Bài ${slot.lessonNum} (Ngày 2/2: Củng cố & Đặt câu)`;
        if (allowedSkills.has('quiz')) {
          candidateTasks.push({
            id: `${stageId}-t1`,
            title: `Quiz nhanh 10 câu · ${unitLabel}`,
            subtitle: 'Nhắc lại từ vựng vừa học sau 24 giờ để khóa trí nhớ dài hạn.',
            skill: 'quiz',
            minutes: 4,
            to: quizPath,
          });
        }
        if (allowedSkills.has('grammar')) {
          candidateTasks.push({
            id: `${stageId}-t2`,
            title: `Học ${grammarLabel}`,
            subtitle: 'Nắm công thức kết hợp, ví dụ mẫu và làm bài tập vận dụng.',
            skill: 'grammar',
            minutes: 6,
            to: grammarPath,
          });
        }
        if (allowedSkills.has('vocab')) {
          candidateTasks.push({
            id: `${stageId}-t3`,
            title: `Luyện gõ chính tả · Bài ${slot.lessonNum}`,
            subtitle: 'Gõ Hiragana chuẩn trường âm, âm ngắt cho các từ trong bài.',
            skill: 'vocab',
            minutes: 4,
            to: `/vocabulary/writing${toolQuery}`,
          });
        }
      } else if (slot.kind === 'lesson-ab') {
        const { unitLabel, unitPath, quizPath, grammarPath, grammarLabel } = buildLessonPaths(
          slot.lessonNum - 1,
        );
        title = `Trọn gói Bài ${slot.lessonNum} · Từ vựng & Ngữ pháp`;
        theme = `Minna I — Bài ${slot.lessonNum} (Ý kiến & Trích dẫn)`;
        if (allowedSkills.has('vocab')) {
          candidateTasks.push({
            id: `${stageId}-t1`,
            title: `Đọc từ vựng ${unitLabel}`,
            subtitle: 'Học nhanh bộ từ vựng Bài 21 và đánh dấu từ cần ôn.',
            skill: 'vocab',
            minutes: 5,
            to: unitPath,
          });
        }
        if (allowedSkills.has('grammar')) {
          candidateTasks.push({
            id: `${stageId}-t2`,
            title: `Học ${grammarLabel}`,
            subtitle: 'Thành thạo ～と思います, ～と言います và ～でしょう？',
            skill: 'grammar',
            minutes: 6,
            to: grammarPath,
          });
        }
        if (allowedSkills.has('quiz')) {
          candidateTasks.push({
            id: `${stageId}-t3`,
            title: `Quiz chốt Bài ${slot.lessonNum}`,
            subtitle: 'Kiểm tra nhanh từ vựng vừa nạp.',
            skill: 'quiz',
            minutes: 4,
            to: quizPath,
          });
        }
      } else if (slot.kind === 'jlpt-practice') {
        title = slot.label;
        theme = `Chặng ${slot.chunkNum} — Thực chiến Đọc hiểu · Nghe hiểu · Hái sao`;
        if (allowedSkills.has('reading')) {
          candidateTasks.push({
            id: `${stageId}-t1`,
            title: slot.useMediumReading ? 'Đọc hiểu Trung văn N5' : 'Đọc hiểu Đoản văn N5',
            subtitle: slot.useMediumReading
              ? 'Đọc bài luận Trung văn N5 và trả lời câu hỏi lý giải nguyên nhân.'
              : 'Đọc nhanh thông báo, tin nhắn, nhật ký N5 có Furigana & giải thích.',
            skill: 'reading',
            minutes: 6,
            to: slot.useMediumReading
              ? `/jlpt/reading-medium${jlptQuery}`
              : `/jlpt/reading-short${jlptQuery}`,
          });
        }
        if (allowedSkills.has('listening')) {
          candidateTasks.push({
            id: `${stageId}-t2`,
            title: `Luyện Nghe hiểu N5 (Chặng ${slot.chunkNum})`,
            subtitle: 'Nghe hội thoại tình huống Minna I kèm phát âm & transcript.',
            skill: 'listening',
            minutes: 6,
            to: `/jlpt/listening${jlptQuery}`,
          });
        }
        if (allowedSkills.has('reading') || allowedSkills.has('grammar')) {
          candidateTasks.push({
            id: `${stageId}-t3`,
            title: 'Luyện Hái sao (★) N5',
            subtitle: 'Sắp xếp 4 mảnh ghép câu đúng ngữ pháp chuẩn đề thi JLPT N5.',
            skill: 'reading',
            minutes: 4,
            to: `/jlpt/star${jlptQuery}`,
          });
        }
      } else if (slot.kind === 'chunk-review') {
        title = slot.label;
        theme = `Chặng ${slot.chunkNum} — Review Day (Không nạp bài mới)`;
        if (allowedSkills.has('review')) {
          candidateTasks.push({
            id: `${stageId}-t1`,
            title: 'Xử lý toàn bộ Bài sai cần ôn',
            subtitle: 'Làm lại các câu sai trong chặng cho tới khi đạt 100%.',
            skill: 'review',
            minutes: 5,
            to: '/grammar/mistakes',
          });
          candidateTasks.push({
            id: `${stageId}-t2`,
            title: `Ôn từ đánh dấu ★ (${book.shortTitle})`,
            subtitle: 'Rà lại toàn bộ từ khó bạn đã gắn sao trong chặng vừa qua.',
            skill: 'review',
            minutes: 4,
            to: `/vocabulary/review${toolQuery}`,
          });
        }
        if (allowedSkills.has('quiz')) {
          candidateTasks.push({
            id: `${stageId}-t3`,
            title: `Quiz tổng hợp Chặng ${slot.chunkNum} · Minna I`,
            subtitle: 'Đánh giá tổng lực từ vựng & ngữ pháp trước khi sang chặng mới.',
            skill: 'quiz',
            minutes: 6,
            to: `/jlpt/grammar${jlptQuery}`,
          });
        }
      } else {
        title = 'Thi thử Toàn bộ JLPT N5 (Full Test — Về đích)';
        theme = 'Màn 60 · Hoàn tất trọn bộ 25 bài Minna no Nihongo I';
        candidateTasks.push(
          {
            id: `${stageId}-t1`,
            title: 'Làm đề Thi thử Toàn bộ JLPT N5 (Full Test)',
            subtitle: 'Tổng kiểm tra Chữ Hán – Từ vựng – Ngữ pháp – Đọc hiểu – Nghe hiểu có bấm giờ.',
            skill: 'quiz',
            minutes: 15,
            to: `/jlpt/full-test${jlptQuery}`,
          },
          {
            id: `${stageId}-t2`,
            title: 'Rà soát lỗi sai cuối cùng & Xuất phiếu ôn PDF',
            subtitle: 'Chốt toàn bộ lỗ hổng để sẵn sàng đỗ JLPT N5.',
            skill: 'review',
            minutes: 5,
            to: '/grammar/mistakes',
          },
        );
      }
    } else if (i === totalStages - 1 && totalStages >= 10) {
      title = `Thi thử Toàn bộ JLPT ${level} (Full Test — Về đích)`;
      theme = `Màn ${stageNumber} · Tổng lực 5 kỹ năng & Hoàn tất ${book.shortTitle}`;
      if (allowedSkills.has('quiz') || allowedSkills.has('reading') || allowedSkills.has('listening')) {
        candidateTasks.push({
          id: `${stageId}-t1`,
          title: `Làm đề Thi thử Toàn bộ JLPT ${level} (Full Test)`,
          subtitle: 'Đánh giá tổng lực Chữ Hán – Từ vựng – Ngữ pháp – Đọc hiểu – Nghe hiểu có bấm giờ.',
          skill: 'quiz',
          minutes: 15,
          to: `/jlpt/full-test${jlptQuery}`,
        });
      }
      if (allowedSkills.has('review')) {
        candidateTasks.push({
          id: `${stageId}-t2`,
          title: 'Rà soát lỗi sai cuối chặng & Xuất phiếu ôn tập',
          subtitle: 'Chốt toàn bộ lỗ hổng đã tích lũy trước khi qua trình độ mới.',
          skill: 'review',
          minutes: 5,
          to: '/grammar/mistakes',
        });
      }
    } else {
      const dayInCycle = i % 7;
      const unitIndex = Math.floor((i * 2) / 7) + (dayInCycle >= 3 ? 1 : 0);
      const { unitLabel, unitPath, flashcardPath, quizPath, grammarPath, grammarLabel } =
        buildLessonPaths(unitIndex);
      const prevPaths = buildLessonPaths(Math.max(0, unitIndex - 1));
      const grammarRef = getGrammarAt(Math.floor(i / 2));
      const resolvedGrammarPath = grammarRef
        ? `/grammar/${grammarRef.bookId}/${grammarRef.chapter.id}`
        : grammarPath;
      const resolvedGrammarLabel = grammarRef ? grammarRef.chapter.title : grammarLabel;

      switch (dayInCycle) {
        case 0: {
          title = `Nạp Từ vựng, Kanji & Nghe ngắn · ${unitLabel}`;
          theme = 'Ngày 1/7 · Nạp mặt chữ + Chạm phản xạ nghe mỗi ngày';
          if (allowedSkills.has('vocab')) {
            candidateTasks.push({
              id: `${stageId}-t1`,
              title: `Đọc từ vựng & lật Flashcard · ${unitLabel}`,
              subtitle: `Học 15–20 từ mới, gắn ★ từ khó rồi lật nhanh Flashcard (${book.shortTitle}).`,
              skill: 'vocab',
              minutes: 6,
              to: unitPath,
            });
          }
          if (allowedSkills.has('kanji')) {
            candidateTasks.push({
              id: `${stageId}-t2`,
              title: `Học 5–6 chữ Kanji ${level}`,
              subtitle:
                levelKanjiCount > 0
                  ? `Ghi nhớ âm Hán Việt, On-Kun và viết nét trong kho ${levelKanjiCount} Kanji ${level}.`
                  : 'Luyện nhận diện âm On-Kun, Hán Việt và thứ tự nét viết.',
              skill: 'kanji',
              minutes: 5,
              to: '/kanji',
            });
          }
          if (allowedSkills.has('listening')) {
            candidateTasks.push({
              id: `${stageId}-t3`,
              title: `Vi-bài tập Nghe hiểu ${level} (1–2 đoạn)`,
              subtitle: 'Nghe hội thoại tình huống không nhìn chữ, sau đó bật Transcript đọc nhại.',
              skill: 'listening',
              minutes: 4,
              to: `/jlpt/listening${jlptQuery}`,
            });
          }
          break;
        }
        case 1: {
          title = 'Nhắc 24h, Ngữ pháp & Hái sao ★';
          theme = 'Ngày 2/7 · Khóa trí nhớ 24h + Ghép cấu trúc câu';
          if (allowedSkills.has('quiz')) {
            candidateTasks.push({
              id: `${stageId}-t1`,
              title: `Quiz nhắc lại 24h (10 câu) · ${unitLabel}`,
              subtitle: 'Kiểm tra ngay từ vựng vừa nạp ở Màn trước để giữ trí nhớ dài hạn.',
              skill: 'quiz',
              minutes: 4,
              to: quizPath,
            });
          }
          if (allowedSkills.has('grammar')) {
            candidateTasks.push({
              id: `${stageId}-t2`,
              title: `Học ${resolvedGrammarLabel}`,
              subtitle: 'Nắm công thức kết hợp, ví dụ mẫu và làm ngay 6 câu luyện tập tự động.',
              skill: 'grammar',
              minutes: 6,
              to: resolvedGrammarPath,
            });
          }
          if (allowedSkills.has('reading')) {
            candidateTasks.push({
              id: `${stageId}-t3`,
              title: `Vi-bài tập Hái sao (★) ${level}`,
              subtitle: 'Rèn tư duy trật tự từ & trợ từ chuẩn đề JLPT qua 3–5 câu xếp câu.',
              skill: 'reading',
              minutes: 4,
              to: `/jlpt/star${jlptQuery}`,
            });
          }
          break;
        }
        case 2: {
          title = 'Gõ chính tả, Đọc Đoản văn & Dojo';
          theme = 'Ngày 3/7 · Chủ động viết đúng & đọc lướt nắm ý chính';
          if (allowedSkills.has('vocab')) {
            candidateTasks.push({
              id: `${stageId}-t1`,
              title: `Luyện gõ chính tả từ vựng · ${book.shortTitle}`,
              subtitle: 'Gõ Hiragana/Kanji từ nghĩa Việt để tránh nhầm trường âm & âm ngắt.',
              skill: 'vocab',
              minutes: 4,
              to: `/vocabulary/writing${toolQuery}`,
            });
          }
          if (allowedSkills.has('reading')) {
            candidateTasks.push({
              id: `${stageId}-t2`,
              title: `Đọc hiểu Đoản văn ngắn ${level}`,
              subtitle: 'Đọc 1 đoạn 100–150 chữ, luyện tìm thông tin chính nhanh trong 4 phút.',
              skill: 'reading',
              minutes: 5,
              to: `/jlpt/reading-short${jlptQuery}`,
            });
          }
          if (allowedSkills.has('quiz') || allowedSkills.has('vocab')) {
            candidateTasks.push({
              id: `${stageId}-t3`,
              title: `Dojo Mini-game: Chém Hoa Quả (${book.shortTitle})`,
              subtitle: 'Giải trí 3 phút kích phản xạ nghĩa Việt ↔ Nhật theo đúng giáo trình.',
              skill: 'quiz',
              minutes: 3,
              to: `/games?game=slash&level=${level}&book=${book.id}`,
            });
          }
          break;
        }
        case 3: {
          title = `Từ vựng mới, Kanji JLPT & Nghe · ${unitLabel}`;
          theme = 'Ngày 4/7 · Mở rộng vốn từ + Phản xạ chữ Hán & nghe';
          if (allowedSkills.has('vocab')) {
            candidateTasks.push({
              id: `${stageId}-t1`,
              title: `Lật Flashcard tốc độ · ${unitLabel}`,
              subtitle: `Nạp nhóm từ vựng mới của ${book.shortTitle} & đánh dấu ★ từ khó.`,
              skill: 'vocab',
              minutes: 5,
              to: flashcardPath,
            });
          }
          if (allowedSkills.has('kanji')) {
            candidateTasks.push({
              id: `${stageId}-t2`,
              title: `Trắc nghiệm Kanji JLPT ${level} (10 câu)`,
              subtitle: 'Chọn nhanh cách đọc Hiragana / chữ Hán chuẩn đề thi thật.',
              skill: 'kanji',
              minutes: 5,
              to: `/jlpt/kanji${jlptQuery}`,
            });
          }
          if (allowedSkills.has('listening')) {
            candidateTasks.push({
              id: `${stageId}-t3`,
              title: `Luyện Nghe hiểu & Transcript ${level}`,
              subtitle: 'Bắt từ khóa câu hỏi trước khi nghe đoạn hội thoại.',
              skill: 'listening',
              minutes: 4,
              to: `/jlpt/listening${jlptQuery}`,
            });
          }
          break;
        }
        case 4: {
          title = 'Quiz 24h, Ngữ pháp & Đọc hiểu';
          theme = 'Ngày 5/7 · Nối mệnh đề nâng cao + Phân tích mạch văn';
          if (allowedSkills.has('quiz')) {
            candidateTasks.push({
              id: `${stageId}-t1`,
              title: `Quiz nhanh 24h · ${prevPaths.unitLabel}`,
              subtitle: 'Quét lại bài hôm qua để đạt ≥ 80% trước khi chuyển cấu trúc mới.',
              skill: 'quiz',
              minutes: 4,
              to: prevPaths.quizPath,
            });
          }
          if (allowedSkills.has('grammar')) {
            candidateTasks.push({
              id: `${stageId}-t2`,
              title: `Học ${resolvedGrammarLabel}`,
              subtitle: 'Phân biệt sắc thái với các mẫu tương đồng và làm bài tập thực hành.',
              skill: 'grammar',
              minutes: 6,
              to: resolvedGrammarPath,
            });
          }
          if (allowedSkills.has('reading')) {
            candidateTasks.push({
              id: `${stageId}-t3`,
              title:
                level === 'N5'
                  ? `Đọc hiểu Đoản văn ${level}`
                  : `Đọc hiểu Trung văn ${level}`,
              subtitle:
                level === 'N5'
                  ? 'Đọc tin nhắn & đoạn văn ngắn N5 kèm câu hỏi suy luận.'
                  : 'Đọc đoạn văn 250–350 chữ, tập xác định câu chủ đề & lý do.',
              skill: 'reading',
              minutes: 5,
              to:
                level === 'N5'
                  ? `/jlpt/reading-short${jlptQuery}`
                  : `/jlpt/reading-medium${jlptQuery}`,
            });
          }
          break;
        }
        case 5: {
          title = 'Thực chiến Phòng thi 5 Kỹ năng';
          theme = 'Ngày 6/7 · Mondai JLPT tổng hợp + Thính giác Ninja';
          if (allowedSkills.has('quiz') || allowedSkills.has('vocab')) {
            candidateTasks.push({
              id: `${stageId}-t1`,
              title: `Mondai Từ vựng & Ngữ pháp JLPT ${level}`,
              subtitle: 'Giải đề chọn từ đúng ngữ cảnh & phân biệt mẫu câu hay bẫy.',
              skill: 'quiz',
              minutes: 5,
              to: `/jlpt/vocab${jlptQuery}`,
            });
          }
          if (allowedSkills.has('reading')) {
            candidateTasks.push({
              id: `${stageId}-t2`,
              title:
                level === 'N5'
                  ? 'Đọc hiểu Trung văn N5'
                  : `Đọc hiểu Trường văn ${level}`,
              subtitle: 'Rèn sức bền đọc văn bản dài & đối chiếu phần giải thích chi tiết.',
              skill: 'reading',
              minutes: 6,
              to:
                level === 'N5'
                  ? `/jlpt/reading-medium${jlptQuery}`
                  : `/jlpt/reading-long${jlptQuery}`,
            });
          }
          if (allowedSkills.has('listening')) {
            candidateTasks.push({
              id: `${stageId}-t3`,
              title: `Dojo Mini-game: Thính giác Ninja (${book.shortTitle})`,
              subtitle: 'Ẩn mặt chữ, nghe giọng đọc tiếng Nhật và bắt đúng mục tiêu trong 3 phút.',
              skill: 'listening',
              minutes: 3,
              to: `/games?game=listening&level=${level}&book=${book.id}`,
            });
          }
          break;
        }
        default: {
          title = 'Review Day · Dọn sạch lỗi sai & Tổng ôn tuần';
          theme = 'Ngày 7/7 · Không nạp bài mới — Khóa chắc 100% kiến thức tuần';
          if (allowedSkills.has('review')) {
            candidateTasks.push({
              id: `${stageId}-t1`,
              title: 'Xử lý toàn bộ Bài sai cần ôn',
              subtitle: 'Làm lại tất cả câu ngữ pháp & từ vựng từng trả lời nhầm trong tuần.',
              skill: 'review',
              minutes: 5,
              to: '/grammar/mistakes',
            });
            candidateTasks.push({
              id: `${stageId}-t2`,
              title: `Ôn từ đánh dấu ★ (${book.shortTitle})`,
              subtitle: 'Rà soát kho từ khó bạn đã gắn sao để hạ tỷ lệ quên xuống 0%.',
              skill: 'review',
              minutes: 4,
              to: `/vocabulary/review${toolQuery}`,
            });
          }
          if (allowedSkills.has('quiz')) {
            candidateTasks.push({
              id: `${stageId}-t3`,
              title: `Mini-test Ngữ pháp JLPT ${level} / Chốt tuần`,
              subtitle: 'Kiểm tra tổng hợp cuối tuần để sẵn sàng bước sang chu kỳ mới.',
              skill: 'quiz',
              minutes: 5,
              to: `/jlpt/grammar${jlptQuery}`,
            });
          }
          break;
        }
      }
    }

    // Fallback: guarantee every stage has at least 1 actionable task even if user unchecked many skills
    if (candidateTasks.length === 0) {
      const { unitPath } = buildLessonPaths(0);
      candidateTasks.push({
        id: `${stageId}-fallback`,
        title: `Luyện tập nhanh ${book.shortTitle} (${level})`,
        subtitle: 'Hoàn thành phiên luyện tập 10–15 phút để giữ chuỗi học hằng ngày.',
        skill: 'vocab',
        minutes: dailyMinutesTarget,
        to: unitPath,
      });
    }

    const override = stageOverrides[stageNumber];
    const removedSet = new Set(override?.removedTaskIds ?? []);
    const filteredBase = candidateTasks.filter((t) => !removedSet.has(t.id));
    const tasks = [...filteredBase, ...(override?.extraTasks ?? [])];
    const resolvedTitle = override?.title?.trim() ? override.title.trim() : title;

    stages.push({
      stageNumber,
      id: stageId,
      chunkNumber,
      chunkTitle,
      title: resolvedTitle,
      theme,
      scheduledDate: scheduledDates[i] ?? addDaysToDateKey(startDate, i),
      minOnlineMinutes: dailyMinutesTarget,
      tasks,
    });
  }

  return stages;
}

/**
 * Builds a real Admin-style curriculum catalog for any (level, textbook) so users
 * building a custom roadmap can assign specific Units, Grammar chapters, Kanji sets,
 * and JLPT modules directly into any Stage (Màn).
 */
export function buildCurriculumTaskCatalog(options: {
  snapshot: CmsSnapshot;
  level: StudyLevel;
  textbookId?: string | null;
  userId?: string | null;
}): CurriculumTaskPreset[] {
  const { snapshot, level, textbookId, userId } = options;
  const book = resolveActiveVocabTextbook(level, userId, textbookId);
  const lvlLower = level.toLowerCase();
  const toolQuery = buildVocabToolQuery(level, book.id);
  const jlptQuery = level === 'N5' || level === 'N4' || level === 'N3' ? `?level=${level}` : '';
  const presets: CurriculumTaskPreset[] = [];

  const units = getUnitsForVocabTextbook(snapshot, level, book);
  for (const unit of units) {
    const unitKey = unit.dbUnitId ?? unit.id;
    const countLabel = unit.totalWords > 0 ? ` (${unit.totalWords} từ)` : '';
    presets.push({
      key: `vocab-read-${unitKey}`,
      group: `Từ vựng · ${book.shortTitle}`,
      title: `Đọc từ vựng: ${unit.name}${countLabel}`,
      subtitle: `Học bảng từ, nghe phát âm & đánh dấu ★ (${book.title}).`,
      skill: 'vocab',
      minutes: 5,
      to: `/vocabulary/${lvlLower}/book/${book.id}/${unitKey}`,
    });
    presets.push({
      key: `vocab-fc-${unitKey}`,
      group: `Flashcard · ${book.shortTitle}`,
      title: `Flashcard: ${unit.name}${countLabel}`,
      subtitle: 'Ôn thẻ lật Hiragana/Kanji ↔ nghĩa tiếng Việt.',
      skill: 'vocab',
      minutes: 4,
      to: `/flashcard/${lvlLower}/book/${book.id}/${unitKey}`,
    });
    const quizParams = new URLSearchParams({
      level,
      book: book.id,
      unit: String(unit.id),
    });
    if (unit.dbUnitId) quizParams.set('unitDbId', unit.dbUnitId);
    if (unit.totalWords > 0) quizParams.set('autoStart', '1');
    presets.push({
      key: `vocab-quiz-${unitKey}`,
      group: `Luyện Quiz · ${book.shortTitle}`,
      title: `Quiz nhanh: ${unit.name}`,
      subtitle: 'Trắc nghiệm 4 đáp án khóa trí nhớ ngay lập tức.',
      skill: 'quiz',
      minutes: 5,
      to: `/vocabulary/quiz?${quizParams.toString()}`,
    });
    presets.push({
      key: `minigame-shooter-${unitKey}`,
      group: `Mini-game Dojo · ${book.shortTitle}`,
      title: `Chém Từ Vựng (Ninja): ${unit.name}`,
      subtitle: 'Gõ Romaji / chạm bùa tiêu diệt Yōkai theo đúng bài học này.',
      skill: 'vocab',
      minutes: 4,
      to: `/games?game=shooter&level=${level}&book=${book.id}&unit=${unit.id}`,
    });
  }

  presets.push(
    {
      key: `minigame-slash-${book.id}`,
      group: `Mini-game Dojo · ${book.shortTitle}`,
      title: `Mini-game Chém Hoa Quả Từ Vựng (${book.shortTitle})`,
      subtitle: 'Nhìn nghĩa tiếng Việt phía trên, vuốt chém đôi quả cầu tiếng Nhật đúng nghĩa.',
      skill: 'vocab',
      minutes: 4,
      to: `/games?game=slash&level=${level}&book=${book.id}`,
    },
    {
      key: `minigame-match-${book.id}`,
      group: `Mini-game Dojo · ${book.shortTitle}`,
      title: `Mini-game Nối Cặp 2 Cột (Kanji & Từ vựng ${level})`,
      subtitle: 'Nối nhanh Chữ Hán ↔ Nghĩa, Chữ Hán ↔ Âm đọc, Từ vựng & Ngữ pháp.',
      skill: 'kanji',
      minutes: 4,
      to: `/games?game=match&level=${level}&book=${book.id}`,
    },
    {
      key: `minigame-memory-${book.id}`,
      group: `Mini-game Dojo · ${book.shortTitle}`,
      title: `Mini-game Lật Thẻ Ký Ức (${book.shortTitle})`,
      subtitle: 'Lật mở 12 thẻ bùa tìm cặp Từ vựng / Kanji ↔ Nghĩa Việt.',
      skill: 'vocab',
      minutes: 4,
      to: `/games?game=memory&level=${level}&book=${book.id}`,
    },
    {
      key: `minigame-truefalse-${book.id}`,
      group: `Mini-game Dojo · ${book.shortTitle}`,
      title: `Mini-game Phản Xạ Đúng / Sai 45s (${level})`,
      subtitle: 'Phán đoán siêu tốc cặp Từ vựng & Kanji Đúng (○) hay Sai (×).',
      skill: 'quiz',
      minutes: 3,
      to: `/games?game=truefalse&level=${level}&book=${book.id}`,
    },
    {
      key: `minigame-listening-${book.id}`,
      group: `Mini-game Dojo · ${book.shortTitle}`,
      title: `Mini-game Thính Giác Ninja (${book.shortTitle})`,
      subtitle: 'Nghe phát âm tiếng Nhật và bắt đúng mục tiêu.',
      skill: 'listening',
      minutes: 4,
      to: `/games?game=listening&level=${level}&book=${book.id}`,
    },
  );

  presets.push({
    key: `vocab-writing-${book.id}`,
    group: `Từ vựng · ${book.shortTitle}`,
    title: `Luyện gõ từ vựng (${book.shortTitle})`,
    subtitle: 'Gõ Hiragana/Kanji chuẩn chính tả từ nghĩa Việt.',
    skill: 'vocab',
    minutes: 5,
    to: `/vocabulary/writing${toolQuery}`,
  });

  const levelGrammarBooks = getLiveGrammarBooks(snapshot).filter((b) => b.level === level);
  const grammarList = levelGrammarBooks.length > 0 ? levelGrammarBooks : getLiveGrammarBooks(snapshot);
  for (const gBook of grammarList) {
    for (const ch of gBook.chapters) {
      presets.push({
        key: `grammar-${gBook.id}-${ch.id}`,
        group: `Ngữ pháp · ${gBook.level}`,
        title: `Ngữ pháp: ${ch.title} (${ch.grammars.length} mẫu)`,
        subtitle: `Bài học và luyện tập thuộc ${gBook.title}.`,
        skill: 'grammar',
        minutes: 6,
        to: `/grammar/${gBook.id}/${ch.id}`,
      });
    }
  }

  const levelKanjiCount = getLiveKanjis(snapshot).filter((k) => k.jlptLevel === level).length;
  presets.push({
    key: `kanji-${level}`,
    group: 'Kanji',
    title: `Luyện Kanji JLPT ${level}${levelKanjiCount > 0 ? ` (${levelKanjiCount} chữ)` : ''}`,
    subtitle: 'Tra cứu Hán Việt, âm On-Kun và tập viết nét.',
    skill: 'kanji',
    minutes: 5,
    to: '/kanji',
  });

  presets.push(
    {
      key: 'jlpt-star',
      group: 'Luyện đề JLPT',
      title: `Luyện Hái sao (★) ${level}`,
      subtitle: 'Sắp xếp 4 mảnh ghép câu chuẩn đề thi JLPT.',
      skill: 'reading',
      minutes: 5,
      to: `/jlpt/star${jlptQuery}`,
    },
    {
      key: 'jlpt-reading-short',
      group: 'Luyện đề JLPT',
      title: `Đọc hiểu Đoản văn ${level}`,
      subtitle: 'Luyện đọc đoạn ngắn 150–200 chữ tìm ý chính.',
      skill: 'reading',
      minutes: 6,
      to: `/jlpt/reading-short${jlptQuery}`,
    },
    {
      key: 'jlpt-reading-medium',
      group: 'Luyện đề JLPT',
      title: `Đọc hiểu Trung văn ${level}`,
      subtitle: 'Phân tích bài viết 400–500 chữ chuẩn JLPT.',
      skill: 'reading',
      minutes: 8,
      to: `/jlpt/reading-medium${jlptQuery}`,
    },
    {
      key: 'jlpt-listening',
      group: 'Luyện đề JLPT',
      title: `Luyện Nghe hiểu ${level}`,
      subtitle: 'Nghe hội thoại tình huống kèm transcript.',
      skill: 'listening',
      minutes: 6,
      to: `/jlpt/listening${jlptQuery}`,
    },
    {
      key: 'jlpt-full-test',
      group: 'Luyện đề JLPT',
      title: `Thi thử Full Test ${level}`,
      subtitle: 'Đề thi tổng hợp có bấm giờ và chấm điểm tự động.',
      skill: 'quiz',
      minutes: 15,
      to: `/jlpt/full-test${jlptQuery}`,
    },
    {
      key: 'review-mistakes',
      group: 'Tổng ôn & Sửa sai',
      title: 'Dọn sạch Bài sai cần ôn',
      subtitle: 'Làm lại các câu sai đã lưu tới khi đạt 100%.',
      skill: 'review',
      minutes: 5,
      to: '/grammar/mistakes',
    },
    {
      key: 'review-starred',
      group: 'Tổng ôn & Sửa sai',
      title: `Ôn từ đánh dấu ★ (${book.shortTitle})`,
      subtitle: 'Ôn lại các từ khó đã gắn sao của giáo trình này.',
      skill: 'review',
      minutes: 4,
      to: `/vocabulary/review${toolQuery}`,
    },
  );

  return presets;
}

export function getActiveStageForMap(
  stages: RoadmapStage[],
  completedStages: Record<string, StageCompletionRecord>,
): RoadmapStage | null {
  for (const stage of stages) {
    if (!completedStages[stage.id]) return stage;
  }
  return stages[stages.length - 1] ?? null;
}

export function isStageUnlocked(
  stage: RoadmapStage,
  stages: RoadmapStage[],
  completedStages: Record<string, StageCompletionRecord>,
): boolean {
  if (stage.stageNumber <= 1) return true;
  if (completedStages[stage.id]) return true;
  const prev = stages.find((s) => s.stageNumber === stage.stageNumber - 1);
  return prev ? Boolean(completedStages[prev.id]) : true;
}

export function computeStageStars(
  scheduledDate: string,
  todayKey = getLocalDateKey(),
): 1 | 2 | 3 {
  if (todayKey <= scheduledDate) return 3;
  const late1 = addDaysToDateKey(scheduledDate, 2);
  if (todayKey <= late1) return 2;
  return 1;
}

export async function completeStageAndUnlockNext(options: {
  state: UserStageRoadmapState;
  stage: RoadmapStage;
  todayOnlineSeconds: number;
  userId?: string | null;
}): Promise<UserStageRoadmapState> {
  const { state, stage, todayOnlineSeconds, userId } = options;
  const todayKey = getLocalDateKey();
  const stars = computeStageStars(stage.scheduledDate, todayKey);
  const mergedTaskIds = Array.from(
    new Set([...state.completedTaskIds, ...stage.tasks.map((t) => t.id)]),
  );

  const nextState: UserStageRoadmapState = {
    ...state,
    completedTaskIds: mergedTaskIds,
    completedStages: {
      ...state.completedStages,
      [stage.id]: {
        stageId: stage.id,
        completedAt: new Date().toISOString(),
        completedDate: todayKey,
        stars,
        onlineMinutesSpent: Math.max(stage.minOnlineMinutes, Math.floor(todayOnlineSeconds / 60)),
      },
    },
  };

  const saved = saveStageRoadmapState(nextState, userId);
  if (userId) {
    await recordStudyCompletion(todayKey, userId);
  }
  return saved;
}

export function hasCompletedStageToday(
  state: UserStageRoadmapState,
  todayKey = getLocalDateKey(),
): boolean {
  return Object.values(state.completedStages).some((rec) => rec.completedDate === todayKey);
}

export function getEffectiveReminderSettings(state: UserStageRoadmapState): {
  enabled: boolean;
  reminderTime: string;
  repeatIntervalMinutes: RepeatMinutesOption;
  dailyMinutesTarget: DailyMinutesTarget;
  studyWeekdays: number[];
} {
  if (state.activeMode === 'custom' && state.customConfig) {
    return {
      enabled: state.notificationsEnabled,
      reminderTime: state.customConfig.reminderTime,
      repeatIntervalMinutes: state.customConfig.repeatIntervalMinutes,
      dailyMinutesTarget: state.customConfig.dailyMinutesTarget,
      studyWeekdays: state.customConfig.studyWeekdays,
    };
  }
  return {
    enabled: state.notificationsEnabled,
    reminderTime: state.fixedReminderTime,
    repeatIntervalMinutes: state.fixedRepeatIntervalMinutes,
    dailyMinutesTarget: state.fixedDailyMinutesTarget,
    studyWeekdays: ALL_WEEKDAYS,
  };
}

export function isDailyEnforcementPending(
  state: UserStageRoadmapState,
  todayOnlineSeconds: number,
  now = new Date(),
): {
  isDueNow: boolean;
  isCompletedToday: boolean;
  remainingSeconds: number;
  targetSeconds: number;
  reminderTime: string;
  repeatIntervalMinutes: RepeatMinutesOption;
} {
  const settings = getEffectiveReminderSettings(state);
  const nowParts = getNowInTimezone(now, DEFAULT_TIMEZONE);
  const targetSeconds = settings.dailyMinutesTarget * 60;
  const remainingSeconds = Math.max(0, targetSeconds - todayOnlineSeconds);
  const completedToday =
    hasCompletedStageToday(state, nowParts.dateKey) && remainingSeconds === 0;

  const isStudyWeekday = settings.studyWeekdays.includes(nowParts.weekday);
  const [rh, rm] = settings.reminderTime.split(':').map(Number);
  const reminderMinutes = (rh || 20) * 60 + (rm || 0);
  const isPastReminderTime = nowParts.totalMinutes >= reminderMinutes;

  return {
    isDueNow: settings.enabled && isStudyWeekday && isPastReminderTime && !completedToday,
    isCompletedToday: completedToday,
    remainingSeconds,
    targetSeconds,
    reminderTime: settings.reminderTime,
    repeatIntervalMinutes: settings.repeatIntervalMinutes,
  };
}

/**
 * Builds a 1-tap Google Calendar URL (NO `.ics` file download!).
 * Opens Google Calendar directly on mobile or desktop with pre-filled recurring reminder
 * and a deep link straight to `/roadmap/stages`.
 */
export function buildOneTapStageGoogleCalendarUrl(options: {
  level: StudyLevel;
  textbookTitle: string;
  mode: RoadmapMode;
  reminderTime: string;
  studyWeekdays: number[];
  dailyMinutesTarget: DailyMinutesTarget;
  startDate?: string;
}): string {
  const todayKey = getLocalDateKey();
  const baseDate =
    options.startDate && VALID_DATE_RE.test(options.startDate) && options.startDate >= todayKey
      ? options.startDate
      : todayKey;
  const cleanTime = sanitizeTimeStr(options.reminderTime, '20:00');
  const [hh, mm] = cleanTime.split(':').map(Number);
  const startTotal = hh * 60 + mm;
  const endTotal = startTotal + Math.max(15, options.dailyMinutesTarget);
  const endH = String(Math.floor((endTotal % 1440) / 60)).padStart(2, '0');
  const endM = String(endTotal % 60).padStart(2, '0');
  const endDate = endTotal >= 1440 ? addDaysToDateKey(baseDate, 1) : baseDate;

  const dtStart = `${baseDate.replace(/-/g, '')}T${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
  const dtEnd = `${endDate.replace(/-/g, '')}T${endH}${endM}00`;
  const stageUrl =
    typeof window !== 'undefined' && window.location
      ? `${window.location.origin}${window.location.pathname}#/roadmap`
      : 'https://duy18nd.github.io/QuizzApp_Japan/#/roadmap';

  const modeLabel = options.mode === 'custom' ? 'Lộ trình tự tạo' : 'Lộ trình cố định';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `🇯🇵 Nihongo 問 — Mở Màn hôm nay (${options.level} · ${options.dailyMinutesTarget}p)`,
    dates: `${dtStart}/${dtEnd}`,
    details: `${modeLabel} (${options.textbookTitle}).\nOnline tối thiểu ${options.dailyMinutesTarget} phút & hoàn thành Màn hôm nay để mở khóa Màn kế tiếp.\nVào học ngay: ${stageUrl}`,
    ctz: DEFAULT_TIMEZONE,
    recur: buildRruleStringForDays(options.studyWeekdays),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function formatMmSs(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatShortDayMonth(dateKey: string): string {
  if (!VALID_DATE_RE.test(dateKey)) return dateKey;
  const [, m, d] = dateKey.split('-');
  return `${d}/${m}`;
}

export function formatFullDayMonthYear(dateKey: string): string {
  if (!VALID_DATE_RE.test(dateKey)) return dateKey;
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
}

export function calculateRoadmapForecast(options: {
  totalStages: number;
  completedCount: number;
  startDate: string;
  studyWeekdays: number[];
  completedToday?: boolean;
  todayKey?: string;
}): RoadmapForecast {
  const {
    totalStages,
    completedCount,
    startDate,
    studyWeekdays,
    completedToday = false,
    todayKey = getLocalDateKey(),
  } = options;
  const safeDays = studyWeekdays.length > 0 ? studyWeekdays : ALL_WEEKDAYS;
  const remainingCount = Math.max(0, totalStages - completedCount);

  if (remainingCount === 0) {
    return {
      totalStages,
      completedCount,
      remainingCount: 0,
      estimatedCompletionDate: todayKey,
      estimatedCompletionLabel: formatFullDayMonthYear(todayKey),
      estimatedWeeks: 0,
      daysPerWeek: safeDays.length,
      isCompleted: true,
    };
  }

  const effectiveAnchor =
    startDate > todayKey
      ? startDate
      : completedToday
        ? addDaysToDateKey(todayKey, 1)
        : todayKey;

  const projectedDates = generateScheduledDates(effectiveAnchor, remainingCount, safeDays);
  const finishDate =
    projectedDates[projectedDates.length - 1] ?? addDaysToDateKey(effectiveAnchor, remainingCount - 1);
  const estimatedWeeks = Math.max(1, Math.ceil(remainingCount / Math.max(1, safeDays.length)));

  return {
    totalStages,
    completedCount,
    remainingCount,
    estimatedCompletionDate: finishDate,
    estimatedCompletionLabel: formatFullDayMonthYear(finishDate),
    estimatedWeeks,
    daysPerWeek: safeDays.length,
    isCompleted: false,
  };
}

/* ============================================================================
   PRO CREATOR ENTITLEMENT & CUSTOM ROADMAP SHARE / IMPORT CODEC
   ============================================================================ */

const PRO_CREATOR_DEMO_KEY_PREFIX = 'nihonmaster_pro_creator_v1:';
const SHARE_CODE_PREFIX = 'NIHON-';

export function isProCreatorUnlocked(
  userId?: string | null,
  userRole?: string | null,
): boolean {
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;
  if (typeof window === 'undefined') return false;
  const owner = userId || 'guest';
  try {
    return window.localStorage.getItem(`${PRO_CREATOR_DEMO_KEY_PREFIX}${owner}`) === '1';
  } catch {
    return false;
  }
}

export function setProCreatorDemoUnlocked(
  userId: string | null | undefined,
  unlocked: boolean,
): void {
  if (typeof window === 'undefined') return;
  const owner = userId || 'guest';
  try {
    if (unlocked) {
      window.localStorage.setItem(`${PRO_CREATOR_DEMO_KEY_PREFIX}${owner}`, '1');
    } else {
      window.localStorage.removeItem(`${PRO_CREATOR_DEMO_KEY_PREFIX}${owner}`);
    }
    window.dispatchEvent(new CustomEvent(STAGE_ROADMAP_SYNC_EVENT));
  } catch {
    // ignore
  }
}

export function encodeRoadmapShareCode(
  config: CustomRoadmapConfig,
  authorName?: string,
): string {
  const payload = {
    v: 1,
    n: config.name,
    l: config.level,
    b: config.textbookId,
    m: config.dailyMinutesTarget,
    t: config.totalStages,
    w: config.studyWeekdays,
    s: config.skills,
    r: config.reminderTime,
    p: config.repeatIntervalMinutes,
    o: config.stageOverrides ?? {},
    c: config.chunkTitles ?? {},
    a: authorName || config.authorName || 'Nihongo Creator',
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${SHARE_CODE_PREFIX}${b64}`;
}

export function decodeRoadmapShareCode(
  rawInput: string,
  todayKey = getLocalDateKey(),
): CustomRoadmapConfig | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  let token = rawInput.trim();

  // If user pasted a full URL containing ?import=NIHON-..., extract the token
  const importMatch = token.match(/[?&]import=(NIHON-[A-Za-z0-9_-]+)/);
  if (importMatch) {
    token = importMatch[1];
  }
  if (!token.startsWith(SHARE_CODE_PREFIX)) return null;

  try {
    const b64Url = token.slice(SHARE_CODE_PREFIX.length);
    const padded = b64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(b64Url.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    return sanitizeSingleCustomConfig(
      {
        id: `shared-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: parsed.n,
        level: parsed.l,
        textbookId: parsed.b,
        startDate: todayKey,
        dailyMinutesTarget: parsed.m,
        totalStages: parsed.t,
        studyWeekdays: parsed.w,
        skills: parsed.s,
        reminderTime: parsed.r,
        repeatIntervalMinutes: parsed.p,
        stageOverrides: parsed.o,
        chunkTitles: parsed.c,
        authorName: parsed.a,
      },
      todayKey,
      `shared-${Date.now()}`,
    );
  } catch {
    return null;
  }
}
