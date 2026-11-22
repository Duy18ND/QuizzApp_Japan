import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BellRing, Clock, X } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import {
  getTodayOnlineSeconds,
  ONLINE_TIME_SYNC_EVENT,
} from '../../services/notificationService';
import { dispatchStudyReminderNotification } from '../../services/pwaReminderService';
import {
  formatMmSs,
  isDailyEnforcementPending,
  loadStageRoadmapState,
  STAGE_ROADMAP_SYNC_EVENT,
} from '../../services/stageRoadmapService';
import { buttonStyles } from '../ui/styles';

export const DailyStudyGateBanner: React.FC = () => {
  const { user, studyLevel } = useAuth();
  const { pathname } = useLocation();
  const [syncVersion, setSyncVersion] = useState(0);
  const [snoozedUntilMs, setSnoozedUntilMs] = useState<number>(0);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const lastBrowserNotifRef = useRef<number>(0);

  useEffect(() => {
    const bump = () => setSyncVersion((v) => v + 1);
    window.addEventListener(STAGE_ROADMAP_SYNC_EVENT, bump);
    window.addEventListener(ONLINE_TIME_SYNC_EVENT, bump);
    const timer = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => {
      window.removeEventListener(STAGE_ROADMAP_SYNC_EVENT, bump);
      window.removeEventListener(ONLINE_TIME_SYNC_EVENT, bump);
      window.clearInterval(timer);
    };
  }, []);

  const roadmapState = useMemo(
    () => (syncVersion >= 0 ? loadStageRoadmapState(user?.id) : loadStageRoadmapState(user?.id)),
    [syncVersion, user?.id],
  );
  const todayOnlineSeconds = useMemo(
    () =>
      syncVersion >= 0
        ? getTodayOnlineSeconds(undefined, user?.id)
        : getTodayOnlineSeconds(undefined, user?.id),
    [syncVersion, user?.id],
  );

  const enforcement = useMemo(
    () => isDailyEnforcementPending(roadmapState, todayOnlineSeconds, new Date(nowTick)),
    [roadmapState, todayOnlineSeconds, nowTick],
  );

  useEffect(() => {
    if (!user || !enforcement.isDueNow || nowTick < snoozedUntilMs) return;
    const intervalMs = enforcement.repeatIntervalMinutes * 60_000;
    const elapsed = nowTick - lastBrowserNotifRef.current;
    if (elapsed >= intervalMs) {
      lastBrowserNotifRef.current = nowTick;
      const missingText =
        enforcement.remainingSeconds > 0
          ? `Còn thiếu ${formatMmSs(enforcement.remainingSeconds)} online`
          : 'Đã đủ thời gian — hãy bấm Hoàn thành Màn hôm nay';
      void dispatchStudyReminderNotification({
        title: `Nihongo 問 · Nhắc học ${studyLevel ? `JLPT ${studyLevel}` : 'hôm nay'}`,
        body: `${missingText} để mở khóa Màn kế tiếp và tắt nhắc ngày hôm nay.`,
      });
    }
  }, [
    enforcement.isDueNow,
    enforcement.remainingSeconds,
    enforcement.repeatIntervalMinutes,
    nowTick,
    snoozedUntilMs,
    studyLevel,
    user,
  ]);

  const isAuthOrAdmin =
    pathname === '/login' || pathname === '/register' || pathname.startsWith('/admin');

  if (!user || isAuthOrAdmin || !enforcement.isDueNow || nowTick < snoozedUntilMs) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-30 flex-none border-b border-sakura/40 bg-sakura-soft px-3 py-2 text-xs text-fg sm:px-5 sm:text-sm print:hidden"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <BellRing className="size-4 shrink-0 text-sakura" aria-hidden />
          <p className="min-w-0 truncate font-medium">
            {enforcement.remainingSeconds > 0 ? (
              <>
                Đã đến giờ học ({enforcement.reminderTime}) · Còn thiếu{' '}
                <strong className="tabular text-primary-fg">
                  {formatMmSs(enforcement.remainingSeconds)}
                </strong>{' '}
                online để xong Màn hôm nay &amp; tắt nhắc.
              </>
            ) : (
              <>
                Đã đạt đủ thời gian online hôm nay! Mở Bản đồ Màn để xác nhận hoàn thành &amp; tắt nhắc.
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {pathname !== '/roadmap' && pathname !== '/roadmap/stages' && (
            <Link
              to="/roadmap"
              className={buttonStyles({ variant: 'primary', size: 'sm', className: 'h-7 px-2.5 text-xs' })}
            >
              Mở Màn hôm nay
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              const now = Date.now();
              lastBrowserNotifRef.current = now;
              setSnoozedUntilMs(now + enforcement.repeatIntervalMinutes * 60_000);
            }}
            title={`Tạm ẩn, nhắc lại sau ${enforcement.repeatIntervalMinutes} phút`}
            className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-7 gap-1 px-2 text-xs' })}
          >
            <Clock className="size-3" aria-hidden />
            <span>+{enforcement.repeatIntervalMinutes}p</span>
            <X className="size-3" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
};
