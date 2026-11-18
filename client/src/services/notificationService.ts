import {
  cancelNativeSlotNotifications,
  getNativeNotificationPermissionState,
  getNativePlatformKind,
  isNativeCapacitorPlatform,
  loadLastNativeSyncStatus,
  NATIVE_NOTIFICATION_SYNC_EVENT,
  requestNativeNotificationPermission,
  sendTestNativeLocalNotification,
  startNativeNotificationListeners,
  syncNativeStudySchedules,
  type NativePlatformKind,
  type NativeScheduleSyncStatus,
} from './nativeNotificationService';
import { supabase } from './supabaseClient';

export {
  getNativeNotificationPermissionState,
  getNativePlatformKind,
  isNativeCapacitorPlatform,
  loadLastNativeSyncStatus,
  NATIVE_NOTIFICATION_SYNC_EVENT,
  syncNativeStudySchedules,
  type NativePlatformKind,
  type NativeScheduleSyncStatus,
};

export const STUDY_SCHEDULE_STORAGE_KEY = 'nihonmaster_study_schedule';
export const STUDY_SCHEDULE_FIRED_STORAGE_KEY = 'nihonmaster_study_fired_keys';
export const PUSH_DEVICES_STORAGE_KEY = 'nihonmaster_push_devices_v1';
export const CURRENT_DEVICE_ID_KEY = 'nihonmaster_device_id_v1';
export const STUDY_SCHEDULE_SYNC_EVENT = 'nihonmaster:study-schedule-sync';
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

export function loadStudySchedule(currentDateKey = getLocalDateKey()): StudyScheduleConfig {
  if (typeof window === 'undefined' || !window.localStorage) {
    return sanitizeStudySchedule(null, currentDateKey);
  }
  try {
    const raw = window.localStorage.getItem(STUDY_SCHEDULE_STORAGE_KEY);
    if (!raw) return sanitizeStudySchedule(null, currentDateKey);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const rawSlotCount = Array.isArray(parsed?.timeSlots) ? parsed.timeSlots.length : 0;
    const clean = sanitizeStudySchedule(parsed, currentDateKey);
    if (rawSlotCount > clean.timeSlots.length) {
      window.localStorage.setItem(STUDY_SCHEDULE_STORAGE_KEY, JSON.stringify(clean));
      try {
        window.dispatchEvent(
          new CustomEvent<StudyScheduleConfig>(STUDY_SCHEDULE_SYNC_EVENT, { detail: clean }),
        );
      } catch {
        // Ignore in non-DOM environments
      }
    }
    return clean;
  } catch {
    return sanitizeStudySchedule(null, currentDateKey);
  }
}

export async function saveStudySchedule(
  next: Partial<StudyScheduleConfig>,
  userId?: string | null,
  currentDateKey = getLocalDateKey(),
): Promise<StudyScheduleConfig> {
  const current = loadStudySchedule(currentDateKey);
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

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STUDY_SCHEDULE_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Ignore quota / private browsing errors
    }
    try {
      window.dispatchEvent(
        new CustomEvent<StudyScheduleConfig>(STUDY_SCHEDULE_SYNC_EVENT, { detail: merged }),
      );
    } catch {
      // Ignore event errors in SSR
    }
  }

  if (supabase && userId && !userId.startsWith('quick-test-')) {
    try {
      await supabase.from('user_reminders').upsert(
        {
          user_id: userId,
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

      // Keep subscribed push devices' schedule_snapshot in sync for background push worker
      const deviceId = getCurrentDeviceId();
      await supabase
        .from('push_subscriptions')
        .update({
          timezone: merged.timezone,
          schedule_snapshot: {
            enabled: merged.enabled,
            timeSlots: merged.timeSlots,
            continuousRepeatMinutes: merged.continuousRepeatEnabled
              ? merged.continuousRepeatMinutes
              : 0,
            completedDates: merged.completedDates,
          },
          updated_at: merged.updatedAt,
        })
        .eq('user_id', userId)
        .eq('device_id', deviceId);
    } catch {
      // Offline / RLS fallback — localStorage remains authoritative locally
    }
  }

  if (isNativeCapacitorPlatform()) {
    void syncNativeStudySchedules(merged);
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
  const current = loadStudySchedule(dateKey);
  const nextCompleted = sanitizeCompletedDates([...current.completedDates, dateKey]);
  return saveStudySchedule(
    {
      completedDates: nextCompleted,
      lastStudiedDate: dateKey,
    },
    userId,
    dateKey,
  );
}

export async function markTodayStudyStarted(userId?: string | null): Promise<StudyScheduleConfig> {
  const today = getLocalDateKey(new Date());
  return recordStudyCompletion(today, userId);
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
  clearFiredKeysForSlot(slotId);
  if (isNativeCapacitorPlatform()) {
    void cancelNativeSlotNotifications(slotId);
  }
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
  let rawCount = 0;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STUDY_SCHEDULE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (Array.isArray(parsed?.timeSlots)) {
          rawCount = parsed.timeSlots.length;
        }
      }
    } catch {
      // Ignore
    }
  }
  const current = loadStudySchedule(currentDateKey);
  const removedCount = Math.max(0, rawCount - current.timeSlots.length);
  if (removedCount > 0 && userId) {
    await saveStudySchedule({ timeSlots: current.timeSlots }, userId, currentDateKey);
  }
  return {
    removedCount,
    schedule: current,
  };
}

