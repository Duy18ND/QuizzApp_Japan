import { createSlice } from '@reduxjs/toolkit';


interface ReviewSliceState {
  // TODO: Define state
}

const initialState: ReviewSliceState = {
  
};

const reviewSlice = createSlice({
  name: 'review',
  initialState,
  reducers: {
    // TODO: Define reducers
  },
});

export const { } = reviewSlice.actions;
export default reviewSlice.reducer;
