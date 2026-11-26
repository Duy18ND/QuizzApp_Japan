import React, { useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  BellRing,
  CheckCircle2,
  Clock,
  Flame,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { onActiveSessionUserChange } from '../../services/sessionScope';
import { LoginRequiredState } from '../auth/LoginRequiredState';
import {
  ALL_DAYS_ORDERED,
  calculateStudyStreakStats,
  deleteScheduleSlot,
  formatOnlineDurationVi,
  formatSlotWeekdays,
  formatVietnameseDateWithWeekday,
  getLocalDateKey,
  getTodayOnlineSeconds,
  getTotalOnlineSeconds,
  JLPT_EXAM_LEVELS,
  loadOnlineTimeMap,
  loadStudySchedule,
  ONLINE_STREAK_THRESHOLD_SECONDS,
  ONLINE_TIME_SYNC_EVENT,
  recordStudyCompletion,
  saveStudySchedule,
  SLOT_REPEAT_OPTIONS,
  STUDY_SCHEDULE_SYNC_EVENT,
  upsertScheduleSlot,
  type JLPTExamLevelGoal,
  type OnlineTimeSyncDetail,
  type ScheduleType,
  type SlotRepeatMinutes,
  type StudyScheduleConfig,
  type StudyTimeSlot,
} from '../../services/notificationService';
import {
  getBrowserNotificationPermission,
  isIosDevice,
  isRunningStandalone,
  isWebPushConfigured,
  requestBrowserNotificationPermission,
  subscribeAndSyncWebPush,
  syncWebPushScheduleToCloud,
  type BrowserNotificationState,
} from '../../services/pwaReminderService';
import {
  loadStageRoadmapState,
  saveStageRoadmapState,
  type RepeatMinutesOption,
} from '../../services/stageRoadmapService';
import { ensureUnifiedStudySchedule } from '../../services/unifiedScheduleService';
import {
  Badge,
  Button,
  Card,
  Chip,
  Field,
  IconButton,
  Input,
  Modal,
  Notice,
  ProgressBar,
  Select,
  Stat,
  Switch,
  useToast,
} from '../ui';

const ALL_SEVEN_DAYS = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_LABEL = 'Ôn từ vựng & Kanji';
const DEFAULT_REPEAT_MINUTES: SlotRepeatMinutes = 5;

function computeDaysUntilExam(targetDate: string, todayKey: string): number | null {
  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return null;
  const target = new Date(`${targetDate}T00:00:00Z`);
  const today = new Date(`${todayKey}T00:00:00Z`);
  const diffMs = target.getTime() - today.getTime();
  if (!Number.isFinite(diffMs)) return null;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Computes the next two official JLPT dates (first Sunday of July & December). */
function getUpcomingJlptPresets(todayKey: string): Array<{ label: string; dateKey: string }> {
  const baseYear = Number(todayKey.slice(0, 4)) || new Date().getFullYear();
  const candidates: Array<{ label: string; dateKey: string }> = [];
  for (const year of [baseYear, baseYear + 1]) {
    for (const month of [7, 12]) {
      const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
      const offsetToSunday = (7 - firstOfMonth.getUTCDay()) % 7;
      const day = 1 + offsetToSunday;
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dateKey >= todayKey) {
        candidates.push({
          label: `JLPT T${month}/${year} (${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')})`,
          dateKey,
        });
      }
    }
  }
  return candidates.slice(0, 2);
}

export const StudyScheduleCard: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { user, studyLevel } = useAuth();
  const { toast } = useToast();

  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());
  const [schedule, setSchedule] = useState<StudyScheduleConfig>(() =>
    loadStudySchedule(getLocalDateKey(), user?.id),
  );
  const [todayOnlineSeconds, setTodayOnlineSeconds] = useState(() =>
    getTodayOnlineSeconds(getLocalDateKey(), user?.id),
  );
  const [totalOnlineSeconds, setTotalOnlineSeconds] = useState(() =>
    getTotalOnlineSeconds(loadOnlineTimeMap(user?.id)),
  );
  const [notifPermission, setNotifPermission] = useState<BrowserNotificationState>(() =>
    getBrowserNotificationPermission(),
  );

  // Add / Edit form
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [formType, setFormType] = useState<ScheduleType>('recurring');
  const [formTime, setFormTime] = useState('20:00');
  const [formLabel, setFormLabel] = useState(DEFAULT_LABEL);
  const [formWeekdays, setFormWeekdays] = useState<number[]>(() => [...ALL_SEVEN_DAYS]);
  const [formDate, setFormDate] = useState(() => getLocalDateKey());
  const [formRepeat, setFormRepeat] = useState(true);
  const [formRepeatMinutes, setFormRepeatMinutes] =
    useState<SlotRepeatMinutes>(DEFAULT_REPEAT_MINUTES);
  const [formError, setFormError] = useState<string | null>(null);

  const streakStats = useMemo(
    () =>
      calculateStudyStreakStats(
        {
          streakMode: 'every_day',
          streakDaysOfWeek: ALL_SEVEN_DAYS,
          completedDates: schedule.completedDates,
        },
        todayKey,
      ),
    [schedule.completedDates, todayKey],
  );
  const examDaysLeft = computeDaysUntilExam(schedule.targetExamDate, todayKey);
  const upcomingJlptPresets = useMemo(() => getUpcomingJlptPresets(todayKey), [todayKey]);
  const displayedExamLevel: JLPTExamLevelGoal =
    schedule.targetExamDate || schedule.updatedAt !== new Date(0).toISOString()
      ? schedule.targetExamLevel
      : ((studyLevel as JLPTExamLevelGoal | null) ?? schedule.targetExamLevel);
  const onlineRemainingSeconds = Math.max(0, ONLINE_STREAK_THRESHOLD_SECONDS - todayOnlineSeconds);
  const needsHomeScreenInstall = isIosDevice() && !isRunningStandalone();

  const [syncedUserId, setSyncedUserId] = useState<string | undefined>(user?.id);
  if (syncedUserId !== user?.id) {
    setSyncedUserId(user?.id);
    const latestDate = getLocalDateKey();
    setSchedule(loadStudySchedule(latestDate, user?.id));
    setTodayOnlineSeconds(getTodayOnlineSeconds(latestDate, user?.id));
    setTotalOnlineSeconds(getTotalOnlineSeconds(loadOnlineTimeMap(user?.id)));
  }

  useEffect(() => {
    let cancelled = false;
    void ensureUnifiedStudySchedule(user?.id).then((synced) => {
      if (!cancelled) setSchedule(synced);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Session / sync / online-time events + midnight rollover
  useEffect(() => {
    const onSync = (event: Event) => {
      const custom = event as CustomEvent<StudyScheduleConfig>;
      setSchedule(custom.detail ?? loadStudySchedule());
    };
    const onOnlineSync = (event: Event) => {
      const custom = event as CustomEvent<OnlineTimeSyncDetail>;
      if (custom.detail) {
        setTodayOnlineSeconds(custom.detail.todaySeconds);
        setTotalOnlineSeconds(custom.detail.totalSeconds);
      } else {
        setTodayOnlineSeconds(getTodayOnlineSeconds());
        setTotalOnlineSeconds(getTotalOnlineSeconds(loadOnlineTimeMap()));
      }
    };
    const unsubSession = onActiveSessionUserChange((uid) => {
      const latestDate = getLocalDateKey();
      setSchedule(loadStudySchedule(latestDate, uid));
      setTodayOnlineSeconds(getTodayOnlineSeconds(latestDate, uid));
      setTotalOnlineSeconds(getTotalOnlineSeconds(loadOnlineTimeMap(uid)));
    });

    window.addEventListener(STUDY_SCHEDULE_SYNC_EVENT, onSync);
    window.addEventListener(ONLINE_TIME_SYNC_EVENT, onOnlineSync);

    const rolloverTimer = window.setInterval(() => {
      const latestDateKey = getLocalDateKey();
      setTodayKey((prev) => {
        if (prev !== latestDateKey) {
          setSchedule(loadStudySchedule(latestDateKey));
          setTodayOnlineSeconds(getTodayOnlineSeconds(latestDateKey));
        }
        return latestDateKey;
      });
    }, 15_000);

    return () => {
      unsubSession();
      window.removeEventListener(STUDY_SCHEDULE_SYNC_EVENT, onSync);
      window.removeEventListener(ONLINE_TIME_SYNC_EVENT, onOnlineSync);
      window.clearInterval(rolloverTimer);
    };
  }, []);

  const syncToStageRoadmap = (nextSchedule: StudyScheduleConfig) => {
    const rmState = loadStageRoadmapState(user?.id);
    const repeatMin: RepeatMinutesOption =
      nextSchedule.continuousRepeatMinutes === 5 ||
      nextSchedule.continuousRepeatMinutes === 10 ||
      nextSchedule.continuousRepeatMinutes === 15
        ? nextSchedule.continuousRepeatMinutes
        : rmState.fixedRepeatIntervalMinutes;
    const nextCustom = rmState.customConfig
      ? {
          ...rmState.customConfig,
          reminderTime: nextSchedule.primaryTime || rmState.customConfig.reminderTime,
          repeatIntervalMinutes: repeatMin,
        }
      : null;
    saveStageRoadmapState(
      {
        ...rmState,
        notificationsEnabled: nextSchedule.enabled,
        fixedReminderTime: nextSchedule.primaryTime || rmState.fixedReminderTime,
        fixedRepeatIntervalMinutes: repeatMin,
        customConfig: nextCustom,
        customRoadmaps: nextCustom
          ? rmState.customRoadmaps.map((c) => (c.id === nextCustom.id ? nextCustom : c))
          : rmState.customRoadmaps,
      },
      user?.id,
    );
  };

  /**
   * Registers this device for push reminders. With `askPermission`, asks for the
   * notification permission first (must run from a click on iPhone).
   */
  const syncPushForSchedule = async (updated: StudyScheduleConfig, askPermission: boolean) => {
    if (!user?.id || !isWebPushConfigured()) return;
    const rmState = loadStageRoadmapState(user.id);
    const pushPayload = {
      userId: user.id,
      notificationsEnabled: updated.enabled,
      reminderTime: updated.primaryTime || rmState.fixedReminderTime || '20:00',
      repeatIntervalMinutes:
        updated.continuousRepeatMinutes || rmState.fixedRepeatIntervalMinutes || 10,
      studyWeekdays:
        updated.streakDaysOfWeek.length > 0 ? updated.streakDaysOfWeek : ALL_SEVEN_DAYS,
      dailyMinutesTarget: rmState.fixedDailyMinutesTarget || 15,
      lastCompletedDate: updated.completedDates.includes(todayKey) ? todayKey : null,
    };

    let permission = getBrowserNotificationPermission();
    if (updated.enabled && askPermission && permission === 'default') {
      permission = await requestBrowserNotificationPermission();
      setNotifPermission(permission);
    }

    if (updated.enabled && permission === 'granted') {
      void subscribeAndSyncWebPush(pushPayload);
    } else {
      void syncWebPushScheduleToCloud(pushPayload);
    }
  };

  const applyUpdate = async (
    patch: Partial<StudyScheduleConfig>,
    toastMsg?: string,
    syncRoadmap = true,
  ) => {
    const updated = await saveStudySchedule(patch, user?.id);
    setSchedule(updated);
    if (syncRoadmap) {
      syncToStageRoadmap(updated);
      await syncPushForSchedule(updated, patch.enabled === true);
    }
    if (toastMsg) {
      toast({ title: toastMsg, tone: 'success' });
    }
  };

  const handleAllowNotifications = async () => {
    const permission = await requestBrowserNotificationPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
      await syncPushForSchedule(schedule, false);
      toast({ title: 'Đã bật thông báo trên máy này', tone: 'success' });
    } else {
      toast({
        title: 'Thông báo đang bị chặn. Hãy mở cài đặt trình duyệt / điện thoại để cho phép.',
        tone: 'warning',
      });
    }
  };

  const resetForm = () => {
    setEditingSlotId(null);
    setFormType('recurring');
    setFormTime('20:00');
    setFormLabel(DEFAULT_LABEL);
    setFormWeekdays([...ALL_SEVEN_DAYS]);
    setFormDate(getLocalDateKey());
    setFormRepeat(true);
    setFormRepeatMinutes(DEFAULT_REPEAT_MINUTES);
    setFormError(null);
  };

  const handleStartEditSlot = (slot: StudyTimeSlot) => {
    setEditingSlotId(slot.id);
    setFormType(slot.scheduleType);
    setFormTime(slot.time);
    setFormLabel(slot.label);
    if (slot.scheduleType === 'recurring') {
      setFormWeekdays(
        slot.daysOfWeek && slot.daysOfWeek.length > 0 ? [...slot.daysOfWeek] : [...ALL_SEVEN_DAYS],
      );
    } else {
      setFormDate(slot.date || todayKey);
    }
    setFormRepeat(slot.repeatMinutes > 0);
    setFormRepeatMinutes(slot.repeatMinutes > 0 ? slot.repeatMinutes : DEFAULT_REPEAT_MINUTES);
    setFormError(null);
  };

  const handleToggleFormWeekday = (day: number) => {
    setFormError(null);
    setFormWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSaveScheduleSlot = async () => {
    setFormError(null);

    if (formType === 'recurring' && formWeekdays.length === 0) {
      setFormError('Hãy chọn ít nhất 1 ngày trong tuần.');
      return;
    }

    const res = await upsertScheduleSlot(
      {
        id: editingSlotId ?? undefined,
        scheduleType: formType,
        time: formTime,
        label: formLabel,
        daysOfWeek: formType === 'recurring' ? formWeekdays : [],
        date: formType === 'once' ? formDate : '',
        repeatMinutes: formRepeat ? formRepeatMinutes : 0,
      },
      user?.id,
    );

    if (!res.ok) {
      setFormError(res.error ?? 'Không lưu được lịch nhắc, hãy thử lại.');
      return;
    }

    setSchedule(res.schedule);
    syncToStageRoadmap(res.schedule);
    await syncPushForSchedule(res.schedule, true);

    toast({
      title: editingSlotId
        ? `Đã cập nhật lịch ${res.slot?.time ?? formTime}`
        : formType === 'recurring'
          ? `Đã thêm lịch ${formTime} · ${formatSlotWeekdays(formWeekdays)}`
          : `Đã thêm lịch ${formTime} · ${formatVietnameseDateWithWeekday(formDate)}`,
      tone: 'success',
    });
    resetForm();
  };

  const handleRemoveSlot = async (slotId: string, slotTime: string) => {
    const updated = await deleteScheduleSlot(slotId, user?.id);
    setSchedule(updated);
    if (editingSlotId === slotId) {
      resetForm();
    }
    toast({ title: `Đã xóa lịch ${slotTime}`, tone: 'info' });
  };

  const handleCompleteStudyToday = async () => {
    const updated = await recordStudyCompletion(todayKey, user?.id);
    setSchedule(updated);
    toast({ title: 'Đã ghi nhận hôm nay bạn đã học. Giữ chuỗi tốt lắm!', tone: 'success' });
  };

  const content = (
    <div className="space-y-5">
      {/* Header + master switch */}
      <div
        className={
          embedded
            ? 'flex items-center justify-end'
            : 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
        }
      >
        {!embedded && (
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <AlarmClock className="size-5 shrink-0 text-primary-fg" aria-hidden />
              <h2 className="text-base font-semibold text-fg sm:text-lg">Lịch nhắc học</h2>
            </div>
          </div>
        )}
        <div className="shrink-0">
          <Switch
            checked={schedule.enabled}
            onChange={(checked) =>
              void applyUpdate(
                { enabled: checked },
                checked ? 'Đã bật nhắc học' : 'Đã tắt nhắc học',
              )
            }
            label="Bật nhắc học"
          />
        </div>
      </div>

      {/* Device readiness */}
      {schedule.enabled && needsHomeScreenInstall && (
        <Notice tone="info">
          Trên iPhone, hãy bấm <strong>Chia sẻ → Thêm vào MH chính</strong> rồi mở app từ biểu tượng đó
          để nhận thông báo.
        </Notice>
      )}
      {schedule.enabled && !needsHomeScreenInstall && notifPermission !== 'granted' && (
        <Notice tone="warning">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {notifPermission === 'denied'
                ? 'Thông báo đang bị chặn trên máy này. Hãy cho phép trong cài đặt trình duyệt / điện thoại.'
                : notifPermission === 'unsupported'
                  ? 'Trình duyệt này không hỗ trợ thông báo.'
                  : 'Máy này chưa cho phép thông báo.'}
            </span>
            {notifPermission === 'default' && (
              <Button
                size="sm"
                variant="primary"
                leftIcon={<BellRing className="size-4" aria-hidden />}
                onClick={() => void handleAllowNotifications()}
              >
                Cho phép
              </Button>
            )}
          </div>
        </Notice>
      )}

      {/* Time slots */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-fg">Các giờ nhắc</h3>

        {schedule.timeSlots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface-2 px-4 py-4 text-center text-sm text-muted">
            Chưa có giờ nhắc nào. Thêm giờ học đầu tiên ở bên dưới nhé.
          </p>
        ) : (
          <ul className="grid gap-2" data-testid="schedule-slots-list">
            {schedule.timeSlots.map((slot) => {
              const isRecurring = slot.scheduleType === 'recurring';
              const isBeingEdited = editingSlotId === slot.id;
              return (
                <li
                  key={slot.id}
                  data-testid={`schedule-slot-item-${slot.id}`}
                  className={`flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5 ${
                    isBeingEdited ? 'border-primary' : 'border-line'
                  }`}
                >
                  <span className="font-mono text-lg font-bold text-fg tabular-nums">{slot.time}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{slot.label}</p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                      <span>
                        {isRecurring
                          ? formatSlotWeekdays(slot.daysOfWeek)
                          : `Một lần · ${formatVietnameseDateWithWeekday(slot.date)}`}
                      </span>
                      {slot.repeatMinutes > 0 && (
                        <span className="inline-flex items-center gap-1 text-primary-fg">
                          <Repeat className="size-3" aria-hidden />
                          Nhắc lại mỗi {slot.repeatMinutes} phút
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton
                      size="sm"
                      aria-label={`Sửa lịch ${slot.time}`}
                      onClick={() => handleStartEditSlot(slot)}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      size="sm"
                      aria-label={`Xóa lịch ${slot.time}`}
                      onClick={() => void handleRemoveSlot(slot.id, slot.time)}
                    >
                      <Trash2 className="size-4 text-danger-fg" aria-hidden />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Add / Edit form */}
        <div className="space-y-4 rounded-xl border border-line bg-surface-2 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-fg">
              {editingSlotId ? 'Sửa giờ nhắc' : 'Thêm giờ nhắc'}
            </span>
            {editingSlotId && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X className="size-3.5" aria-hidden />}
                onClick={resetForm}
              >
                Hủy
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Kiểu lịch">
            <Button
              type="button"
              size="sm"
              variant={formType === 'recurring' ? 'primary' : 'secondary'}
              aria-pressed={formType === 'recurring'}
              onClick={() => {
                setFormType('recurring');
                setFormError(null);
                if (formWeekdays.length === 0) setFormWeekdays([...ALL_SEVEN_DAYS]);
              }}
            >
              Hằng tuần
            </Button>
            <Button
              type="button"
              size="sm"
              variant={formType === 'once' ? 'primary' : 'secondary'}
              aria-pressed={formType === 'once'}
              onClick={() => {
                setFormType('once');
                setFormError(null);
                if (!formDate || formDate < todayKey) setFormDate(todayKey);
              }}
            >
              Một lần
            </Button>
          </div>

          {formError && <Notice tone="danger">{formError}</Notice>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[8rem_1fr]">
            <Field label="Giờ" htmlFor="new-slot-time">
              <Input
                id="new-slot-time"
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="tabular-nums"
              />
            </Field>
            {formType === 'once' ? (
              <Field label="Ngày" htmlFor="new-slot-date">
                <Input
                  id="new-slot-date"
                  type="date"
                  min={todayKey}
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="tabular-nums"
                />
              </Field>
            ) : (
              <div className="hidden sm:block" />
            )}
            <div className="col-span-2">
              <Field label="Nội dung" htmlFor="new-slot-label">
                <Input
                  id="new-slot-label"
                  type="text"
                  placeholder="VD: Ôn từ vựng & Kanji"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                />
              </Field>
            </div>
          </div>

          {formType === 'recurring' && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted">Lặp vào các ngày</span>
              <div className="grid grid-cols-7 gap-1" role="group" aria-label="Chọn ngày trong tuần">
                {ALL_DAYS_ORDERED.map((item) => {
                  const selected = formWeekdays.includes(item.day);
                  return (
                    <Button
                      key={item.day}
                      type="button"
                      size="sm"
                      variant={selected ? 'primary' : 'secondary'}
                      aria-pressed={selected}
                      aria-label={item.fullLabel}
                      onClick={() => handleToggleFormWeekday(item.day)}
                      className="px-0"
                    >
                      {item.shortLabel}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Re-notify until the app is opened */}
          <div className="space-y-2 rounded-lg border border-line bg-surface p-3">
            <Switch
              checked={formRepeat}
              onChange={setFormRepeat}
              label="Nhắc lại nếu chưa mở app"
              description="Thông báo lặp lại đến khi bạn mở app (tối đa 3 giờ)."
            />
            {formRepeat && (
              <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Nhắc lại sau">
                {SLOT_REPEAT_OPTIONS.map((minutes) => (
                  <Button
                    key={minutes}
                    type="button"
                    size="sm"
                    variant={formRepeatMinutes === minutes ? 'primary' : 'secondary'}
                    aria-pressed={formRepeatMinutes === minutes}
                    onClick={() => setFormRepeatMinutes(minutes)}
                  >
                    {minutes} phút
                  </Button>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            fullWidth
            leftIcon={
              editingSlotId ? (
                <CheckCircle2 className="size-4" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )
            }
            onClick={() => void handleSaveScheduleSlot()}
          >
            {editingSlotId ? 'Lưu thay đổi' : 'Thêm giờ nhắc'}
          </Button>
        </div>
      </section>

      {/* Streak & JLPT goal */}
      <section className="space-y-3 border-t border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-fg">Chuỗi ngày học &amp; mục tiêu JLPT</h3>
          {user && (
            <Badge tone={streakStats.completedToday ? 'success' : 'sakura'}>
              <Flame className="size-3.5 shrink-0" aria-hidden />
              Chuỗi {streakStats.currentStreak} ngày
            </Badge>
          )}
        </div>

        {!user ? (
          <LoginRequiredState
            compact
            title="Đăng nhập để lưu lịch và chuỗi ngày học"
            description="Lịch nhắc, chuỗi ngày học và ngày thi JLPT được lưu theo tài khoản của bạn."
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-line bg-surface-2 p-3 sm:p-4">
              <Stat label="Chuỗi hiện tại" value={`${streakStats.currentStreak} ngày`} />
              <Stat label="Kỷ lục" value={`${streakStats.longestStreak} ngày`} />
              <Stat
                label="Đã học"
                value={`${streakStats.totalCompletedDays} ngày`}
                hint={formatOnlineDurationVi(totalOnlineSeconds)}
              />
            </div>

            <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                  <Clock className="size-4 text-primary-fg" aria-hidden />
                  Hôm nay
                </span>
                <span className="font-mono font-semibold text-fg tabular-nums">
                  {formatOnlineDurationVi(todayOnlineSeconds)}
                </span>
              </div>
              <ProgressBar
                value={Math.min(todayOnlineSeconds, ONLINE_STREAK_THRESHOLD_SECONDS)}
                max={ONLINE_STREAK_THRESHOLD_SECONDS}
                tone={streakStats.completedToday ? 'success' : 'primary'}
                label="Tiến độ giữ chuỗi hôm nay"
                size="sm"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted">
                  {streakStats.completedToday
                    ? '✓ Hôm nay đã được tính vào chuỗi.'
                    : `Học thêm ${onlineRemainingSeconds} giây để giữ chuỗi.`}
                </p>
                {!streakStats.completedToday && (
                  <Button
                    variant="soft"
                    size="sm"
                    leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
                    onClick={() => void handleCompleteStudyToday()}
                  >
                    Tôi đã học hôm nay
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-fg">Kỳ thi JLPT</span>
                {examDaysLeft !== null ? (
                  <Badge
                    tone={examDaysLeft > 0 ? 'primary' : examDaysLeft === 0 ? 'sakura' : 'warning'}
                  >
                    <Trophy className="size-3.5 shrink-0" aria-hidden />
                    {examDaysLeft > 0
                      ? `Còn ${examDaysLeft} ngày`
                      : examDaysLeft === 0
                        ? 'Hôm nay thi!'
                        : `Đã qua ${Math.abs(examDaysLeft)} ngày`}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted">Chưa hẹn ngày thi</span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Cấp độ" htmlFor="target-exam-level">
                  <Select
                    id="target-exam-level"
                    wrapperClassName="w-full"
                    className="w-full"
                    value={displayedExamLevel}
                    onChange={(e) =>
                      void applyUpdate(
                        { targetExamLevel: e.target.value as JLPTExamLevelGoal },
                        `Đã đặt mục tiêu kỳ thi JLPT ${e.target.value}`,
                        false,
                      )
                    }
                  >
                    {JLPT_EXAM_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        JLPT {lvl}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Ngày thi" htmlFor="target-exam-date">
                  <Input
                    id="target-exam-date"
                    type="date"
                    min={todayKey}
                    value={schedule.targetExamDate}
                    onChange={(e) =>
                      void applyUpdate(
                        {
                          targetExamLevel: displayedExamLevel,
                          targetExamDate: e.target.value,
                        },
                        e.target.value
                          ? `Đã hẹn ngày thi ${formatVietnameseDateWithWeekday(e.target.value)}`
                          : 'Đã xóa ngày thi',
                        false,
                      )
                    }
                    className="w-full tabular-nums"
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted">Chọn nhanh kỳ thi:</span>
                {upcomingJlptPresets.map((preset) => (
                  <Chip
                    key={preset.dateKey}
                    selected={schedule.targetExamDate === preset.dateKey}
                    onClick={() =>
                      void applyUpdate(
                        {
                          targetExamLevel: displayedExamLevel,
                          targetExamDate: preset.dateKey,
                        },
                        `Đã hẹn ${preset.label}`,
                        false,
                      )
                    }
                  >
                    {preset.label}
                  </Chip>
                ))}
                {schedule.targetExamDate && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void applyUpdate({ targetExamDate: '' }, 'Đã xóa ngày thi', false)
                    }
                  >
                    Xóa ngày
                  </Button>
                )}
              </div>

              {schedule.targetExamDate && examDaysLeft !== null && (
                <p className="rounded-lg border border-primary/30 bg-primary-soft/35 px-3 py-2 text-xs text-fg">
                  Mục tiêu <strong>JLPT {displayedExamLevel}</strong> vào{' '}
                  <strong>{formatVietnameseDateWithWeekday(schedule.targetExamDate)}</strong>
                  {examDaysLeft > 0
                    ? ` — còn ${examDaysLeft} ngày (~${Math.max(1, Math.ceil(examDaysLeft / 7))} tuần) để ôn luyện.`
                    : examDaysLeft === 0
                      ? ' — chúc bạn thi thật tốt hôm nay!'
                      : ` — kỳ thi này đã qua ${Math.abs(examDaysLeft)} ngày.`}
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );

  if (embedded) return content;
  return <Card padding="lg">{content}</Card>;
};

interface StudyScheduleModalProps {
  open: boolean;
  onClose: () => void;
}

export const StudyScheduleModal: React.FC<StudyScheduleModalProps> = ({ open, onClose }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="inline-flex items-center gap-2">
          <AlarmClock className="size-5 shrink-0 text-primary-fg" aria-hidden />
          <span>Lịch nhắc học</span>
        </span>
      }
      description="Đặt giờ học, app sẽ gửi thông báo về điện thoại kể cả khi bạn đã thoát app."
    >
      <StudyScheduleCard embedded />
    </Modal>
  );
};
