import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

export enum LoaderStateStatus {
  INITIAL = "initial",
  SOLVING = "solving",
  ERROR = "error",
}

export interface LoaderState {
  status: LoaderStateStatus;
}

const initialState: LoaderState = {
  status: LoaderStateStatus.INITIAL,
};

export const LoaderSlice = createSlice({
  name: "loader",
  initialState,
  reducers: {
    setLoaderInititalStatus(state) {
      state.status = LoaderStateStatus.INITIAL;
    },

    setLoaderSolvingStatus(state) {
      state.status = LoaderStateStatus.SOLVING;
    },

    setLoaderErrorStatus(state) {
      state.status = LoaderStateStatus.ERROR;
    },
  },
});

export const {
  setLoaderErrorStatus,
  setLoaderInititalStatus,
  setLoaderSolvingStatus,
} = LoaderSlice.actions;

export const selectLoaderState = (state: RootState) => state.loader;

export default LoaderSlice.reducer;
