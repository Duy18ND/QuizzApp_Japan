import { createSlice } from '@reduxjs/toolkit';


interface LearningSliceState {
  // TODO: Define state
}

const initialState: LearningSliceState = {
  
};

const learningSlice = createSlice({
  name: 'learning',
  initialState,
  reducers: {
    // TODO: Define reducers
  },
});

export const { } = learningSlice.actions;
export default learningSlice.reducer;