export async function syncStudyScheduleFromCloud(
  userId?: string | null,
): Promise<StudyScheduleConfig> {
  const local = loadStudySchedule();
  if (!supabase || !userId || userId.startsWith('quick-test-')) {
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
      window.localStorage.setItem(STUDY_SCHEDULE_STORAGE_KEY, JSON.stringify(hydrated));
      window.dispatchEvent(
        new CustomEvent<StudyScheduleConfig>(STUDY_SCHEDULE_SYNC_EVENT, { detail: hydrated }),
      );
    } catch {
      // Ignore
    }
    if (isNativeCapacitorPlatform()) {
      void syncNativeStudySchedules(hydrated);
    }
    return hydrated;
  } catch {
    return local;
  }
}

/* ============================================================================
   CROSS-PLATFORM DEVICE DETECTION & MULTI-DEVICE WEB PUSH SUBSCRIPTIONS
   ============================================================================ */

export interface DeviceCompatibilityInfo {
  platform:
    | 'windows-pc'
    | 'mac-desktop'
    | 'ios-native'
    | 'android-native'
    | 'ios-pwa'
    | 'ios-browser'
    | 'android'
    | 'other';
  platformLabel: string;
  browser: 'Chrome' | 'Edge' | 'Safari' | 'Firefox' | 'Capacitor' | 'Other';
  nativePlatform: NativePlatformKind;
  isNativeApp: boolean;
  isIos: boolean;
  iosVersion: number | null;
  isStandalonePwa: boolean;
  requiresIosHomeScreenInstall: boolean;
  nativeLocalNotificationsSupported: boolean;
  supportsRemoveFromHomeScreen: boolean;
  webPushSupported: boolean;
  notificationSupported: boolean;
  compatibilitySummary: string;
}

export interface PushDeviceSubscriptionRecord {
  id: string;
  deviceId: string;
  deviceLabel: string;
  platform: string;
  browser: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
  timezone: string;
  updatedAt: string;
}

export function getCurrentDeviceId(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'server-device-default';
  }
  try {
    const existing = window.localStorage.getItem(CURRENT_DEVICE_ID_KEY);
    if (existing && existing.trim()) return existing.trim();
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `dev-${crypto.randomUUID().slice(0, 12)}`
        : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    window.localStorage.setItem(CURRENT_DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return 'dev-local-fallback';
  }
}

