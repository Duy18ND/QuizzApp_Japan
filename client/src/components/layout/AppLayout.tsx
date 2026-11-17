import React, { Suspense, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LogIn, LogOut, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { JapaneseLookupProvider } from '../common/JapaneseLookupPopover';
import { Badge, LoadingState, PageContainer } from '../ui';
import { buttonStyles } from '../ui/styles';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ClickEffect } from './ClickEffect';
import { JapaneseLandscapeBg } from './JapaneseLandscapeBg';

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
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

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

      <header className="relative z-40 flex-none overflow-hidden border-b border-line bg-glass-header print:hidden">
        <div
          aria-hidden
          className="seigaiha-mask pointer-events-none absolute inset-0 bg-wave opacity-[0.035]"
        />
        <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4 md:h-15 md:px-6">
          <Link to="/" className="group flex shrink-0 items-center gap-2 rounded-lg sm:gap-2.5" aria-label="Nihongo 問 — Trang chủ">
            <span
              lang="ja"
              aria-hidden
              className="grid size-8 place-items-center rounded-lg bg-primary text-base font-bold text-on-primary shadow-card ring-2 ring-sakura/35 transition-transform duration-150 group-hover:scale-105"
            >
              問
            </span>
            <span className="text-base font-bold tracking-tight sm:text-lg">
              Nihongo <span className="text-primary-fg">問</span>
            </span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            {!isHome && (
              <Link
                to="/"
                aria-label="Về trang chủ"
                title="Về trang chủ"
                className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'px-2 sm:px-3' })}
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
                    aria-label="Bảng quản trị"
                    title="Bảng quản trị"
                    className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'px-2 sm:px-3' })}
                  >
                    <ShieldCheck className="size-4 text-primary-fg" aria-hidden />
                    <span className="hidden md:inline">Admin</span>
                  </Link>
                )}
                <Link
                  to="/profile"
                  aria-label={`Hồ sơ ${user.displayName} (${user.role})`}
                  title={`Hồ sơ: ${user.displayName} (${user.role})`}
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'gap-1.5 px-2 sm:px-2.5' })}
                >
                  <UserRound className="size-3.5 shrink-0" aria-hidden />
                  <span className="hidden max-w-24 truncate md:inline">{user.displayName}</span>
                  <Badge tone={ROLE_BADGE_TONE[user.role]} className="px-1.5 py-0 text-[10px]">
                    {user.role}
                  </Badge>
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'w-8 px-0' })}
                >
                  <LogOut className="size-4" aria-hidden />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/profile"
                  aria-label="Hồ sơ & Lịch sử (Khách)"
                  title="Hồ sơ & Lịch sử (Khách)"
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'gap-1.5 px-2 sm:px-2.5' })}
                >
                  <UserRound className="size-3.5 shrink-0" aria-hidden />
                  <Badge tone="neutral" className="hidden px-1.5 py-0 text-[10px] md:inline-flex">
                    Khách
                  </Badge>
                </Link>
                <Link
                  to="/login"
                  aria-label="Đăng nhập"
                  title="Đăng nhập"
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'gap-1.5 px-2 sm:px-3' })}
                >
                  <LogIn className="size-3.5 shrink-0" aria-hidden />
                  <span className={isHome ? 'text-xs sm:text-sm' : 'hidden sm:inline'}>Đăng nhập</span>
                </Link>
              </>
            )}

            <Link
              to="/settings"
              aria-label="Cài đặt"
              title="Cài đặt"
              className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'w-8 px-0' })}
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
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-6 md:py-6">
          <JapaneseLookupProvider containerRef={mainRef}>
            <Suspense
              fallback={
                <PageContainer size="md" className="py-12">
                  <LoadingState label="Đang tải trang..." />
                </PageContainer>
              }
            >
              <Outlet />
            </Suspense>
          </JapaneseLookupProvider>
        </div>
      </main>
    </div>
  );
};
