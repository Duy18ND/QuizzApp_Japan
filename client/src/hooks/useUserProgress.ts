import { useCallback, useEffect, useState } from 'react';
import {
  deleteAllVocabDirectFromSupabase,
  getInMemoryUserProgress,
  setInMemoryUserProgress,
  writeVocabItemDirectToSupabase,
} from '../services/cloudProgressWriter';
import {
  getActiveAuthenticatedUserId,
  onActiveSessionUserChange,
} from '../services/sessionScope';
import type { UserProgress } from '../types/quiz';

const PROGRESS_SYNC_EVENT = 'nihonmaster:user-progress-sync';
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const USER_PROGRESS_STORAGE_KEY = 'nihonmaster_user_progress';

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

export const loadUserProgress = (explicitUserId?: string | null): UserProgress => {
  const uid = explicitUserId === undefined ? getActiveAuthenticatedUserId() : explicitUserId;
  if (!uid) {
    return { starredWords: [], wrongWords: {} };
  }
  return sanitizeUserProgress(getInMemoryUserProgress(uid));
};

/**
 * Hydrates / commits user progress strictly in active account memory + dispatches UI sync
 * (never writes user quiz/vocab progress to `localStorage` or cookies).
 */
export const commitUserProgress = (
  next: UserProgress,
  explicitUserId?: string | null,
): UserProgress => {
  const uid = explicitUserId === undefined ? getActiveAuthenticatedUserId() : explicitUserId;
  if (!uid) {
    return { starredWords: [], wrongWords: {} };
  }
  const clean = sanitizeUserProgress(next);
  setInMemoryUserProgress(uid, clean);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<UserProgress>(PROGRESS_SYNC_EVENT, { detail: clean }));
  }
  return clean;
};

export function broadcastUserProgressReset(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<UserProgress>(PROGRESS_SYNC_EVENT, {
      detail: { starredWords: [], wrongWords: {} },
    }),
  );
}

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

    const unsubSession = onActiveSessionUserChange(() => {
      setProgress(loadUserProgress());
    });

    window.addEventListener(PROGRESS_SYNC_EVENT, onSync);
    return () => {
      unsubSession();
      window.removeEventListener(PROGRESS_SYNC_EVENT, onSync);
    };
  }, []);

  const toggleStar = useCallback((wordId: number) => {
    const uid = getActiveAuthenticatedUserId();
    if (!uid) return;
    const latest = loadUserProgress(uid);
    const isStarred = latest.starredWords.includes(wordId);
    const nextStarred = !isStarred;
    const newStarredWords = nextStarred
      ? [...latest.starredWords, wordId]
      : latest.starredWords.filter((id) => id !== wordId);

    const clean = commitUserProgress(
      {
        ...latest,
        starredWords: newStarredWords,
      },
      uid,
    );
    setProgress(clean);
    void writeVocabItemDirectToSupabase(uid, wordId, nextStarred, clean.wrongWords[wordId] || 0);
  }, []);

  const addWrongWord = useCallback((wordId: number) => {
    const uid = getActiveAuthenticatedUserId();
    if (!uid) return;
    const latest = loadUserProgress(uid);
    const nextWrongCount = (latest.wrongWords[wordId] || 0) + 1;
    const clean = commitUserProgress(
      {
        ...latest,
        wrongWords: {
          ...latest.wrongWords,
          [wordId]: nextWrongCount,
        },
      },
      uid,
    );
    setProgress(clean);
    void writeVocabItemDirectToSupabase(
      uid,
      wordId,
      clean.starredWords.includes(wordId),
      nextWrongCount,
    );
  }, []);

  const clearWrongWord = useCallback((wordId: number) => {
    const uid = getActiveAuthenticatedUserId();
    if (!uid) return;
    const latest = loadUserProgress(uid);
    if (!(wordId in latest.wrongWords)) return;
    const nextWrong = { ...latest.wrongWords };
    delete nextWrong[wordId];
    const clean = commitUserProgress(
      {
        ...latest,
        wrongWords: nextWrong,
      },
      uid,
    );
    setProgress(clean);
    void writeVocabItemDirectToSupabase(uid, wordId, clean.starredWords.includes(wordId), 0);
  }, []);

  const resetProgress = useCallback(() => {
    const uid = getActiveAuthenticatedUserId();
    if (!uid) return;
    const clean = commitUserProgress(defaultProgress, uid);
    setProgress(clean);
    void deleteAllVocabDirectFromSupabase(uid);
  }, []);

  return {
    progress,
    toggleStar,
    addWrongWord,
    clearWrongWord,
    resetProgress,
  };
};