export function detectDevicePushCompatibility(
  customUa?: string,
  customStandalone?: boolean,
  customNativePlatform?: NativePlatformKind,
): DeviceCompatibilityInfo {
  const nativePlatform = customNativePlatform ?? getNativePlatformKind();
  const isNativeApp = nativePlatform === 'ios' || nativePlatform === 'android';

  const ua =
    customUa ??
    (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');

  const isStandalonePwa =
    customStandalone !== undefined
      ? customStandalone
      : typeof window !== 'undefined' &&
        ((typeof window.matchMedia === 'function' &&
          window.matchMedia('(display-mode: standalone)').matches) ||
          Boolean((navigator as { standalone?: boolean }).standalone));

  const isIos = nativePlatform === 'ios' || /iPad|iPhone|iPod/.test(ua);
  const iosMatch = ua.match(/OS (\d+)[._](\d+)/);
  const iosVersion = iosMatch ? Number(`${iosMatch[1]}.${iosMatch[2]}`) : null;
  const isAndroid = nativePlatform === 'android' || /Android/i.test(ua);
  const isWindows = /Windows NT/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isIos;

  let browser: DeviceCompatibilityInfo['browser'] = 'Other';
  if (isNativeApp) {
    browser = 'Capacitor';
  } else if (/Edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = 'Chrome';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Firefox';
  } else if (/Safari\//i.test(ua)) {
    browser = 'Safari';
  }

  let platform: DeviceCompatibilityInfo['platform'] = 'other';
  let platformLabel = 'Thiết bị trình duyệt';
  if (nativePlatform === 'ios') {
    platform = 'ios-native';
    platformLabel = 'iPhone / iPad Native App (iOS · UNUserNotificationCenter)';
  } else if (nativePlatform === 'android') {
    platform = 'android-native';
    platformLabel = 'Android Native App (Capacitor · AlarmManager)';
  } else if (isIos) {
    platform = isStandalonePwa ? 'ios-pwa' : 'ios-browser';
    platformLabel = isStandalonePwa
      ? 'iPhone / iPad (PWA Màn hình chính · Web Push)'
      : 'iPhone / iPad (Trình duyệt Safari — Cần cài Màn hình chính hoặc dùng App Native)';
  } else if (isAndroid) {
    platform = 'android';
    platformLabel = `Android (${browser})`;
  } else if (isWindows) {
    platform = 'windows-pc';
    platformLabel = `Windows PC / Laptop (${browser})`;
  } else if (isMac) {
    platform = 'mac-desktop';
    platformLabel = `Mac / Desktop (${browser})`;
  }

  const notificationSupported =
    isNativeApp ||
    customUa !== undefined ||
    (typeof window !== 'undefined' && 'Notification' in window);
  const swAndPushSupported =
    !isNativeApp &&
    (customUa !== undefined ||
      (typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window));

  const requiresIosHomeScreenInstall = !isNativeApp && isIos && !isStandalonePwa;
  const iosVersionSupported = !isIos || iosVersion === null || iosVersion >= 16.4;
  const nativeLocalNotificationsSupported = isNativeApp;
  const supportsRemoveFromHomeScreen = isNativeApp;
  const webPushSupported =
    !isNativeApp &&
    notificationSupported &&
    swAndPushSupported &&
    !requiresIosHomeScreenInstall &&
    iosVersionSupported;

  let compatibilitySummary =
    'Hỗ trợ đầy đủ Web Push & Service Worker (nhận thông báo cả khi đóng tab).';
  if (platform === 'ios-native') {
    compatibilitySummary =
      'Ứng dụng iOS Native dùng Apple UNUserNotificationCenter & UNCalendarNotificationTrigger: tự động nhắc đúng giờ kể cả khi thoát app, khóa màn hình, đóng ở App Switcher, khởi động lại máy hoặc chọn "Xóa khỏi Màn hình chính" (giữ app trong Thư viện ứng dụng).';
  } else if (platform === 'android-native') {
    compatibilitySummary =
      'Ứng dụng Android Native dùng AlarmManager chính xác và khôi phục lịch sau khi khởi động lại máy.';
  } else if (requiresIosHomeScreenInstall) {
    compatibilitySummary =
      'Trên iPhone/iPad (iOS/iPadOS 16.4+): Bản Web cần bấm Chia sẻ ➔ Thêm vào Màn hình chính (và giữ biểu tượng PWA trên Màn hình chính). Nếu muốn xóa biểu tượng khỏi Màn hình chính mà vẫn nhận nhắc học, hãy dùng ứng dụng Native iOS (Capacitor).';
  } else if (platform === 'ios-pwa') {
    compatibilitySummary =
      'Đang chạy PWA Màn hình chính: hỗ trợ Web Push (APNs). Lưu ý không xóa biểu tượng PWA khỏi Màn hình chính để giữ Web Push; chỉ ứng dụng iOS Native mới tiếp tục nhắc khi ẩn icon vào Thư viện ứng dụng.';
  } else if (isIos && !iosVersionSupported) {
    compatibilitySummary =
      'Thiết bị iOS/iPadOS cần phiên bản 16.4 trở lên và cài đặt ra Màn hình chính để nhận Web Push.';
  } else if (!webPushSupported) {
    compatibilitySummary =
      'Trình duyệt hiện tại hạn chế Push API nền; bạn vẫn có thể đồng bộ lịch .ics / Google Calendar.';
  }

  return {
    platform,
    platformLabel,
    browser,
    nativePlatform,
    isNativeApp,
    isIos,
    iosVersion,
    isStandalonePwa,
    requiresIosHomeScreenInstall,
    nativeLocalNotificationsSupported,
    supportsRemoveFromHomeScreen,
    webPushSupported,
    notificationSupported,
    compatibilitySummary,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof globalThis.atob === 'function' ? globalThis.atob(base64) : '';
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function loadLocalPushDevices(): PushDeviceSubscriptionRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(PUSH_DEVICES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PushDeviceSubscriptionRecord =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof item.deviceId === 'string' &&
            typeof item.endpoint === 'string' &&
            typeof item.p256dh === 'string' &&
            typeof item.auth === 'string',
        ),
    );
  } catch {
    return [];
  }
}

function saveLocalPushDevices(devices: PushDeviceSubscriptionRecord[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(PUSH_DEVICES_STORAGE_KEY, JSON.stringify(devices));
  } catch {
    // Ignore quota errors
  }
}

export async function listSubscribedDevices(
  userId?: string | null,
): Promise<PushDeviceSubscriptionRecord[]> {
  const localDevices = loadLocalPushDevices();
  if (!supabase || !userId || userId.startsWith('quick-test-')) {
    return localDevices;
  }

  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true)
      .order('updated_at', { ascending: false });

    if (error || !data) return localDevices;

    const byDeviceId = new Map<string, PushDeviceSubscriptionRecord>();
    for (const row of data) {
      byDeviceId.set(String(row.device_id), {
        id: String(row.id),
        deviceId: String(row.device_id),
        deviceLabel: String(row.device_label || 'Thiết bị học tập'),
        platform: String(row.platform || 'unknown'),
        browser: String(row.browser || 'unknown'),
        endpoint: String(row.endpoint),
        p256dh: String(row.p256dh),
        auth: String(row.auth),
        enabled: Boolean(row.enabled),
        timezone: String(row.timezone || DEFAULT_TIMEZONE),
        updatedAt: String(row.updated_at || new Date().toISOString()),
      });
    }
    for (const local of localDevices) {
      if (!byDeviceId.has(local.deviceId)) {
        byDeviceId.set(local.deviceId, local);
      }
    }
    const merged = Array.from(byDeviceId.values());
    saveLocalPushDevices(merged);
    return merged;
  } catch {
    return localDevices;
  }
}

