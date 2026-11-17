import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GrammarProgress, PracticeType } from '../../types/grammar';

const STORAGE_KEY = 'nihonmaster_grammar_progress';

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
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return {};
    const result: Record<string, GrammarProgress> = {};
    for (const [grammarId, entry] of Object.entries(parsed)) {
      if (UNSAFE_KEYS.has(grammarId)) continue;
      const clean = sanitizeProgressRecord(entry);
      if (clean) {
        result[grammarId] = clean;
      }
    }
    return result;
  } catch {
    // ignore corrupted localStorage data
  }
  return {};
};

const saveRecords = (records: Record<string, GrammarProgress>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore quota / private-mode storage errors
  }
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
      saveRecords(state.records);
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
      saveRecords(state.records);
    },
    resetAllGrammarProgress(state) {
      state.records = {};
      saveRecords(state.records);
    },
  },
});

export const { updateProgress, hydrateGrammarProgress, resetAllGrammarProgress } =
  grammarProgressSlice.actions;
export default grammarProgressSlice.reducer;
