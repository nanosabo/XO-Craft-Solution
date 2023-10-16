import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

export enum AppStateStatus {
  INITIAL = "initial",
  LOADED = "loaded",
}

export interface AppState {
  status: AppStateStatus;
}

const initialState: AppState = {
  status: AppStateStatus.INITIAL,
};

export const AppSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setAppLoadedStatus(state) {
      state.status = AppStateStatus.LOADED;
    },
  },
});

export const { setAppLoadedStatus } = AppSlice.actions;

export const selectAppState = (state: RootState) => state.app;

export default AppSlice.reducer;
