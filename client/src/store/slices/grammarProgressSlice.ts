import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  deleteAllGrammarDirectFromSupabase,
  getInMemoryGrammarMap,
  setInMemoryGrammarMap,
  writeGrammarItemDirectToSupabase,
} from '../../services/cloudProgressWriter';
import { getActiveAuthenticatedUserId } from '../../services/sessionScope';
import type { GrammarProgress, PracticeType } from '../../types/grammar';

interface ProgressState {
  records: Record<string, GrammarProgress>;
}

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isPlainObject = (val: unknown): val is Record<string, unknown> =>
  Boolean(val) && typeof val === 'object' && !Array.isArray(val);

const DEFAULT_PROGRESS_RECORD: GrammarProgress = {
  multiple_choice: 0,
  fill_blank: 0,
  star_question: 0,
  conjugation: 0,
  sentence_ordering: 0,
  ja_to_vi: 0,
  vi_to_ja: 0,
  sentence_transformation: 0,
  grammar_selection: 0,
  text_input: 0,
  free_writing: 0,
  mixed: 0,
};

const sanitizeProgressRecord = (val: unknown): GrammarProgress | null => {
  if (!isPlainObject(val)) return null;
  const clean: GrammarProgress = { ...DEFAULT_PROGRESS_RECORD };
  for (const key of Object.keys(DEFAULT_PROGRESS_RECORD) as Array<keyof GrammarProgress>) {
    const scoreVal = val[key];
    if (typeof scoreVal === 'number' && Number.isFinite(scoreVal)) {
      clean[key] = Math.max(0, Math.min(100, Math.round(scoreVal)));
    }
  }
  return clean;
};

const loadInitialRecords = (): Record<string, GrammarProgress> => {
  const uid = getActiveAuthenticatedUserId();
  if (!uid) return {};
  const cached = getInMemoryGrammarMap(uid);
  const result: Record<string, GrammarProgress> = {};
  for (const [grammarId, entry] of Object.entries(cached)) {
    if (UNSAFE_KEYS.has(grammarId)) continue;
    const clean = sanitizeProgressRecord(entry);
    if (clean) result[grammarId] = clean;
  }
  return result;
};

const cacheGrammarInSession = (records: Record<string, GrammarProgress>) => {
  const uid = getActiveAuthenticatedUserId();
  if (!uid) return;
  setInMemoryGrammarMap(uid, { ...records });
};

const initialState: ProgressState = {
  records: loadInitialRecords(),
};

const grammarProgressSlice = createSlice({
  name: 'grammarProgress',
  initialState,
  reducers: {
    updateProgress(
      state,
      action: PayloadAction<{ grammarId: string; type: PracticeType; score: number }>,
    ) {
      const uid = getActiveAuthenticatedUserId();
      if (!uid) return;
      const { grammarId, type, score } = action.payload;
      if (!grammarId || UNSAFE_KEYS.has(grammarId)) {
        return;
      }
      if (!state.records[grammarId]) {
        state.records[grammarId] = { ...DEFAULT_PROGRESS_RECORD };
      }

      const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
      const existingScore = Number(state.records[grammarId][type] ?? 0);
      state.records[grammarId][type] = Math.max(
        Number.isFinite(existingScore) ? existingScore : 0,
        normalizedScore,
      );
      cacheGrammarInSession(state.records);
      void writeGrammarItemDirectToSupabase(uid, grammarId, { ...state.records[grammarId] });
    },
    hydrateGrammarProgress(state, action: PayloadAction<unknown>) {
      const incoming = action.payload;
      if (!isPlainObject(incoming)) return;
      const cleanRecords: Record<string, GrammarProgress> = {};
      for (const [grammarId, entry] of Object.entries(incoming)) {
        if (UNSAFE_KEYS.has(grammarId)) continue;
        const clean = sanitizeProgressRecord(entry);
        if (clean) cleanRecords[grammarId] = clean;
      }
      state.records = cleanRecords;
      cacheGrammarInSession(state.records);
    },
    resetAllGrammarProgress(state) {
      const uid = getActiveAuthenticatedUserId();
      state.records = {};
      if (!uid) return;
      cacheGrammarInSession({});
      void deleteAllGrammarDirectFromSupabase(uid);
    },
    reloadGrammarFromSession(state) {
      state.records = loadInitialRecords();
    },
  },
});

export const {
  updateProgress,
  hydrateGrammarProgress,
  resetAllGrammarProgress,
  reloadGrammarFromSession,
} = grammarProgressSlice.actions;
export default grammarProgressSlice.reducer;
