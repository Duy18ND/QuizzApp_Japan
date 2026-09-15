import { createSlice } from '@reduxjs/toolkit';


interface VocabularySliceState {
  // TODO: Define state
}

const initialState: VocabularySliceState = {
  
};

const vocabularySlice = createSlice({
  name: 'vocabulary',
  initialState,
  reducers: {
    // TODO: Define reducers
  },
});

export const { } = vocabularySlice.actions;
export default vocabularySlice.reducer;
