import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { PracticeQuestion, PracticeType } from '../../types/grammar';

interface PracticeState {
  isActive: boolean;
  questions: PracticeQuestion[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  score: { correct: number; wrong: number };
  isFinished: boolean;
  activeMode: PracticeType | null;
}

const initialState: PracticeState = {
  isActive: false,
  questions: [],
  currentQuestionIndex: 0,
  userAnswers: {},
  score: { correct: 0, wrong: 0 },
  isFinished: false,
  activeMode: null,
};

const practiceSlice = createSlice({
  name: 'practice',
  initialState,
  reducers: {
    startPractice(state, action: PayloadAction<{ mode: PracticeType; questions: PracticeQuestion[] }>) {
      state.isActive = true;
      state.activeMode = action.payload.mode;
      state.questions = action.payload.questions;
      state.currentQuestionIndex = 0;
      state.userAnswers = {};
      state.score = { correct: 0, wrong: 0 };
      state.isFinished = false;
    },
    submitAnswer(state, action: PayloadAction<{ questionId: string; answer: string; isCorrect: boolean }>) {
      const { questionId, answer, isCorrect } = action.payload;
      state.userAnswers[questionId] = answer;
      if (isCorrect) {
        state.score.correct += 1;
      } else {
        state.score.wrong += 1;
      }
    },
    nextQuestion(state) {
      if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex += 1;
      } else {
        state.isFinished = true;
      }
    },
    endPractice(state) {
      state.isActive = false;
      state.isFinished = true;
    },
    resetPractice(state) {
      Object.assign(state, initialState);
    }
  },
});

export const { startPractice, submitAnswer, nextQuestion, endPractice, resetPractice } = practiceSlice.actions;
export default practiceSlice.reducer;
