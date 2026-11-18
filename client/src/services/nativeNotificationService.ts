/**
 * Nihongo 問 — Native iOS & Android Local Notifications Engine (Capacitor)
 *
 * Uses Apple's UserNotifications framework (`UNUserNotificationCenter` /
 * `UNCalendarNotificationTrigger`) via `@capacitor/local-notifications` on iOS
 * and exact AlarmManager + LocalNotificationRestoreReceiver on Android.
 *
 * Key iOS Native Guarantees:
 * - Repeating study reminders use native `UNCalendarNotificationTrigger` (`schedule.on`).
 * - One-time study reminders use non-repeating `schedule.at` (`repeats: false`).
 * - Notifications are persisted by iOS `usernotificationd` and continue firing
 *   when the app is exited, screen is locked, closed from App Switcher,
 *   restarted, or after **"Remove from Home Screen"** (while remaining installed in App Library).
 * - Enforces Apple's 64-pending-notification hard ceiling using a deterministic
 *   rolling window priority queue (`NATIVE_SCHEDULE_SAFE_BUDGET = 62`, leaving
 *   2 slots reserved for Test Notification & Snooze).
 * - Never calls `LocalNotifications.schedule()` before notification permission is
 *   explicitly granted (because Capacitor 8 `schedule()` auto-prompts on iOS if `.notDetermined`).
 */

import { Capacitor } from '@capacitor/core';
import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import type {
  NotificationPermissionStatus,
  ScheduleType,
  StudyScheduleConfig,
  StudyTimeSlot,
} from './notificationService';

export const IOS_SYSTEM_PENDING_LIMIT = 64;
export const NATIVE_SCHEDULE_SAFE_BUDGET = 62;
export const NATIVE_SCHEDULE_NAMESPACE = 'nihongo-study-schedule';
export const NATIVE_CHANNEL_ID = 'nihongo-study-reminders';
export const NATIVE_ACTION_TYPE_ID = 'STUDY_REMINDER_ACTIONS';
export const NATIVE_TEST_NOTIFICATION_ID = 99_001;
export const NATIVE_SNOOZE_NOTIFICATION_ID = 99_002;
export const VN_UTC_OFFSET_MINUTES = 7 * 60; // Asia/Ho_Chi_Minh is fixed UTC+7 (no DST)
export const NATIVE_NOTIFICATION_SYNC_EVENT = 'nihonmaster:native-notif-sync';

const NATIVE_SYNC_STATUS_STORAGE_KEY = 'nihonmaster_native_notif_status_v1';
const VALID_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const VALID_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6, 0];

export type NativePlatformKind = 'ios' | 'android' | 'web';

export interface ConvertedLocalWeekdayTime {
  weekday: number; // 0 (Sun) .. 6 (Sat)
  capacitorWeekday: number; // 1 (Sunday) .. 7 (Saturday) for Apple DateComponents & Capacitor Weekday
  hour: number;
  minute: number;
}

export interface PlannedNativeNotificationItem {
  id: number;
  logicalKey: string;
  slotId: string;
  scheduleType: ScheduleType;
  tier: 'recurring_primary' | 'one_time' | 'recurring_repeat';
  triggerKind: 'calendar_daily' | 'calendar_weekly' | 'at_timestamp';
  title: string;
  body: string;
  scheduleSignature: string;
  nextFireAtMs: number;
  notification: LocalNotificationSchema;
}

export interface PlannedNativeScheduleResult {
  enabled: boolean;
  maxBudget: number;
  totalDesiredCount: number;
  scheduledItems: PlannedNativeNotificationItem[];
  overflowItems: PlannedNativeNotificationItem[];
  recurringPrimaryCount: number;
  oneTimeCount: number;
  repeatFollowUpCount: number;
  expiredOneTimeCount: number;
}

export interface NativeScheduleDiff {
  toCancelIds: number[];
  toScheduleItems: PlannedNativeNotificationItem[];
  unchangedIds: number[];
}

export interface NativeScheduleSyncStatus {
  isNative: boolean;
  nativePlatform: NativePlatformKind;
  permission: NotificationPermissionStatus;
  scheduledCount: number;
  maxBudget: number;
  systemLimit: number;
  overflowCount: number;
  recurringTriggerCount: number;
  oneTimeTriggerCount: number;
  repeatTriggerCount: number;
  pendingTotalInOs: number;
  lastSyncedAt: string | null;
  statusMessage: string;
  error?: string;
}

export interface NativePlanOptions {
  now?: Date;
  maxPendingBudget?: number;
  deviceUtcOffsetMinutes?: number;
  soundName?: string;
  channelId?: string;
}

