import { createSlice } from '@reduxjs/toolkit';


interface AppSliceState {
  // TODO: Define state
}

const initialState: AppSliceState = {
  
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // TODO: Define reducers
  },
});

export const { } = appSlice.actions;
export default appSlice.reducer;
