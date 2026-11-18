import React, { useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  Bell,
  BellOff,
  BellRing,
  Calendar,
  CheckCircle2,
  Flame,
  Pencil,
  Plus,
  Repeat,
  Smartphone,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import {
  ALL_DAYS_ORDERED,
  buildGoogleCalendarUrl,
  calculateStudyStreakStats,
  deleteScheduleSlot,
  detectDevicePushCompatibility,
  downloadStudyScheduleIcs,
  formatSlotWeekdays,
  formatVietnameseDateWithWeekday,
  getCurrentDeviceId,
  getLocalDateKey,
  getNotificationPermissionState,
  JLPT_EXAM_LEVELS,
  listSubscribedDevices,
  loadStudySchedule,
  recordStudyCompletion,
  requestStudyNotificationPermission,
  saveStudySchedule,
  sendStudyNotification,
  STUDY_SCHEDULE_SYNC_EVENT,
  subscribeDeviceToWebPush,
  syncStudyScheduleFromCloud,
  unsubscribeDeviceFromWebPush,
  upsertScheduleSlot,
  type JLPTExamLevelGoal,
  type NotificationPermissionStatus,
  type PushDeviceSubscriptionRecord,
  type RepeatIntervalMinutes,
  type ScheduleType,
  type StudyScheduleConfig,
  type StudyTimeSlot,
} from '../../services/notificationService';
import {
  Badge,
  Button,
  Card,
  Chip,
  Field,
  Input,
  Modal,
  Notice,
  Select,
  Stat,
  Switch,
  useToast,
} from '../ui';

const REPEAT_INTERVAL_OPTIONS: Array<{ value: RepeatIntervalMinutes; label: string }> = [
  { value: 5, label: 'Mỗi 5 phút' },
  { value: 10, label: 'Mỗi 10 phút' },
  { value: 15, label: 'Mỗi 15 phút' },
];

const ALL_SEVEN_DAYS = [1, 2, 3, 4, 5, 6, 0];

function computeDaysUntilExam(targetDate: string, todayKey: string): number | null {
  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return null;
  const target = new Date(`${targetDate}T00:00:00Z`);
  const today = new Date(`${todayKey}T00:00:00Z`);
  const diffMs = target.getTime() - today.getTime();
  if (!Number.isFinite(diffMs)) return null;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export const StudyScheduleCard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());
  const [schedule, setSchedule] = useState<StudyScheduleConfig>(() => loadStudySchedule());
  const [permission, setPermission] = useState<NotificationPermissionStatus>(() =>
    getNotificationPermissionState(),
  );
  const [subscribedDevices, setSubscribedDevices] = useState<PushDeviceSubscriptionRecord[]>([]);
  const [subscribingPush, setSubscribingPush] = useState(false);

  // Add / Edit Schedule Form State
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [formType, setFormType] = useState<ScheduleType>('recurring');
  const [formTime, setFormTime] = useState('20:00');
  const [formLabel, setFormLabel] = useState('Ôn từ vựng & Kanji');
  const [formWeekdays, setFormWeekdays] = useState<number[]>(() => [...ALL_SEVEN_DAYS]);
  const [formDate, setFormDate] = useState(() => getLocalDateKey());
  const [formError, setFormError] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  const currentDeviceId = useMemo(() => getCurrentDeviceId(), []);
  const compat = useMemo(() => detectDevicePushCompatibility(), []);
  const isCurrentDeviceSubscribed = useMemo(
    () => subscribedDevices.some((d) => d.deviceId === currentDeviceId && d.enabled),
    [subscribedDevices, currentDeviceId],
  );

  const streakStats = useMemo(
    () => calculateStudyStreakStats(schedule, todayKey),
    [schedule, todayKey],
  );
  const examDaysLeft = computeDaysUntilExam(schedule.targetExamDate, todayKey);

  useEffect(() => {
    void syncStudyScheduleFromCloud(user?.id).then((synced) => {
      setSchedule(synced);
    });
    void listSubscribedDevices(user?.id).then((devices) => {
      setSubscribedDevices(devices);
    });
  }, [user?.id]);

  // Listen to storage/sync events and automatically re-check date rollover without page refresh
  useEffect(() => {
    const onSync = (event: Event) => {
      const custom = event as CustomEvent<StudyScheduleConfig>;
      if (custom.detail) {
        setSchedule(custom.detail);
      } else {
        setSchedule(loadStudySchedule());
      }
    };
    window.addEventListener(STUDY_SCHEDULE_SYNC_EVENT, onSync);

    const rolloverTimer = window.setInterval(() => {
      const latestDateKey = getLocalDateKey();
      setTodayKey((prev) => {
        if (prev !== latestDateKey) {
          setSchedule(loadStudySchedule(latestDateKey));
        }
        return latestDateKey;
      });
    }, 15_000);

    return () => {
      window.removeEventListener(STUDY_SCHEDULE_SYNC_EVENT, onSync);
      window.clearInterval(rolloverTimer);
    };
  }, []);

  const applyUpdate = async (patch: Partial<StudyScheduleConfig>, toastMsg?: string) => {
    const updated = await saveStudySchedule(patch, user?.id);
    setSchedule(updated);
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

  const handleRequestPermission = async () => {
    const nextPerm = await requestStudyNotificationPermission();
    setPermission(nextPerm);
    if (nextPerm === 'granted') {
      toast({ title: 'Đã cấp quyền thông báo thành công!', tone: 'success' });
    } else if (nextPerm === 'denied') {
      toast({
        title: 'Quyền thông báo đang bị chặn trên trình duyệt. Hãy bật lại trong Cài đặt trình duyệt.',
        tone: 'warning',
      });
    }
  };

  const handleSubscribeCurrentDevice = async () => {
    setSubscribingPush(true);
    const res = await subscribeDeviceToWebPush({ userId: user?.id });
    setPermission(getNotificationPermissionState());
    setSubscribingPush(false);
    if (res.ok) {
      setSubscribedDevices(res.devices);
      toast({
        title: 'Đã đăng ký nhận thông báo Web Push trên thiết bị này!',
        tone: 'success',
      });
    } else {
      toast({
        title: res.error ?? 'Không thể đăng ký Web Push.',
        tone: 'warning',
      });
    }
  };

  const handleUnsubscribeDevice = async (targetDeviceId: string, label: string) => {
    const remaining = await unsubscribeDeviceFromWebPush(targetDeviceId, user?.id);
    setSubscribedDevices(remaining);
    toast({
      title: `Đã tắt nhận thông báo Push trên ${label}`,
      tone: 'info',
    });
  };

  const handleTestNotification = async () => {
    setSendingTest(true);
    const res = await sendStudyNotification({
      title: '🔔 Thông báo thử nghiệm — Nihongo 問',
      body: `Lịch nhắc học (${schedule.primaryTime}) đã hoạt động! Bấm để vào ôn tập ngay.`,
      slotTime: schedule.primaryTime,
      snoozeMinutes: schedule.continuousRepeatMinutes || 5,
      requireInteraction: false,
    });
    setPermission(getNotificationPermissionState());
    setSendingTest(false);

    if (res.ok) {
      toast({ title: 'Đã gửi thông báo thử nghiệm tới thiết bị!', tone: 'success' });
    } else {
      toast({
        title: res.reason || 'Chưa thể gửi thông báo. Vui lòng cấp quyền thông báo trước.',
        tone: 'warning',
      });
    }
  };

  const handleToggleStreakWeekday = (day: number) => {
    const hasDay = schedule.streakDaysOfWeek.includes(day);
    const nextDays = hasDay
      ? schedule.streakDaysOfWeek.filter((d) => d !== day)
      : [...schedule.streakDaysOfWeek, day];
    if (nextDays.length === 0) {
      toast({ title: 'Vui lòng chọn ít nhất 1 thứ mục tiêu trong tuần.', tone: 'warning' });
      return;
    }
    void applyUpdate({
      streakMode: 'custom_weekly',
      streakDaysOfWeek: nextDays,
    });
  };

  const handleDownloadIcs = () => {
    downloadStudyScheduleIcs(schedule);
    toast({
      title: 'Đã tải file lịch báo thức (.ics) — mở file để thêm vào Lịch điện thoại!',
      tone: 'success',
    });
  };

  const handleOpenGoogleCalendar = () => {
    const url = buildGoogleCalendarUrl(schedule);
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

  return (
    <Card padding="lg" className="space-y-5">
      {/* 0. Notification Settings & Cross-Platform Push Status */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <AlarmClock className="size-5 text-primary-fg shrink-0" aria-hidden />
            <h2 className="text-base font-semibold text-fg">
              Cài đặt Thông báo & Lịch nhắc học (PC / iOS / Android PWA)
            </h2>
          </div>
          <p className="text-sm text-muted">
            Nhận thông báo hệ thống trên Windows PC, Android Chrome và iPhone/iPad (iOS 16.4+ đã thêm vào Màn hình chính).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {permission === 'granted' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success-line bg-success-soft px-3 py-1 text-xs font-semibold text-success-fg">
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
              Đã cấp quyền thông báo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-line bg-warning-soft px-3 py-1 text-xs font-semibold text-warning-fg">
              <Bell className="size-3.5 shrink-0" aria-hidden />
              Chưa cấp quyền
            </span>
          )}
          <Badge tone={isCurrentDeviceSubscribed ? 'primary' : 'neutral'}>
            {isCurrentDeviceSubscribed ? 'Web Push: Đã bật trên máy này' : 'Web Push: Chưa đăng ký'}
          </Badge>
        </div>
      </div>

      <Switch
        checked={schedule.enabled}
        onChange={(checked) =>
          void applyUpdate(
            { enabled: checked },
            checked ? 'Đã bật lịch nhắc giờ học' : 'Đã tạm tắt lịch nhắc giờ học',
          )
        }
        label="Bật thông báo nhắc giờ học trên điện thoại / máy tính"
        description="Khi bật, hệ thống gửi thông báo theo lịch nhắc (múi giờ Asia/Ho_Chi_Minh). Gửi thông báo nhắc học không tự động cộng chuỗi Streak."
      />

      {/* Device Compatibility, Push Subscription & iOS Guide */}
      <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-fg">
            Thiết bị hiện tại: <strong className="text-primary-fg">{compat.platformLabel}</strong>
          </span>
          <Badge tone={compat.webPushSupported ? 'success' : 'warning'}>
            {compat.webPushSupported ? 'Tương thích Web Push' : 'Cần cài PWA ra Màn hình chính'}
          </Badge>
        </div>

        <p className="text-xs text-muted">{compat.compatibilitySummary}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            loading={sendingTest}
            className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
            leftIcon={<BellRing className="size-4 shrink-0" aria-hidden />}
            onClick={() => void handleTestNotification()}
          >
            🔔 Gửi thông báo thử nghiệm ngay (Test Notification)
          </Button>

          {permission !== 'granted' && permission !== 'unsupported' && (
            <Button
              variant="secondary"
              size="sm"
              className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
              leftIcon={<Bell className="size-4 shrink-0" aria-hidden />}
              onClick={() => void handleRequestPermission()}
            >
              Cấp quyền thông báo trên trình duyệt
            </Button>
          )}

          {!isCurrentDeviceSubscribed ? (
            <Button
              variant="secondary"
              size="sm"
              loading={subscribingPush}
              className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
              leftIcon={<Smartphone className="size-4 shrink-0" aria-hidden />}
              onClick={() => void handleSubscribeCurrentDevice()}
            >
              Đăng ký Web Push trên thiết bị này
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
              leftIcon={<BellOff className="size-4 shrink-0 text-danger-fg" aria-hidden />}
              onClick={() =>
                void handleUnsubscribeDevice(currentDeviceId, 'thiết bị hiện tại')
              }
            >
              <span className="text-danger-fg">Tắt Push trên thiết bị này</span>
            </Button>
          )}
        </div>

        {/* iOS 16.4+ Step-by-Step Home Screen Instructions */}
        <div className="rounded-lg border border-line bg-surface p-3 text-xs text-muted space-y-1">
          <p className="font-semibold text-fg">
            <Smartphone className="mr-1 inline size-3.5 text-primary-fg" aria-hidden />
            Hướng dẫn nhận thông báo trên iPhone / iPad (iOS/iPadOS 16.4+):
          </p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Mở trang web trong trình duyệt <strong>Safari</strong>.</li>
            <li>Bấm nút <strong>Chia sẻ (Share)</strong>.</li>
            <li>Chọn <strong>Thêm vào MH chính (Add to Home Screen)</strong>.</li>
            <li>Mở ứng dụng <strong>Nihongo 問</strong> từ Màn hình chính.</li>
            <li>Bật quyền thông báo và bấm <strong>Đăng ký Web Push trên thiết bị này</strong>.</li>
          </ol>
        </div>

        {/* Subscribed Multi-Device List */}
        {subscribedDevices.length > 0 && (
          <div className="space-y-1.5 border-t border-line pt-2.5">
            <span className="text-xs font-semibold text-fg">
              Thiết bị đang nhận thông báo Push ({subscribedDevices.length}):
            </span>
            <div className="grid gap-1.5">
              {subscribedDevices.map((dev) => {
                const isThisDevice = dev.deviceId === currentDeviceId;
                return (
                  <div
                    key={dev.deviceId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-fg">{dev.deviceLabel}</span>
                      <Badge tone={isThisDevice ? 'primary' : 'neutral'}>
                        {isThisDevice ? 'Thiết bị này' : dev.browser}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Hủy đăng ký thiết bị ${dev.deviceLabel}`}
                      onClick={() => void handleUnsubscribeDevice(dev.deviceId, dev.deviceLabel)}
                    >
                      <Trash2 className="size-3.5 text-danger-fg" aria-hidden />
                      <span className="text-xs text-danger-fg">Gỡ thiết bị</span>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 1. Study Reminders (WHEN notifications are sent) */}
      <div className="space-y-4 border-t border-line pt-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">
            1. Lịch nhắc giờ học (Study Reminders — Khi nào gửi thông báo)
          </h3>
          <p className="text-xs text-muted">
            Quy định thời điểm gửi thông báo nhắc học. Lịch <strong>Repeats Weekly</strong> lặp lại hàng tuần theo các Thứ đã chọn; lịch <strong>One-Time</strong> chỉ nhắc 1 lần vào ngày đã chọn và tự xóa khi qua ngày mới.
          </p>
        </div>

        {/* Active Schedule Items List */}
        {schedule.timeSlots.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface-2 px-4 py-4 text-center text-xs text-muted">
            Chưa có lịch nhắc nào. Hãy chọn loại lịch (Lặp hàng tuần hoặc Một lần) ở khung bên dưới để thêm mới!
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
                  className="flex flex-col justify-between gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3 sm:flex-row sm:items-center"
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
                      {isBeingEdited && (
                        <Badge tone="sakura">Đang chỉnh sửa</Badge>
                      )}
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

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Sửa lịch ${slot.time}`}
                      leftIcon={<Pencil className="size-3.5" aria-hidden />}
                      onClick={() => handleStartEditSlot(slot)}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Xóa khung giờ ${slot.time}`}
                      onClick={() => void handleRemoveSlot(slot.id, slot.time)}
                    >
                      <Trash2 className="size-3.5 text-danger-fg" aria-hidden />
                      <span className="text-xs text-danger-fg">Xóa</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Redesigned Add / Edit Schedule Form */}
        <div className="space-y-3.5 rounded-xl border border-line bg-surface-2 p-4">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className={formType === 'once' ? 'sm:col-span-3' : 'sm:col-span-4'}>
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
              <div className="sm:col-span-4">
                <Field
                  label="Ngày nhắc cụ thể"
                  htmlFor="new-slot-date"
                  hint="Tự động xóa sau khi hết ngày này"
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

            <div className={formType === 'once' ? 'sm:col-span-5' : 'sm:col-span-8'}>
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
                  Chọn các thứ lặp lại trong tuần (bắt buộc chọn ít nhất 1 thứ):
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

              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chọn các thứ trong tuần">
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
                      className="min-w-14 justify-center"
                    >
                      <span>{item.shortLabel}</span>
                      <span className="text-[11px] opacity-85">({item.enShort})</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="border-t border-line pt-2.5 text-xs text-muted">
              Lịch <strong>Một lần (One-Time)</strong> chỉ thông báo đúng 1 lần vào ngày{' '}
              <strong className="text-fg">{formatVietnameseDateWithWeekday(formDate)}</strong> lúc{' '}
              <strong className="text-fg">{formTime}</strong>, không lặp lại tuần sau và sẽ tự xóa khi sang ngày kế tiếp.
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

        {/* Continuous Repeat Alert Sub-Option */}
        <div className="space-y-2.5 rounded-xl border border-line bg-surface p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-fg sm:text-sm">
                Nhắc lặp lại nếu chưa hoàn thành bài học hôm nay
              </span>
              <p className="text-xs text-muted">
                Áp dụng cho lịch lặp hàng tuần: nhắc lại tối đa 5 lần cho tới khi bạn hoàn thành bài học trong ngày.
              </p>
            </div>
            <Button
              variant={schedule.continuousRepeatEnabled ? 'primary' : 'secondary'}
              size="sm"
              className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
              leftIcon={<Repeat className="size-4 shrink-0" aria-hidden />}
              onClick={() =>
                void applyUpdate(
                  {
                    continuousRepeatEnabled: !schedule.continuousRepeatEnabled,
                    continuousRepeatMinutes: !schedule.continuousRepeatEnabled
                      ? schedule.continuousRepeatMinutes || 5
                      : 0,
                  },
                  !schedule.continuousRepeatEnabled
                    ? 'Đã bật Nhắc liên tục nếu chưa vào học'
                    : 'Đã tắt Nhắc liên tục',
                )
              }
            >
              🔁 Nhắc liên tục nếu chưa vào học (Continuous Repeat Alert)
            </Button>
          </div>

          {schedule.continuousRepeatEnabled && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-medium text-muted">Chu kỳ nhắc lặp lại:</span>
              {REPEAT_INTERVAL_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  selected={schedule.continuousRepeatMinutes === opt.value}
                  onClick={() =>
                    void applyUpdate(
                      {
                        continuousRepeatEnabled: true,
                        continuousRepeatMinutes: opt.value,
                      },
                      `Đã đặt nhắc lặp lại ${opt.label.toLowerCase()}`,
                    )
                  }
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Study Goal & Streak (WHICH DAYS the user actually completes studying) */}
      <div className="space-y-4 border-t border-line pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-fg">
              2. Study Goal & Streak (Mục tiêu & Chuỗi ngày học thực tế)
            </h3>
            <p className="text-xs text-muted">
              Theo dõi những ngày bạn thực sự hoàn thành bài học (làm Quiz, luyện viết hoặc xác nhận hoàn thành). Thông báo nhắc giờ không tự cộng Streak.
            </p>
          </div>
          <Badge tone={streakStats.completedToday ? 'success' : 'sakura'}>
            <Flame className="mr-1 inline size-3.5" aria-hidden />
            {streakStats.completedToday
              ? `Đã hoàn thành hôm nay · Streak ${streakStats.currentStreak} ngày`
              : `Streak hiện tại: ${streakStats.currentStreak} ngày`}
          </Badge>
        </div>

        {/* Streak Statistics Row */}
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface-2 p-3.5 sm:grid-cols-3">
          <Stat
            label="Chuỗi hiện tại (Current Streak)"
            value={`${streakStats.currentStreak} ngày`}
            hint={
              streakStats.mode === 'every_day'
                ? 'Chế độ: Học mỗi ngày'
                : `Chế độ: ${formatSlotWeekdays(schedule.streakDaysOfWeek)}`
            }
          />
          <Stat
            label="Kỷ lục dài nhất (Longest Streak)"
            value={`${streakStats.longestStreak} ngày`}
            hint="Chuỗi ngày hoàn thành liên tiếp cao nhất"
          />
          <div className="flex flex-col justify-between gap-2">
            <Stat
              label="Tổng ngày đã học (Completed Days)"
              value={`${streakStats.totalCompletedDays} ngày`}
            />
            <Button
              variant={streakStats.completedToday ? 'soft' : 'primary'}
              size="sm"
              leftIcon={<CheckCircle2 className="size-4 shrink-0" aria-hidden />}
              onClick={() => void handleCompleteStudyToday()}
            >
              {streakStats.completedToday
                ? 'Đã hoàn thành hôm nay ✓'
                : 'Hoàn thành bài học hôm nay'}
            </Button>
          </div>
        </div>

        {/* Mode A vs Mode B Selector */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-3 space-y-2">
            <Button
              variant={schedule.streakMode === 'every_day' ? 'primary' : 'secondary'}
              size="sm"
              fullWidth
              className="h-auto min-h-9 justify-center py-2 text-left whitespace-normal sm:whitespace-nowrap"
              onClick={() =>
                void applyUpdate(
                  {
                    streakMode: 'every_day',
                    streakDaysOfWeek: [...ALL_SEVEN_DAYS],
                  },
                  'Đã chọn Mode A: Mục tiêu học mỗi ngày (Every Day Goal)',
                )
              }
            >
              🔥 Học liên tục mỗi ngày (Continuous Daily Mode)
            </Button>
            <p className="text-xs text-muted">
              <strong>Every Day Goal:</strong> Mục tiêu học đều đặn mỗi ngày để giữ chuỗi liên tiếp. Bỏ lỡ 1 ngày sẽ làm đứt chuỗi Streak.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-3 space-y-2">
            <Button
              variant={schedule.streakMode === 'custom_weekly' ? 'primary' : 'secondary'}
              size="sm"
              fullWidth
              className="h-auto min-h-9 justify-center py-2 text-left whitespace-normal sm:whitespace-nowrap"
              onClick={() =>
                void applyUpdate(
                  {
                    streakMode: 'custom_weekly',
                    streakDaysOfWeek:
                      schedule.streakDaysOfWeek.length === 7
                        ? [1, 2, 3, 4, 5]
                        : schedule.streakDaysOfWeek,
                  },
                  'Đã chọn Mode B: Mục tiêu tuần tùy chỉnh (Custom Weekly Goal)',
                )
              }
            >
              📅 Chọn ngày cố định (Tùy chỉnh)
            </Button>
            <p className="text-xs text-muted">
              <strong>Custom Weekly Goal:</strong> Chọn các thứ muốn học trong tuần. Các ngày nghỉ ngoài danh sách sẽ không làm đứt chuỗi Streak.
            </p>
          </div>
        </div>

        {schedule.streakMode === 'custom_weekly' && (
          <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3">
            <span className="text-xs font-medium text-fg">
              Chọn các thứ mục tiêu tính vào chuỗi Streak (những thứ không chọn là ngày nghỉ):
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {ALL_DAYS_ORDERED.map((item) => {
                const active = schedule.streakDaysOfWeek.includes(item.day);
                return (
                  <Button
                    key={item.day}
                    variant={active ? 'primary' : 'secondary'}
                    size="sm"
                    aria-pressed={active}
                    aria-label={`Mục tiêu ${item.fullLabel}`}
                    onClick={() => handleToggleStreakWeekday(item.day)}
                    className="min-w-12 justify-center"
                  >
                    {item.shortLabel}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Target JLPT Exam Date (Separate Optional Countdown) */}
      <div className="space-y-3 border-t border-line pt-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">
            3. Target JLPT Exam Date (Đếm ngược Ngày thi JLPT mục tiêu)
          </h3>
          <p className="text-xs text-muted">
            Tính năng tùy chọn độc lập giúp theo dõi số ngày còn lại tới kỳ thi JLPT (không tự động tạo lịch nhắc học).
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3.5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-36">
              <Field label="Cấp độ mục tiêu" htmlFor="target-exam-level">
                <Select
                  id="target-exam-level"
                  value={schedule.targetExamLevel}
                  onChange={(e) =>
                    void applyUpdate({
                      targetExamLevel: e.target.value as JLPTExamLevelGoal,
                    })
                  }
                >
                  {JLPT_EXAM_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      JLPT {lvl} Target Exam
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="w-48">
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
                  className="tabular-nums"
                />
              </Field>
            </div>

            {schedule.targetExamDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void applyUpdate({ targetExamDate: '' }, 'Đã xóa ngày thi JLPT mục tiêu')
                }
              >
                <X className="size-3.5" aria-hidden />
                <span>Xóa ngày thi</span>
              </Button>
            )}
          </div>

          {examDaysLeft !== null && (
            <div className="flex items-center gap-2">
              <Badge tone={examDaysLeft > 0 ? 'primary' : examDaysLeft === 0 ? 'sakura' : 'warning'}>
                <Trophy className="mr-1 inline size-3.5" aria-hidden />
                {examDaysLeft > 0
                  ? `JLPT ${schedule.targetExamLevel} Target Exam — Còn ${examDaysLeft} ngày (${examDaysLeft} days remaining)`
                  : examDaysLeft === 0
                    ? `JLPT ${schedule.targetExamLevel} Target Exam — Hôm nay là ngày thi!`
                    : `JLPT ${schedule.targetExamLevel} Target Exam — Đã qua ngày thi mục tiêu (${Math.abs(examDaysLeft)} ngày trước)`}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* 4. One-Click Native Phone Alarm / Calendar Sync */}
      <div className="space-y-3 border-t border-line pt-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">
            4. Đồng bộ Báo thức Lịch Điện Thoại (iPhone / Android .ics & Google Calendar)
          </h3>
          <p className="text-xs text-muted">
            Đảm bảo điện thoại luôn đổ chuông đúng giờ ngay cả khi bật chế độ tiết kiệm pin nghiêm ngặt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            className="h-auto min-h-9 max-w-full py-2 text-left whitespace-normal sm:whitespace-nowrap"
            leftIcon={<Smartphone className="size-4 shrink-0" aria-hidden />}
            onClick={handleDownloadIcs}
          >
            📲 Cài vào Lịch Báo Thức Điện Thoại (iPhone / Android .ics)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="h-auto min-h-9 max-w-full py-2 text-left whitespace-normal sm:whitespace-nowrap"
            leftIcon={<Calendar className="size-4 shrink-0" aria-hidden />}
            onClick={handleOpenGoogleCalendar}
          >
            🗓️ Thêm nhanh vào Google Calendar
          </Button>
        </div>
      </div>
    </Card>
  );
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
          <AlarmClock className="size-5 text-primary-fg" aria-hidden />
          ⏰ Lịch nhắc học, Chuỗi Streak & Báo thức Điện thoại
        </span>
      }
      description="Thiết lập lịch nhắc (Recurring / One-Time), theo dõi chuỗi ngày học thực tế (Study Streak) và bật thông báo Web Push."
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <StudyScheduleCard />
    </Modal>
  );
};
