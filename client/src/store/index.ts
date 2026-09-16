import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import vocabularyReducer from './slices/vocabularySlice';
import quizReducer from './slices/quizSlice';
import flashcardReducer from './slices/flashcardSlice';
import learningReducer from './slices/learningSlice';
import reviewReducer from './slices/reviewSlice';
import writingReducer from './slices/writingSlice';
import grammarReducer from './slices/grammarSlice';
import practiceReducer from './slices/practiceSlice';
import grammarProgressReducer from './slices/grammarProgressSlice';
import mistakeReducer from './slices/mistakeSlice';


export const store = configureStore({
  reducer: {
    app: appReducer,
    vocabulary: vocabularyReducer,
    quiz: quizReducer,
    flashcard: flashcardReducer,
    learning: learningReducer,
    review: reviewReducer,
    writing: writingReducer,
    grammar: grammarReducer,
    practice: practiceReducer,
    grammarProgress: grammarProgressReducer,
    mistake: mistakeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
