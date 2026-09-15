import { createSlice } from '@reduxjs/toolkit';


interface QuizSliceState {
  // TODO: Define state
}

const initialState: QuizSliceState = {
  
};

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    // TODO: Define reducers
  },
});

export const { } = quizSlice.actions;
export default quizSlice.reducer;
