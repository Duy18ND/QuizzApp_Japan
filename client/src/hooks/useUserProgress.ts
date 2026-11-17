import { useCallback, useEffect, useState } from 'react';
import type { UserProgress } from '../types/quiz';

const STORAGE_KEY = 'nihonmaster_user_progress';
const PROGRESS_SYNC_EVENT = 'nihonmaster:user-progress-sync';
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const defaultProgress: UserProgress = {
  starredWords: [],
  wrongWords: {},
};

const isPlainObject = (val: unknown): val is Record<string, unknown> =>
  Boolean(val) && typeof val === 'object' && !Array.isArray(val);

const sanitizeProgress = (parsed: unknown): UserProgress => {
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

const loadProgress = (): UserProgress => {
  if (typeof window === 'undefined') return defaultProgress;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress;
    return sanitizeProgress(JSON.parse(raw));
  } catch (error) {
    console.warn('Error reading localStorage', error);
    return defaultProgress;
  }
};

const saveProgress = (next: UserProgress) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Error setting localStorage', error);
  }
};

export const useUserProgress = () => {
  const [progress, setProgress] = useState<UserProgress>(() => loadProgress());

  useEffect(() => {
    const onSync = (event: Event) => {
      const custom = event as CustomEvent<UserProgress>;
      if (custom.detail) {
        setProgress(sanitizeProgress(custom.detail));
      } else {
        setProgress(loadProgress());
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setProgress(loadProgress());
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
    saveProgress(next);
    setProgress(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<UserProgress>(PROGRESS_SYNC_EVENT, { detail: next }));
    }
  }, []);

  const toggleStar = useCallback(
    (wordId: number) => {
      const latest = loadProgress();
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
      const latest = loadProgress();
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

  return {
    progress,
    toggleStar,
    addWrongWord,
  };
};
