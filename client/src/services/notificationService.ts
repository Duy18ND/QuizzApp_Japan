import {
  getInMemoryOnlineTime,
  getInMemoryStudySchedule,
  setInMemoryOnlineTime,
  setInMemoryStudySchedule,
} from './cloudProgressWriter';
import {
  getActiveAuthenticatedUserId,
  isSupabaseAccountUuid,
} from './sessionScope';
import { supabase } from './supabaseClient';

export const STUDY_SCHEDULE_STORAGE_KEY = 'nihonmaster_study_schedule';
export const STUDY_SCHEDULE_SYNC_EVENT = 'nihonmaster:study-schedule-sync';
export const ONLINE_TIME_STORAGE_KEY = 'nihonmaster_online_time_v1';
export const ONLINE_TIME_SYNC_EVENT = 'nihonmaster:online-time-sync';
export const ONLINE_STREAK_THRESHOLD_SECONDS = 60;
export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

export type RepeatIntervalMinutes = 0 | 5 | 10 | 15;
export type ScheduleType = 'recurring' | 'once';
export type StreakGoalMode = 'every_day' | 'custom_weekly';
export type JLPTExamLevelGoal = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface StudyTimeSlot {
  id: string;
  scheduleType: ScheduleType; // 'recurring' (lặp hàng tuần theo thứ) | 'once' (1 lần theo ngày cụ thể)
  time: string; // "HH:MM" 24h format
  label: string; // Nội dung học tập
  daysOfWeek: number[]; // For 'recurring': 0 (CN) .. 6 (T7)
  date: string; // For 'once': "YYYY-MM-DD"
  /** Legacy compatibility flag (true when scheduleType === 'recurring') */
  isDaily?: boolean;
}

export interface StudyScheduleConfig {
  enabled: boolean;
  primaryTime: string;
  timeSlots: StudyTimeSlot[];
  /** Streak Mode: 'every_day' (Mode A) or 'custom_weekly' (Mode B) */
  streakMode: StreakGoalMode;
  streakDaysOfWeek: number[]; // 0 (CN) .. 6 (T7)
  /** Sorted unique "YYYY-MM-DD" dates when the user actually completed studying */
  completedDates: string[];
  /** Legacy compatibility mirrors for streakMode / streakDaysOfWeek */
  isContinuousDaily: boolean;
  daysOfWeek: number[];
  /** Separate Optional JLPT Exam Countdown */
  targetExamLevel: JLPTExamLevelGoal;
  targetExamDate: string; // Optional YYYY-MM-DD
  continuousRepeatEnabled: boolean;
  continuousRepeatMinutes: RepeatIntervalMinutes;
  maxRepeatCount: number;
  timezone: string;
  lastStudiedDate: string | null; // YYYY-MM-DD
  updatedAt: string;
}

export interface StudyStreakStats {
  mode: StreakGoalMode;
  currentStreak: number;
  longestStreak: number;
  totalCompletedDays: number;
  completedToday: boolean;
  isRequiredToday: boolean;
}

export interface TimezoneDateParts {
  dateKey: string; // "YYYY-MM-DD"
  timeKey: string; // "HH:MM"
  weekday: number; // 0 (Sun) .. 6 (Sat)
  hour: number;
  minute: number;
  totalMinutes: number;
}

export const ALL_DAYS_ORDERED: Array<{
  day: number;
  shortLabel: string;
  fullLabel: string;
  enShort: string;
  icsDay: string;
}> = [
  { day: 1, shortLabel: 'T2', fullLabel: 'Thứ 2', enShort: 'Mon', icsDay: 'MO' },
  { day: 2, shortLabel: 'T3', fullLabel: 'Thứ 3', enShort: 'Tue', icsDay: 'TU' },
  { day: 3, shortLabel: 'T4', fullLabel: 'Thứ 4', enShort: 'Wed', icsDay: 'WE' },
  { day: 4, shortLabel: 'T5', fullLabel: 'Thứ 5', enShort: 'Thu', icsDay: 'TH' },
  { day: 5, shortLabel: 'T6', fullLabel: 'Thứ 6', enShort: 'Fri', icsDay: 'FR' },
  { day: 6, shortLabel: 'T7', fullLabel: 'Thứ 7', enShort: 'Sat', icsDay: 'SA' },
  { day: 0, shortLabel: 'CN', fullLabel: 'Chủ nhật', enShort: 'Sun', icsDay: 'SU' },
];

export const JLPT_EXAM_LEVELS: JLPTExamLevelGoal[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6, 0];
const VALID_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const VALID_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Extracts exact local date/time/weekday in `Asia/Ho_Chi_Minh` (or specified IANA timezone)
 * without UTC offset drift.
 */
export function getNowInTimezone(
  date = new Date(),
  timeZone = DEFAULT_TIMEZONE,
): TimezoneDateParts {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== 'literal') {
        map[p.type] = p.value;
      }
    }
    const year = map.year || String(date.getFullYear());
    const month = (map.month || String(date.getMonth() + 1)).padStart(2, '0');
    const day = (map.day || String(date.getDate())).padStart(2, '0');
    const rawHour = Number(map.hour ?? date.getHours());
    const hour = rawHour === 24 ? 0 : rawHour;
    const minute = Number(map.minute ?? date.getMinutes());
    const weekday =
      map.weekday && map.weekday in WEEKDAY_MAP
        ? WEEKDAY_MAP[map.weekday]
        : date.getDay();

    const dateKey = `${year}-${month}-${day}`;
    const timeKey = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return {
      dateKey,
      timeKey,
      weekday,
      hour,
      minute,
      totalMinutes: hour * 60 + minute,
    };
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hour = date.getHours();
    const minute = date.getMinutes();
    return {
      dateKey: `${y}-${m}-${d}`,
      timeKey: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      weekday: date.getDay(),
      hour,
      minute,
      totalMinutes: hour * 60 + minute,
    };
  }
}

