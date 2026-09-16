import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GrammarProgress, PracticeType } from '../../types/grammar';

interface ProgressState {
  records: Record<string, GrammarProgress>;
}

const initialState: ProgressState = {
  records: {},
};

const grammarProgressSlice = createSlice({
  name: 'grammarProgress',
  initialState,
  reducers: {
    updateProgress(state, action: PayloadAction<{ grammarId: string; type: PracticeType; score: number }>) {
      const { grammarId, type, score } = action.payload;
      if (!state.records[grammarId]) {
        state.records[grammarId] = {
          recognition: 0,
          conjugation: 0,
          sentence_transformation: 0,
          word_order: 0,
          fill_blank: 0,
          translation: 0,
          free_writing: 0,
          mix_review: 0,
        };
      }
      
      // Simple moving average or just store latest score. For simplicity, store the latest score.
      // A more robust implementation would weight it.
      state.records[grammarId][type] = score;
    },
  },
});

export const { updateProgress } = grammarProgressSlice.actions;
export default grammarProgressSlice.reducer;
