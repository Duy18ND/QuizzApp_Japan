import { createSlice } from '@reduxjs/toolkit';


interface WritingSliceState {
  // TODO: Define state
}

const initialState: WritingSliceState = {
  
};

const writingSlice = createSlice({
  name: 'writing',
  initialState,
  reducers: {
    // TODO: Define reducers
  },
});

export const { } = writingSlice.actions;
export default writingSlice.reducer;
