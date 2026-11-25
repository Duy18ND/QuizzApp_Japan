import React, { useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
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
  buildExamGoogleCalendarUrl,
  buildGoogleCalendarUrl,
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
  STUDY_SCHEDULE_SYNC_EVENT,
  syncStudyScheduleFromCloud,
  upsertScheduleSlot,
  type JLPTExamLevelGoal,
  type OnlineTimeSyncDetail,
  type ScheduleType,
  type StudyScheduleConfig,
  type StudyTimeSlot,
} from '../../services/notificationService';
import {
  isWebPushConfigured,
  subscribeAndSyncWebPush,
  syncWebPushScheduleToCloud,
} from '../../services/pwaReminderService';
import {
  loadStageRoadmapState,
  saveStageRoadmapState,
  type RepeatMinutesOption,
} from '../../services/stageRoadmapService';
import {
  Badge,
  Button,
  Card,
  Field,
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

function computeDaysUntilExam(targetDate: string, todayKey: string): number | null {
  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return null;
  const target = new Date(`${targetDate}T00:00:00Z`);
  const today = new Date(`${todayKey}T00:00:00Z`);
  const diffMs = target.getTime() - today.getTime();
  if (!Number.isFinite(diffMs)) return null;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export const StudyScheduleCard: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());
  const [schedule, setSchedule] = useState<StudyScheduleConfig>(() => loadStudySchedule());
  const [todayOnlineSeconds, setTodayOnlineSeconds] = useState(() => getTodayOnlineSeconds());
  const [totalOnlineSeconds, setTotalOnlineSeconds] = useState(() =>
    getTotalOnlineSeconds(loadOnlineTimeMap()),
  );

  // Add / Edit Schedule Form State
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [formType, setFormType] = useState<ScheduleType>('recurring');
  const [formTime, setFormTime] = useState('20:00');
  const [formLabel, setFormLabel] = useState('Ôn từ vựng & Kanji');
  const [formWeekdays, setFormWeekdays] = useState<number[]>(() => [...ALL_SEVEN_DAYS]);
  const [formDate, setFormDate] = useState(() => getLocalDateKey());
  const [formError, setFormError] = useState<string | null>(null);

  // Calculate streak as a continuous daily online streak synced with web visit time & completed study dates
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
  const onlineRemainingSeconds = Math.max(0, ONLINE_STREAK_THRESHOLD_SECONDS - todayOnlineSeconds);

  useEffect(() => {
    if (!user?.id) return;
    void syncStudyScheduleFromCloud(user.id).then((synced) => {
      setSchedule(synced);
    });
  }, [user?.id]);

  // Listen to session/storage/sync/online-time events and automatically handle midnight date rollover
  useEffect(() => {
    const onSync = (event: Event) => {
      const custom = event as CustomEvent<StudyScheduleConfig>;
      if (custom.detail) {
        setSchedule(custom.detail);
      } else {
        setSchedule(loadStudySchedule());
      }
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

  const applyUpdate = async (patch: Partial<StudyScheduleConfig>, toastMsg?: string) => {
    const updated = await saveStudySchedule(patch, user?.id);
    setSchedule(updated);
    syncToStageRoadmap(updated);
    if (user?.id && isWebPushConfigured()) {
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
      if (
        updated.enabled &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        void subscribeAndSyncWebPush(pushPayload);
      } else {
        void syncWebPushScheduleToCloud(pushPayload);
      }
    }
    if (toastMsg) {
      toast({ title: toastMsg, tone: 'success' });
    }
  };

  const resetForm = () => {
    setEditingSlotId(null);
    setFormType('recurring');
    setFormTime('20:00');
    setFormLabel('Ôn từ vựng & Kanji');
    setFormWeekdays([...ALL_SEVEN_DAYS]);
    setFormDate(getLocalDateKey());
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
      setFormError('Vui lòng chọn ít nhất 1 thứ trong tuần (T2 – CN) trước khi lưu.');
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
      },
      user?.id,
    );

    if (!res.ok) {
      setFormError(res.error ?? 'Không thể lưu lịch nhắc.');
      return;
    }

    setSchedule(res.schedule);
    syncToStageRoadmap(res.schedule);
    if (editingSlotId) {
      toast({
        title: `Đã cập nhật lịch ${res.slot?.time ?? formTime}`,
        tone: 'success',
      });
      resetForm();
    } else {
      toast({
        title:
          formType === 'recurring'
            ? `Đã thêm lịch lặp hàng tuần (${formTime} — ${formatSlotWeekdays(formWeekdays)})`
            : `Đã thêm lịch 1 lần (${formTime} — Ngày ${formatVietnameseDateWithWeekday(formDate)})`,
        tone: 'success',
      });
      setFormLabel('Ôn từ vựng & Kanji');
    }
  };

  const handleRemoveSlot = async (slotId: string, slotTime: string) => {
    const updated = await deleteScheduleSlot(slotId, user?.id);
    setSchedule(updated);
    if (editingSlotId === slotId) {
      resetForm();
    }
    toast({ title: `Đã xóa lịch ${slotTime}`, tone: 'info' });
  };

  const handleOpenGoogleCalendar = (slot?: StudyTimeSlot) => {
    const url = buildGoogleCalendarUrl(schedule, slot);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenExamGoogleCalendar = (offsetDays: 0 | 7) => {
    if (!schedule.targetExamDate) return;
    const url = buildExamGoogleCalendarUrl(
      schedule.targetExamLevel,
      schedule.targetExamDate,
      offsetDays,
      todayKey,
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCompleteStudyToday = async () => {
    const updated = await recordStudyCompletion(todayKey, user?.id);
    setSchedule(updated);
    toast({
      title: 'Đã hoàn thành mục tiêu học hôm nay! Chuỗi Streak đã được cập nhật.',
      tone: 'success',
    });
  };

  const content = (
    <div className="space-y-4 sm:space-y-5">
      {/* Compact Header & Master Toggle */}
      <div
        className={
          embedded
            ? 'flex items-center justify-end'
            : 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
        }
      >
        {!embedded && (
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <AlarmClock className="size-5 shrink-0 text-primary-fg" aria-hidden />
              <h2 className="text-base font-semibold text-fg sm:text-lg">
                Lịch nhắc học &amp; Mục tiêu JLPT
              </h2>
            </div>
            <p className="text-xs text-muted sm:text-sm">
              Đồng bộ lịch học qua Google Calendar và tự động tính chuỗi online theo thời gian bạn học trên web.
            </p>
          </div>
        )}

        <div className="shrink-0">
          <Switch
            checked={schedule.enabled}
            onChange={(checked) =>
              void applyUpdate(
                { enabled: checked },
                checked ? 'Đã bật lịch nhắc giờ học' : 'Đã tạm tắt lịch nhắc giờ học',
              )
            }
            label="Bật lịch nhắc giờ học"
          />
        </div>
      </div>

      {/* 1. Lịch nhắc giờ học (Study Reminders — Khi nào gửi thông báo) */}
      <section className="space-y-4 border-t border-line pt-4">
        <div>
          <h3 className="text-sm font-semibold text-fg sm:text-base">
            1. Lịch nhắc giờ học (Study Reminders — Khi nào gửi thông báo)
          </h3>
          <p className="text-xs text-muted sm:text-sm">
            Đặt khung giờ học và bấm <strong>Google Lịch</strong> để nhận chuông nhắc trên điện thoại/máy tính. Lịch{' '}
            <strong>Repeats Weekly</strong> lặp hàng tuần; lịch <strong>One-Time</strong> nhắc 1 lần rồi tự xóa hết ngày.
          </p>
        </div>

        {/* Active Schedule Items List */}
        {schedule.timeSlots.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface-2 px-4 py-4 text-center text-xs text-muted sm:text-sm">
            Chưa có lịch nhắc nào. Hãy chọn loại lịch ở khung bên dưới để thêm mới!
          </div>
        ) : (
          <div className="grid gap-2.5" data-testid="schedule-slots-list">
            {schedule.timeSlots.map((slot, idx) => {
              const isRecurring = slot.scheduleType === 'recurring';
              const isBeingEdited = editingSlotId === slot.id;
              return (
                <div
                  key={slot.id}
                  data-testid={`schedule-slot-item-${slot.id}`}
                  className="flex flex-col justify-between gap-2.5 rounded-xl border border-line bg-surface px-3 py-3 sm:flex-row sm:items-center sm:px-4"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={idx === 0 ? 'primary' : 'neutral'}>
                        <span className="font-mono tabular-nums">{slot.time}</span>
                      </Badge>
                      <span className="font-semibold text-fg">{slot.label}</span>
                      <Badge tone={isRecurring ? 'primary' : 'warning'}>
                        {isRecurring ? 'Lặp hàng tuần (Repeats Weekly)' : 'Một lần (One-Time)'}
                      </Badge>
                      {isBeingEdited && <Badge tone="sakura">Đang chỉnh sửa</Badge>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      {isRecurring ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                          🗓️ Thứ áp dụng:{' '}
                          <strong className="text-primary-fg">
                            {formatSlotWeekdays(slot.daysOfWeek)}
                          </strong>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                          📅 Ngày hẹn:{' '}
                          <strong className="text-warning-fg">
                            {formatVietnameseDateWithWeekday(slot.date)}
                          </strong>{' '}
                          <span className="text-muted">(Tự xóa khi hết ngày)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-[1.45fr_1fr_1fr] gap-1 min-[375px]:gap-1.5 sm:flex sm:shrink-0 sm:items-center sm:gap-2">
                    <Button
                      variant="soft"
                      size="sm"
                      aria-label={`Thêm lịch ${slot.time} vào Google Calendar`}
                      className="justify-center gap-1 px-1.5 text-[11px] min-[375px]:gap-1.5 min-[375px]:px-2 min-[375px]:text-xs sm:px-3 sm:text-sm"
                      leftIcon={<Calendar className="size-3 shrink-0 min-[375px]:size-3.5" aria-hidden />}
                      onClick={() => handleOpenGoogleCalendar(slot)}
                    >
                      Google Lịch
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Sửa lịch ${slot.time}`}
                      className="justify-center gap-1 px-1.5 text-[11px] min-[375px]:gap-1.5 min-[375px]:px-2 min-[375px]:text-xs sm:px-3 sm:text-sm"
                      leftIcon={<Pencil className="size-3 shrink-0 min-[375px]:size-3.5" aria-hidden />}
                      onClick={() => handleStartEditSlot(slot)}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Xóa khung giờ ${slot.time}`}
                      className="justify-center gap-1 px-1.5 text-[11px] min-[375px]:gap-1.5 min-[375px]:px-2 min-[375px]:text-xs sm:px-3 sm:text-sm"
                      onClick={() => void handleRemoveSlot(slot.id, slot.time)}
                    >
                      <Trash2 className="size-3 shrink-0 text-danger-fg min-[375px]:size-3.5" aria-hidden />
                      <span className="text-danger-fg">Xóa</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add / Edit Schedule Form */}
        <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-fg">
              {editingSlotId ? 'Chỉnh sửa lịch nhắc học' : 'Thêm lịch nhắc học mới'}
            </span>
            {editingSlotId && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X className="size-3.5" aria-hidden />}
                onClick={resetForm}
              >
                Hủy sửa
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted">Chọn loại lịch nhắc:</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={formType === 'recurring' ? 'primary' : 'secondary'}
                size="sm"
                className="h-auto min-h-9 justify-center py-2 whitespace-normal sm:whitespace-nowrap"
                leftIcon={<Repeat className="size-4 shrink-0" aria-hidden />}
                onClick={() => {
                  setFormType('recurring');
                  setFormError(null);
                  if (formWeekdays.length === 0) {
                    setFormWeekdays([...ALL_SEVEN_DAYS]);
                  }
                }}
              >
                Lặp hàng tuần (Recurring Schedule)
              </Button>
              <Button
                type="button"
                variant={formType === 'once' ? 'primary' : 'secondary'}
                size="sm"
                className="h-auto min-h-9 justify-center py-2 whitespace-normal sm:whitespace-nowrap"
                leftIcon={<Calendar className="size-4 shrink-0" aria-hidden />}
                onClick={() => {
                  setFormType('once');
                  setFormError(null);
                  if (!formDate || formDate < todayKey) {
                    setFormDate(todayKey);
                  }
                }}
              >
                Một lần theo ngày (One-Time Schedule)
              </Button>
            </div>
          </div>

          {formError && <Notice tone="danger">{formError}</Notice>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <div className={formType === 'once' ? 'sm:col-span-1 lg:col-span-3' : 'sm:col-span-1 lg:col-span-4'}>
              <Field label="Giờ nhắc" htmlFor="new-slot-time">
                <Input
                  id="new-slot-time"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="tabular-nums"
                />
              </Field>
            </div>

            {formType === 'once' && (
              <div className="sm:col-span-1 lg:col-span-4">
                <Field
                  label="Ngày nhắc cụ thể"
                  htmlFor="new-slot-date"
                  hint="Tự xóa sau khi hết ngày này"
                >
                  <Input
                    id="new-slot-date"
                    type="date"
                    min={todayKey}
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="tabular-nums"
                  />
                </Field>
              </div>
            )}

            <div className={formType === 'once' ? 'sm:col-span-2 lg:col-span-5' : 'sm:col-span-1 lg:col-span-8'}>
              <Field label="Nội dung học tập" htmlFor="new-slot-label">
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

          {formType === 'recurring' ? (
            <div className="space-y-2 border-t border-line pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-fg">
                  Chọn các thứ lặp lại trong tuần:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setFormError(null);
                      setFormWeekdays([...ALL_SEVEN_DAYS]);
                    }}
                  >
                    Cả tuần (T2–CN)
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setFormError(null);
                      setFormWeekdays([1, 3, 5]);
                    }}
                  >
                    T2, T4, T6
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2" role="group" aria-label="Chọn các thứ trong tuần">
                {ALL_DAYS_ORDERED.map((item) => {
                  const selected = formWeekdays.includes(item.day);
                  return (
                    <Button
                      key={item.day}
                      type="button"
                      variant={selected ? 'primary' : 'secondary'}
                      size="sm"
                      aria-pressed={selected}
                      aria-label={`Chọn ${item.fullLabel} (${item.enShort})`}
                      onClick={() => handleToggleFormWeekday(item.day)}
                      className="justify-center px-2 sm:min-w-14 sm:px-3"
                    >
                      <span>{item.shortLabel}</span>
                      <span className="hidden text-[11px] opacity-85 sm:inline">({item.enShort})</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="border-t border-line pt-2.5 text-xs text-muted">
              Lịch <strong>Một lần (One-Time)</strong> chỉ nhắc 1 lần vào ngày{' '}
              <strong className="text-fg">{formatVietnameseDateWithWeekday(formDate)}</strong> lúc{' '}
              <strong className="text-fg">{formTime}</strong> và tự xóa khi qua ngày kế tiếp.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
            {editingSlotId && (
              <Button type="button" variant="secondary" size="sm" onClick={resetForm}>
                Hủy
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
              leftIcon={
                editingSlotId ? (
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                ) : (
                  <Plus className="size-4 shrink-0" aria-hidden />
                )
              }
              onClick={() => void handleSaveScheduleSlot()}
            >
              {editingSlotId ? 'Lưu thay đổi' : 'Thêm giờ'}
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Merged Section 2 + 3: Study Goal & Streak (Auto Web Online Time + Exam Target & Calendar) */}
      <section className="space-y-4 border-t border-line pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-fg sm:text-base">
              2. Study Goal &amp; Streak (Mục tiêu &amp; Chuỗi ngày học thực tế)
            </h3>
            <p className="text-xs text-muted sm:text-sm">
              Chuỗi online tự động tính theo <strong>thời gian bạn vào học trên web</strong> (đủ 1 phút/ngày hoặc hoàn thành Quiz). Đặt mục tiêu cấp độ JLPT và thêm lịch nhắc ngày thi bên dưới.
            </p>
          </div>

          {user && (
            <Badge tone={streakStats.completedToday ? 'success' : 'sakura'} className="self-start">
              <Flame className="size-3.5 shrink-0" aria-hidden />
              {streakStats.completedToday
                ? `Đã tính chuỗi hôm nay · Streak ${streakStats.currentStreak} ngày`
                : `Streak: ${streakStats.currentStreak} ngày · Online: ${formatOnlineDurationVi(todayOnlineSeconds)}`}
            </Badge>
          )}
        </div>

        {!user ? (
          <LoginRequiredState
            compact
            title="Đăng nhập để tính chuỗi online & mục tiêu kỳ thi"
            description="Chuỗi học tính theo thời gian vào web, ngày thi JLPT và lịch nhắc cá nhân chỉ lưu và hiển thị sau khi bạn đăng nhập (Google hoặc tự tạo tài khoản)."
          />
        ) : (
        <>
        {/* Unified Stats + Live Web Online Timer Grid */}
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
          <Stat
            label="Chuỗi hiện tại (Online Streak)"
            value={`${streakStats.currentStreak} ngày`}
            hint="Tính liên tục mỗi ngày vào học web"
          />
          <Stat
            label="Kỷ lục dài nhất (Longest)"
            value={`${streakStats.longestStreak} ngày`}
            hint="Chuỗi ngày liên tiếp cao nhất"
          />
          <Stat
            label="Tổng ngày đã học"
            value={`${streakStats.totalCompletedDays} ngày`}
            hint={`Tổng tích lũy: ${formatOnlineDurationVi(totalOnlineSeconds)}`}
          />
          <div className="flex flex-col justify-between gap-2 border-t border-line pt-2.5 sm:border-t-0 sm:pt-0 lg:border-l lg:border-line lg:pl-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1 font-medium text-fg">
                  <Clock className="size-3.5 text-primary-fg" aria-hidden />
                  Online hôm nay
                </span>
                <span className="font-mono font-semibold text-fg tabular-nums">
                  {formatOnlineDurationVi(todayOnlineSeconds)}
                </span>
              </div>
              <ProgressBar
                value={Math.min(todayOnlineSeconds, ONLINE_STREAK_THRESHOLD_SECONDS)}
                max={ONLINE_STREAK_THRESHOLD_SECONDS}
                tone={streakStats.completedToday ? 'success' : 'primary'}
                label="Tiến độ online giữ chuỗi hôm nay"
                size="sm"
              />
              <p className="text-[11px] text-muted">
                {streakStats.completedToday
                  ? '✓ Đã đủ điều kiện & cộng chuỗi hôm nay.'
                  : `Còn ${onlineRemainingSeconds} giây online để tự cộng chuỗi.`}
              </p>
            </div>
            <Button
              variant={streakStats.completedToday ? 'soft' : 'primary'}
              size="sm"
              fullWidth
              leftIcon={<CheckCircle2 className="size-4 shrink-0" aria-hidden />}
              onClick={() => void handleCompleteStudyToday()}
            >
              {streakStats.completedToday ? 'Đã hoàn thành hôm nay ✓' : 'Xác nhận học hôm nay'}
            </Button>
          </div>
        </div>

        {/* Merged JLPT Target Exam & Exam Calendar Reminder */}
        <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold text-fg sm:text-sm">
                Mục tiêu kỳ thi JLPT &amp; Lịch nhắc ngày thi
              </h4>
              <p className="text-xs text-muted">
                Chọn cấp độ + ngày thi dự kiến để đếm ngược và đẩy lịch nhắc trực tiếp vào Google Calendar.
              </p>
            </div>

            {examDaysLeft !== null ? (
              <Badge tone={examDaysLeft > 0 ? 'primary' : examDaysLeft === 0 ? 'sakura' : 'warning'}>
                <Trophy className="size-3.5 shrink-0" aria-hidden />
                {examDaysLeft > 0
                  ? `JLPT ${schedule.targetExamLevel} — Còn ${examDaysLeft} ngày`
                  : examDaysLeft === 0
                    ? `JLPT ${schedule.targetExamLevel} — Hôm nay thi!`
                    : `JLPT ${schedule.targetExamLevel} — Đã qua ${Math.abs(examDaysLeft)} ngày`}
              </Badge>
            ) : (
              <Badge tone="neutral">Chưa đặt ngày thi</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            <div className="sm:col-span-1 lg:col-span-4">
              <Field label="Cấp độ mục tiêu" htmlFor="target-exam-level">
                <Select
                  id="target-exam-level"
                  wrapperClassName="w-full"
                  className="w-full"
                  value={schedule.targetExamLevel}
                  onChange={(e) =>
                    void applyUpdate({
                      targetExamLevel: e.target.value as JLPTExamLevelGoal,
                    })
                  }
                >
                  {JLPT_EXAM_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      JLPT {lvl}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="sm:col-span-1 lg:col-span-5">
              <Field label="Ngày thi dự kiến" htmlFor="target-exam-date">
                <Input
                  id="target-exam-date"
                  type="date"
                  value={schedule.targetExamDate}
                  onChange={(e) =>
                    void applyUpdate(
                      { targetExamDate: e.target.value },
                      e.target.value ? 'Đã lưu ngày thi mục tiêu' : 'Đã xóa ngày thi mục tiêu',
                    )
                  }
                  className="w-full tabular-nums"
                />
              </Field>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              {schedule.targetExamDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center lg:w-auto"
                  onClick={() =>
                    void applyUpdate({ targetExamDate: '' }, 'Đã xóa ngày thi JLPT mục tiêu')
                  }
                >
                  <X className="size-3.5 shrink-0" aria-hidden />
                  <span>Xóa ngày thi</span>
                </Button>
              )}
            </div>
          </div>

          {schedule.targetExamDate ? (
            <div className="grid grid-cols-2 gap-1.5 border-t border-line pt-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                className="h-auto min-h-9 justify-center gap-1 px-1.5 py-2 text-[11px] leading-tight whitespace-normal min-[375px]:gap-1.5 min-[375px]:px-2.5 min-[375px]:text-xs min-[375px]:whitespace-nowrap sm:px-3 sm:text-sm"
                leftIcon={<AlarmClock className="size-3 shrink-0 min-[375px]:size-3.5 sm:size-4" aria-hidden />}
                rightIcon={<ExternalLink className="hidden size-3.5 shrink-0 sm:inline" aria-hidden />}
                onClick={() => handleOpenExamGoogleCalendar(7)}
              >
                Trước 7 ngày ôn
              </Button>
              <Button
                variant="soft"
                size="sm"
                className="h-auto min-h-9 justify-center gap-1 px-1.5 py-2 text-[11px] leading-tight whitespace-normal min-[375px]:gap-1.5 min-[375px]:px-2.5 min-[375px]:text-xs min-[375px]:whitespace-nowrap sm:px-3 sm:text-sm"
                leftIcon={<Calendar className="size-3 shrink-0 min-[375px]:size-3.5 sm:size-4" aria-hidden />}
                rightIcon={<ExternalLink className="hidden size-3.5 shrink-0 sm:inline" aria-hidden />}
                onClick={() => handleOpenExamGoogleCalendar(0)}
              >
                Ngày thi chính thức
              </Button>
            </div>
          ) : (
            <p className="border-t border-line pt-2.5 text-xs text-muted">
              Chọn <strong>Ngày thi dự kiến</strong> để mở nút thêm lịch nhắc <strong>Trước 7 ngày ôn</strong> &amp; <strong>Ngày thi chính thức</strong> trên Google Calendar.
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
          <span>Lịch nhắc học &amp; Mục tiêu JLPT</span>
        </span>
      }
      description="Thêm lịch nhắc Google Calendar và theo dõi chuỗi học online tự động trên web."
    >
      <StudyScheduleCard embedded />
    </Modal>
  );
};
