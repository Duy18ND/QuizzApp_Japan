import React, { Suspense, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LogIn, LogOut, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import {
  startWebOnlineTimeTracker,
} from '../../services/notificationService';
import { JapaneseLookupProvider } from '../common/JapaneseLookupPopover';
import { Badge, LoadingState } from '../ui';
import { buttonStyles } from '../ui/styles';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ClickEffect } from './ClickEffect';
import { JapaneseLandscapeBg } from './JapaneseLandscapeBg';
import { SakuraContactFloating } from './SakuraContactFloating';

const ROLE_BADGE_TONE = {
  SUPER_ADMIN: 'sakura',
  ADMIN: 'primary',
  USER: 'success',
} as const;

export const AppLayout: React.FC = () => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const mainRef = useRef<HTMLElement>(null);
  const { user, signOut } = useAuth();
  const userIdRef = useRef<string | undefined>(user?.id);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    const stopOnlineTracker = startWebOnlineTimeTracker(() => userIdRef.current);
    return () => {
      stopOnlineTracker();
    };
  }, []);

  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden bg-transparent text-fg">
      <JapaneseLandscapeBg />
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
        <div className="relative mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-2.5 py-1.5 sm:h-15 sm:flex-nowrap sm:gap-3 sm:px-5 sm:py-0 lg:px-8">
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

          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1 sm:flex-nowrap sm:gap-2.5">
            {!isHome && (
              <Link
                to="/"
                aria-label="Về trang chủ"
                title="Về trang chủ"
                className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 px-2 sm:px-3' })}
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
                    aria-label="Quản trị (/admin)"
                    title="Quản trị (/admin)"
                    className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 gap-1 px-2 sm:gap-1.5 sm:px-3' })}
                  >
                    <ShieldCheck className="size-3.5 shrink-0 text-primary-fg sm:size-4" aria-hidden />
                    <span className="hidden sm:inline">Quản trị</span>
                  </Link>
                )}
                <Link
                  to="/profile"
                  aria-label={`Hồ sơ ${user.displayName || user.email} (${user.role})`}
                  title={`${user.email} (${user.role})`}
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 gap-1 px-1.5 sm:gap-1.5 sm:px-2.5' })}
                >
                  <UserRound className="size-3.5 shrink-0" aria-hidden />
                  <span className="hidden max-w-28 truncate md:inline">
                    {user.displayName || user.email}
                  </span>
                  <Badge tone={ROLE_BADGE_TONE[user.role]} className="hidden px-1.5 py-0 text-[10px] min-[375px]:inline-flex">
                    {user.role}
                  </Badge>
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 gap-1.5 px-2 sm:px-2.5' })}
                >
                  <LogOut className="size-3.5 shrink-0" aria-hidden />
                  <span className="hidden md:inline text-xs">Đăng xuất</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/profile"
                  aria-label="Hồ sơ & Lịch sử (Khách)"
                  title="Hồ sơ & Lịch sử (Khách)"
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'hidden h-8 gap-1.5 px-2.5 md:inline-flex' })}
                >
                  <UserRound className="size-3.5 shrink-0" aria-hidden />
                  <Badge tone="neutral" className="px-1.5 py-0 text-[10px]">
                    Khách
                  </Badge>
                </Link>
                <Link
                  to="/login"
                  aria-label="Đăng nhập / Đăng ký"
                  title="Đăng nhập / Đăng ký"
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 gap-1 px-2 sm:gap-1.5 sm:px-3' })}
                >
                  <LogIn className="size-3.5 shrink-0" aria-hidden />
                  {isHome ? (
                    <>
                      <span className="hidden text-xs min-[360px]:inline sm:hidden">Đăng nhập</span>
                      <span className="hidden text-sm sm:inline">Đăng nhập / Đăng ký</span>
                    </>
                  ) : (
                    <span className="hidden text-xs sm:inline sm:text-sm">Đăng nhập / Đăng ký</span>
                  )}
                </Link>
              </>
            )}

            <Link
              to="/settings"
              aria-label="Cài đặt"
              title="Cài đặt"
              className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'size-8 px-0' })}
            >
              <Settings className="size-4" aria-hidden />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        id="main"
        tabIndex={-1}
        className="relative z-10 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto focus:outline-none"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-5 lg:px-8 lg:py-6">
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
      <SakuraContactFloating />
    </div>
  );
};