function getVnNowParts(date = new Date()): {
  dateKey: string;
  weekday: number;
  hour: number;
  minute: number;
  totalMinutes: number;
} {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const map: Record<string, string> = {};
    for (const part of formatter.formatToParts(date)) {
      if (part.type !== 'literal') {
        map[part.type] = part.value;
      }
    }
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const year = map.year || String(date.getUTCFullYear());
    const month = (map.month || '01').padStart(2, '0');
    const day = (map.day || '01').padStart(2, '0');
    const rawHour = Number(map.hour ?? 0);
    const hour = rawHour === 24 ? 0 : rawHour;
    const minute = Number(map.minute ?? 0);
    const weekday = map.weekday && map.weekday in weekdayMap ? weekdayMap[map.weekday] : date.getUTCDay();
    return {
      dateKey: `${year}-${month}-${day}`,
      weekday,
      hour,
      minute,
      totalMinutes: hour * 60 + minute,
    };
  } catch {
    const utcMs = date.getTime() + VN_UTC_OFFSET_MINUTES * 60_000;
    const vn = new Date(utcMs);
    const hour = vn.getUTCHours();
    const minute = vn.getUTCMinutes();
    const dateKey = `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`;
    return {
      dateKey,
      weekday: vn.getUTCDay(),
      hour,
      minute,
      totalMinutes: hour * 60 + minute,
    };
  }
}

