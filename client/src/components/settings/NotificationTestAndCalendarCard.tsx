import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  Calendar,
  CheckCircle2,
  Cloud,
  Download,
  Lock,
  PowerOff,
  RefreshCw,
  Share,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { getPreferredVocabLevel, resolveActiveVocabTextbook } from '../../data/vocabTextbooks';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import {
  downloadRoadmapIcsFile,
  downloadStudyScheduleIcsFile,
} from '../../services/googleCalendarSyncService';
import {
  getLocalDateKey,
  getTodayOnlineSeconds,
  loadStudySchedule,
} from '../../services/notificationService';
import {
  dispatchStudyReminderNotification,
  getPwaPushDiagnosticStatus,
  isWebPushConfigured,
  PWA_INSTALL_CHANGE_EVENT,
  requestBrowserNotificationPermission,
  scheduleDelayedLockscreenTestNotification,
  subscribeAndSyncWebPush,
  triggerOneTapPwaInstall,
  triggerServerWebPushTest,
  type PwaPushDiagnosticStatus,
} from '../../services/pwaReminderService';
import {
  generateStageMap,
  getActiveStageForMap,
  getEffectiveReminderSettings,
  getRecommendedFixedStageCount,
  isDailyEnforcementPending,
  loadStageRoadmapState,
  STAGE_ROADMAP_SYNC_EVENT,
} from '../../services/stageRoadmapService';
import type { StudyLevel } from '../../services/userLevelService';
import {
  Badge,
  Button,
  Card,
  Modal,
  Notice,
  useToast,
} from '../ui';

