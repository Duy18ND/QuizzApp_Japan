import {
  getLocalDateKey,
  loadStudySchedule,
  saveStudySchedule,
  syncStudyScheduleFromCloud,
  upsertScheduleSlot,
  type SlotRepeatMinutes,
  type StudyScheduleConfig,
} from './notificationService';
import {
  getEffectiveReminderSettings,
  loadStageRoadmapState,
} from './stageRoadmapService';

const ALL_SEVEN_DAYS = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_LABEL = 'Ôn từ vựng & Kanji';
const UNIFIED_SCHEDULE_MIGRATION_PREFIX = 'nihonmaster_unified_schedule_migrated_v1:';

export function formatUnifiedReminderButtonLabel(
  schedule: StudyScheduleConfig,
  isAuthenticated = true,
): string {
  if (!isAuthenticated) return 'Lịch nhắc học';
  if (!schedule.enabled) return 'Nhắc học: Đang tắt';
  if (schedule.timeSlots.length === 0) return 'Nhắc học: Chưa đặt giờ';
  const sorted = [...schedule.timeSlots].sort((a, b) => a.time.localeCompare(b.time));
  if (sorted.length === 1) return `Nhắc học: ${sorted[0].time}`;
  return `Nhắc học: ${sorted[0].time} (+${sorted.length - 1})`;
}

/**
 * Loads cloud/local `StudyScheduleConfig` for an authenticated user and performs a
 * one-time migration of any legacy roadmap reminder time (e.g. `21:41` on `/roadmap`)
 * into `timeSlots` so `/`, `/roadmap`, and `/settings` always share one single schedule.
 */
export async function ensureUnifiedStudySchedule(
  userId?: string | null,
): Promise<StudyScheduleConfig> {
  const today = getLocalDateKey();
  if (!userId) {
    return loadStudySchedule(today, null);
  }

  let current = await syncStudyScheduleFromCloud(userId);
  if (typeof window === 'undefined') return current;

  const migrationKey = `${UNIFIED_SCHEDULE_MIGRATION_PREFIX}${userId}`;
  let alreadyMigrated = false;
  try {
    alreadyMigrated = window.localStorage.getItem(migrationKey) === '1';
  } catch {
    alreadyMigrated = true;
  }

  if (!alreadyMigrated) {
    try {
      window.localStorage.setItem(migrationKey, '1');
    } catch {
      // ignore quota errors
    }

    if (current.timeSlots.length === 0) {
      const rmState = loadStageRoadmapState(userId);
      const eff = getEffectiveReminderSettings(rmState);
      const customWithTime = rmState.customRoadmaps.find(
        (c) => Boolean(c.reminderTime) && c.notificationsEnabled !== false,
      );
      const hasLegacyReminder =
        (rmState.activeMode === 'custom' &&
          Boolean(rmState.customConfig?.reminderTime) &&
          rmState.customConfig?.notificationsEnabled !== false) ||
        Boolean(customWithTime) ||
        rmState.fixedReminderTime !== '20:00';

      const targetTime =
        rmState.activeMode === 'custom' && rmState.customConfig?.reminderTime
          ? rmState.customConfig.reminderTime
          : customWithTime?.reminderTime || eff.reminderTime;
      const targetLabel =
        rmState.activeMode === 'custom' && rmState.customConfig?.name
          ? rmState.customConfig.name
          : customWithTime?.name || eff.roadmapLabel || DEFAULT_LABEL;

      if (hasLegacyReminder && targetTime) {
        const res = await upsertScheduleSlot(
          {
            scheduleType: 'recurring',
            time: targetTime,
            label: targetLabel,
            daysOfWeek: eff.studyWeekdays.length > 0 ? eff.studyWeekdays : ALL_SEVEN_DAYS,
            date: '',
            repeatMinutes: eff.repeatIntervalMinutes,
          },
          userId,
        );
        if (res.ok) {
          current = await saveStudySchedule({ enabled: eff.enabled }, userId);
        }
      }
    }
  }

  return current;
}

export async function syncRoadmapConfigSlotToSchedule(
  params: {
    time: string;
    label: string;
    weekdays: number[];
    repeatMinutes: SlotRepeatMinutes;
    enabled: boolean;
  },
  userId?: string | null,
): Promise<StudyScheduleConfig> {
  const current = loadStudySchedule(getLocalDateKey(), userId);
  if (!userId || !params.enabled || !params.time) return current;
  const exists = current.timeSlots.some(
    (s) => s.scheduleType === 'recurring' && s.time === params.time,
  );
  if (!exists) {
    const res = await upsertScheduleSlot(
      {
        scheduleType: 'recurring',
        time: params.time,
        label: params.label || DEFAULT_LABEL,
        daysOfWeek: params.weekdays.length > 0 ? params.weekdays : ALL_SEVEN_DAYS,
        date: '',
        repeatMinutes: params.repeatMinutes,
      },
      userId,
    );
    if (res.ok && !res.schedule.enabled) {
      return saveStudySchedule({ enabled: true }, userId);
    }
    if (res.ok) return res.schedule;
  } else if (!current.enabled) {
    return saveStudySchedule({ enabled: true }, userId);
  }
  return current;
}