export interface SubscribeDeviceOptions {
  userId?: string | null;
  deviceId?: string;
  deviceLabel?: string;
  platform?: string;
  browser?: string;
  customSubscription?: {
    endpoint: string;
    p256dh: string;
    auth: string;
  };
}

export async function subscribeDeviceToWebPush(
  options: SubscribeDeviceOptions = {},
): Promise<{
  ok: boolean;
  error?: string;
  device?: PushDeviceSubscriptionRecord;
  devices: PushDeviceSubscriptionRecord[];
}> {
  const compat = detectDevicePushCompatibility();
  if (!options.customSubscription && compat.requiresIosHomeScreenInstall) {
    return {
      ok: false,
      error:
        'Trên iPhone/iPad: Vui lòng bấm nút Chia sẻ (Share) ➔ Thêm vào Màn hình chính (Add to Home Screen) rồi mở ứng dụng từ Màn hình chính để bật Web Push.',
      devices: loadLocalPushDevices(),
    };
  }

  const deviceId = options.deviceId || getCurrentDeviceId();
  const deviceLabel = options.deviceLabel || compat.platformLabel;
  const platform = options.platform || compat.platform;
  const browser = options.browser || compat.browser;

  let endpoint = options.customSubscription?.endpoint || '';
  let p256dh = options.customSubscription?.p256dh || '';
  let auth = options.customSubscription?.auth || '';

  if (!options.customSubscription) {
    const perm = await requestStudyNotificationPermission();
    if (perm !== 'granted') {
      return {
        ok: false,
        error: 'Chưa được cấp quyền thông báo. Vui lòng cho phép thông báo trên trình duyệt.',
        devices: loadLocalPushDevices(),
      };
    }

    const reg = (await registerStudyServiceWorker()) ??
      (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
        ? await navigator.serviceWorker.ready.catch(() => null)
        : null);
    const vapidPublicKey =
      (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() || '';

    if (!reg || !reg.pushManager) {
      return {
        ok: false,
        error:
          'Trình duyệt hiện tại không hỗ trợ Service Worker PushManager. Trên iPhone, hãy cài ứng dụng ra Màn hình chính (iOS 16.4+).',
        devices: loadLocalPushDevices(),
      };
    }

    if (!vapidPublicKey) {
      return {
        ok: false,
        error: 'Chưa cấu hình khóa công khai VITE_VAPID_PUBLIC_KEY trong môi trường.',
        devices: loadLocalPushDevices(),
      };
    }

    try {
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }
      const subJson = sub.toJSON();
      endpoint = subJson.endpoint || '';
      p256dh = subJson.keys?.p256dh || '';
      auth = subJson.keys?.auth || '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PushManager.subscribe failed';
      return {
        ok: false,
        error: `Không thể đăng ký Web Push với máy chủ thông báo (APNs/FCM): ${msg}`,
        devices: loadLocalPushDevices(),
      };
    }
  }

  if (!endpoint || !p256dh || !auth) {
    return {
      ok: false,
      error: 'Thông tin đăng ký Push Subscription không hợp lệ (thiếu endpoint hoặc khóa mã hóa).',
      devices: loadLocalPushDevices(),
    };
  }

  const schedule = loadStudySchedule();
  const nowIso = new Date().toISOString();
  const record: PushDeviceSubscriptionRecord = {
    id: `push-${deviceId}`,
    deviceId,
    deviceLabel,
    platform,
    browser,
    endpoint,
    p256dh,
    auth,
    enabled: true,
    timezone: schedule.timezone || DEFAULT_TIMEZONE,
    updatedAt: nowIso,
  };

  // Deduplicate by deviceId and endpoint so multiple devices coexist cleanly without duplicates
  const existing = loadLocalPushDevices().filter(
    (d) => d.deviceId !== deviceId && d.endpoint !== endpoint,
  );
  const nextDevices = [record, ...existing];
  saveLocalPushDevices(nextDevices);

  if (supabase && options.userId && !options.userId.startsWith('quick-test-')) {
    try {
      await supabase.from('push_subscriptions').upsert(
        {
          user_id: options.userId,
          device_id: record.deviceId,
          device_label: record.deviceLabel,
          platform: record.platform,
          browser: record.browser,
          endpoint: record.endpoint,
          p256dh: record.p256dh,
          auth: record.auth,
          enabled: true,
          timezone: record.timezone,
          schedule_snapshot: {
            enabled: schedule.enabled,
            timeSlots: schedule.timeSlots,
            continuousRepeatMinutes: schedule.continuousRepeatEnabled
              ? schedule.continuousRepeatMinutes
              : 0,
            completedDates: schedule.completedDates,
          },
          updated_at: nowIso,
        },
        { onConflict: 'user_id,device_id' },
      );
    } catch {
      // Keep local subscription record when offline
    }
  }

  return {
    ok: true,
    device: record,
    devices: nextDevices,
  };
}

