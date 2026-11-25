import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Gamepad2,
  Home,
  LogIn,
  LogOut,
  Map,
  RotateCcw,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { cn } from '../../lib/cn';
import {
  getLocalDateKey,
  getTodayOnlineSeconds,
  startWebOnlineTimeTracker,
} from '../../services/notificationService';
import {
  getBrowserNotificationPermission,
  isWebPushConfigured,
  reportAppOpenedForReminders,
  subscribeAndSyncWebPush,
} from '../../services/pwaReminderService';
import {
  getEffectiveReminderSettings,
  isDailyEnforcementPending,
  loadStageRoadmapState,
} from '../../services/stageRoadmapService';
import {
  hasDismissedLevelModal,
  markLevelModalDismissed,
  OPEN_LEVEL_MODAL_EVENT,
} from '../../services/userLevelService';
import { JapaneseLookupProvider } from '../common/JapaneseLookupPopover';
import { WhatsNewNavButton } from '../home/WhatsNewBoard';
import { DailyStudyGateBanner } from '../settings/DailyStudyGateBanner';
import { LevelSelectionModal } from '../settings/LevelSelectionModal';
import { Badge, LoadingState } from '../ui';
import { buttonStyles } from '../ui/styles';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ClickEffect } from './ClickEffect';
import { JapaneseLandscapeBg } from './JapaneseLandscapeBg';
import { SakuraContactFloating } from './SakuraContactFloating';

const ADMIN_ROLE_BADGE_TONE = {
  SUPER_ADMIN: 'sakura',
  ADMIN: 'primary',
} as const;

/** Main sections: header links on desktop, bottom bar on phones. */
const NAV_ITEMS = [
  { to: '/', label: 'Trang chủ', icon: Home, match: (p: string) => p === '/' },
  { to: '/roadmap', label: 'Lộ trình', icon: Map, match: (p: string) => p.startsWith('/roadmap') },
  { to: '/games', label: 'Mini-game', icon: Gamepad2, match: (p: string) => p.startsWith('/games') },
  {
    to: '/vocabulary',
    label: 'Từ vựng',
    icon: BookOpen,
    match: (p: string) => p.startsWith('/vocabulary') && !p.startsWith('/vocabulary/review'),
  },
  {
    to: '/vocabulary/review',
    label: 'Ôn tập',
    icon: RotateCcw,
    match: (p: string) => p.startsWith('/vocabulary/review') || p.startsWith('/jlpt'),
  },
] as const;

