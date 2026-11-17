import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GrammarProgress, PracticeType } from '../../types/grammar';

const STORAGE_KEY = 'nihonmaster_grammar_progress';

interface ProgressState {
  records: Record<string, GrammarProgress>;
}

const loadInitialRecords = (): Record<string, GrammarProgress> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, GrammarProgress>;
    }
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
      if (grammarId === '__proto__' || grammarId === 'constructor' || grammarId === 'prototype') {
        return;
      }
      if (!state.records[grammarId]) {
        state.records[grammarId] = {
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
      }

      state.records[grammarId][type] = score;
      saveRecords(state.records);
    },
  },
});

export const { updateProgress } = grammarProgressSlice.actions;
export default grammarProgressSlice.reducer;
