import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GrammarMistake } from '../../types/grammar';

const STORAGE_KEY = 'nihonmaster_grammar_mistakes';

interface MistakeState {
  mistakes: GrammarMistake[];
}

const loadInitialMistakes = (): GrammarMistake[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as GrammarMistake[];
    }
  } catch {
    // ignore corrupted localStorage data
  }
  return [];
};

const saveMistakes = (mistakes: GrammarMistake[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mistakes));
  } catch {
    // ignore quota / private-mode storage errors
  }
};

const initialState: MistakeState = {
  mistakes: loadInitialMistakes(),
};

const mistakeSlice = createSlice({
  name: 'mistake',
  initialState,
  reducers: {
    addMistake(state, action: PayloadAction<GrammarMistake>) {
      const existingIndex = state.mistakes.findIndex((m) => m.questionId === action.payload.questionId);
      if (existingIndex >= 0) {
        state.mistakes.splice(existingIndex, 1);
      }
      state.mistakes.push(action.payload);
      saveMistakes(state.mistakes);
    },
    removeMistakesByGrammar(state, action: PayloadAction<string>) {
      state.mistakes = state.mistakes.filter((m) => m.grammarId !== action.payload);
      saveMistakes(state.mistakes);
    },
    clearMistakes(state) {
      state.mistakes = [];
      saveMistakes(state.mistakes);
    },
  },
});

export const { addMistake, removeMistakesByGrammar, clearMistakes } = mistakeSlice.actions;
export default mistakeSlice.reducer;
