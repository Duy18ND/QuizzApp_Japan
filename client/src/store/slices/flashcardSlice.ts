import { createSlice } from '@reduxjs/toolkit';


interface FlashcardSliceState {
  // TODO: Define state
}

const initialState: FlashcardSliceState = {
  
};

const flashcardSlice = createSlice({
  name: 'flashcard',
  initialState,
  reducers: {
    // TODO: Define reducers
  },
});

export const { } = flashcardSlice.actions;
export default flashcardSlice.reducer;