export function getLocalDateKey(date = new Date(), timeZone = DEFAULT_TIMEZONE): string {
  return getNowInTimezone(date, timeZone).dateKey;
}

export function getWeekdayForDateKey(dateKey: string): number {
  if (!VALID_DATE_REGEX.test(dateKey)) return 1;
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDaysToDateKey(dateKey: string, daysToAdd: number): string {
  if (!VALID_DATE_REGEX.test(dateKey)) return getLocalDateKey();
  const [y, m, d] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + daysToAdd));
  const ny = utc.getUTCFullYear();
  const nm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(utc.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export function formatVietnameseDateWithWeekday(dateStr: string): string {
  if (!VALID_DATE_REGEX.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = getWeekdayForDateKey(dateStr);
  const dayInfo = ALL_DAYS_ORDERED.find((item) => item.day === weekday);
  const weekdayLabel = dayInfo ? dayInfo.fullLabel : '';
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}${weekdayLabel ? ` (${weekdayLabel})` : ''}`;
}

export function formatSlotWeekdays(daysOfWeek: number[]): string {
  const cleanDays = sanitizeDaysArray(daysOfWeek);
  if (cleanDays.length >= 7) {
    return 'Mỗi ngày (T2, T3, T4, T5, T6, T7, CN)';
  }
  const ordered = ALL_DAYS_ORDERED.filter((d) => cleanDays.includes(d.day)).map(
    (d) => d.shortLabel,
  );
  return ordered.length > 0 ? ordered.join(', ') : 'T2 – CN';
}

export function formatWeekdaysLabel(daysOfWeek: number[], isContinuousDaily: boolean): string {
  if (isContinuousDaily || daysOfWeek.length >= 7) {
    return 'Mỗi ngày (T2, T3, T4, T5, T6, T7, CN)';
  }
  return `Mỗi tuần (${formatSlotWeekdays(daysOfWeek)})`;
}

export const DEFAULT_STUDY_SCHEDULE: StudyScheduleConfig = {
  enabled: true,
  primaryTime: '20:00',
  timeSlots: [],
  streakMode: 'every_day',
  streakDaysOfWeek: [...DEFAULT_DAYS],
  completedDates: [],
  isContinuousDaily: true,
  daysOfWeek: [...DEFAULT_DAYS],
  targetExamLevel: 'N3',
  targetExamDate: '',
  continuousRepeatEnabled: true,
  continuousRepeatMinutes: 5,
  maxRepeatCount: 5,
  timezone: DEFAULT_TIMEZONE,
  lastStudiedDate: null,
  updatedAt: new Date(0).toISOString(),
};

function sanitizeTime(raw: unknown, fallback = '20:00'): string {
  if (typeof raw === 'string' && VALID_TIME_REGEX.test(raw.trim())) {
    return raw.trim();
  }
  return fallback;
}

function sanitizeDate(raw: unknown, fallback = getLocalDateKey()): string {
  if (typeof raw === 'string' && VALID_DATE_REGEX.test(raw.trim())) {
    return raw.trim();
  }
  return fallback;
}

export function sanitizeDaysArray(raw: unknown, fallback: number[] = DEFAULT_DAYS): number[] {
  if (!Array.isArray(raw)) return [...fallback];
  const valid = Array.from(
    new Set(
      raw
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    ),
  );
  if (valid.length === 0) return [...fallback];
  return ALL_DAYS_ORDERED.filter((item) => valid.includes(item.day)).map((item) => item.day);
}

export function sanitizeCompletedDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string' && VALID_DATE_REGEX.test(item.trim())) {
      unique.add(item.trim());
    }
  }
  return Array.from(unique).sort();
}

function buildCanonicalSlotKey(slot: {
  scheduleType: ScheduleType;
  time: string;
  daysOfWeek: number[];
  date: string;
}): string {
  if (slot.scheduleType === 'once') {
    return `once::${slot.date}::${slot.time}`;
  }
  return `recurring::${slot.daysOfWeek.join(',')}::${slot.time}`;
}

/**
 * Sanitizes `timeSlots`, migrates legacy records safely, prevents duplicate records,
 * and removes expired one-time schedules (`scheduleType === 'once' && date < currentDateKey`).
 * Recurring schedules are NEVER auto-deleted.
 */
export function sanitizeTimeSlots(
  raw: unknown,
  currentDateKey = getLocalDateKey(),
  fallbackRecurringDays: number[] = DEFAULT_DAYS,
): StudyTimeSlot[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const result: StudyTimeSlot[] = [];
  const seenIds = new Set<string>();
  const seenCanonicalKeys = new Set<string>();

  for (let i = 0; i < raw.length && result.length < 200; i++) {
    const item = raw[i];
    if (typeof item === 'string') {
      const t = sanitizeTime(item, '');
      if (!t) continue;
      const days = sanitizeDaysArray(fallbackRecurringDays);
      const id = `slot-recurring-${t.replace(':', '')}`;
      const canonical = buildCanonicalSlotKey({
        scheduleType: 'recurring',
        time: t,
        daysOfWeek: days,
        date: '',
      });
      if (seenIds.has(id) || seenCanonicalKeys.has(canonical)) continue;
      seenIds.add(id);
      seenCanonicalKeys.add(canonical);
      result.push({
        id,
        scheduleType: 'recurring',
        time: t,
        label: 'Ôn từ vựng & Kanji',
        daysOfWeek: days,
        date: '',
        isDaily: true,
      });
      continue;
    }

    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;
    const t = sanitizeTime(obj.time, '');
    if (!t) continue;

    let scheduleType: ScheduleType = 'recurring';
    if (obj.scheduleType === 'once' || obj.scheduleType === 'recurring') {
      scheduleType = obj.scheduleType;
    } else if (typeof obj.isDaily === 'boolean') {
      scheduleType = obj.isDaily ? 'recurring' : 'once';
    } else if (typeof obj.date === 'string' && VALID_DATE_REGEX.test(obj.date) && !obj.daysOfWeek) {
      scheduleType = 'once';
    }

    const label =
      typeof obj.label === 'string' && obj.label.trim()
        ? obj.label.trim().slice(0, 80)
        : 'Ôn từ vựng & Kanji';

    if (scheduleType === 'once') {
      const date = sanitizeDate(obj.date, '');
      if (!date || date < currentDateKey) {
        continue;
      }

      const id =
        typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim().slice(0, 64)
          : `slot-once-${date}-${t.replace(':', '')}`;
      const canonical = buildCanonicalSlotKey({
        scheduleType: 'once',
        time: t,
        daysOfWeek: [],
        date,
      });
      if (seenIds.has(id) || seenCanonicalKeys.has(canonical)) continue;
      seenIds.add(id);
      seenCanonicalKeys.add(canonical);

      result.push({
        id,
        scheduleType: 'once',
        time: t,
        label,
        daysOfWeek: [],
        date,
        isDaily: false,
      });
    } else {
      const daysOfWeek = sanitizeDaysArray(obj.daysOfWeek, fallbackRecurringDays);
      const id =
        typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim().slice(0, 64)
          : `slot-recurring-${t.replace(':', '')}-${daysOfWeek.join('')}`;
      const canonical = buildCanonicalSlotKey({
        scheduleType: 'recurring',
        time: t,
        daysOfWeek,
        date: '',
      });
      if (seenIds.has(id) || seenCanonicalKeys.has(canonical)) continue;
      seenIds.add(id);
      seenCanonicalKeys.add(canonical);

      result.push({
        id,
        scheduleType: 'recurring',
        time: t,
        label,
        daysOfWeek,
        date: '',
        isDaily: true,
      });
    }
  }

  return result.sort((a, b) => {
    if (a.scheduleType !== b.scheduleType) {
      return a.scheduleType === 'recurring' ? -1 : 1;
    }
    if (a.scheduleType === 'once' && b.scheduleType === 'once' && a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.time.localeCompare(b.time);
  });
}

export function sanitizeStudySchedule(
  raw: unknown,
  currentDateKey = getLocalDateKey(),
): StudyScheduleConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ...DEFAULT_STUDY_SCHEDULE,
      streakDaysOfWeek: [...DEFAULT_DAYS],
      daysOfWeek: [...DEFAULT_DAYS],
      completedDates: [],
      timeSlots: [],
    };
  }

  const r = raw as Record<string, unknown>;

  let streakMode: StreakGoalMode = 'every_day';
  if (r.streakMode === 'every_day' || r.streakMode === 'custom_weekly') {
    streakMode = r.streakMode;
  } else if (typeof r.isContinuousDaily === 'boolean') {
    streakMode = r.isContinuousDaily ? 'every_day' : 'custom_weekly';
  }

  const isContinuousDaily = streakMode === 'every_day';
  const rawStreakDays = r.streakDaysOfWeek ?? r.daysOfWeek;
  const streakDaysOfWeek = isContinuousDaily
    ? [...DEFAULT_DAYS]
    : sanitizeDaysArray(rawStreakDays, [1, 2, 3, 4, 5]);

  const completedDates = sanitizeCompletedDates(r.completedDates);
  const lastStudiedDate =
    typeof r.lastStudiedDate === 'string' && VALID_DATE_REGEX.test(r.lastStudiedDate)
      ? r.lastStudiedDate
      : completedDates.length > 0
        ? completedDates[completedDates.length - 1]
        : null;

  if (lastStudiedDate && !completedDates.includes(lastStudiedDate)) {
    completedDates.push(lastStudiedDate);
    completedDates.sort();
  }

  const timeSlots = sanitizeTimeSlots(r.timeSlots, currentDateKey, streakDaysOfWeek);
  const primaryTime = sanitizeTime(
    r.primaryTime,
    timeSlots[0]?.time ?? DEFAULT_STUDY_SCHEDULE.primaryTime,
  );

  const rawRepeat = Number(r.continuousRepeatMinutes);
  const continuousRepeatMinutes: RepeatIntervalMinutes =
    rawRepeat === 5 || rawRepeat === 10 || rawRepeat === 15
      ? rawRepeat
      : rawRepeat === 0
        ? 0
        : 5;

  const continuousRepeatEnabled =
    typeof r.continuousRepeatEnabled === 'boolean'
      ? r.continuousRepeatEnabled
      : continuousRepeatMinutes > 0;

  const targetExamLevel: JLPTExamLevelGoal =
    typeof r.targetExamLevel === 'string' &&
    JLPT_EXAM_LEVELS.includes(r.targetExamLevel as JLPTExamLevelGoal)
      ? (r.targetExamLevel as JLPTExamLevelGoal)
      : 'N3';

  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : true,
    primaryTime,
    timeSlots,
    streakMode,
    streakDaysOfWeek,
    completedDates,
    isContinuousDaily,
    daysOfWeek: streakDaysOfWeek,
    targetExamLevel,
    targetExamDate:
      typeof r.targetExamDate === 'string' && VALID_DATE_REGEX.test(r.targetExamDate)
        ? r.targetExamDate
        : '',
    continuousRepeatEnabled,
    continuousRepeatMinutes: continuousRepeatEnabled
      ? continuousRepeatMinutes === 0
        ? 5
        : continuousRepeatMinutes
      : 0,
    maxRepeatCount: 5,
    timezone:
      typeof r.timezone === 'string' && r.timezone.trim()
        ? r.timezone.trim().slice(0, 64)
        : DEFAULT_TIMEZONE,
    lastStudiedDate:
      completedDates.length > 0 ? completedDates[completedDates.length - 1] : lastStudiedDate,
    updatedAt:
      typeof r.updatedAt === 'string' && r.updatedAt
        ? r.updatedAt
        : new Date().toISOString(),
  };
}

/* ============================================================================
   STUDY STREAK CALCULATION ENGINE (MODE A: EVERY DAY vs MODE B: CUSTOM WEEKLY)
   ============================================================================ */

export function isRequiredStreakDay(
  dateKey: string,
  streakMode: StreakGoalMode,
  streakDaysOfWeek: number[],
): boolean {
  if (streakMode === 'every_day') return true;
  const weekday = getWeekdayForDateKey(dateKey);
  return streakDaysOfWeek.includes(weekday);
}

/**
 * Calculates Current Streak, Longest Streak, and Total Completed Days in `Asia/Ho_Chi_Minh`.
 * - Mode A (`every_day`): Every calendar day is required. Missing a day breaks the streak.
 * - Mode B (`custom_weekly`): Only selected `streakDaysOfWeek` are required; unselected days are rest days and do NOT break the streak.
 * - Sending a reminder notification NEVER counts as a completed day.
 */
export function calculateStudyStreakStats(
  config: Pick<StudyScheduleConfig, 'streakMode' | 'streakDaysOfWeek' | 'completedDates'>,
  currentDateKey = getLocalDateKey(),
): StudyStreakStats {
  const mode = config.streakMode || 'every_day';
  const reqDays = sanitizeDaysArray(config.streakDaysOfWeek, DEFAULT_DAYS);
  const cleanDates = sanitizeCompletedDates(config.completedDates).filter(
    (d) => d <= currentDateKey,
  );
  const completedSet = new Set<string>(cleanDates);

  const completedToday = completedSet.has(currentDateKey);
  const isRequiredToday = isRequiredStreakDay(currentDateKey, mode, reqDays);

  if (cleanDates.length === 0) {
    return {
      mode,
      currentStreak: 0,
      longestStreak: 0,
      totalCompletedDays: 0,
      completedToday: false,
      isRequiredToday,
    };
  }

  // 1. Calculate Current Streak walking backward from currentDateKey
  let currentStreak = 0;
  for (let offset = 0; offset <= 3650; offset++) {
    const dKey = addDaysToDateKey(currentDateKey, -offset);
    const isRequired = isRequiredStreakDay(dKey, mode, reqDays);
    const isCompleted = completedSet.has(dKey);

    if (mode === 'every_day') {
      if (isCompleted) {
        currentStreak += 1;
      } else if (offset === 0) {
        // Today is still in progress; check yesterday
        continue;
      } else {
        break;
      }
    } else {
      // Custom Weekly Mode: only selected required weekdays count toward or break the streak
      if (isRequired) {
        if (isCompleted) {
          currentStreak += 1;
        } else if (offset === 0) {
          // Today is still in progress
          continue;
        } else {
          break;
        }
      } else {
        // Unselected rest day — does not break streak
        continue;
      }
    }
  }

  // 2. Calculate Longest Streak walking forward from earliest completed date to currentDateKey
  const minDate = cleanDates[0];
  let longestStreak = 0;
  let running = 0;
  let cursor = minDate;
  let safety = 0;

  while (cursor <= currentDateKey && safety < 4000) {
    safety += 1;
    const isRequired = isRequiredStreakDay(cursor, mode, reqDays);
    const isCompleted = completedSet.has(cursor);

    if (mode === 'every_day') {
      if (isCompleted) {
        running += 1;
        if (running > longestStreak) longestStreak = running;
      } else if (cursor < currentDateKey) {
        running = 0;
      }
    } else {
      if (isRequired) {
        if (isCompleted) {
          running += 1;
          if (running > longestStreak) longestStreak = running;
        } else if (cursor < currentDateKey) {
          running = 0;
        }
      }
    }
    cursor = addDaysToDateKey(cursor, 1);
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return {
    mode,
    currentStreak,
    longestStreak,
    totalCompletedDays: completedSet.size,
    completedToday,
    isRequiredToday,
  };
}

export function loadStudySchedule(
  currentDateKey = getLocalDateKey(),
  explicitUserId?: string | null,
): StudyScheduleConfig {
  const uid = explicitUserId === undefined ? getActiveAuthenticatedUserId() : explicitUserId;
  if (!uid) {
    return sanitizeStudySchedule(null, currentDateKey);
  }
  const parsed = getInMemoryStudySchedule(uid);
  if (!parsed) return sanitizeStudySchedule(null, currentDateKey);
  const rawSlotCount = Array.isArray(parsed.timeSlots) ? parsed.timeSlots.length : 0;
  const clean = sanitizeStudySchedule(parsed, currentDateKey);
  if (rawSlotCount > clean.timeSlots.length) {
    setInMemoryStudySchedule(uid, clean as unknown as Record<string, unknown>);
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent<StudyScheduleConfig>(STUDY_SCHEDULE_SYNC_EVENT, { detail: clean }),
        );
      } catch {
        // Ignore in non-DOM environments
      }
    }
  }
  return clean;
}

export async function saveStudySchedule(
  next: Partial<StudyScheduleConfig>,
  userId?: string | null,
  currentDateKey = getLocalDateKey(),
): Promise<StudyScheduleConfig> {
  const effectiveUid = userId === undefined ? getActiveAuthenticatedUserId() : userId;
  if (!effectiveUid) {
    // Guests must not persist study progress, streak dates, or schedules
    return sanitizeStudySchedule(
      { ...next, completedDates: [], lastStudiedDate: null },
      currentDateKey,
    );
  }

  const current = loadStudySchedule(currentDateKey, effectiveUid);
  const nextPatch = { ...next };

  if (nextPatch.streakMode !== undefined) {
    nextPatch.isContinuousDaily = nextPatch.streakMode === 'every_day';
  } else if (nextPatch.isContinuousDaily !== undefined) {
    nextPatch.streakMode = nextPatch.isContinuousDaily ? 'every_day' : 'custom_weekly';
  }

  if (nextPatch.streakDaysOfWeek !== undefined) {
    nextPatch.daysOfWeek = nextPatch.streakDaysOfWeek;
  } else if (nextPatch.daysOfWeek !== undefined) {
    nextPatch.streakDaysOfWeek = nextPatch.daysOfWeek;
  }

  const merged = sanitizeStudySchedule(
    {
      ...current,
      ...nextPatch,
      updatedAt: new Date().toISOString(),
    },
    currentDateKey,
  );

  setInMemoryStudySchedule(effectiveUid, merged as unknown as Record<string, unknown>);
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent<StudyScheduleConfig>(STUDY_SCHEDULE_SYNC_EVENT, { detail: merged }),
      );
    } catch {
      // Ignore event errors in SSR
    }
  }

  if (supabase && effectiveUid && isSupabaseAccountUuid(effectiveUid)) {
    try {
      await supabase.from('user_reminders').upsert(
        {
          user_id: effectiveUid,
          enabled: merged.enabled,
          time_slots: merged.timeSlots,
          is_continuous_daily: merged.isContinuousDaily,
          days_of_week: merged.daysOfWeek,
          streak_mode: merged.streakMode,
          streak_days_of_week: merged.streakDaysOfWeek,
          completed_dates: merged.completedDates,
          target_exam_level: merged.targetExamLevel,
          target_exam_date: merged.targetExamDate,
          continuous_repeat_minutes: merged.continuousRepeatEnabled
            ? merged.continuousRepeatMinutes
            : 0,
          timezone: merged.timezone,
          updated_at: merged.updatedAt,
        },
        { onConflict: 'user_id' },
      );
    } catch {
      // Offline / RLS fallback — in-memory state remains authoritative locally
    }
  }

  return merged;
}

/**
 * Records a completed study date (`YYYY-MM-DD` in `Asia/Ho_Chi_Minh`).
 * Deduplicates automatically so completing multiple quizzes on the same day never creates duplicate entries.
 */
export async function recordStudyCompletion(
  dateKey = getLocalDateKey(),
  userId?: string | null,
): Promise<StudyScheduleConfig> {
  const effectiveUid = userId === undefined ? getActiveAuthenticatedUserId() : userId;
  if (!effectiveUid) {
    return sanitizeStudySchedule(null, dateKey);
  }
  const current = loadStudySchedule(dateKey, effectiveUid);
  const nextCompleted = sanitizeCompletedDates([...current.completedDates, dateKey]);
  return saveStudySchedule(
    {
      completedDates: nextCompleted,
      lastStudiedDate: dateKey,
    },
    effectiveUid,
    dateKey,
  );
}

export async function markTodayStudyStarted(userId?: string | null): Promise<StudyScheduleConfig> {
  const today = getLocalDateKey(new Date());
  return recordStudyCompletion(today, userId);
}

/* ============================================================================
   WEB ONLINE STUDY TIME TRACKER (COUNTS ACTIVE WEB TIME TOWARD DAILY STREAK)
   ============================================================================ */

export interface OnlineTimeSyncDetail {
  dateKey: string;
  todaySeconds: number;
  totalSeconds: number;
  streakAwardedToday: boolean;
}

export function loadOnlineTimeMap(explicitUserId?: string | null): Record<string, number> {
  const uid = explicitUserId === undefined ? getActiveAuthenticatedUserId() : explicitUserId;
  if (!uid) return {};
  const parsed = getInMemoryOnlineTime(uid);
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (VALID_DATE_REGEX.test(k)) {
      const secs = Math.floor(Number(v) || 0);
      if (secs > 0) {
        clean[k] = Math.min(secs, 86_400);
      }
    }
  }
  const keys = Object.keys(clean).sort().slice(-90);
  const trimmed: Record<string, number> = {};
  for (const key of keys) {
    trimmed[key] = clean[key];
  }
  return trimmed;
}

export function getTodayOnlineSeconds(
  dateKey = getLocalDateKey(),
  explicitUserId?: string | null,
): number {
  const map = loadOnlineTimeMap(explicitUserId);
  return map[dateKey] ?? 0;
}

export function getTotalOnlineSeconds(map = loadOnlineTimeMap()): number {
  return Object.values(map).reduce((sum, secs) => sum + (Number(secs) || 0), 0);
}

export function formatOnlineDurationVi(totalSeconds: number): string {
  const clean = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (clean < 60) {
    return `${clean} giây`;
  }
  const hours = Math.floor(clean / 3600);
  const mins = Math.floor((clean % 3600) / 60);
  const secs = clean % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}g ${mins}p` : `${hours} giờ`;
  }
  return secs > 0 ? `${mins}p ${String(secs).padStart(2, '0')}s` : `${mins} phút`;
}

