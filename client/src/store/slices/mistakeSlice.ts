import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GrammarMistake } from '../../types/grammar';

interface MistakeState {
  mistakes: GrammarMistake[];
}

const initialState: MistakeState = {
  mistakes: [],
};

const mistakeSlice = createSlice({
  name: 'mistake',
  initialState,
  reducers: {
    addMistake(state, action: PayloadAction<GrammarMistake>) {
      state.mistakes.push(action.payload);
    },
    removeMistakesByGrammar(state, action: PayloadAction<string>) {
      state.mistakes = state.mistakes.filter(m => m.grammarId !== action.payload);
    },
    clearMistakes(state) {
      state.mistakes = [];
    }
  },
});

export const { addMistake, removeMistakesByGrammar, clearMistakes } = mistakeSlice.actions;
export default mistakeSlice.reducer;
