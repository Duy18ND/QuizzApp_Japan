import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import grammarReducer from './slices/grammarSlice';
import practiceReducer from './slices/practiceSlice';
import grammarProgressReducer from './slices/grammarProgressSlice';
import mistakeReducer from './slices/mistakeSlice';
import kanjiReducer from './slices/kanjiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    grammar: grammarReducer,
    practice: practiceReducer,
    grammarProgress: grammarProgressReducer,
    mistake: mistakeReducer,
    kanji: kanjiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