export async function addOnlineStudySeconds(
  secondsToAdd: number,
  dateKey = getLocalDateKey(),
  userId?: string | null,
): Promise<OnlineTimeSyncDetail> {
  const effectiveUid = userId === undefined ? getActiveAuthenticatedUserId() : userId;
  if (!effectiveUid) {
    return {
      dateKey,
      todaySeconds: 0,
      totalSeconds: 0,
      streakAwardedToday: false,
    };
  }

  const increment = Math.max(0, Math.floor(Number(secondsToAdd) || 0));
  const map = loadOnlineTimeMap(effectiveUid);
  const nextToday = Math.min(86_400, (map[dateKey] ?? 0) + increment);

  if (increment > 0 && VALID_DATE_REGEX.test(dateKey)) {
    map[dateKey] = nextToday;
    setInMemoryOnlineTime(effectiveUid, map);
  }

  let streakAwardedToday = false;
  if (nextToday >= ONLINE_STREAK_THRESHOLD_SECONDS) {
    const current = loadStudySchedule(dateKey, effectiveUid);
    if (!current.completedDates.includes(dateKey)) {
      await recordStudyCompletion(dateKey, effectiveUid);
      streakAwardedToday = true;
    }
  }

  const detail: OnlineTimeSyncDetail = {
    dateKey,
    todaySeconds: nextToday,
    totalSeconds: getTotalOnlineSeconds(map),
    streakAwardedToday,
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<OnlineTimeSyncDetail>(ONLINE_TIME_SYNC_EVENT, { detail }));
  }

  return detail;
}

