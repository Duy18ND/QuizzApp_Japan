import React, { useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  Bell,
  BellOff,
  BellRing,
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  Pencil,
  Plus,
  RefreshCw,
  Repeat,
  Send,
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
  getEffectiveNotificationPermissionState,
  getLocalDateKey,
  getNotificationPermissionState,
  JLPT_EXAM_LEVELS,
  listSubscribedDevices,
  loadLastNativeSyncStatus,
  loadStudySchedule,
  NATIVE_NOTIFICATION_SYNC_EVENT,
  recordStudyCompletion,
  requestStudyNotificationPermission,
  saveStudySchedule,
  sendTestPushNotification,
  STUDY_SCHEDULE_SYNC_EVENT,
  subscribeDeviceToWebPush,
  syncNativeStudySchedules,
  syncStudyScheduleFromCloud,
  unsubscribeDeviceFromWebPush,
  upsertScheduleSlot,
  type JLPTExamLevelGoal,
  type NativeScheduleSyncStatus,
  type NotificationPermissionStatus,
  type PushDeviceSubscriptionRecord,
  type RepeatIntervalMinutes,
  type ScheduleType,
  type StudyScheduleConfig,
  type StudyTimeSlot,
} from '../../services/notificationService';
import {
  generateSecureNtfyTopic,
  isValidNtfyTopic,
  loadNtfyConfig,
  pushUpcomingSchedulesToNtfy,
  saveNtfyConfig,
  sendNtfyNotification,
  type NtfyChannelConfig,
} from '../../services/thirdPartyPushService';
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
  const [nativeStatus, setNativeStatus] = useState<NativeScheduleSyncStatus>(() =>
    loadLastNativeSyncStatus(),
  );
  const [syncingNative, setSyncingNative] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: 'success' | 'warning' | 'danger' | 'info';
    message: string;
  } | null>(null);
  const [subscribedDevices, setSubscribedDevices] = useState<PushDeviceSubscriptionRecord[]>([]);
  const [subscribingPush, setSubscribingPush] = useState(false);
  const [ntfyConfig, setNtfyConfig] = useState<NtfyChannelConfig>(() => loadNtfyConfig());
  const [ntfyBusy, setNtfyBusy] = useState(false);
  const [ntfyFeedback, setNtfyFeedback] = useState<{
    tone: 'success' | 'warning' | 'danger' | 'info';
    message: string;
  } | null>(null);

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
    void getEffectiveNotificationPermissionState().then((perm) => {
      setPermission(perm);
    });
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
    const onNativeSync = (event: Event) => {
      const custom = event as CustomEvent<NativeScheduleSyncStatus>;
      if (custom.detail) {
        setNativeStatus(custom.detail);
        setPermission(custom.detail.permission);
      } else {
        setNativeStatus(loadLastNativeSyncStatus());
      }
    };
    window.addEventListener(STUDY_SCHEDULE_SYNC_EVENT, onSync);
    window.addEventListener(NATIVE_NOTIFICATION_SYNC_EVENT, onNativeSync);

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
      window.removeEventListener(NATIVE_NOTIFICATION_SYNC_EVENT, onNativeSync);
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
    setRequestingPermission(true);
    setActionFeedback(null);
    const nextPerm = await requestStudyNotificationPermission();
    setPermission(nextPerm);
    setRequestingPermission(false);
    if (nextPerm === 'granted') {
      if (compat.isNativeApp) {
        const synced = await syncNativeStudySchedules(schedule);
        setNativeStatus(synced);
        const msg = `Đã cấp quyền và đồng bộ ${synced.scheduledCount} lịch vào hệ điều hành!`;
        setActionFeedback({ tone: 'success', message: msg });
        toast({ title: msg, tone: 'success' });
      } else {
        const msg = 'Đã cấp quyền thông báo thành công!';
        setActionFeedback({ tone: 'success', message: msg });
        toast({ title: msg, tone: 'success' });
      }
    } else if (nextPerm === 'denied') {
      const msg = compat.isNativeApp
        ? 'Không thể bật quyền tự động (iOS chỉ hiện hộp thoại 1 lần hoặc app cài sideload thiếu quyền thông báo). Hãy vào Cài đặt iPhone ➔ Thông báo ➔ kiểm tra mục Nihongo 問, hoặc dùng Google Calendar / app ntfy (mục 4 & 5 bên dưới).'
        : 'Quyền thông báo đang bị chặn trên trình duyệt. Hãy bật lại trong Cài đặt trình duyệt.';
      setActionFeedback({ tone: 'warning', message: msg });
      toast({ title: msg, tone: 'warning' });
    } else {
      const msg = compat.isNativeApp
        ? 'Trình bao Native iOS không nhận được phản hồi từ plugin LocalNotifications. Hãy dùng Google Calendar (mục 4) hoặc app thứ 3 ntfy (mục 5) — đảm bảo chạy ổn định 100%.'
        : 'Trình duyệt hiện tại không bật hộp thoại quyền thông báo.';
      setActionFeedback({ tone: 'warning', message: msg });
      toast({ title: msg, tone: 'warning' });
    }
  };

  const handleGenerateNtfyTopic = async () => {
    const newTopic = generateSecureNtfyTopic();
    const saved = await saveNtfyConfig(
      { topic: newTopic, enabled: true },
      { userId: user?.id, deviceId: currentDeviceId, schedule },
    );
    setNtfyConfig(saved);
    setNtfyFeedback({
      tone: 'success',
      message: `Đã tạo kênh bảo mật riêng "${saved.topic}". Bấm "Copy tên kênh" và dán vào app ntfy trên iPhone để đăng ký (Subscribe).`,
    });
  };

  const handleCopyNtfyTopic = async () => {
    const cleanTopic = ntfyConfig.topic.trim();
    if (!cleanTopic) return;
    try {
      await navigator.clipboard.writeText(cleanTopic);
      toast({ title: `Đã copy tên kênh "${cleanTopic}"!`, tone: 'success' });
    } catch {
      setNtfyFeedback({
        tone: 'info',
        message: `Hãy copy thủ công tên kênh: ${cleanTopic}`,
      });
    }
  };

  const handleSendNtfyTest = async (delay?: string) => {
    const cleanTopic = ntfyConfig.topic.trim();
    if (!isValidNtfyTopic(cleanTopic)) {
      setNtfyFeedback({
        tone: 'warning',
        message: 'Tên kênh ntfy cần dài từ 8 ký tự trở lên. Bấm "Tạo kênh bảo mật" trước nhé!',
      });
      return;
    }
    setNtfyBusy(true);
    setNtfyFeedback(null);
    const saved = await saveNtfyConfig(
      { topic: cleanTopic, enabled: true },
      { userId: user?.id, deviceId: currentDeviceId, schedule },
    );
    setNtfyConfig(saved);

    const res = await sendNtfyNotification({
      serverUrl: saved.serverUrl,
      topic: saved.topic,
      title: delay
        ? '📲 Test Push nền (ntfy iOS) — Nihongo 問'
        : '🔔 Test thông báo ntfy — Nihongo 問',
      message: delay
        ? `Thông báo hẹn sau ${delay} đã gửi thành công từ máy chủ ntfy! Bấm để mở bài học ngay.`
        : 'Kết nối ntfy thành công! Từ giờ bạn có thể ẩn hoặc xóa icon web Nihongo 問 khỏi Màn hình chính.',
      delay,
      priority: 4,
    });
    setNtfyBusy(false);

    if (res.ok) {
      const msg = delay
        ? `Đã hẹn ntfy gửi sau ${delay} tới kênh "${saved.topic}" — hãy khóa màn hình iPhone hoặc tắt Safari để chờ thông báo!`
        : `Đã gửi thông báo thử nghiệm tới kênh "${saved.topic}" trên app ntfy!`;
      setNtfyFeedback({ tone: 'success', message: msg });
      toast({ title: msg, tone: 'success' });
    } else {
      const msg = res.error ?? 'Không thể gửi thông báo tới máy chủ ntfy.';
      setNtfyFeedback({ tone: 'danger', message: msg });
      toast({ title: msg, tone: 'warning' });
    }
  };

  const handleSyncNtfy72h = async () => {
    if (schedule.timeSlots.length === 0) {
      setNtfyFeedback({
        tone: 'warning',
        message: 'Bạn chưa có khung giờ học nào trong lịch. Hãy thêm ít nhất 1 lịch ở mục 1 trước.',
      });
      return;
    }
    setNtfyBusy(true);
    setNtfyFeedback(null);
    const res = await pushUpcomingSchedulesToNtfy(ntfyConfig, schedule, {
      userId: user?.id,
      deviceId: currentDeviceId,
    });
    setNtfyConfig(loadNtfyConfig());
    setNtfyBusy(false);
    if (!res.ok) {
      setNtfyFeedback({
        tone: 'danger',
        message: res.error ?? 'Không thể đẩy lịch lên ntfy.',
      });
      return;
    }
    const msg =
      res.totalInWindow === 0
        ? 'Không có khung giờ nào rơi vào 72 giờ sắp tới (hoặc các khung giờ hôm nay đều đã qua).'
        : `Đã nạp ${res.scheduledCount} thông báo mới (tổng ${res.totalInWindow} lịch trong 72h tới) lên máy chủ ntfy. Kể cả bạn tắt Safari hoặc xóa icon web, iPhone vẫn nhận thông báo qua app ntfy!`;
    setNtfyFeedback({ tone: 'success', message: msg });
    toast({ title: 'Đã đẩy lịch 72h tới lên ntfy!', tone: 'success' });
  };

  const handleManualNativeSync = async () => {
    setSyncingNative(true);
    const synced = await syncNativeStudySchedules(schedule);
    setNativeStatus(synced);
    setPermission(synced.permission);
    setSyncingNative(false);
    toast({
      title: synced.statusMessage,
      tone: synced.error ? 'warning' : 'success',
    });
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

  const handleTestNotification = async (delaySeconds = 0) => {
    setSendingTest(true);
    if (delaySeconds > 0) {
      toast({
        title: compat.isNativeApp
          ? `Đã hẹn Test Local Notification sau ${delaySeconds} giây — hãy khóa màn hình, đóng App hoặc thử "Xóa khỏi Màn hình chính"!`
          : `Sẽ gửi Push sau ${delaySeconds} giây — hãy về Màn hình chính hoặc khóa màn hình iPhone để kiểm tra!`,
        tone: 'info',
      });
    }
    const res = await sendTestPushNotification({
      userId: user?.id,
      delaySeconds,
      schedulePrimaryTime: schedule.primaryTime,
    });
    setPermission(await getEffectiveNotificationPermissionState());
    setSendingTest(false);

    if (res.ok) {
      toast({
        title:
          res.channel === 'native_local'
            ? `Đã đăng ký Test Local Notification (${delaySeconds || 2}s) trực tiếp với ${compat.nativePlatform === 'ios' ? 'iOS UNUserNotificationCenter' : 'Android AlarmManager'}!`
            : res.channel === 'server_web_push'
              ? 'Đã gửi Background Web Push (APNs / FCM) tới thiết bị!'
              : 'Đã hiển thị thông báo qua Service Worker (ServiceWorkerRegistration.showNotification)!',
        tone: 'success',
      });
    } else {
      toast({
        title: res.reason || 'Chưa thể gửi thông báo. Vui lòng bật quyền thông báo trước.',
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

  const handleOpenGoogleCalendar = (slot?: StudyTimeSlot) => {
    const url = buildGoogleCalendarUrl(schedule, slot);
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
      {/* 0. Notification Settings & Cross-Platform Native / Web Push Status */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <AlarmClock className="size-5 text-primary-fg shrink-0" aria-hidden />
            <h2 className="text-base font-semibold text-fg">
              {compat.isNativeApp
                ? 'Cài đặt Thông báo & Lịch nhắc học (Native Mobile App)'
                : 'Cài đặt Thông báo & Lịch nhắc học (PC / iOS / Android PWA)'}
            </h2>
          </div>
          <p className="text-sm text-muted">
            {compat.isNativeApp
              ? 'Nhắc nhở trực tiếp qua hệ điều hành (iOS UNUserNotificationCenter / Android AlarmManager), hoạt động kể cả khi tắt app, khóa màn hình hoặc ẩn icon khỏi Màn hình chính.'
              : 'Nhận thông báo hệ thống trên Windows PC, Android Chrome và iPhone/iPad (PWA Màn hình chính hoặc Ứng dụng Native iOS Capacitor).'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {permission === 'granted' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success-line bg-success-soft px-3 py-1 text-xs font-semibold text-success-fg">
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
              Đã cấp quyền thông báo
            </span>
          ) : permission === 'denied' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-danger-line bg-danger-soft px-3 py-1 text-xs font-semibold text-danger-fg">
              <BellOff className="size-3.5 shrink-0" aria-hidden />
              Quyền thông báo đang bị chặn
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-line bg-warning-soft px-3 py-1 text-xs font-semibold text-warning-fg">
              <Bell className="size-3.5 shrink-0" aria-hidden />
              Chưa cấp quyền
            </span>
          )}

          {compat.isNativeApp ? (
            <Badge tone={nativeStatus.scheduledCount > 0 && permission === 'granted' ? 'success' : 'primary'}>
              {compat.nativePlatform === 'ios'
                ? `iOS UNUserNotificationCenter: ${nativeStatus.scheduledCount}/${nativeStatus.maxBudget}`
                : `Android AlarmManager: ${nativeStatus.scheduledCount}`}
            </Badge>
          ) : (
            <Badge tone={isCurrentDeviceSubscribed ? 'primary' : 'neutral'}>
              {isCurrentDeviceSubscribed ? 'Web Push: Đã bật trên máy này' : 'Web Push: Chưa đăng ký'}
            </Badge>
          )}
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

      {/* Device Compatibility, Native Scheduling Status, Push Subscription & iOS Guide */}
      <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-fg">
            Thiết bị hiện tại: <strong className="text-primary-fg">{compat.platformLabel}</strong>
          </span>
          <Badge
            tone={
              compat.nativeLocalNotificationsSupported || compat.webPushSupported
                ? 'success'
                : 'warning'
            }
          >
            {compat.nativeLocalNotificationsSupported
              ? 'Native Local Notifications (Hoạt động cả khi ẩn icon)'
              : compat.webPushSupported
                ? 'Tương thích Web Push'
                : 'Cần cài PWA ra Màn hình chính hoặc dùng App Native'}
          </Badge>
        </div>

        <p className="text-xs text-muted">{compat.compatibilitySummary}</p>

        {/* Native iOS/Android Scheduling Status Breakdown */}
        {compat.isNativeApp && (
          <div className="space-y-2 rounded-lg border border-line bg-surface p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-fg">
                Trạng thái đồng bộ hệ điều hành ({compat.nativePlatform === 'ios' ? 'Apple UNUserNotificationCenter' : 'Android Exact Alarm'})
              </span>
              <Button
                variant="secondary"
                size="sm"
                loading={syncingNative}
                leftIcon={<RefreshCw className="size-3.5 shrink-0" aria-hidden />}
                onClick={() => void handleManualNativeSync()}
              >
                Đồng bộ lại lịch Native
              </Button>
            </div>
            <p className="text-muted">{nativeStatus.statusMessage}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">
                Lặp hàng tuần (Calendar): {nativeStatus.recurringTriggerCount}
              </Badge>
              <Badge tone="neutral">
                Một lần: {nativeStatus.oneTimeTriggerCount}
              </Badge>
              <Badge tone="neutral">
                Nhắc lặp hôm nay: {nativeStatus.repeatTriggerCount}
              </Badge>
              <Badge tone={nativeStatus.overflowCount > 0 ? 'warning' : 'success'}>
                Slot OS: {nativeStatus.scheduledCount}/{nativeStatus.maxBudget} (Giới hạn iOS: {nativeStatus.systemLimit})
              </Badge>
            </div>
            {nativeStatus.overflowCount > 0 && (
              <Notice tone="warning">
                Hiện có <strong>{nativeStatus.overflowCount}</strong> lịch nhắc tương lai đang chờ trong hàng đợi rolling window (hệ điều hành iOS giới hạn tối đa 64 thông báo chờ cùng lúc và sẽ tự động nạp tiếp khi các lịch gần nhất hoàn thành).
              </Notice>
            )}
          </div>
        )}

        {permission === 'denied' && (
          <Notice tone="warning">
            {compat.isNativeApp
              ? 'Quyền thông báo đang bị tắt trên thiết bị. Hãy vào Cài đặt điện thoại ➔ Thông báo ➔ Nihongo 問 và bật "Cho phép thông báo", sau đó bấm "Đồng bộ lại lịch Native".'
              : 'Quyền thông báo đang bị chặn trên trình duyệt. Hãy bật lại quyền Thông báo trong Cài đặt trang web của trình duyệt.'}
          </Notice>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {compat.isNativeApp ? (
            <>
              <Button
                variant="primary"
                size="sm"
                loading={sendingTest}
                className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
                leftIcon={<BellRing className="size-4 shrink-0" aria-hidden />}
                onClick={() => void handleTestNotification(2)}
              >
                🔔 Test Local Notification (sau 2s)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={sendingTest}
                className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
                leftIcon={<Smartphone className="size-4 shrink-0" aria-hidden />}
                onClick={() => void handleTestNotification(5)}
              >
                📲 Test 5s (Khóa màn hình / Đóng App / Xóa khỏi MH chính)
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                loading={sendingTest}
                className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
                leftIcon={<BellRing className="size-4 shrink-0" aria-hidden />}
                onClick={() => void handleTestNotification(0)}
              >
                🔔 Gửi thông báo thử nghiệm ngay (Test Notification)
              </Button>

              <Button
                variant="secondary"
                size="sm"
                loading={sendingTest}
                className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
                leftIcon={<Smartphone className="size-4 shrink-0" aria-hidden />}
                onClick={() => void handleTestNotification(5)}
              >
                📲 Test Push sau 5s (Khóa màn hình / Đóng App)
              </Button>
            </>
          )}

          {permission !== 'granted' && permission !== 'unsupported' && (
            <Button
              variant="secondary"
              size="sm"
              loading={requestingPermission}
              className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
              leftIcon={<Bell className="size-4 shrink-0" aria-hidden />}
              onClick={() => void handleRequestPermission()}
            >
              {compat.isNativeApp
                ? 'Bật quyền thông báo (Enable Notifications)'
                : 'Cấp quyền thông báo trên trình duyệt'}
            </Button>
          )}

          {!compat.isNativeApp && (
            !isCurrentDeviceSubscribed ? (
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
            )
          )}
        </div>

        {actionFeedback && (
          <Notice tone={actionFeedback.tone}>{actionFeedback.message}</Notice>
        )}

        {/* iPhone Home Screen Removal Options: Native App vs Apple Calendar (.ics) vs Safari Hide Page */}
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface p-3 text-xs text-muted space-y-1.5">
            <p className="font-semibold text-fg">
              <Smartphone className="mr-1 inline size-3.5 text-primary-fg" aria-hidden />
              Cách 1 — Bản Native iOS App (Khuyên dùng, lưu vào App Library):
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Thông báo dùng <strong>Apple UNUserNotificationCenter</strong> (hoạt động cả khi khóa màn hình, đóng ở App Switcher, mất mạng hoặc khởi động lại iPhone).
              </li>
              <li>
                Có thể giữ icon ➔ <strong>Xóa ứng dụng</strong> ➔ chọn <strong>"Xóa khỏi Màn hình chính (Remove from Home Screen)"</strong> để ẩn vào <strong>Thư viện ứng dụng (App Library)</strong> — thông báo vẫn hiển thị bình thường (tuyệt đối không chọn <em>"Xóa ứng dụng / Delete App"</em>).
              </li>
              <li>
                <strong>Không có máy Mac?</strong> Có thể tải file <code>.ipa</code> từ GitHub Actions (<em>Build Native Apps</em>) rồi cài vào iPhone bằng <strong>Sideloadly / AltStore</strong> từ Windows.
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-line bg-surface p-3 text-xs text-muted space-y-1.5">
            <p className="font-semibold text-fg">
              <Smartphone className="mr-1 inline size-3.5 text-primary-fg" aria-hidden />
              Cách 2 &amp; 3 — Dùng trên Safari iPhone (Không cần cài App Native):
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong>Muốn xóa hẳn icon Web khỏi Màn hình chính:</strong> Bấm nút <strong>"📲 Cài vào Lịch Báo Thức Điện Thoại (iPhone .ics)"</strong> ở mục 4 để nạp lịch vào <strong>Apple Calendar</strong> — sau đó có thể xóa bookmark Web khỏi Màn hình chính mà iPhone vẫn báo chuông + hiện thông báo kèm link vào học.
              </li>
              <li>
                <strong>Muốn giữ Web Push (APNs) nhưng giấu icon khỏi MH chính:</strong> Mở Safari ➔ <strong>Chia sẻ</strong> ➔ <strong>Thêm vào MH chính</strong>, kéo icon sang 1 trang riêng rồi giữ nền MH chính ➔ bấm dãy chấm (<code>•••</code>) ➔ <strong>bỏ tích trang đó</strong> để ẩn trang (không bấm <em>Xóa dấu trang</em> vì iOS sẽ ngừng Web Push).
              </li>
            </ul>
          </div>
        </div>

        {/* Subscribed Multi-Device List */}
        {!compat.isNativeApp && subscribedDevices.length > 0 && (
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
                      aria-label={`Thêm lịch ${slot.time} vào Google Calendar`}
                      leftIcon={<Calendar className="size-3.5 text-primary-fg" aria-hidden />}
                      onClick={() => handleOpenGoogleCalendar(slot)}
                    >
                      Google Lịch
                    </Button>
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

      {/* 4. One-Click Google Calendar & Native Phone Calendar (.ics) */}
      <div className="space-y-3 border-t border-line pt-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">
            4. Liên kết Google Calendar (Google Lịch) &amp; Apple Calendar (.ics)
          </h3>
          <p className="text-xs text-muted">
            Cách ổn định nhất trên iPhone mà <strong>không cần để icon QuizzApp trên Màn hình chính</strong>: đồng bộ lịch sang ứng dụng <strong>Google Calendar</strong> hoặc <strong>Apple Calendar (Lịch iPhone)</strong> để hệ thống tự đổ chuông &amp; hiện thông báo ngoài màn hình khóa.
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
            rightIcon={<ExternalLink className="size-3.5 shrink-0" aria-hidden />}
            onClick={() => handleOpenGoogleCalendar()}
          >
            🗓️ Thêm nhanh vào Google Calendar
          </Button>
        </div>

        <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs text-muted space-y-1">
          <p className="font-semibold text-fg">
            Mẹo đồng bộ nhiều lịch cùng lúc vào ứng dụng Google Calendar trên iPhone:
          </p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Bấm nút <strong>Google Lịch</strong> ở từng khung giờ trong Mục 1 để lưu nhanh từng lịch lặp, hoặc tải file <strong>.ics</strong> rồi nhập tại <em>calendar.google.com ➔ Cài đặt ➔ Nhập &amp; xuất</em>.</li>
            <li>Trên iPhone: mở <strong>Cài đặt iPhone ➔ Thông báo ➔ Google Calendar</strong> và bật <strong>Thông báo nhạy cảm thời gian (Time-Sensitive)</strong> + bật <strong>Làm mới ứng dụng trong nền</strong> để báo đúng giây dù khóa máy.</li>
          </ol>
        </div>
      </div>

      {/* 5. 3rd-Party Push App on App Store (ntfy — Real iPhone Push without QuizzApp Icon) */}
      <div className="space-y-3 border-t border-line pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-fg">
              5. App Thứ 3 trên App Store: ntfy (Nhận Push iOS thật, không cần icon QuizzApp)
            </h3>
            <p className="text-xs text-muted">
              Cài app <strong>ntfy</strong> miễn phí từ Apple App Store (hoặc Google Play) — không cần Apple ID dev, không cần Sideloadly. Sau khi đăng ký kênh bảo mật bên dưới, iPhone sẽ nhận thông báo nhắc học kể cả khi tắt Safari hoặc xóa hẳn shortcut web khỏi Màn hình chính.
            </p>
          </div>
          <Badge tone={ntfyConfig.enabled && isValidNtfyTopic(ntfyConfig.topic) ? 'success' : 'neutral'}>
            {ntfyConfig.enabled && isValidNtfyTopic(ntfyConfig.topic)
              ? 'ntfy: Đã liên kết'
              : 'ntfy: Chưa kích hoạt'}
          </Badge>
        </div>

        <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <Field label="Máy chủ ntfy (HTTPS)" htmlFor="ntfy-server-url">
                <Input
                  id="ntfy-server-url"
                  type="url"
                  value={ntfyConfig.serverUrl}
                  onChange={(e) =>
                    setNtfyConfig((prev) => ({ ...prev, serverUrl: e.target.value }))
                  }
                  placeholder="https://ntfy.sh"
                />
              </Field>
            </div>
            <div className="sm:col-span-8">
              <Field
                label="Tên kênh riêng bảo mật (Topic ngẫu nhiên >= 8 ký tự)"
                htmlFor="ntfy-topic-input"
                hint="Dán chính xác tên kênh này vào mục Subscribe (+) trong app ntfy trên iPhone."
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-44 flex-1">
                    <Input
                      id="ntfy-topic-input"
                      type="text"
                      value={ntfyConfig.topic}
                      onChange={(e) =>
                        setNtfyConfig((prev) => ({ ...prev, topic: e.target.value }))
                      }
                      placeholder="VD: nihongo-8f3c91a4b7d2..."
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleGenerateNtfyTopic()}
                  >
                    Tạo kênh bảo mật
                  </Button>
                  {ntfyConfig.topic.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<Copy className="size-3.5" aria-hidden />}
                      onClick={() => void handleCopyNtfyTopic()}
                    >
                      Copy
                    </Button>
                  )}
                </div>
              </Field>
            </div>
          </div>

          {ntfyFeedback && (
            <Notice tone={ntfyFeedback.tone}>{ntfyFeedback.message}</Notice>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={ntfyBusy}
              className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
              leftIcon={<Send className="size-3.5 shrink-0" aria-hidden />}
              onClick={() => void handleSendNtfyTest()}
            >
              🔔 Bắn Test ntfy ngay
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={ntfyBusy}
              className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
              leftIcon={<Smartphone className="size-3.5 shrink-0" aria-hidden />}
              onClick={() => void handleSendNtfyTest('15s')}
            >
              📲 Test ntfy sau 15s (Khóa màn hình / Tắt Safari)
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={ntfyBusy}
              className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
              leftIcon={<Calendar className="size-3.5 shrink-0" aria-hidden />}
              onClick={() => void handleSyncNtfy72h()}
            >
              📅 Đẩy lịch 72h tới lên ntfy
            </Button>
          </div>
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