/**
 * Removes/unsubscribes a single device subscription without affecting other subscribed devices.
 */
export async function unsubscribeDeviceFromWebPush(
  targetDeviceId: string,
  userId?: string | null,
): Promise<PushDeviceSubscriptionRecord[]> {
  if (targetDeviceId === getCurrentDeviceId()) {
    const reg = await registerStudyServiceWorker();
    if (reg && reg.pushManager) {
      try {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
      } catch {
        // Ignore
      }
    }
  }

  const remaining = loadLocalPushDevices().filter((d) => d.deviceId !== targetDeviceId);
  saveLocalPushDevices(remaining);

  if (supabase && userId && !userId.startsWith('quick-test-')) {
    try {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('device_id', targetDeviceId);
    } catch {
      // Ignore offline errors
    }
  }

  return remaining;
}

/* ============================================================================
   PURE SCHEDULE TRIGGER MATCHING & DUPLICATE PREVENTION
   ============================================================================ */

export function shouldScheduleSlotTriggerOnDate(
  slot: StudyTimeSlot,
  partsOrDate: TimezoneDateParts | Date,
  timeZone = DEFAULT_TIMEZONE,
): boolean {
  const parts =
    partsOrDate instanceof Date ? getNowInTimezone(partsOrDate, timeZone) : partsOrDate;

  if (slot.scheduleType === 'once') {
    if (!slot.date || slot.date !== parts.dateKey) return false;
    return true;
  }

  return Array.isArray(slot.daysOfWeek) && slot.daysOfWeek.includes(parts.weekday);
}

export function shouldScheduleSlotFireAtExactTime(
  slot: StudyTimeSlot,
  partsOrDate: TimezoneDateParts | Date,
  timeZone = DEFAULT_TIMEZONE,
): boolean {
  const parts =
    partsOrDate instanceof Date ? getNowInTimezone(partsOrDate, timeZone) : partsOrDate;
  if (!shouldScheduleSlotTriggerOnDate(slot, parts, timeZone)) return false;
  return slot.time === parts.timeKey;
}

const memoryFiredKeys = new Set<string>();

function loadPersistedFiredKeys(currentDateKey: string): Set<string> {
  const active = new Set<string>();
  for (const k of memoryFiredKeys) {
    if (k.startsWith(`${currentDateKey}::`)) {
      active.add(k);
    }
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STUDY_SCHEDULE_FIRED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const k of parsed) {
            if (typeof k === 'string' && k.startsWith(`${currentDateKey}::`)) {
              active.add(k);
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  }
  return active;
}

function recordFiredKey(fireKey: string, currentDateKey: string): void {
  memoryFiredKeys.add(fireKey);
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const active = loadPersistedFiredKeys(currentDateKey);
    active.add(fireKey);
    window.localStorage.setItem(
      STUDY_SCHEDULE_FIRED_STORAGE_KEY,
      JSON.stringify(Array.from(active)),
    );
  } catch {
    // Ignore
  }
}

export function hasFiredNotificationKey(fireKey: string, currentDateKey: string): boolean {
  return loadPersistedFiredKeys(currentDateKey).has(fireKey);
}

export function clearFiredKeysForSlot(slotId: string): void {
  for (const k of Array.from(memoryFiredKeys)) {
    if (k.includes(`::${slotId}::`)) {
      memoryFiredKeys.delete(k);
    }
  }
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(STUDY_SCHEDULE_FIRED_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter(
        (k): k is string => typeof k === 'string' && !k.includes(`::${slotId}::`),
      );
      window.localStorage.setItem(STUDY_SCHEDULE_FIRED_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {
    // Ignore
  }
}

/* ============================================================================
   SERVICE WORKER & WEB NOTIFICATION ENGINE
   ============================================================================ */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotificationPermissionState(): NotificationPermissionStatus {
  if (typeof window === 'undefined') {
    return 'unsupported';
  }
  if (isNativeCapacitorPlatform()) {
    return loadLastNativeSyncStatus().permission;
  }
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

export async function getEffectiveNotificationPermissionState(): Promise<NotificationPermissionStatus> {
  if (isNativeCapacitorPlatform()) {
    return getNativeNotificationPermissionState();
  }
  return getNotificationPermissionState();
}

export function isIosDevice(): boolean {
  if (isNativeCapacitorPlatform() && getNativePlatformKind() === 'ios') return true;
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export async function registerStudyServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (
    isNativeCapacitorPlatform() ||
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return null;
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .catch(() => null);
  }
  return swRegistrationPromise;
}

export async function requestStudyNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (isNativeCapacitorPlatform()) {
    return requestNativeNotificationPermission(loadStudySchedule());
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      await registerStudyServiceWorker();
    }
    return result as NotificationPermissionStatus;
  } catch {
    return getNotificationPermissionState();
  }
}

export interface StudyNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  deliveryKey?: string;
  slotId?: string;
  slotTime?: string;
  snoozeMinutes?: number;
  requireInteraction?: boolean;
}