export function startWebOnlineTimeTracker(getUserId?: () => string | null | undefined): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let bufferedSeconds = 0;

  const resolveUid = () => getUserId?.() || getActiveAuthenticatedUserId();

  const flush = () => {
    const uid = resolveUid();
    if (!uid || bufferedSeconds <= 0) {
      bufferedSeconds = 0;
      return;
    }
    const toFlush = bufferedSeconds;
    bufferedSeconds = 0;
    const today = getLocalDateKey(new Date());
    void addOnlineStudySeconds(toFlush, today, uid);
  };

  const intervalId = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const uid = resolveUid();
    if (!uid) {
      bufferedSeconds = 0;
      return;
    }
    bufferedSeconds += 1;
    const currentToday = getTodayOnlineSeconds(getLocalDateKey(new Date()), uid) + bufferedSeconds;
    if (bufferedSeconds >= 5 || currentToday === ONLINE_STREAK_THRESHOLD_SECONDS) {
      flush();
    }
  }, 1000);

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  };

  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    flush();
    window.clearInterval(intervalId);
    window.removeEventListener('pagehide', flush);
    window.removeEventListener('beforeunload', flush);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

/**
 * Helper to create or update a single schedule item (`recurring` or `once`)
 * while preserving all other schedules untouched.
 */
