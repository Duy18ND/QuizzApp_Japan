import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface KanjiProgress {
  kanjiId: string;
  learned: boolean;
  tutorialSeen: boolean;
  writingAttempts: number;
  correctAttempts: number;
  lastPracticedAt: string;
}

interface KanjiState {
  progress: Record<string, KanjiProgress>;
  tutorialSeen: boolean;
}

const STORAGE_KEY = 'nihonmaster_kanji_progress';
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isPlainObject = (val: unknown): val is Record<string, unknown> =>
  Boolean(val) && typeof val === 'object' && !Array.isArray(val);

const sanitizeKanjiProgress = (key: string, val: unknown): KanjiProgress | null => {
  if (!isPlainObject(val)) return null;
  const writingAttempts =
    typeof val.writingAttempts === 'number' && Number.isFinite(val.writingAttempts) && val.writingAttempts >= 0
      ? Math.floor(val.writingAttempts)
      : 0;
  const correctAttempts =
    typeof val.correctAttempts === 'number' && Number.isFinite(val.correctAttempts) && val.correctAttempts >= 0
      ? Math.floor(val.correctAttempts)
      : 0;
  return {
    kanjiId: typeof val.kanjiId === 'string' && val.kanjiId ? val.kanjiId : key,
    learned: typeof val.learned === 'boolean' ? val.learned : false,
    tutorialSeen: typeof val.tutorialSeen === 'boolean' ? val.tutorialSeen : false,
    writingAttempts,
    correctAttempts,
    lastPracticedAt: typeof val.lastPracticedAt === 'string' ? val.lastPracticedAt : new Date().toISOString(),
  };
};

// Load initial state from localStorage if available
const loadInitialState = (): KanjiState => {
  const fallback: KanjiState = { progress: {}, tutorialSeen: false };
  if (typeof window === 'undefined') return fallback;
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) return fallback;
    const parsed: unknown = JSON.parse(serialized);
    if (!isPlainObject(parsed)) return fallback;

    const progress: Record<string, KanjiProgress> = {};
    if (isPlainObject(parsed.progress)) {
      for (const [key, entry] of Object.entries(parsed.progress)) {
        if (UNSAFE_KEYS.has(key)) continue;
        const clean = sanitizeKanjiProgress(key, entry);
        if (clean) {
          progress[key] = clean;
        }
      }
    }

    return {
      progress,
      tutorialSeen: typeof parsed.tutorialSeen === 'boolean' ? parsed.tutorialSeen : false,
    };
  } catch (e) {
    console.warn('Could not load kanji progress from local storage', e);
    return fallback;
  }
};

const saveKanjiState = (state: KanjiState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save kanji progress to local storage', e);
  }
};

const initialState: KanjiState = loadInitialState();

const kanjiSlice = createSlice({
  name: 'kanji',
  initialState,
  reducers: {
    markTutorialSeen(state) {
      state.tutorialSeen = true;
      saveKanjiState(state);
    },
    updateKanjiProgress(state, action: PayloadAction<{ kanjiId: string; correct: boolean }>) {
      const { kanjiId, correct } = action.payload;
      if (!kanjiId || UNSAFE_KEYS.has(kanjiId)) return;
      if (!state.progress[kanjiId]) {
        state.progress[kanjiId] = {
          kanjiId,
          learned: false,
          tutorialSeen: true,
          writingAttempts: 0,
          correctAttempts: 0,
          lastPracticedAt: new Date().toISOString(),
        };
      }
      
      const p = state.progress[kanjiId];
      p.writingAttempts += 1;
      if (correct) {
        p.correctAttempts += 1;
      }
      p.lastPracticedAt = new Date().toISOString();
      
      // Auto-mark as learned if written correctly 3 times
      if (p.correctAttempts >= 3) {
        p.learned = true;
      }

      saveKanjiState(state);
    },
    markKanjiLearned(state, action: PayloadAction<{ kanjiId: string; learned: boolean }>) {
      const { kanjiId, learned } = action.payload;
      if (!kanjiId || UNSAFE_KEYS.has(kanjiId)) return;
      if (!state.progress[kanjiId]) {
        state.progress[kanjiId] = {
          kanjiId,
          learned,
          tutorialSeen: true,
          writingAttempts: 0,
          correctAttempts: 0,
          lastPracticedAt: new Date().toISOString(),
        };
      } else {
        state.progress[kanjiId].learned = learned;
      }
      saveKanjiState(state);
    },
    resetKanjiProgress(state, action: PayloadAction<string>) {
      const kanjiId = action.payload;
      if (!kanjiId || UNSAFE_KEYS.has(kanjiId)) return;
      if (state.progress[kanjiId]) {
        state.progress[kanjiId] = {
          kanjiId,
          learned: false,
          tutorialSeen: true,
          writingAttempts: 0,
          correctAttempts: 0,
          lastPracticedAt: new Date().toISOString(),
        };
      }
      saveKanjiState(state);
    },
    hydrateKanjiState(state, action: PayloadAction<unknown>) {
      const incoming = action.payload;
      if (!isPlainObject(incoming)) return;
      const progress: Record<string, KanjiProgress> = {};
      if (isPlainObject(incoming.progress)) {
        for (const [key, entry] of Object.entries(incoming.progress)) {
          if (UNSAFE_KEYS.has(key)) continue;
          const clean = sanitizeKanjiProgress(key, entry);
          if (clean) progress[key] = clean;
        }
      }
      state.progress = progress;
      state.tutorialSeen = typeof incoming.tutorialSeen === 'boolean' ? incoming.tutorialSeen : false;
      saveKanjiState(state);
    },
    resetAllKanjiProgress(state) {
      state.progress = {};
      state.tutorialSeen = false;
      saveKanjiState(state);
    },
  },
});

export const {
  markTutorialSeen,
  updateKanjiProgress,
  markKanjiLearned,
  resetKanjiProgress,
  hydrateKanjiState,
  resetAllKanjiProgress,
} = kanjiSlice.actions;
export default kanjiSlice.reducer;