export async function sendStudyNotification(
  payload: StudyNotificationPayload,
): Promise<{ ok: boolean; reason?: string }> {
  const permission = getNotificationPermissionState();
  if (permission === 'unsupported') {
    return {
      ok: false,
      reason: 'Trình duyệt hiện tại không hỗ trợ Web Notification API.',
    };
  }

  // Requirement 10: Never request permission automatically inside sendStudyNotification.
  // Permission must ONLY be requested when the user explicitly clicks Enable Notifications.
  if (permission !== 'granted') {
    return {
      ok: false,
      reason:
        'Chưa cấp quyền thông báo. Vui lòng bấm nút "Bật quyền thông báo (Enable Notifications)" trước.',
    };
  }

  const targetUrl = payload.url || './#/vocabulary/review';
  const uniqueTag = payload.deliveryKey || payload.tag || 'nihongo-study-reminder';
  const reg =
    (await registerStudyServiceWorker()) ??
    (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      ? await navigator.serviceWorker.ready.catch(() => null)
      : null);

  // Requirement 4: Always use ServiceWorkerRegistration.showNotification() (required on iOS/Android PWA)
  // instead of the page-level `new Notification()` constructor.
  if (!reg || typeof reg.showNotification !== 'function') {
    return {
      ok: false,
      reason:
        'Service Worker chưa sẵn sàng để hiển thị thông báo (ServiceWorkerRegistration.showNotification). Hãy tải lại trang hoặc mở từ Màn hình chính.',
    };
  }

  try {
    await reg.showNotification(payload.title, {
      body: payload.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: uniqueTag,
      requireInteraction: Boolean(payload.requireInteraction),
      data: {
        url: targetUrl,
        deliveryKey: uniqueTag,
        slotId: payload.slotId || null,
        slotTime: payload.slotTime || null,
        snoozeMinutes: payload.snoozeMinutes || 5,
      },
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Không thể hiển thị thông báo qua Service Worker.',
    };
  }
}

/**
 * Dedicated Test Push Notification dispatcher:
 * 1. If the current device has a real Web Push subscription (APNs/FCM/WNS) and Supabase Edge Function
 *    `send-study-reminders` is reachable, requests a real server-dispatched encrypted Web Push
 *    (with optional `delaySeconds` so the user can lock the iPhone screen or close the PWA).
 * 2. Otherwise falls back to ServiceWorkerRegistration.showNotification() and reports the exact channel used.
 */
export async function sendTestPushNotification(options: {
  userId?: string | null;
  delaySeconds?: number;
  schedulePrimaryTime?: string;
} = {}): Promise<{
  ok: boolean;
  channel: 'native_local' | 'server_web_push' | 'service_worker';
  triggerAtIso?: string;
  reason?: string;
}> {
  const delaySec = Math.max(0, Math.min(10, Number(options.delaySeconds) || 0));

  if (isNativeCapacitorPlatform()) {
    const nativeRes = await sendTestNativeLocalNotification(
      Math.max(1, delaySec || 2),
      options.schedulePrimaryTime || '20:00',
    );
    return {
      ok: nativeRes.ok,
      channel: 'native_local',
      triggerAtIso: nativeRes.triggerAtIso,
      reason: nativeRes.reason,
    };
  }

  const permission = getNotificationPermissionState();
  if (permission !== 'granted') {
    return {
      ok: false,
      channel: 'service_worker',
      reason:
        'Chưa cấp quyền thông báo. Vui lòng bấm nút "Bật quyền thông báo (Enable Notifications)" trước khi gửi Test Push.',
    };
  }
  const currentDeviceId = getCurrentDeviceId();
  const currentSub = loadLocalPushDevices().find(
    (d) => d.deviceId === currentDeviceId && d.enabled,
  );

  if (
    supabase &&
    currentSub &&
    currentSub.endpoint.startsWith('https://') &&
    currentSub.p256dh &&
    currentSub.auth
  ) {
    try {
      const { data, error } = await supabase.functions.invoke('send-study-reminders', {
        body: {
          action: 'test_push',
          delaySeconds: delaySec,
          title: '📲 Test Push Notification (APNs / Web Push) — Nihongo 問',
          body: `Thông báo đẩy nền từ máy chủ (${options.schedulePrimaryTime || '20:00'}) đã gửi thành công tới thiết bị của bạn!`,
          subscription: {
            endpoint: currentSub.endpoint,
            p256dh: currentSub.p256dh,
            auth: currentSub.auth,
          },
        },
      });
      if (!error && data && data.ok) {
        return { ok: true, channel: 'server_web_push' };
      }
    } catch {
      // Fallback to ServiceWorkerRegistration below if Edge Function is not deployed yet
    }
  }

  if (delaySec > 0) {
    await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
  }

  const swRes = await sendStudyNotification({
    title: '🔔 Thông báo thử nghiệm (Service Worker) — Nihongo 問',
    body: `ServiceWorkerRegistration.showNotification (${options.schedulePrimaryTime || '20:00'}) đã hoạt động! Để nhận khi đóng hẳn PWA trên iPhone, hãy đăng ký Web Push & bật Edge Function send-study-reminders.`,
    deliveryKey: `test-sw-${Date.now()}`,
    slotTime: options.schedulePrimaryTime || '20:00',
    requireInteraction: false,
  });

  return {
    ok: swRes.ok,
    channel: 'service_worker',
    reason: swRes.reason,
  };
}

/* ============================================================================
   CONTINUOUS REPEAT / SCHEDULE CHECK LOOP
   ============================================================================ */

let reminderIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Evaluates due schedules at `now`.
 * IMPORTANT: Sending a notification NEVER increments `completedDates` or the Study Streak!
 */
export function evaluateScheduleTick(
  now = new Date(),
  options: { forcePermissionGranted?: boolean; skipBrowserNotification?: boolean } = {},
): {
  triggeredSlotIds: string[];
  deliveryKeys: string[];
  schedule: StudyScheduleConfig;
} {
  const tzParts = getNowInTimezone(now, DEFAULT_TIMEZONE);
  const todayKey = tzParts.dateKey;

  const schedule = loadStudySchedule(todayKey);
  const triggeredSlotIds: string[] = [];
  const deliveryKeys: string[] = [];

  if (!schedule.enabled) {
    return { triggeredSlotIds, deliveryKeys, schedule };
  }
  if (!options.forcePermissionGranted && getNotificationPermissionState() !== 'granted') {
    return { triggeredSlotIds, deliveryKeys, schedule };
  }

  const completedToday = schedule.completedDates.includes(todayKey);
  const nowTotalMinutes = tzParts.totalMinutes;

  for (const slot of schedule.timeSlots) {
    if (!shouldScheduleSlotTriggerOnDate(slot, tzParts, schedule.timezone || DEFAULT_TIMEZONE)) {
      continue;
    }

    const [hhStr, mmStr] = slot.time.split(':');
    const slotMinutes = Number(hhStr) * 60 + Number(mmStr);
    if (!Number.isFinite(slotMinutes)) continue;

    const diff = nowTotalMinutes - slotMinutes;
    if (diff < 0) continue;

    // 1. Primary reminder at exact slot time (both 'recurring' and 'once')
    if (diff === 0) {
      const fireKey = `${todayKey}::${slot.id}::${slot.time}::0`;
      if (!hasFiredNotificationKey(fireKey, todayKey)) {
        recordFiredKey(fireKey, todayKey);
        triggeredSlotIds.push(slot.id);
        deliveryKeys.push(fireKey);
        if (!options.skipBrowserNotification) {
          void sendStudyNotification({
            title: `⏰ Đến giờ học: ${slot.label} (${slot.time})`,
            body:
              slot.scheduleType === 'once'
                ? `Lịch hẹn 1 lần ngày ${formatVietnameseDateWithWeekday(slot.date)}: bắt đầu ôn tập ngay nhé!`
                : 'Dành 15 phút ôn Từ vựng, Kanji & Ngữ pháp ngay để giữ chuỗi học đều đặn!',
            tag: fireKey,
            deliveryKey: fireKey,
            slotId: slot.id,
            slotTime: slot.time,
            snoozeMinutes: schedule.continuousRepeatMinutes || 5,
            requireInteraction: true,
          });
        }
      }
      continue;
    }

    // 2. Continuous repeat nagging applies ONLY to recurring schedules when today is not yet completed
    if (
      slot.scheduleType === 'recurring' &&
      !completedToday &&
      schedule.continuousRepeatEnabled &&
      schedule.continuousRepeatMinutes > 0
    ) {
      const interval = schedule.continuousRepeatMinutes;
      const maxMins = interval * schedule.maxRepeatCount;
      if (diff > 0 && diff <= maxMins && diff % interval === 0) {
        const repeatAttempt = diff / interval;
        const fireKey = `${todayKey}::${slot.id}::${slot.time}::repeat-${repeatAttempt}`;
        if (!hasFiredNotificationKey(fireKey, todayKey)) {
          recordFiredKey(fireKey, todayKey);
          triggeredSlotIds.push(slot.id);
          deliveryKeys.push(fireKey);
          if (!options.skipBrowserNotification) {
            void sendStudyNotification({
              title: `🔁 Nhắc lần ${repeatAttempt}/${schedule.maxRepeatCount}: Chưa vào học (${slot.time})`,
              body: `Khung giờ "${slot.label}" đã qua ${diff} phút. Hoàn thành bài học để giữ chuỗi Streak!`,
              tag: fireKey,
              deliveryKey: fireKey,
              slotId: slot.id,
              slotTime: slot.time,
              snoozeMinutes: interval,
              requireInteraction: true,
            });
          }
        }
      }
    }
  }

  return { triggeredSlotIds, deliveryKeys, schedule };
}

export function startStudyReminderLoop(): () => void {
  if (typeof window === 'undefined') return () => {};

  if (isNativeCapacitorPlatform()) {
    return startNativeNotificationListeners({
      onScheduleRefreshRequested: async () => loadStudySchedule(),
      onNavigate: (hashRoute) => {
        const cleanHash = hashRoute.startsWith('#')
          ? hashRoute
          : `#/${hashRoute.replace(/^\.?\/?#?\/?/, '')}`;
        window.location.hash = cleanHash;
      },
    });
  }

  void registerStudyServiceWorker();

  const onSwMessage = (event: MessageEvent) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'PUSH_SUBSCRIPTION_CHANGED' && msg.subscription) {
      const subObj = msg.subscription as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (subObj.endpoint && subObj.keys?.p256dh && subObj.keys?.auth) {
        void subscribeDeviceToWebPush({
          customSubscription: {
            endpoint: subObj.endpoint,
            p256dh: subObj.keys.p256dh,
            auth: subObj.keys.auth,
          },
        });
      }
      return;
    }
    if (msg.type === 'SNOOZE_STUDY_REMINDER') {
      const mins = Number(msg.minutes) || 5;
      window.setTimeout(() => {
        const current = loadStudySchedule();
        const todayKey = getLocalDateKey(new Date());
        if (!current.completedDates.includes(todayKey)) {
          void sendStudyNotification({
            title: '⏰ Nhắc lại sau 5 phút — Nihongo 問',
            body: 'Đã hết 5 phút tạm hoãn! Vào ôn tập tiếng Nhật ngay nhé.',
            requireInteraction: true,
          });
        }
      }, mins * 60 * 1000);
    }
  };

  const onVisibilityOrFocus = () => {
    evaluateScheduleTick();
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', onSwMessage);
  }
  window.addEventListener('focus', onVisibilityOrFocus);
  document.addEventListener('visibilitychange', onVisibilityOrFocus);

  if (reminderIntervalId) {
    clearInterval(reminderIntervalId);
  }
  evaluateScheduleTick();
  reminderIntervalId = setInterval(() => {
    evaluateScheduleTick();
  }, 20_000);

  return () => {
    if (reminderIntervalId) {
      clearInterval(reminderIntervalId);
      reminderIntervalId = null;
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
    }
    window.removeEventListener('focus', onVisibilityOrFocus);
    document.removeEventListener('visibilitychange', onVisibilityOrFocus);
  };
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