export const NotificationTestAndCalendarCard: React.FC = () => {
  const { user, studyLevel, studyTextbookId } = useAuth();
  const cmsSnapshot = useCurriculumSnapshot();
  const { toast } = useToast();

  const [syncVersion, setSyncVersion] = useState(0);
  const [diag, setDiag] = useState<PwaPushDiagnosticStatus | null>(null);
  const [refreshingDiag, setRefreshingDiag] = useState(false);
  const [swCountdown, setSwCountdown] = useState(0);
  const [serverCountdown, setServerCountdown] = useState(0);
  const [testingMode, setTestingMode] = useState<string | null>(null);
  const [lastTestReport, setLastTestReport] = useState<{
    tone: 'success' | 'info' | 'warning';
    title: string;
    detail: string;
  } | null>(null);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  const refreshDiagnostics = useCallback(async () => {
    setRefreshingDiag(true);
    const status = await getPwaPushDiagnosticStatus(user?.id);
    setDiag(status);
    setRefreshingDiag(false);
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    void getPwaPushDiagnosticStatus(user?.id).then((status) => {
      if (active) setDiag(status);
    });
    const bump = () => {
      setSyncVersion((v) => v + 1);
      void getPwaPushDiagnosticStatus(user?.id).then((status) => {
        if (active) setDiag(status);
      });
    };
    window.addEventListener(STAGE_ROADMAP_SYNC_EVENT, bump);
    window.addEventListener(PWA_INSTALL_CHANGE_EVENT, bump);
    return () => {
      active = false;
      window.removeEventListener(STAGE_ROADMAP_SYNC_EVENT, bump);
      window.removeEventListener(PWA_INSTALL_CHANGE_EVENT, bump);
    };
  }, [user?.id]);

  useEffect(() => {
    if (swCountdown <= 0) return;
    const id = window.setInterval(() => {
      setSwCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [swCountdown]);

  useEffect(() => {
    if (serverCountdown <= 0) return;
    const id = window.setInterval(() => {
      setServerCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [serverCountdown]);

  const roadmapState = useMemo(
    () => (syncVersion >= 0 ? loadStageRoadmapState(user?.id) : loadStageRoadmapState(user?.id)),
    [syncVersion, user?.id],
  );
  const guestPreferredLevel = useMemo(
    () => (syncVersion >= 0 ? getPreferredVocabLevel(user?.id) : null),
    [syncVersion, user?.id],
  );
  const activeLevel: StudyLevel =
    roadmapState.activeMode === 'custom' && roadmapState.customConfig
      ? roadmapState.customConfig.level
      : (studyLevel ?? guestPreferredLevel ?? 'N5');

  const activeBook = useMemo(
    () =>
      resolveActiveVocabTextbook(
        activeLevel,
        user?.id,
        roadmapState.activeMode === 'custom' && roadmapState.customConfig
          ? roadmapState.customConfig.textbookId
          : activeLevel === studyLevel
            ? studyTextbookId
            : null,
      ),
    [activeLevel, roadmapState.activeMode, roadmapState.customConfig, studyLevel, studyTextbookId, user?.id],
  );

  const stages = useMemo(() => {
    if (roadmapState.activeMode === 'custom' && roadmapState.customConfig) {
      const cfg = roadmapState.customConfig;
      return generateStageMap({
        mode: 'custom',
        level: cfg.level,
        textbookId: cfg.textbookId,
        userId: user?.id,
        snapshot: cmsSnapshot,
        startDate: cfg.startDate,
        dailyMinutesTarget: cfg.dailyMinutesTarget,
        totalStages: cfg.totalStages,
        studyWeekdays: cfg.studyWeekdays,
        skills: cfg.skills,
        stageOverrides: cfg.stageOverrides,
        chunkTitles: cfg.chunkTitles,
        includeKanaStarter: cfg.includeKanaStarter,
      });
    }
    return generateStageMap({
      mode: 'fixed',
      level: activeLevel,
      textbookId: activeBook.id,
      userId: user?.id,
      snapshot: cmsSnapshot,
      startDate: roadmapState.fixedStartDate,
      dailyMinutesTarget: roadmapState.fixedDailyMinutesTarget,
      totalStages: getRecommendedFixedStageCount(activeLevel, activeBook.id),
      studyWeekdays: roadmapState.fixedStudyWeekdays,
      includeKanaStarter: roadmapState.fixedIncludeKanaStarter,
    });
  }, [activeBook.id, activeLevel, cmsSnapshot, roadmapState, user?.id]);

  const activeStage = useMemo(
    () => getActiveStageForMap(stages, roadmapState.completedStages),
    [stages, roadmapState.completedStages],
  );
  const effectiveSettings = getEffectiveReminderSettings(roadmapState);
  const todayKey = getLocalDateKey();

  const buildPushPayload = () => {
    const todaySeconds = getTodayOnlineSeconds(todayKey, user?.id);
    const enforcement = isDailyEnforcementPending(roadmapState, todaySeconds);
    return {
      userId: user?.id || '',
      notificationsEnabled: roadmapState.notificationsEnabled,
      reminderTime: effectiveSettings.reminderTime,
      repeatIntervalMinutes: effectiveSettings.repeatIntervalMinutes,
      studyWeekdays: effectiveSettings.studyWeekdays,
      dailyMinutesTarget: effectiveSettings.dailyMinutesTarget,
      lastCompletedDate: enforcement.isCompletedToday ? todayKey : null,
      activeStageLabel: activeStage ? `Màn ${activeStage.stageNumber}` : undefined,
    };
  };

  const handleDownloadRoadmapIcs = () => {
    const completedSet = new Set(Object.keys(roadmapState.completedStages));
    const res = downloadRoadmapIcsFile({
      stages,
      completedStageIds: completedSet,
      level: activeLevel,
      bookTitle: activeBook.title,
      reminderTime: effectiveSettings.reminderTime,
      dailyMinutesTarget: effectiveSettings.dailyMinutesTarget,
    });
    if (res.count > 0) {
      toast({
        title: `Đã tải ${res.filename} (${res.count} ngày học)! Mở file để thêm vào Lịch điện thoại.`,
        tone: 'success',
      });
      setLastTestReport({
        tone: 'success',
        title: `Đã tải xuống ${res.filename} (${res.count} ngày học ${activeLevel})`,
        detail:
          'Trên iPhone: mở file vừa tải trong Safari / Tệp ➔ chọn "Thêm tất cả" để nạp toàn bộ lịch học + chuông trước 10p vào Apple Calendar.',
      });
      return;
    }

    const schedule = loadStudySchedule(todayKey, user?.id);
    const fallback = downloadStudyScheduleIcsFile(schedule, activeLevel);
    toast({
      title: `Đã tải ${fallback.filename} (${fallback.count} lịch nhắc)!`,
      tone: 'success',
    });
  };

  const handleDownloadScheduleIcs = () => {
    const schedule = loadStudySchedule(todayKey, user?.id);
    const res = downloadStudyScheduleIcsFile(schedule, activeLevel);
    toast({
      title: `Đã tải ${res.filename} (${res.count} lịch nhắc giờ học)!`,
      tone: 'success',
    });
    setLastTestReport({
      tone: 'success',
      title: `Đã tải xuống ${res.filename}`,
      detail: 'Mở file .ics vừa tải trên điện thoại để nạp lịch nhắc lặp hàng tuần vào Apple Calendar / Google Calendar.',
    });
  };

  const handleInstallPwa = async () => {
    const outcome = await triggerOneTapPwaInstall();
    void refreshDiagnostics();
    if (outcome === 'accepted') {
      toast({ title: 'Đã cài đặt Nihongo 問 ra màn hình chính!', tone: 'success' });
    } else if (outcome === 'already-installed') {
      toast({ title: 'Ứng dụng đã được cài ra màn hình chính.', tone: 'info' });
    } else {
      setIosGuideOpen(true);
    }
  };

  const handleEnableAndSyncPush = async () => {
    setTestingMode('sync');
    const perm = await requestBrowserNotificationPermission();
    if (perm !== 'granted') {
      setTestingMode(null);
      void refreshDiagnostics();
      setLastTestReport({
        tone: 'warning',
        title:
          perm === 'unsupported'
            ? 'Trình duyệt hiện tại chưa hỗ trợ Thông báo.'
            : 'Chưa cấp quyền Thông báo trên thiết bị.',
        detail:
          diag?.isIos && !diag.isStandalone
            ? 'Trên iPhone bắt buộc phải bấm Chia sẻ ➔ Thêm vào MH chính trước, rồi mở từ icon ngoài MH chính mới bật được Web Push.'
            : 'Hãy bấm Cho phép thông báo trong cài đặt trình duyệt / Cài đặt iPhone.',
      });
      return;
    }

    if (!user?.id || !isWebPushConfigured()) {
      setTestingMode(null);
      void refreshDiagnostics();
      setLastTestReport({
        tone: 'info',
        title: 'Đã cấp quyền thông báo cục bộ trên máy!',
        detail: !user?.id
          ? 'Hãy đăng nhập tài khoản để đồng bộ Server Web Push (kể cả khi vuốt tắt app).'
          : 'Thiếu VITE_VAPID_PUBLIC_KEY để đồng bộ Web Push cloud.',
      });
      return;
    }

    const res = await subscribeAndSyncWebPush(buildPushPayload());
    setTestingMode(null);
    await refreshDiagnostics();
    if (res.ok) {
      toast({ title: 'Đã kết nối & đồng bộ Server Web Push lên Cloud!', tone: 'success' });
      setLastTestReport({
        tone: 'success',
        title: 'Đã kích hoạt & đồng bộ Cloud Web Push thành công',
        detail:
          'Thiết bị của bạn đã được lưu vào Supabase. Bây giờ bạn có thể chạy Test 4 và Test 5 (xóa app đa nhiệm) để kiểm chứng.',
      });
    } else {
      setLastTestReport({
        tone: 'warning',
        title: 'Chưa đồng bộ được Cloud Web Push',
        detail:
          diag?.isIos && !diag.isStandalone
            ? 'Trên iPhone phải mở app từ icon đã Thêm vào MH chính mới tạo được Push Subscription.'
            : 'Hãy đảm bảo Service Worker đang hoạt động và cho phép quyền thông báo.',
      });
    }
  };

  const handleInstantLocalTest = async () => {
    setTestingMode('instant-local');
    let perm = diag?.permission ?? 'default';
    if (perm !== 'granted') {
      perm = await requestBrowserNotificationPermission();
    }
    if (perm !== 'granted') {
      setTestingMode(null);
      void refreshDiagnostics();
      toast({ title: 'Cần cho phép quyền Thông báo để test.', tone: 'warning' });
      return;
    }
    const ok = await dispatchStudyReminderNotification({
      title: `Nihongo 問 · Test ngay (${activeLevel}) thành công!`,
      body: activeStage
        ? `Thông báo tại chỗ hoạt động tốt. Màn hôm nay: Màn ${activeStage.stageNumber}.`
        : 'Thông báo tại chỗ trên thiết bị hoạt động bình thường!',
      tag: `nihongo-settings-instant-${Date.now()}`,
      url: `${window.location.origin}${window.location.pathname}#/settings`,
    });
    setTestingMode(null);
    void refreshDiagnostics();
    setLastTestReport({
      tone: ok ? 'success' : 'warning',
      title: ok ? 'Đã bắn thông báo ngay lập tức (0s)' : 'Không gửi được thông báo cục bộ',
      detail: ok
        ? 'Hãy kiểm tra thanh thông báo / banner trên màn hình thiết bị.'
        : 'Kiểm tra cài đặt Do Not Disturb / quyền thông báo của trình duyệt.',
    });
  };

  const handleSwBackgroundTest = async (delaySeconds: 5) => {
    setTestingMode(`sw-${delaySeconds}`);
    const res = await scheduleDelayedLockscreenTestNotification(
      {
        title: `Nihongo 問 · Test nền (${delaySeconds}s) thành công!`,
        body: 'Bạn vừa thoát ra màn hình chính / khóa máy và Service Worker vẫn nảy thông báo!',
        url: `${window.location.origin}${window.location.pathname}#/roadmap`,
      },
      delaySeconds,
    );
    setTestingMode(null);
    void refreshDiagnostics();
    if (!res.ok) {
      setLastTestReport({
        tone: 'warning',
        title: 'Chưa thể hẹn giờ Service Worker',
        detail:
          res.mode === 'unsupported'
            ? 'Trên iPhone hãy bấm Thêm vào MH chính và mở từ icon app để hỗ trợ thông báo.'
            : 'Bạn cần bấm Cho phép Thông báo trước.',
      });
      return;
    }
    setSwCountdown(delaySeconds);
    toast({
      title: `Đếm ngược ${delaySeconds}s — Bấm Home thoát ra màn hình chính hoặc khóa máy ngay!`,
      tone: 'info',
    });
    setLastTestReport({
      tone: 'info',
      title: `Đang hẹn Service Worker ${delaySeconds}s (${res.mode})`,
      detail:
        'Hãy bấm nút Home thoát ra Màn hình chính hoặc tắt màn hình chờ. Lưu ý: nếu muốn test cả trường hợp VUỐT XÓA HẲN APP khỏi đa nhiệm, hãy dùng Test 5 (Server Web Push).',
    });
  };

  const handleServerPushTest = async (delaySeconds: 0 | 5) => {
    setTestingMode(delaySeconds > 0 ? 'server-5' : 'server-0');
    if (delaySeconds > 0) {
      setServerCountdown(delaySeconds);
      toast({
        title: `Đã gửi lệnh Server ${delaySeconds}s — Bây giờ hãy thoát MH chính & XÓA APP khỏi đa nhiệm ngay!`,
        tone: 'info',
      });
      setLastTestReport({
        tone: 'info',
        title: `Server Cloud đang đếm ngược ${delaySeconds}s...`,
        detail:
          '3 bước test thật: (1) Bấm Home thoát ra Màn hình chính ➔ (2) Mở Đa nhiệm vuốt XÓA hẳn app Nihongo 問 ➔ (3) Đợi 5 giây xem máy có tự nổ chuông từ Apple/Google Push không!',
      });
    }

    const res = await triggerServerWebPushTest({
      payload: buildPushPayload(),
      delaySeconds,
      stageLabel: activeStage ? `Màn ${activeStage.stageNumber}` : `${activeLevel}`,
    });

    setTestingMode(null);
    void refreshDiagnostics();

    if (res.ok) {
      toast({ title: res.message, tone: 'success' });
      setLastTestReport({
        tone: 'success',
        title:
          delaySeconds > 0
            ? `Server đã hẹn giờ ${delaySeconds}s — hãy xóa app khỏi đa nhiệm và chờ chuông!`
            : 'Server Web Push tức thì thành công!',
        detail: res.message,
      });
    } else {
      setServerCountdown(0);
      toast({ title: res.message, tone: 'warning' });
      setLastTestReport({
        tone: 'warning',
        title: 'Chưa gửi được Server Web Push',
        detail: res.message,
      });
    }
  };

  return (
    <Card id="notification-center" padding="lg" className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-fg"
          >
            <BellRing className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">
              Tải lịch .ics &amp; Trung tâm Kiểm tra Thông báo
            </h2>
            <p className="text-sm text-muted">
              Xuất file lịch học trực tiếp về điện thoại và kiểm tra đủ 5 kịch bản chuông (bao gồm thoát màn hình chính &amp; vuốt xóa app khỏi đa nhiệm).
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          disabled={refreshingDiag}
          leftIcon={<RefreshCw className="size-3.5" aria-hidden />}
          onClick={() => void refreshDiagnostics()}
        >
          Làm mới trạng thái
        </Button>
      </div>

      {/* Section A: ICS Download + PWA Install */}
      <section className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
              <Calendar className="size-4 text-primary-fg" aria-hidden />
              <span>Tải file lịch học về điện thoại (.ics) &amp; Cài App PWA</span>
            </h3>
            <p className="text-xs text-muted">
              File .ics tự mở trên Apple Calendar (iPhone) hoặc Google Calendar, kèm sẵn báo thức trước 10 phút &amp; đúng giờ học.
            </p>
          </div>
          <Badge tone="primary">
            JLPT {activeLevel} · {activeBook.shortTitle}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Download className="size-4 shrink-0" aria-hidden />}
            onClick={handleDownloadRoadmapIcs}
          >
            Tải file lịch Lộ trình (.ics)
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Calendar className="size-4 shrink-0" aria-hidden />}
            onClick={handleDownloadScheduleIcs}
          >
            Tải lịch giờ nhắc cá nhân (.ics)
          </Button>
          <Button
            type="button"
            variant={diag?.isStandalone ? 'soft' : 'secondary'}
            size="sm"
            leftIcon={<Smartphone className="size-4 shrink-0" aria-hidden />}
            onClick={() => void handleInstallPwa()}
          >
            {diag?.isStandalone ? '✓ Đã mở từ Màn hình chính' : 'Cài App ra MH chính (PWA)'}
          </Button>
        </div>

        <p className="text-xs text-muted">
          Trên <strong>iPhone (Safari)</strong>: sau khi bấm tải file <code>.ics</code>, chạm vào tệp ở thanh tải xuống ➔ chọn{' '}
          <strong className="text-fg">Thêm tất cả</strong> để nạp lịch. Nếu muốn nhận chuông kể cả khi đã xóa app khỏi màn hình chờ, hãy dùng nút{' '}
          <strong className="text-fg">Cài App ra MH chính</strong> trước.
        </p>
      </section>

      {/* Section B: Device Capability Checklist */}
      <section className="space-y-3 border-t border-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-fg">
            Trạng thái nhận thông báo trên thiết bị này
          </h3>
          <Button
            type="button"
            variant="soft"
            size="sm"
            disabled={testingMode !== null}
            leftIcon={<Cloud className="size-3.5" aria-hidden />}
            onClick={() => void handleEnableAndSyncPush()}
          >
            {testingMode === 'sync' ? 'Đang kích hoạt...' : 'Kích hoạt & Đồng bộ Cloud Push'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone={diag?.isStandalone ? 'success' : 'warning'}>
            {diag?.isStandalone ? (
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            )}
            <span>
              {diag?.isStandalone
                ? 'App Màn hình chính (PWA Standalone)'
                : 'Đang mở trong trình duyệt (chưa mở từ MH chính)'}
            </span>
          </Badge>

          <Badge
            tone={
              diag?.permission === 'granted'
                ? 'success'
                : diag?.permission === 'denied'
                  ? 'danger'
                  : 'warning'
            }
          >
            {diag?.permission === 'granted' ? (
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            )}
            <span>
              Quyền chuông:{' '}
              {diag?.permission === 'granted'
                ? 'Đã cho phép'
                : diag?.permission === 'denied'
                  ? 'Đang bị chặn'
                  : diag?.permission === 'unsupported'
                    ? 'Chưa hỗ trợ'
                    : 'Chưa hỏi'}
            </span>
          </Badge>

          <Badge tone={diag?.deviceSubscribed && (diag?.cloudSubscriptionCount ?? 0) > 0 ? 'success' : 'neutral'}>
            {diag?.deviceSubscribed && (diag?.cloudSubscriptionCount ?? 0) > 0 ? (
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <Bell className="size-3.5 shrink-0" aria-hidden />
            )}
            <span>
              Cloud Web Push:{' '}
              {diag?.deviceSubscribed && (diag?.cloudSubscriptionCount ?? 0) > 0
                ? `Đã đồng bộ (${diag.cloudReminderTime || '20:00'})`
                : 'Chưa đồng bộ'}
            </span>
          </Badge>
        </div>

        {diag?.isIos && !diag.isStandalone && (
          <Notice tone="warning">
            <p className="font-semibold">
              Lưu ý bắt buộc cho iPhone / iPad để nhận chuông khi đã xóa app khỏi màn hình chờ:
            </p>
            <p className="mt-1 text-xs">
              Apple chỉ bật Web Push chạy ngầm khi bạn bấm <strong className="text-fg">Chia sẻ ➔ Thêm vào MH chính</strong> trên Safari và mở icon{' '}
              <strong className="text-fg">Nihongo 問</strong> ngoài màn hình chính.
            </p>
          </Notice>
        )}
      </section>

      {/* Section C: 5 Notification Test Modes */}
      <section className="space-y-3 border-t border-line pt-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">
            Các kiểu Test Thông báo thực tế (Từ tại chỗ tới Xóa app đa nhiệm)
          </h3>
          <p className="text-xs text-muted">
            Thử lần lượt từ trái sang phải. Muốn kiểm chứng <strong>thoát khỏi màn hình chính &amp; vuốt xóa app khỏi đa nhiệm vẫn nảy thông báo</strong>, hãy dùng nút <strong>Test 5 (Server Web Push 5s)</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={testingMode !== null}
            className="h-auto justify-start py-2.5 text-left"
            leftIcon={<Bell className="size-4 shrink-0 text-primary-fg" aria-hidden />}
            onClick={() => void handleInstantLocalTest()}
          >
            <span className="flex flex-col">
              <span className="font-semibold text-fg">1. Test ngay tại chỗ (0s)</span>
              <span className="text-[11px] font-normal text-muted">Kiểm tra quyền chuông &amp; âm thanh</span>
            </span>
          </Button>

          <Button
            type="button"
            variant={swCountdown > 0 ? 'primary' : 'secondary'}
            size="sm"
            disabled={testingMode !== null || swCountdown > 0}
            className="h-auto justify-start py-2.5 text-left"
            leftIcon={<Smartphone className="size-4 shrink-0 text-primary-fg" aria-hidden />}
            onClick={() => void handleSwBackgroundTest(5)}
          >
            <span className="flex flex-col">
              <span className="font-semibold">
                {swCountdown > 0
                  ? `2. Đếm ngược SW (${swCountdown}s)...`
                  : '2. Thoát ra MH chính (SW 5s)'}
              </span>
              <span className="text-[11px] font-normal opacity-80">
                Bấm Home ra ngoài hoặc khóa màn hình 5s
              </span>
            </span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={testingMode !== null || swCountdown > 0}
            className="h-auto justify-start py-2.5 text-left"
            leftIcon={<Lock className="size-4 shrink-0 text-primary-fg" aria-hidden />}
            onClick={() => void handleSwBackgroundTest(5)}
          >
            <span className="flex flex-col">
              <span className="font-semibold text-fg">3. Khóa máy chờ sâu (SW 5s)</span>
              <span className="text-[11px] font-normal text-muted">Đủ thời gian khóa máy &amp; chờ sáng màn</span>
            </span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={testingMode !== null}
            className="h-auto justify-start py-2.5 text-left"
            leftIcon={<Cloud className="size-4 shrink-0 text-primary-fg" aria-hidden />}
            onClick={() => void handleServerPushTest(0)}
          >
            <span className="flex flex-col">
              <span className="font-semibold text-fg">4. Server Cloud Push (0s)</span>
              <span className="text-[11px] font-normal text-muted">Test kết nối Cloud → Apple/Google → máy</span>
            </span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={testingMode !== null || serverCountdown > 0}
            className="h-auto justify-start py-2.5 text-left sm:col-span-2"
            leftIcon={<PowerOff className="size-4 shrink-0" aria-hidden />}
            onClick={() => void handleServerPushTest(5)}
          >
            <span className="flex flex-col">
              <span className="font-semibold">
                {serverCountdown > 0
                  ? `5. Đang chờ Server bắn Push (${serverCountdown}s) — Hãy vuốt xóa App ngay!`
                  : '5. Test THOÁT MH CHÍNH + XÓA APP khỏi đa nhiệm (Server Push 5s)'}
              </span>
              <span className="text-[11px] font-normal opacity-90">
                Bấm xong hãy thoát về MH chính, vuốt XÓA app ở Recent Apps &amp; tắt màn hình — sau 5s vẫn nảy chuông!
              </span>
            </span>
          </Button>
        </div>

        {lastTestReport && (
          <Notice tone={lastTestReport.tone}>
            <p className="font-semibold">{lastTestReport.title}</p>
            <p className="mt-1 text-xs leading-relaxed">{lastTestReport.detail}</p>
          </Notice>
        )}
      </section>

      {/* PWA Install Guide Modal for iPhone Safari */}
      <Modal
        open={iosGuideOpen}
        onClose={() => setIosGuideOpen(false)}
        size="sm"
        title="Cài Nihongo 問 ra Màn hình chính"
        description="Bắt buộc để iPhone nhận Web Push ngay cả khi đã xóa app khỏi màn hình chờ."
        footer={
          <Button type="button" variant="primary" onClick={() => setIosGuideOpen(false)}>
            Đã hiểu
          </Button>
        }
      >
        <div className="space-y-3 text-sm text-fg">
          <Notice tone="info">
            <span className="font-semibold">Trên iPhone / iPad (Safari):</span>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-muted">
              <li>
                Bấm biểu tượng <strong className="text-fg">Chia sẻ</strong>{' '}
                <Share className="inline size-3.5 text-primary-fg" aria-hidden /> ở thanh dưới Safari.
              </li>
              <li>
                Chọn <strong className="text-fg">Thêm vào MH chính (Add to Home Screen)</strong> ➔ Bấm{' '}
                <strong className="text-fg">Thêm</strong>.
              </li>
              <li>Mở lại icon app vừa tạo ngoài màn hình chính rồi bấm Test 5 để kiểm chứng.</li>
            </ol>
          </Notice>
        </div>
      </Modal>
    </Card>
  );
};