export const AppLayout: React.FC = () => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const mainRef = useRef<HTMLElement>(null);
  const { user, status, studyLevel, signOut } = useAuth();
  const userIdRef = useRef<string | undefined>(user?.id);
  const [manualLevelModalOpen, setManualLevelModalOpen] = useState(false);
  const [dismissedScope, setDismissedScope] = useState<string | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isAuthOrAdminRoute =
    pathname === '/login' || pathname === '/register' || pathname.startsWith('/admin');
  const currentLevelScope = user?.id ?? null;

  const shouldAutoOpenLevelModal =
    status === 'authenticated' &&
    Boolean(user) &&
    !isAuthOrAdminRoute &&
    !isAdmin &&
    !studyLevel &&
    dismissedScope !== currentLevelScope &&
    !hasDismissedLevelModal(user?.id);

  const levelModalOpen =
    manualLevelModalOpen || (Boolean(user) && shouldAutoOpenLevelModal);

  useEffect(() => {
    const stopOnlineTracker = startWebOnlineTimeTracker(() => userIdRef.current);
    return () => {
      stopOnlineTracker();
    };
  }, []);

  // Automatically keep this device's Web Push subscription synced to Supabase whenever logged in & granted
  useEffect(() => {
    if (status !== 'authenticated' || !user?.id || !isWebPushConfigured()) return;
    if (getBrowserNotificationPermission() !== 'granted') return;

    const rmState = loadStageRoadmapState(user.id);
    const effective = getEffectiveReminderSettings(rmState);
    const todayKey = getLocalDateKey();
    const enforcement = isDailyEnforcementPending(
      rmState,
      getTodayOnlineSeconds(todayKey, user.id),
    );
    void subscribeAndSyncWebPush({
      userId: user.id,
      notificationsEnabled: rmState.notificationsEnabled,
      reminderTime: effective.reminderTime,
      repeatIntervalMinutes: effective.repeatIntervalMinutes,
      studyWeekdays: effective.studyWeekdays,
      dailyMinutesTarget: effective.dailyMinutesTarget,
      lastCompletedDate: enforcement.isCompletedToday ? todayKey : null,
    });
  }, [status, user?.id]);

  // Opening the app (or coming back to it) stops "nhắc lại đến khi mở app" reminders on the server
  useEffect(() => {
    if (status !== 'authenticated' || !user?.id) return;
    const userId = user.id;
    const report = () => {
      if (document.visibilityState === 'visible') void reportAppOpenedForReminders(userId);
    };
    report();
    // Heartbeat while the app stays open, so a slot that starts during a study session doesn't re-notify
    const heartbeat = window.setInterval(report, 60_000);
    document.addEventListener('visibilitychange', report);
    window.addEventListener('focus', report);
    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', report);
      window.removeEventListener('focus', report);
    };
  }, [status, user?.id]);

  // Listen to explicit open-modal triggers from HomePage / SettingsPage / ProfilePage
  useEffect(() => {
    const onOpenLevelModal = () => setManualLevelModalOpen(true);
    window.addEventListener(OPEN_LEVEL_MODAL_EVENT, onOpenLevelModal);
    return () => {
      window.removeEventListener(OPEN_LEVEL_MODAL_EVENT, onOpenLevelModal);
    };
  }, []);

  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden bg-transparent text-fg">
      <JapaneseLandscapeBg subdued={!isHome} />
      <ClickEffect />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-on-primary"
      >
        Bỏ qua điều hướng
      </a>

      <header className="relative z-40 flex-none border-b border-line bg-glass-header print:hidden">
        <div
          aria-hidden
          className="seigaiha-mask pointer-events-none absolute inset-0 overflow-hidden bg-wave opacity-[0.035]"
        />
        <div className="relative mx-auto flex min-h-13 max-w-6xl flex-nowrap items-center justify-between gap-2 px-3 py-1.5 sm:min-h-15 sm:gap-3 sm:px-5 sm:py-2 lg:px-8">
          <Link to="/" className="group flex shrink-0 items-center gap-1.5 rounded-lg sm:gap-2.5" aria-label="Nihongo 問 — Trang chủ">
            <span
              lang="ja"
              aria-hidden
              className="grid size-7 place-items-center rounded-lg bg-primary text-sm font-bold text-on-primary shadow-card ring-2 ring-sakura/35 transition-transform duration-150 group-hover:scale-105 sm:size-8 sm:text-base"
            >
              問
            </span>
            <span className="text-sm font-bold tracking-tight min-[350px]:text-base sm:text-lg">
              Nihongo <span className="text-primary-fg">問</span>
            </span>
          </Link>

          <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  title={item.label}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                    active ? 'bg-primary-soft text-primary-fg' : 'text-muted hover:bg-glass-hover hover:text-fg',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex min-w-0 flex-nowrap items-center justify-end gap-1.5 sm:gap-2">
            {isAuthOrAdminRoute && (
              <Link
                to="/"
                aria-label="Về trang chủ"
                title="Về trang chủ"
                className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 px-2 sm:px-3 md:hidden' })}
              >
                <span aria-hidden>←</span>
                <span className="hidden sm:inline">Trang chủ</span>
              </Link>
            )}

            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    aria-label="Quản trị"
                    title="Quản trị"
                    className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 gap-1 px-2 sm:gap-1.5 sm:px-3' })}
                  >
                    <ShieldCheck className="size-3.5 shrink-0 text-primary-fg sm:size-4" aria-hidden />
                    <span className="hidden sm:inline">Quản trị</span>
                  </Link>
                )}
                <Link
                  to="/profile"
                  aria-label={`Hồ sơ ${user.displayName || user.email}`}
                  title={user.displayName || user.email}
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 gap-1 px-1.5 sm:gap-1.5 sm:px-2.5' })}
                >
                  <UserRound className="size-3.5 shrink-0" aria-hidden />
                  <span className="hidden max-w-28 truncate md:inline">
                    {user.displayName || user.email}
                  </span>
                  {isAdmin ? (
                    <Badge
                      tone={ADMIN_ROLE_BADGE_TONE[user.role as 'ADMIN' | 'SUPER_ADMIN']}
                      className="hidden px-1.5 py-0 text-[10px] min-[375px]:inline-flex"
                    >
                      {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  ) : studyLevel ? (
                    <Badge
                      tone="primary"
                      className="hidden px-1.5 py-0 text-[10px] min-[375px]:inline-flex"
                    >
                      {studyLevel}
                    </Badge>
                  ) : null}
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'hidden h-8 gap-1.5 px-2 sm:px-2.5 md:inline-flex' })}
                >
                  <LogOut className="size-3.5 shrink-0" aria-hidden />
                  <span className="hidden md:inline text-xs">Đăng xuất</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  aria-label="Đăng nhập / Đăng ký"
                  title="Đăng nhập / Đăng ký"
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 gap-1 px-2 sm:gap-1.5 sm:px-3' })}
                >
                  <LogIn className="size-3.5 shrink-0" aria-hidden />
                  <span className="hidden text-sm sm:inline">Đăng nhập</span>
                </Link>
              </>
            )}

            <div className="hidden xl:block">
              <WhatsNewNavButton />
            </div>

            <Link
              to="/settings"
              aria-label="Cài đặt"
              title="Cài đặt"
              className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'size-8 px-0' })}
            >
              <Settings className="size-4" aria-hidden />
            </Link>
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <DailyStudyGateBanner />

      <main
        ref={mainRef}
        id="main"
        tabIndex={-1}
        className="relative z-10 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto focus:outline-none"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 py-3 pb-6 sm:px-5 sm:py-5 md:pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:px-8 lg:py-6">
          <JapaneseLookupProvider containerRef={mainRef}>
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center">
                  <LoadingState label="Đang tải trang..." className="py-0" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </JapaneseLookupProvider>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (< md) for easy 1-thumb switching across core pages */}
      {!isAuthOrAdminRoute && (
        <nav
          aria-label="Điều hướng nhanh di động"
          className="relative z-40 flex-none border-t border-line bg-glass-header pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden print:hidden"
        >
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[54px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors',
                    active
                      ? 'text-primary-fg'
                      : 'text-muted active:text-fg',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-7 w-11 place-items-center rounded-full transition-colors',
                      active && 'bg-primary-soft',
                    )}
                  >
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <LevelSelectionModal
        open={levelModalOpen}
        onClose={() => setManualLevelModalOpen(false)}
        onDismissWithoutSelection={() => {
          markLevelModalDismissed(user?.id, true);
          setDismissedScope(currentLevelScope);
        }}
      />
      <SakuraContactFloating />
    </div>
  );
};
