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

// Load initial state from localStorage if available
const loadInitialState = (): KanjiState => {
  try {
    const serialized = localStorage.getItem('nihonmaster_kanji_progress');
    if (serialized) {
      return JSON.parse(serialized);
    }
  } catch (e) {
    console.warn('Could not load kanji progress from local storage', e);
  }
  return {
    progress: {},
    tutorialSeen: false,
  };
};

const initialState: KanjiState = loadInitialState();

const kanjiSlice = createSlice({
  name: 'kanji',
  initialState,
  reducers: {
    markTutorialSeen(state) {
      state.tutorialSeen = true;
      localStorage.setItem('nihonmaster_kanji_progress', JSON.stringify(state));
    },
    updateKanjiProgress(state, action: PayloadAction<{ kanjiId: string; correct: boolean }>) {
      const { kanjiId, correct } = action.payload;
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

      localStorage.setItem('nihonmaster_kanji_progress', JSON.stringify(state));
    },
    markKanjiLearned(state, action: PayloadAction<{ kanjiId: string; learned: boolean }>) {
      const { kanjiId, learned } = action.payload;
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
      localStorage.setItem('nihonmaster_kanji_progress', JSON.stringify(state));
    },
    resetKanjiProgress(state, action: PayloadAction<string>) {
      const kanjiId = action.payload;
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
      localStorage.setItem('nihonmaster_kanji_progress', JSON.stringify(state));
    }
  },
});

export const { markTutorialSeen, updateKanjiProgress, markKanjiLearned, resetKanjiProgress } = kanjiSlice.actions;
export default kanjiSlice.reducer;