function addDaysToDateKeySimple(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function formatViDateLabel(dateKey: string): string {
  if (!VALID_DATE_REGEX.test(dateKey)) return dateKey;
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Converts a wall-clock weekday & hour/minute in `Asia/Ho_Chi_Minh` (UTC+7)
 * into the device's current local timezone weekday & hour/minute so iOS `UNCalendarNotificationTrigger`
 * (which interprets `DateComponents` in `TimeZone.current`) fires at the exact intended VN time.
 */
export function convertVnWeekdayTimeToDeviceLocal(
  vnWeekday: number,
  hh: number,
  mm: number,
  deviceUtcOffsetMinutes = -new Date().getTimezoneOffset(),
): ConvertedLocalWeekdayTime {
  const deltaMinutes = deviceUtcOffsetMinutes - VN_UTC_OFFSET_MINUTES;
  const shiftedTotal = hh * 60 + mm + deltaMinutes;
  const dayShift = Math.floor(shiftedTotal / 1440);
  const wrappedMinutes = ((shiftedTotal % 1440) + 1440) % 1440;
  const hour = Math.floor(wrappedMinutes / 60);
  const minute = wrappedMinutes % 60;
  const weekday = (((vnWeekday + dayShift) % 7) + 7) % 7;
  const capacitorWeekday = (weekday % 7) + 1;
  return {
    weekday,
    capacitorWeekday,
    hour,
    minute,
  };
}

/**
 * Parses a date (`YYYY-MM-DD`) and time (`HH:MM`) in `Asia/Ho_Chi_Minh` (`+07:00`)
 * into an exact UTC Date instance.
 */
export function buildVnTimestampDate(dateKey: string, timeStr: string): Date | null {
  if (!VALID_DATE_REGEX.test(dateKey) || !VALID_TIME_REGEX.test(timeStr)) {
    return null;
  }
  const dt = new Date(`${dateKey}T${timeStr}:00+07:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

/**
 * Generates a collision-resistant positive 31-bit signed integer ID in `[100_000, 2_147_000_000]`
 * required by Capacitor LocalNotifications (`id: Int32` on Android & `Int` on iOS).
 */
export function computeNativeNotificationId(logicalKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < logicalKey.length; i++) {
    hash ^= logicalKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  const span = 2_147_000_000 - 100_000;
  return 100_000 + (unsigned % span);
}

function getNextOccurrenceMsForRecurring(
  timeStr: string,
  daysOfWeek: number[],
  now: Date,
  nowDateKey: string,
): number {
  const cleanDays = daysOfWeek.length > 0 ? daysOfWeek : DEFAULT_DAYS;
  const daySet = new Set(cleanDays);
  const nowMs = now.getTime();
  for (let offset = 0; offset <= 7; offset++) {
    const candidateDateKey = addDaysToDateKeySimple(nowDateKey, offset);
    const [y, m, d] = candidateDateKey.split('-').map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (!daySet.has(weekday)) continue;
    const candidateDate = buildVnTimestampDate(candidateDateKey, timeStr);
    if (candidateDate && candidateDate.getTime() > nowMs) {
      return candidateDate.getTime();
    }
  }
  return nowMs + 7 * 86_400_000;
}

function allocateUniqueId(logicalKey: string, usedIds: Set<number>): number {
  let candidate = computeNativeNotificationId(logicalKey);
  while (usedIds.has(candidate)) {
    candidate = candidate >= 2_147_000_000 ? 100_000 : candidate + 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function normalizeDaysList(daysOfWeek: number[] | undefined): number[] {
  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return [...DEFAULT_DAYS];
  const ordered = [1, 2, 3, 4, 5, 6, 0];
  const valid = new Set(daysOfWeek.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6));
  if (valid.size === 0) return [...DEFAULT_DAYS];
  return ordered.filter((d) => valid.has(d));
}

function makeNativePayloadExtras(params: {
  slot: StudyTimeSlot;
  logicalKey: string;
  tier: PlannedNativeNotificationItem['tier'];
  scheduleSignature: string;
  nextFireAtMs: number;
}) {
  return {
    namespace: NATIVE_SCHEDULE_NAMESPACE,
    slotId: params.slot.id,
    scheduleType: params.slot.scheduleType,
    date: params.slot.date || '',
    time: params.slot.time,
    tier: params.tier,
    logicalKey: params.logicalKey,
    scheduleSignature: params.scheduleSignature,
    nextFireAtMs: params.nextFireAtMs,
    url: '#/vocabulary/review',
  };
}

/**
 * Pure deterministic planner converting the shared `StudyScheduleConfig` data model into
 * prioritized native `LocalNotificationSchema` entries for Apple `UNUserNotificationCenter` /
 * Android `AlarmManager`.
 *
 * Respects `maxPendingBudget` (default 62 of iOS's 64-notification ceiling) so user schedules
 * are never silently evicted by iOS:
 *   - Tier 1: Primary Recurring weekly/daily `UNCalendarNotificationTrigger` items
 *   - Tier 2: Future One-Time `schedule.at` (`repeats: false`) items, sorted soonest-first
 *   - Tier 3: Optional today-only continuous repeat follow-ups (only when remaining budget allows)
 */
export function planNativeStudyNotifications(
  config: StudyScheduleConfig,
  options: NativePlanOptions = {},
): PlannedNativeScheduleResult {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const maxBudget = Math.max(
    1,
    Math.min(IOS_SYSTEM_PENDING_LIMIT, options.maxPendingBudget ?? NATIVE_SCHEDULE_SAFE_BUDGET),
  );
  const deviceOffset = options.deviceUtcOffsetMinutes ?? -now.getTimezoneOffset();
  const vnNow = getVnNowParts(now);
  const completedToday = Array.isArray(config.completedDates)
    ? config.completedDates.includes(vnNow.dateKey)
    : false;
  const soundName = options.soundName;
  const channelId = options.channelId ?? NATIVE_CHANNEL_ID;

  let expiredOneTimeCount = 0;

  if (!config.enabled) {
    return {
      enabled: false,
      maxBudget,
      totalDesiredCount: 0,
      scheduledItems: [],
      overflowItems: [],
      recurringPrimaryCount: 0,
      oneTimeCount: 0,
      repeatFollowUpCount: 0,
      expiredOneTimeCount: 0,
    };
  }

  const tier1Recurring: PlannedNativeNotificationItem[] = [];
  const tier2OneTime: PlannedNativeNotificationItem[] = [];
  const tier3Repeats: PlannedNativeNotificationItem[] = [];
  const usedIds = new Set<number>([NATIVE_TEST_NOTIFICATION_ID, NATIVE_SNOOZE_NOTIFICATION_ID]);

  for (const slot of config.timeSlots ?? []) {
    if (!slot || !VALID_TIME_REGEX.test(slot.time)) continue;
    const [hh, mm] = slot.time.split(':').map(Number);

    if (slot.scheduleType === 'once') {
      if (!slot.date || slot.date < vnNow.dateKey) {
        expiredOneTimeCount += 1;
        continue;
      }
      const targetDate = buildVnTimestampDate(slot.date, slot.time);
      if (!targetDate || targetDate.getTime() <= nowMs + 1000) {
        expiredOneTimeCount += 1;
        continue;
      }

      const logicalKey = `${slot.id}::once::${slot.date}::${slot.time}`;
      const id = allocateUniqueId(logicalKey, usedIds);
      const title = `⏰ Lịch hẹn học (${slot.time}): ${slot.label}`;
      const body = `Lịch học 1 lần ngày ${formatViDateLabel(slot.date)} — Bắt đầu ôn tập ngay!`;
      const scheduleSignature = `once|${targetDate.toISOString()}|${title}|${body}`;

      tier2OneTime.push({
        id,
        logicalKey,
        slotId: slot.id,
        scheduleType: 'once',
        tier: 'one_time',
        triggerKind: 'at_timestamp',
        title,
        body,
        scheduleSignature,
        nextFireAtMs: targetDate.getTime(),
        notification: {
          id,
          title,
          body,
          ...(soundName ? { sound: soundName } : {}),
          channelId,
          threadIdentifier: NATIVE_SCHEDULE_NAMESPACE,
          actionTypeId: NATIVE_ACTION_TYPE_ID,
          foreground: true,
          interruptionLevel: 'active',
          autoCancel: true,
          isExactNotification: true,
          schedule: {
            at: targetDate,
            repeats: false,
            allowWhileIdle: true,
          },
          extra: makeNativePayloadExtras({
            slot,
            logicalKey,
            tier: 'one_time',
            scheduleSignature,
            nextFireAtMs: targetDate.getTime(),
          }),
        },
      });
      continue;
    }

    // Recurring schedule (UNCalendarNotificationTrigger with `schedule.on`)
    const days = normalizeDaysList(slot.daysOfWeek);
    const title = `⏰ Đến giờ học: ${slot.label} (${slot.time})`;
    const body = 'Dành 15 phút ôn Từ vựng, Kanji & Ngữ pháp ngay để giữ chuỗi Streak!';
    const nextFireAtMs = getNextOccurrenceMsForRecurring(slot.time, days, now, vnNow.dateKey);

    if (days.length === 7) {
      const localTime = convertVnWeekdayTimeToDeviceLocal(1, hh, mm, deviceOffset);
      const logicalKey = `${slot.id}::daily::${slot.time}`;
      const id = allocateUniqueId(logicalKey, usedIds);
      const scheduleSignature = `daily|${localTime.hour}:${localTime.minute}|${title}|${body}`;

      tier1Recurring.push({
        id,
        logicalKey,
        slotId: slot.id,
        scheduleType: 'recurring',
        tier: 'recurring_primary',
        triggerKind: 'calendar_daily',
        title,
        body,
        scheduleSignature,
        nextFireAtMs,
        notification: {
          id,
          title,
          body,
          ...(soundName ? { sound: soundName } : {}),
          channelId,
          threadIdentifier: NATIVE_SCHEDULE_NAMESPACE,
          actionTypeId: NATIVE_ACTION_TYPE_ID,
          foreground: true,
          interruptionLevel: 'active',
          autoCancel: true,
          isExactNotification: true,
          schedule: {
            on: {
              hour: localTime.hour,
              minute: localTime.minute,
              second: 0,
            },
            allowWhileIdle: true,
          },
          extra: makeNativePayloadExtras({
            slot,
            logicalKey,
            tier: 'recurring_primary',
            scheduleSignature,
            nextFireAtMs,
          }),
        },
      });
    } else {
      for (const vnDay of days) {
        const localTime = convertVnWeekdayTimeToDeviceLocal(vnDay, hh, mm, deviceOffset);
        const logicalKey = `${slot.id}::weekday-${vnDay}::${slot.time}`;
        const id = allocateUniqueId(logicalKey, usedIds);
        const scheduleSignature = `weekly|w${localTime.capacitorWeekday}|${localTime.hour}:${localTime.minute}|${title}|${body}`;
        const nextDayMs = getNextOccurrenceMsForRecurring(slot.time, [vnDay], now, vnNow.dateKey);

        tier1Recurring.push({
          id,
          logicalKey,
          slotId: slot.id,
          scheduleType: 'recurring',
          tier: 'recurring_primary',
          triggerKind: 'calendar_weekly',
          title,
          body,
          scheduleSignature,
          nextFireAtMs: nextDayMs,
          notification: {
            id,
            title,
            body,
            ...(soundName ? { sound: soundName } : {}),
            channelId,
            threadIdentifier: NATIVE_SCHEDULE_NAMESPACE,
            actionTypeId: NATIVE_ACTION_TYPE_ID,
            foreground: true,
            interruptionLevel: 'active',
            autoCancel: true,
            isExactNotification: true,
            schedule: {
              on: {
                weekday: localTime.capacitorWeekday,
                hour: localTime.hour,
                minute: localTime.minute,
                second: 0,
              },
              allowWhileIdle: true,
            },
            extra: makeNativePayloadExtras({
              slot,
              logicalKey,
              tier: 'recurring_primary',
              scheduleSignature,
              nextFireAtMs: nextDayMs,
            }),
          },
        });
      }
    }

    // Tier 3: Continuous repeat follow-ups for TODAY (canceled automatically once today is completed)
    if (
      !completedToday &&
      config.continuousRepeatEnabled &&
      config.continuousRepeatMinutes > 0 &&
      days.includes(vnNow.weekday)
    ) {
      const interval = config.continuousRepeatMinutes;
      const maxRepeat = Math.max(1, Math.min(5, config.maxRepeatCount || 5));
      for (let attempt = 1; attempt <= maxRepeat; attempt++) {
        const followMinutes = hh * 60 + mm + attempt * interval;
        if (followMinutes >= 1440) break;
        const fHh = String(Math.floor(followMinutes / 60)).padStart(2, '0');
        const fMm = String(followMinutes % 60).padStart(2, '0');
        const followDate = buildVnTimestampDate(vnNow.dateKey, `${fHh}:${fMm}`);
        if (!followDate || followDate.getTime() <= nowMs + 1000) continue;

        const logicalKey = `${slot.id}::repeat-${attempt}::${vnNow.dateKey}::${slot.time}`;
        const id = allocateUniqueId(logicalKey, usedIds);
        const rTitle = `🔁 Nhắc lần ${attempt}/${maxRepeat}: Chưa vào học (${slot.time})`;
        const rBody = `Khung giờ "${slot.label}" đã qua ${attempt * interval} phút. Vào học ngay để giữ chuỗi Streak!`;
        const rSig = `repeat|${followDate.toISOString()}|${rTitle}|${rBody}`;

        tier3Repeats.push({
          id,
          logicalKey,
          slotId: slot.id,
          scheduleType: 'recurring',
          tier: 'recurring_repeat',
          triggerKind: 'at_timestamp',
          title: rTitle,
          body: rBody,
          scheduleSignature: rSig,
          nextFireAtMs: followDate.getTime(),
          notification: {
            id,
            title: rTitle,
            body: rBody,
            ...(soundName ? { sound: soundName } : {}),
            channelId,
            threadIdentifier: NATIVE_SCHEDULE_NAMESPACE,
            actionTypeId: NATIVE_ACTION_TYPE_ID,
            foreground: true,
            interruptionLevel: 'active',
            autoCancel: true,
            isExactNotification: true,
            schedule: {
              at: followDate,
              repeats: false,
              allowWhileIdle: true,
            },
            extra: makeNativePayloadExtras({
              slot,
              logicalKey,
              tier: 'recurring_repeat',
              scheduleSignature: rSig,
              nextFireAtMs: followDate.getTime(),
            }),
          },
        });
      }
    }
  }

  tier1Recurring.sort((a, b) => a.nextFireAtMs - b.nextFireAtMs);
  tier2OneTime.sort((a, b) => a.nextFireAtMs - b.nextFireAtMs);
  tier3Repeats.sort((a, b) => a.nextFireAtMs - b.nextFireAtMs);

  const orderedAll = [...tier1Recurring, ...tier2OneTime, ...tier3Repeats];
  const scheduledItems = orderedAll.slice(0, maxBudget);
  const overflowItems = orderedAll.slice(maxBudget);

  return {
    enabled: true,
    maxBudget,
    totalDesiredCount: orderedAll.length,
    scheduledItems,
    overflowItems,
    recurringPrimaryCount: scheduledItems.filter((i) => i.tier === 'recurring_primary').length,
    oneTimeCount: scheduledItems.filter((i) => i.tier === 'one_time').length,
    repeatFollowUpCount: scheduledItems.filter((i) => i.tier === 'recurring_repeat').length,
    expiredOneTimeCount,
  };
}

/**
 * Computes incremental diff against currently registered OS pending notifications
 * so updating or deleting one schedule ONLY modifies affected IDs and never cancels unrelated schedules.
 */
export function computeNativeNotificationDiff(
  pendingInOs: Array<{
    id: number;
    title?: string;
    body?: string;
    extra?: Record<string, unknown> | null;
  }>,
  desiredItems: PlannedNativeNotificationItem[],
): NativeScheduleDiff {
  const managedPending = pendingInOs.filter(
    (item) => item.extra && item.extra.namespace === NATIVE_SCHEDULE_NAMESPACE,
  );

  const pendingById = new Map<
    number,
    { id: number; title?: string; body?: string; extra?: Record<string, unknown> | null }
  >();
  for (const p of managedPending) {
    pendingById.set(Number(p.id), p);
  }

  const desiredById = new Map<number, PlannedNativeNotificationItem>();
  for (const d of desiredItems) {
    desiredById.set(d.id, d);
  }

  const toCancelIds: number[] = [];
  const toScheduleItems: PlannedNativeNotificationItem[] = [];
  const unchangedIds: number[] = [];

  for (const [pendingId, pendingItem] of pendingById.entries()) {
    const desired = desiredById.get(pendingId);
    if (!desired) {
      toCancelIds.push(pendingId);
      continue;
    }
    const pendingSig =
      pendingItem.extra && typeof pendingItem.extra.scheduleSignature === 'string'
        ? pendingItem.extra.scheduleSignature
        : '';
    if (
      pendingSig !== desired.scheduleSignature ||
      pendingItem.title !== desired.title ||
      pendingItem.body !== desired.body
    ) {
      toCancelIds.push(pendingId);
      toScheduleItems.push(desired);
    } else {
      unchangedIds.push(pendingId);
    }
  }

  for (const [desiredId, desired] of desiredById.entries()) {
    if (!pendingById.has(desiredId)) {
      toScheduleItems.push(desired);
    }
  }

  return {
    toCancelIds,
    toScheduleItems,
    unchangedIds,
  };
}

/* ============================================================================
   CAPACITOR RUNTIME BRIDGE (LAZY-LOADED ONLY WHEN RUNNING NATIVELY)
   ============================================================================ */

export function isNativeCapacitorPlatform(): boolean {
  try {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getNativePlatformKind(): NativePlatformKind {
  try {
    if (!isNativeCapacitorPlatform()) return 'web';
    const platform = Capacitor.getPlatform();
    if (platform === 'ios' || platform === 'android') return platform;
    return 'web';
  } catch {
    return 'web';
  }
}

function saveLastNativeSyncStatus(status: NativeScheduleSyncStatus): void {
  if (typeof window === 'undefined') return;
  if (window.localStorage) {
    try {
      window.localStorage.setItem(NATIVE_SYNC_STATUS_STORAGE_KEY, JSON.stringify(status));
    } catch {
      // Ignore storage errors
    }
  }
  try {
    window.dispatchEvent(
      new CustomEvent<NativeScheduleSyncStatus>(NATIVE_NOTIFICATION_SYNC_EVENT, {
        detail: status,
      }),
    );
  } catch {
    // Ignore non-DOM environment errors
  }
}

export function loadLastNativeSyncStatus(): NativeScheduleSyncStatus {
  const nativePlatform = getNativePlatformKind();
  const isNative = nativePlatform !== 'web';
  const fallback: NativeScheduleSyncStatus = {
    isNative,
    nativePlatform,
    permission: 'default',
    scheduledCount: 0,
    maxBudget: NATIVE_SCHEDULE_SAFE_BUDGET,
    systemLimit: IOS_SYSTEM_PENDING_LIMIT,
    overflowCount: 0,
    recurringTriggerCount: 0,
    oneTimeTriggerCount: 0,
    repeatTriggerCount: 0,
    pendingTotalInOs: 0,
    lastSyncedAt: null,
    statusMessage: isNative
      ? 'Sẵn sàng đồng bộ lịch học với hệ điều hành.'
      : 'Đang chạy trên trình duyệt Web / PWA.',
  };

  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(NATIVE_SYNC_STATUS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<NativeScheduleSyncStatus>;
    return {
      ...fallback,
      ...parsed,
      isNative,
      nativePlatform,
    };
  } catch {
    return fallback;
  }
}

async function loadLocalNotificationsPlugin() {
  const mod = await import('@capacitor/local-notifications');
  return mod.LocalNotifications;
}

function mapCapacitorPermission(display: string | undefined): NotificationPermissionStatus {
  if (display === 'granted') return 'granted';
  if (display === 'denied') return 'denied';
  return 'default';
}

export async function getNativeNotificationPermissionState(): Promise<NotificationPermissionStatus> {
  if (!isNativeCapacitorPlatform()) return 'unsupported';
  try {
    const LocalNotifications = await loadLocalNotificationsPlugin();
    const res = await LocalNotifications.checkPermissions();
    return mapCapacitorPermission(res.display);
  } catch {
    return 'unsupported';
  }
}

export async function ensureNativeNotificationEnvironment(): Promise<void> {
  if (!isNativeCapacitorPlatform()) return;
  try {
    const LocalNotifications = await loadLocalNotificationsPlugin();
    const platform = getNativePlatformKind();

    if (platform === 'android') {
      await LocalNotifications.createChannel({
        id: NATIVE_CHANNEL_ID,
        name: 'Lịch nhắc học Nihongo 問',
        description: 'Thông báo nhắc ôn Từ vựng, Kanji & Ngữ pháp đúng giờ.',
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: true,
      }).catch(() => {});
    }

    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: NATIVE_ACTION_TYPE_ID,
          actions: [
            {
              id: 'study_now',
              title: '📖 Vào học ngay',
              foreground: true,
            },
            {
              id: 'snooze_5m',
              title: '⏳ Nhắc lại sau 5 phút',
              foreground: false,
            },
          ],
        },
      ],
    }).catch(() => {});
  } catch {
    // Ignore non-fatal channel/action setup errors
  }
}

/**
 * Explicitly requests OS notification permission ONLY in response to a user button click.
 */
export async function requestNativeNotificationPermission(
  currentSchedule?: StudyScheduleConfig,
): Promise<NotificationPermissionStatus> {
  if (!isNativeCapacitorPlatform()) return 'unsupported';
  try {
    const LocalNotifications = await loadLocalNotificationsPlugin();
    await ensureNativeNotificationEnvironment();
    const res = await LocalNotifications.requestPermissions();
    const mapped = mapCapacitorPermission(res.display);
    if (mapped === 'granted' && currentSchedule) {
      await syncNativeStudySchedules(currentSchedule);
    }
    return mapped;
  } catch {
    return 'denied';
  }
}

/**
 * Synchronizes `StudyScheduleConfig` with iOS `UNUserNotificationCenter` / Android `AlarmManager`
 * ONLY if OS permission is already `'granted'`. Never calls `schedule()` when permission is missing
 * (preventing accidental auto-prompts from Capacitor's internal `ensureAuthorization`).
 */
export async function syncNativeStudySchedules(
  config: StudyScheduleConfig,
): Promise<NativeScheduleSyncStatus> {
  const nativePlatform = getNativePlatformKind();
  if (nativePlatform === 'web') {
    const webStatus = loadLastNativeSyncStatus();
    return webStatus;
  }

  try {
    const LocalNotifications = await loadLocalNotificationsPlugin();
    const permRes = await LocalNotifications.checkPermissions();
    const permission = mapCapacitorPermission(permRes.display);
    const pendingRes = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
    const pendingList = pendingRes.notifications ?? [];

    if (permission !== 'granted') {
      const status: NativeScheduleSyncStatus = {
        isNative: true,
        nativePlatform,
        permission,
        scheduledCount: 0,
        maxBudget: NATIVE_SCHEDULE_SAFE_BUDGET,
        systemLimit: IOS_SYSTEM_PENDING_LIMIT,
        overflowCount: 0,
        recurringTriggerCount: 0,
        oneTimeTriggerCount: 0,
        repeatTriggerCount: 0,
        pendingTotalInOs: pendingList.length,
        lastSyncedAt: new Date().toISOString(),
        statusMessage:
          permission === 'denied'
            ? 'Quyền thông báo đang bị tắt trong Cài đặt thiết bị. Hãy mở Cài đặt iOS ➔ Thông báo ➔ Nihongo 問.'
            : 'Chưa cấp quyền thông báo. Bấm nút "Bật quyền thông báo" để đăng ký lịch vào iOS Notification Center.',
      };
      saveLastNativeSyncStatus(status);
      return status;
    }

    await ensureNativeNotificationEnvironment();

    const plan = planNativeStudyNotifications(config, {
      now: new Date(),
      maxPendingBudget: NATIVE_SCHEDULE_SAFE_BUDGET,
      soundName: nativePlatform === 'ios' ? 'default' : undefined,
      channelId: NATIVE_CHANNEL_ID,
    });

    const diff = computeNativeNotificationDiff(
      pendingList.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        extra: (n.extra ?? null) as Record<string, unknown> | null,
      })),
      plan.scheduledItems,
    );

    if (diff.toCancelIds.length > 0) {
      await LocalNotifications.cancel({
        notifications: diff.toCancelIds.map((id) => ({ id })),
      });
    }

    if (diff.toScheduleItems.length > 0) {
      await LocalNotifications.schedule({
        notifications: diff.toScheduleItems.map((item) => item.notification),
      });
    }

    const updatedPendingRes = await LocalNotifications.getPending().catch(() => ({
      notifications: pendingList,
    }));
    const updatedPendingCount = updatedPendingRes.notifications?.length ?? plan.scheduledItems.length;

    const status: NativeScheduleSyncStatus = {
      isNative: true,
      nativePlatform,
      permission: 'granted',
      scheduledCount: plan.scheduledItems.length,
      maxBudget: plan.maxBudget,
      systemLimit: IOS_SYSTEM_PENDING_LIMIT,
      overflowCount: plan.overflowItems.length,
      recurringTriggerCount: plan.recurringPrimaryCount,
      oneTimeTriggerCount: plan.oneTimeCount,
      repeatTriggerCount: plan.repeatFollowUpCount,
      pendingTotalInOs: updatedPendingCount,
      lastSyncedAt: new Date().toISOString(),
      statusMessage: !config.enabled
        ? 'Lịch nhắc đang tạm tắt — đã hủy các thông báo chờ trên hệ điều hành.'
        : plan.scheduledItems.length === 0
          ? 'Đã bật thông báo Native, nhưng chưa có khung giờ học nào trong lịch.'
          : plan.overflowItems.length > 0
            ? `Đã đăng ký ${plan.scheduledItems.length}/${plan.maxBudget} slot vào hệ điều hành (${plan.overflowItems.length} lịch tương lai nằm trong hàng đợi rolling window).`
            : `Đã đồng bộ ${plan.scheduledItems.length} lịch nhắc trực tiếp vào ${nativePlatform === 'ios' ? 'iOS UNUserNotificationCenter' : 'Android AlarmManager'}.`,
    };
    saveLastNativeSyncStatus(status);
    return status;
  } catch (err) {
    const status: NativeScheduleSyncStatus = {
      ...loadLastNativeSyncStatus(),
      isNative: true,
      nativePlatform,
      statusMessage: 'Không thể đồng bộ lịch thông báo Native.',
      error: err instanceof Error ? err.message : 'Native notification sync failed',
    };
    saveLastNativeSyncStatus(status);
    return status;
  }
}

/**
 * Cancels only the OS notifications associated with a single deleted slot ID.
 */
export async function cancelNativeSlotNotifications(slotId: string): Promise<void> {
  if (!isNativeCapacitorPlatform() || !slotId) return;
  try {
    const LocalNotifications = await loadLocalNotificationsPlugin();
    const pendingRes = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
    const matchingIds = (pendingRes.notifications ?? [])
      .filter((n) => n.extra && n.extra.slotId === slotId)
      .map((n) => ({ id: n.id }));

    if (matchingIds.length > 0) {
      await LocalNotifications.cancel({ notifications: matchingIds });
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Schedules a one-off Native Local Notification (e.g. 1s or 5s delay) via iOS `UNUserNotificationCenter`
 * / Android `AlarmManager` so the user can test background, locked-screen, closed-app, and
 * Home-Screen-removed delivery on a real device.
 */
export async function sendTestNativeLocalNotification(
  delaySeconds = 3,
  schedulePrimaryTime = '20:00',
): Promise<{ ok: boolean; triggerAtIso?: string; reason?: string }> {
  const platform = getNativePlatformKind();
  if (platform === 'web') {
    return { ok: false, reason: 'Không chạy trong môi trường Native iOS / Android.' };
  }

  try {
    const LocalNotifications = await loadLocalNotificationsPlugin();
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      return {
        ok: false,
        reason: 'Chưa cấp quyền thông báo thiết bị. Vui lòng bấm nút "Bật quyền thông báo" trước.',
      };
    }

    await ensureNativeNotificationEnvironment();
    const delayMs = Math.max(1, Math.min(300, Number(delaySeconds) || 3)) * 1000;
    const triggerAt = new Date(Date.now() + delayMs);

    await LocalNotifications.cancel({
      notifications: [{ id: NATIVE_TEST_NOTIFICATION_ID }],
    }).catch(() => {});

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NATIVE_TEST_NOTIFICATION_ID,
          title: '📲 Test Native Local Notification — Nihongo 問',
          body: `Hệ điều hành đã gửi thông báo nền đúng hẹn (giờ học ${schedulePrimaryTime}) mà không cần mở app hay giữ icon ngoài Màn hình chính!`,
          ...(platform === 'ios' ? { sound: 'default' } : {}),
          channelId: NATIVE_CHANNEL_ID,
          threadIdentifier: NATIVE_SCHEDULE_NAMESPACE,
          actionTypeId: NATIVE_ACTION_TYPE_ID,
          foreground: true,
          interruptionLevel: 'active',
          autoCancel: true,
          isExactNotification: true,
          schedule: {
            at: triggerAt,
            repeats: false,
            allowWhileIdle: true,
          },
          extra: {
            namespace: 'nihongo-study-test',
            slotId: 'test',
            url: '#/vocabulary/review',
          },
        },
      ],
    });

    return {
      ok: true,
      triggerAtIso: triggerAt.toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Không thể lên lịch Test Local Notification.',
    };
  }
}

export async function scheduleNativeSnoozeNotification(
  minutes = 5,
  slotLabel = 'Ôn tập tiếng Nhật',
): Promise<void> {
  const platform = getNativePlatformKind();
  if (platform === 'web') return;
  try {
    const LocalNotifications = await loadLocalNotificationsPlugin();
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;

    await ensureNativeNotificationEnvironment();
    const triggerAt = new Date(Date.now() + Math.max(1, minutes) * 60_000);
    await LocalNotifications.cancel({
      notifications: [{ id: NATIVE_SNOOZE_NOTIFICATION_ID }],
    }).catch(() => {});

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NATIVE_SNOOZE_NOTIFICATION_ID,
          title: `⏰ Nhắc lại sau ${minutes} phút — Nihongo 問`,
          body: `Đã hết thời gian tạm hoãn cho "${slotLabel}". Vào ôn tập ngay nhé!`,
          ...(platform === 'ios' ? { sound: 'default' } : {}),
          channelId: NATIVE_CHANNEL_ID,
          threadIdentifier: NATIVE_SCHEDULE_NAMESPACE,
          actionTypeId: NATIVE_ACTION_TYPE_ID,
          foreground: true,
          interruptionLevel: 'active',
          autoCancel: true,
          isExactNotification: true,
          schedule: {
            at: triggerAt,
            repeats: false,
            allowWhileIdle: true,
          },
          extra: {
            namespace: 'nihongo-study-snooze',
            url: '#/vocabulary/review',
          },
        },
      ],
    });
  } catch {
    // Ignore errors
  }
}

/**
 * Registers native Capacitor LocalNotification & App lifecycle listeners so:
 * - Delivered/tapped notifications route cleanly without modifying study streaks.
 * - Tapping "Nhắc lại sau 5 phút" registers a native snooze notification.
 * - Resuming or backgrounding the app refreshes the rolling 64-notification window.
 */
export function startNativeNotificationListeners(options: {
  onScheduleRefreshRequested: () => Promise<StudyScheduleConfig>;
  onNavigate?: (hashRoute: string) => void;
}): () => void {
  if (!isNativeCapacitorPlatform()) return () => {};

  let disposed = false;
  const handles: Array<{ remove: () => Promise<void> }> = [];

  void (async () => {
    try {
      await ensureNativeNotificationEnvironment();
      const LocalNotifications = await loadLocalNotificationsPlugin();
      const { App } = await import('@capacitor/app');

      if (disposed) return;

      const receivedHandle = await LocalNotifications.addListener(
        'localNotificationReceived',
        () => {
          void options.onScheduleRefreshRequested().then((clean) => syncNativeStudySchedules(clean));
        },
      );
      handles.push(receivedHandle);

      const actionHandle = await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (event) => {
          if (event.actionId === 'snooze_5m') {
            const label =
              typeof event.notification?.title === 'string'
                ? event.notification.title
                : 'Ôn tập tiếng Nhật';
            void scheduleNativeSnoozeNotification(5, label);
            return;
          }

          const rawUrl =
            event.notification?.extra && typeof event.notification.extra.url === 'string'
              ? event.notification.extra.url
              : '#/vocabulary/review';
          if (options.onNavigate) {
            options.onNavigate(rawUrl);
          } else if (typeof window !== 'undefined') {
            window.location.hash = rawUrl.replace(/^\.?\/*/, '');
          }
        },
      );
      handles.push(actionHandle);

      const appStateHandle = await App.addListener('appStateChange', () => {
        void options.onScheduleRefreshRequested().then((clean) => syncNativeStudySchedules(clean));
      });
      handles.push(appStateHandle);

      // Perform a non-prompting sync on startup (only schedules if already granted)
      const latest = await options.onScheduleRefreshRequested();
      if (!disposed) {
        await syncNativeStudySchedules(latest);
      }
    } catch {
      // Ignore listener init errors in non-native environments
    }
  })();

  return () => {
    disposed = true;
    for (const h of handles) {
      void h.remove().catch(() => {});
    }
  };
}
