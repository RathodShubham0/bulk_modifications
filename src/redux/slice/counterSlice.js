import { createSlice } from "@reduxjs/toolkit";

export const counterSlice = createSlice({
  name: "acc",
  initialState: {
    toggleValue: "Docs",
  },
  reducers: {
    updateToggleValue: (state, action) => {
      state.toggleValue = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { updateToggleValue } = counterSlice.actions;

export default counterSlice.reducer;
