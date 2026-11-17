import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { buttonStyles } from '../ui/styles';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ClickEffect } from './ClickEffect';
import { JapaneseLandscapeBg } from './JapaneseLandscapeBg';

export const AppLayout: React.FC = () => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

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

      <header className="relative z-40 flex-none overflow-hidden border-b border-line bg-glass-header">
        <div
          aria-hidden
          className="seigaiha-mask pointer-events-none absolute inset-0 bg-wave opacity-[0.08]"
        />
        <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:h-15 md:px-6">
          <Link to="/" className="group flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="Nihongo 問 — Trang chủ">
            <span
              lang="ja"
              aria-hidden
              className="grid size-8 place-items-center rounded-lg bg-primary text-base font-bold text-on-primary shadow-card ring-2 ring-sakura/35 transition-transform duration-150 group-hover:scale-105"
            >
              問
            </span>
            <span className="text-lg font-bold tracking-tight">
              Nihongo <span className="text-primary-fg">問</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2.5">
            {!isHome && (
              <Link
                to="/"
                className={buttonStyles({ variant: 'secondary', size: 'sm' })}
              >
                ← Trang chủ
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="relative z-10 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto focus:outline-none"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-6 md:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