export function generateStudyScheduleIcs(config: StudyScheduleConfig): string {
  const clean = sanitizeStudySchedule(config);
  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const dtStamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const appUrl =
    typeof window !== 'undefined' && window.location
      ? `${window.location.origin}${window.location.pathname}#/vocabulary/review`
      : 'https://duy18nd.github.io/Quizz_App_NiHon/#/vocabulary/review';

  const slotsToExport: StudyTimeSlot[] =
    clean.timeSlots.length > 0
      ? clean.timeSlots
      : [
          {
            id: 'slot-default',
            scheduleType: 'recurring',
            time: clean.primaryTime,
            label: 'Ôn từ vựng & Kanji',
            daysOfWeek: clean.isContinuousDaily ? [...DEFAULT_DAYS] : clean.daysOfWeek,
            date: '',
            isDaily: true,
          },
        ];

  const events = slotsToExport.map((slot, idx) => {
    const isRecurring = slot.scheduleType === 'recurring';
    const baseDate = isRecurring ? todayKey : slot.date || todayKey;
    const tzId = clean.timezone || DEFAULT_TIMEZONE;
    const dtStart = formatIcsLocalDateTime(baseDate, slot.time);
    const endSlot = addMinutesToDateAndTimeStr(baseDate, slot.time, 30);
    const dtEnd = formatIcsLocalDateTime(endSlot.dateKey, endSlot.timeStr);
    const summary = `🇯🇵 Học tiếng Nhật — ${slot.label} (Nihongo 問)`;
    const description = `Lịch học ${slot.time} trên Nihongo 問. Bấm vào link để ôn tập ngay: ${appUrl}`;

    const lines = [
      'BEGIN:VEVENT',
      `UID:nihongo-slot-${idx}-${slot.id}@quizzapp.nihon`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;TZID=${tzId}:${dtStart}`,
      `DTEND;TZID=${tzId}:${dtEnd}`,
    ];
    if (isRecurring) {
      const slotRrule =
        slot.daysOfWeek && slot.daysOfWeek.length > 0
          ? buildRruleStringForDays(slot.daysOfWeek)
          : buildRruleString(clean);
      lines.push(slotRrule);
    }
    lines.push(
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `URL:${appUrl}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:⏰ Đến giờ học tiếng Nhật (Nihongo 問)!',
      'TRIGGER:PT0M',
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:⏳ Còn 10 phút nữa đến giờ học tiếng Nhật (Nihongo 問)!',
      'TRIGGER:-PT10M',
      'END:VALARM',
      'END:VEVENT',
    );
    return lines.join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nihongo 問 QuizzApp//Study Schedule//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Nihongo 問 — Lịch học tiếng Nhật',
    `X-WR-TIMEZONE:${clean.timezone || DEFAULT_TIMEZONE}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadStudyScheduleIcs(config: StudyScheduleConfig): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const icsContent = generateStudyScheduleIcs(config);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'nihongo-lich-hoc.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
