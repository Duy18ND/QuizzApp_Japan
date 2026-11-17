import { useCallback, useEffect, useState } from 'react';
import type { UserProgress } from '../types/quiz';

const STORAGE_KEY = 'nihonmaster_user_progress';
const PROGRESS_SYNC_EVENT = 'nihonmaster:user-progress-sync';
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const USER_PROGRESS_STORAGE_KEY = STORAGE_KEY;

const defaultProgress: UserProgress = {
  starredWords: [],
  wrongWords: {},
};

const isPlainObject = (val: unknown): val is Record<string, unknown> =>
  Boolean(val) && typeof val === 'object' && !Array.isArray(val);

export const sanitizeUserProgress = (parsed: unknown): UserProgress => {
  if (!isPlainObject(parsed)) return defaultProgress;

  const starredSet = new Set<number>();
  if (Array.isArray(parsed.starredWords)) {
    for (const id of parsed.starredWords) {
      if (typeof id === 'number' && Number.isFinite(id)) {
        starredSet.add(id);
      }
    }
  }

  const wrongWords: Record<number, number> = {};
  if (isPlainObject(parsed.wrongWords)) {
    for (const [key, count] of Object.entries(parsed.wrongWords)) {
      if (UNSAFE_KEYS.has(key)) continue;
      const numericId = Number(key);
      if (
        Number.isFinite(numericId) &&
        typeof count === 'number' &&
        Number.isFinite(count) &&
        count > 0
      ) {
        wrongWords[numericId] = Math.floor(count);
      }
    }
  }

  return {
    starredWords: Array.from(starredSet),
    wrongWords,
  };
};

export const loadUserProgress = (): UserProgress => {
  if (typeof window === 'undefined') return defaultProgress;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress;
    return sanitizeUserProgress(JSON.parse(raw));
  } catch (error) {
    console.warn('Error reading localStorage', error);
    return defaultProgress;
  }
};

export const commitUserProgress = (next: UserProgress): UserProgress => {
  const clean = sanitizeUserProgress(next);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch (error) {
      console.warn('Error setting localStorage', error);
    }
    window.dispatchEvent(new CustomEvent<UserProgress>(PROGRESS_SYNC_EVENT, { detail: clean }));
  }
  return clean;
};

export const useUserProgress = () => {
  const [progress, setProgress] = useState<UserProgress>(() => loadUserProgress());

  useEffect(() => {
    const onSync = (event: Event) => {
      const custom = event as CustomEvent<UserProgress>;
      if (custom.detail) {
        setProgress(sanitizeUserProgress(custom.detail));
      } else {
        setProgress(loadUserProgress());
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setProgress(loadUserProgress());
      }
    };

    window.addEventListener(PROGRESS_SYNC_EVENT, onSync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PROGRESS_SYNC_EVENT, onSync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const commitProgress = useCallback((next: UserProgress) => {
    const clean = commitUserProgress(next);
    setProgress(clean);
  }, []);

  const toggleStar = useCallback(
    (wordId: number) => {
      const latest = loadUserProgress();
      const isStarred = latest.starredWords.includes(wordId);
      const newStarredWords = isStarred
        ? latest.starredWords.filter((id) => id !== wordId)
        : [...latest.starredWords, wordId];

      commitProgress({
        ...latest,
        starredWords: newStarredWords,
      });
    },
    [commitProgress],
  );

  const addWrongWord = useCallback(
    (wordId: number) => {
      const latest = loadUserProgress();
      const currentCount = latest.wrongWords[wordId] || 0;
      commitProgress({
        ...latest,
        wrongWords: {
          ...latest.wrongWords,
          [wordId]: currentCount + 1,
        },
      });
    },
    [commitProgress],
  );

  const clearWrongWord = useCallback(
    (wordId: number) => {
      const latest = loadUserProgress();
      if (!(wordId in latest.wrongWords)) return;
      const nextWrong = { ...latest.wrongWords };
      delete nextWrong[wordId];
      commitProgress({
        ...latest,
        wrongWords: nextWrong,
      });
    },
    [commitProgress],
  );

  const resetProgress = useCallback(() => {
    commitProgress(defaultProgress);
  }, [commitProgress]);

  return {
    progress,
    toggleStar,
    addWrongWord,
    clearWrongWord,
    resetProgress,
  };
};
