import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const META_COLORS: Record<Theme, string> = { light: '#F8FAFC', dark: '#0B1120' };

const media: MediaQueryList | null =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return media?.matches ? 'dark' : 'light';
}

let current: Theme = typeof window === 'undefined' ? 'light' : (readStored() ?? systemTheme());
const listeners = new Set<() => void>();

function applyToDocument(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 220);
  }
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[theme]);
}

function setTheme(theme: Theme, persist: boolean) {
  if (theme === current) return;
  current = theme;
  applyToDocument(theme, true);
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable (private mode) — theme still applies for this session */
    }
  }
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  // Keep the DOM in sync with state on boot (the inline script in index.html already did the heavy lifting).
  applyToDocument(current, false);

  // Follow the OS preference until the user makes an explicit choice.
  media?.addEventListener('change', () => {
    if (readStored() === null) setTheme(systemTheme(), false);
  });

  // Keep multiple tabs in sync.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) setTheme(readStored() ?? systemTheme(), false);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => current;
const getServerSnapshot = (): Theme => 'light';

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => setTheme(current === 'dark' ? 'light' : 'dark', true), []);
  const setExplicitTheme = useCallback((next: Theme) => setTheme(next, true), []);

  return { theme, toggleTheme, setTheme: setExplicitTheme };
}
