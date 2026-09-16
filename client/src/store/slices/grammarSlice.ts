import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { JLPTLevel, GrammarRule } from '../../types/grammar';

interface GrammarState {
  availableRules: GrammarRule[];
  selectedLevel: JLPTLevel | 'All';
  selectedGrammarId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: GrammarState = {
  availableRules: [],
  selectedLevel: 'N4',
  selectedGrammarId: null,
  isLoading: false,
  error: null,
};

const grammarSlice = createSlice({
  name: 'grammar',
  initialState,
  reducers: {
    setGrammarRules(state, action: PayloadAction<GrammarRule[]>) {
      state.availableRules = action.payload;
    },
    setSelectedLevel(state, action: PayloadAction<JLPTLevel | 'All'>) {
      state.selectedLevel = action.payload;
    },
    selectGrammar(state, action: PayloadAction<string | null>) {
      state.selectedGrammarId = action.payload;
    },
  },
});

export const { setGrammarRules, setSelectedLevel, selectGrammar } = grammarSlice.actions;
export default grammarSlice.reducer;