export interface UpsertScheduleSlotInput {
  id?: string;
  scheduleType: ScheduleType;
  time: string;
  label: string;
  daysOfWeek?: number[];
  date?: string;
}

export async function upsertScheduleSlot(
  input: UpsertScheduleSlotInput,
  userId?: string | null,
  currentDateKey = getLocalDateKey(),
): Promise<{ ok: boolean; error?: string; schedule: StudyScheduleConfig; slot?: StudyTimeSlot }> {
  const current = loadStudySchedule(currentDateKey);
  const time = sanitizeTime(input.time, '');
  if (!time) {
    return {
      ok: false,
      error: 'Vui lòng chọn giờ nhắc hợp lệ (HH:MM).',
      schedule: current,
    };
  }

  const label = input.label.trim() ? input.label.trim().slice(0, 80) : 'Ôn từ vựng & Kanji';

  let nextSlot: StudyTimeSlot;
  if (input.scheduleType === 'recurring') {
    const rawDays = Array.isArray(input.daysOfWeek) ? input.daysOfWeek : [];
    const validDays = Array.from(
      new Set(
        rawDays
          .map((d) => Number(d))
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
      ),
    );
    if (validDays.length === 0) {
      return {
        ok: false,
        error: 'Vui lòng chọn ít nhất 1 thứ trong tuần cho lịch lặp hàng tuần.',
        schedule: current,
      };
    }
    const orderedDays = ALL_DAYS_ORDERED.filter((item) => validDays.includes(item.day)).map(
      (item) => item.day,
    );
    const slotId =
      input.id && input.id.trim()
        ? input.id.trim()
        : `slot-recurring-${time.replace(':', '')}-${orderedDays.join('')}`;

    nextSlot = {
      id: slotId,
      scheduleType: 'recurring',
      time,
      label,
      daysOfWeek: orderedDays,
      date: '',
      isDaily: true,
    };
  } else {
    const date = sanitizeDate(input.date, '');
    if (!date) {
      return {
        ok: false,
        error: 'Vui lòng chọn ngày cụ thể cho lịch nhắc 1 lần.',
        schedule: current,
      };
    }
    if (date < currentDateKey) {
      return {
        ok: false,
        error: 'Ngày đã chọn nằm trong quá khứ. Vui lòng chọn hôm nay hoặc ngày tiếp theo.',
        schedule: current,
      };
    }
    const slotId =
      input.id && input.id.trim()
        ? input.id.trim()
        : `slot-once-${date}-${time.replace(':', '')}`;

    nextSlot = {
      id: slotId,
      scheduleType: 'once',
      time,
      label,
      daysOfWeek: [],
      date,
      isDaily: false,
    };
  }

  const existingIndex = input.id
    ? current.timeSlots.findIndex((s) => s.id === input.id)
    : current.timeSlots.findIndex((s) => s.id === nextSlot.id);

  const nextSlots =
    existingIndex >= 0
      ? current.timeSlots.map((item, idx) => (idx === existingIndex ? nextSlot : item))
      : [...current.timeSlots, nextSlot];

  const updated = await saveStudySchedule(
    {
      timeSlots: nextSlots,
      primaryTime: nextSlots[0]?.time ?? time,
    },
    userId,
    currentDateKey,
  );

  return {
    ok: true,
    schedule: updated,
    slot: nextSlot,
  };
}

