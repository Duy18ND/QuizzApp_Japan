import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  deleteAllKanjiDirectFromSupabase,
  getInMemoryKanjiState,
  setInMemoryKanjiState,
  writeKanjiItemDirectToSupabase,
} from '../../services/cloudProgressWriter';
import { getActiveAuthenticatedUserId } from '../../services/sessionScope';

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

const loadInitialState = (): KanjiState => {
  const fallback: KanjiState = { progress: {}, tutorialSeen: false };
  const uid = getActiveAuthenticatedUserId();
  if (!uid) return fallback;
  const cached = getInMemoryKanjiState(uid);
  const progress: Record<string, KanjiProgress> = {};
  for (const [key, entry] of Object.entries(cached.progress)) {
    if (UNSAFE_KEYS.has(key)) continue;
    const clean = sanitizeKanjiProgress(key, entry);
    if (clean) progress[key] = clean;
  }
  return {
    progress,
    tutorialSeen: cached.tutorialSeen,
  };
};

const cacheKanjiInSession = (state: KanjiState) => {
  const uid = getActiveAuthenticatedUserId();
  if (!uid) return;
  setInMemoryKanjiState(uid, {
    progress: { ...state.progress },
    tutorialSeen: state.tutorialSeen,
  });
};

const initialState: KanjiState = loadInitialState();

const kanjiSlice = createSlice({
  name: 'kanji',
  initialState,
  reducers: {
    markTutorialSeen(state) {
      if (!getActiveAuthenticatedUserId()) return;
      state.tutorialSeen = true;
      cacheKanjiInSession(state);
    },
    updateKanjiProgress(state, action: PayloadAction<{ kanjiId: string; correct: boolean }>) {
      const uid = getActiveAuthenticatedUserId();
      if (!uid) return;
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

      if (p.correctAttempts >= 3) {
        p.learned = true;
      }

      cacheKanjiInSession(state);
      void writeKanjiItemDirectToSupabase(uid, kanjiId, { ...p });
    },
    markKanjiLearned(state, action: PayloadAction<{ kanjiId: string; learned: boolean }>) {
      const uid = getActiveAuthenticatedUserId();
      if (!uid) return;
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
        state.progress[kanjiId].lastPracticedAt = new Date().toISOString();
      }
      cacheKanjiInSession(state);
      void writeKanjiItemDirectToSupabase(uid, kanjiId, { ...state.progress[kanjiId] });
    },
    resetKanjiProgress(state, action: PayloadAction<string>) {
      const uid = getActiveAuthenticatedUserId();
      if (!uid) return;
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
        cacheKanjiInSession(state);
        void writeKanjiItemDirectToSupabase(uid, kanjiId, { ...state.progress[kanjiId] });
      }
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
      cacheKanjiInSession(state);
    },
    resetAllKanjiProgress(state) {
      const uid = getActiveAuthenticatedUserId();
      state.progress = {};
      state.tutorialSeen = false;
      if (!uid) return;
      cacheKanjiInSession(state);
      void deleteAllKanjiDirectFromSupabase(uid);
    },
    reloadKanjiFromSession(state) {
      const loaded = loadInitialState();
      state.progress = loaded.progress;
      state.tutorialSeen = loaded.tutorialSeen;
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
  reloadKanjiFromSession,
} = kanjiSlice.actions;
export default kanjiSlice.reducer;