export async function deleteScheduleSlot(
  slotId: string,
  userId?: string | null,
  currentDateKey = getLocalDateKey(),
): Promise<StudyScheduleConfig> {
  const current = loadStudySchedule(currentDateKey);
  const nextSlots = current.timeSlots.filter((s) => s.id !== slotId);
  return saveStudySchedule(
    {
      timeSlots: nextSlots,
      primaryTime: nextSlots[0]?.time ?? current.primaryTime,
    },
    userId,
    currentDateKey,
  );
}

export async function cleanupExpiredOneTimeSchedules(
  userId?: string | null,
  currentDateKey = getLocalDateKey(),
): Promise<{ removedCount: number; schedule: StudyScheduleConfig }> {
  const effectiveUid = userId === undefined ? getActiveAuthenticatedUserId() : userId;
  if (!effectiveUid) {
    return {
      removedCount: 0,
      schedule: sanitizeStudySchedule(null, currentDateKey),
    };
  }
  const parsed = getInMemoryStudySchedule(effectiveUid);
  const rawCount = Array.isArray(parsed?.timeSlots) ? parsed.timeSlots.length : 0;
  const current = loadStudySchedule(currentDateKey, effectiveUid);
  const removedCount = Math.max(0, rawCount - current.timeSlots.length);
  if (removedCount > 0) {
    await saveStudySchedule({ timeSlots: current.timeSlots }, effectiveUid, currentDateKey);
  }
  return {
    removedCount,
    schedule: current,
  };
}

export async function syncStudyScheduleFromCloud(
  userId?: string | null,
): Promise<StudyScheduleConfig> {
  const local = loadStudySchedule(getLocalDateKey(), userId);
  if (!supabase || !userId || !isSupabaseAccountUuid(userId)) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from('user_reminders')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return local;

    const remoteUpdatedAt = typeof data.updated_at === 'string' ? Date.parse(data.updated_at) : 0;
    const localUpdatedAt = Date.parse(local.updatedAt) || 0;
    const mergedCompleted = sanitizeCompletedDates([
      ...local.completedDates,
      ...(Array.isArray(data.completed_dates) ? data.completed_dates : []),
    ]);

    if (localUpdatedAt > remoteUpdatedAt) {
      if (mergedCompleted.length > local.completedDates.length) {
        return saveStudySchedule({ completedDates: mergedCompleted }, userId);
      }
      return local;
    }

    const repeatMin = Number(data.continuous_repeat_minutes) || 0;
    const hydrated = sanitizeStudySchedule({
      ...local,
      enabled: data.enabled ?? local.enabled,
      timeSlots: data.time_slots ?? local.timeSlots,
      streakMode: data.streak_mode ?? (data.is_continuous_daily ? 'every_day' : 'custom_weekly'),
      streakDaysOfWeek: data.streak_days_of_week ?? data.days_of_week ?? local.streakDaysOfWeek,
      completedDates: mergedCompleted,
      targetExamLevel: data.target_exam_level ?? local.targetExamLevel,
      targetExamDate: data.target_exam_date ?? local.targetExamDate,
      isContinuousDaily: data.is_continuous_daily ?? local.isContinuousDaily,
      daysOfWeek: data.days_of_week ?? local.daysOfWeek,
      continuousRepeatEnabled: repeatMin > 0,
      continuousRepeatMinutes: repeatMin === 5 || repeatMin === 10 || repeatMin === 15 ? repeatMin : 5,
      timezone: data.timezone || local.timezone,
      updatedAt: data.updated_at || new Date().toISOString(),
    });

    try {
      setInMemoryStudySchedule(userId, hydrated as unknown as Record<string, unknown>);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent<StudyScheduleConfig>(STUDY_SCHEDULE_SYNC_EVENT, { detail: hydrated }),
        );
      }
    } catch {
      // Ignore
    }
    return hydrated;
  } catch {
    return local;
  }
}

/* ============================================================================
   NATIVE PHONE ALARM / CALENDAR SYNC (.ICS & GOOGLE CALENDAR)
   ============================================================================ */

function formatIcsLocalDateTime(dateStrOrObj: Date | string, timeStr: string): string {
  const [hh, mm] = sanitizeTime(timeStr, '20:00').split(':');
  if (typeof dateStrOrObj === 'string' && VALID_DATE_REGEX.test(dateStrOrObj)) {
    return `${dateStrOrObj.replace(/-/g, '')}T${hh}${mm}00`;
  }
  const dateKey = getLocalDateKey(
    dateStrOrObj instanceof Date ? dateStrOrObj : new Date(),
  );
  return `${dateKey.replace(/-/g, '')}T${hh}${mm}00`;
}

function addMinutesToDateAndTimeStr(
  baseDateKey: string,
  timeStr: string,
  minutesToAdd: number,
): { dateKey: string; timeStr: string } {
  const [hh, mm] = sanitizeTime(timeStr, '20:00').split(':').map(Number);
  const rawTotal = hh * 60 + mm + minutesToAdd;
  const dayOffset = Math.floor(rawTotal / (24 * 60));
  const total = ((rawTotal % (24 * 60)) + 24 * 60) % (24 * 60);
  const nextH = String(Math.floor(total / 60)).padStart(2, '0');
  const nextM = String(total % 60).padStart(2, '0');
  return {
    dateKey: dayOffset === 0 ? baseDateKey : addDaysToDateKey(baseDateKey, dayOffset),
    timeStr: `${nextH}:${nextM}`,
  };
}

export function buildRruleStringForDays(daysOfWeek: number[]): string {
  const cleanDays = sanitizeDaysArray(daysOfWeek);
  if (cleanDays.length >= 7) {
    return 'RRULE:FREQ=DAILY';
  }
  const byDays = ALL_DAYS_ORDERED.filter((d) => cleanDays.includes(d.day)).map(
    (d) => d.icsDay,
  );
  const dayList = byDays.length > 0 ? byDays.join(',') : 'MO,TU,WE,TH,FR,SA,SU';
  return `RRULE:FREQ=WEEKLY;BYDAY=${dayList}`;
}

export function buildRruleString(config: StudyScheduleConfig): string {
  if (config.isContinuousDaily) {
    return 'RRULE:FREQ=DAILY';
  }
  return buildRruleStringForDays(config.daysOfWeek);
}

export function buildGoogleCalendarUrl(
  config: StudyScheduleConfig,
  slot?: StudyTimeSlot,
): string {
  const clean = sanitizeStudySchedule(config);
  const todayKey = getLocalDateKey();
  const activeSlot: StudyTimeSlot = slot ??
    clean.timeSlots[0] ?? {
      id: 'default',
      scheduleType: 'recurring',
      time: clean.primaryTime,
      label: 'Ôn từ vựng & Kanji',
      daysOfWeek: clean.isContinuousDaily ? [...DEFAULT_DAYS] : clean.daysOfWeek,
      date: '',
      isDaily: true,
    };
  const isRecurring = activeSlot.scheduleType === 'recurring';
  const baseDate = isRecurring ? todayKey : activeSlot.date || todayKey;
  const dtStart = formatIcsLocalDateTime(baseDate, activeSlot.time);
  const endSlot = addMinutesToDateAndTimeStr(baseDate, activeSlot.time, 30);
  const dtEnd = formatIcsLocalDateTime(endSlot.dateKey, endSlot.timeStr);
  const appUrl =
    typeof window !== 'undefined' && window.location
      ? `${window.location.origin}${window.location.pathname}#/vocabulary/review`
      : 'https://duy18nd.github.io/Quizz_App_NiHon/#/vocabulary/review';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `🇯🇵 Học tiếng Nhật — ${activeSlot.label} (Nihongo 問)`,
    dates: `${dtStart}/${dtEnd}`,
    details: `Nhắc giờ học tiếng Nhật trên Nihongo 問.\nVào học ngay: ${appUrl}`,
    ctz: clean.timezone || DEFAULT_TIMEZONE,
  });

  if (isRecurring) {
    const slotRrule =
      activeSlot.daysOfWeek && activeSlot.daysOfWeek.length > 0
        ? buildRruleStringForDays(activeSlot.daysOfWeek)
        : buildRruleString(clean);
    params.set('recur', slotRrule);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildExamGoogleCalendarUrl(
  level: JLPTExamLevelGoal,
  examDate: string,
  reminderOffsetDays: 0 | 7 | 30 = 0,
  todayKey = getLocalDateKey(),
): string {
  const cleanDate = VALID_DATE_REGEX.test(examDate) ? examDate : todayKey;
  const appUrl =
    typeof window !== 'undefined' && window.location
      ? `${window.location.origin}${window.location.pathname}#/jlpt/full-test`
      : 'https://duy18nd.github.io/QuizzApp_Japan/#/jlpt/full-test';

  if (reminderOffsetDays > 0) {
    const rawReminderDate = addDaysToDateKey(cleanDate, -reminderOffsetDays);
    const targetDate = rawReminderDate < todayKey ? todayKey : rawReminderDate;
    const dtStart = formatIcsLocalDateTime(targetDate, '20:00');
    const dtEnd = formatIcsLocalDateTime(targetDate, '20:30');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `⏳ Còn ${reminderOffsetDays} ngày tới kỳ thi JLPT ${level} — Ôn nước rút (Nihongo 問)`,
      dates: `${dtStart}/${dtEnd}`,
      details: `Ngày thi JLPT ${level} dự kiến: ${formatVietnameseDateWithWeekday(cleanDate)}.\nLàm đề thi thử ngay tại: ${appUrl}`,
      ctz: DEFAULT_TIMEZONE,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  const dtStart = formatIcsLocalDateTime(cleanDate, '08:30');
  const dtEnd = formatIcsLocalDateTime(cleanDate, '12:00');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `🎯 Ngày thi JLPT ${level} — Mục tiêu (Nihongo 問)`,
    dates: `${dtStart}/${dtEnd}`,
    details: `Ngày thi mục tiêu JLPT ${level}.\nÔn tập tổng hợp trước giờ thi: ${appUrl}`,
    ctz: DEFAULT_TIMEZONE,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
