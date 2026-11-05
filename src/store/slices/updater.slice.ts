import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

export type UpdateStage =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "up-to-date"
  | "error";

export type UpdateMode = "now" | "later";

export interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface UpdateState {
  stage: UpdateStage;
  currentVersion: string;
  latestVersion: string | null;
  releaseNotes: string | null;
  releaseDate: string | null;
  progress: UpdateProgress | null;
  mode: UpdateMode | null;
  error: string | null;
  /** True when the check was started automatically on startup. */
  automatic: boolean;
  checkedAt: number | null;
}

const initialState: UpdateState = {
  stage: "idle",
  currentVersion: "",
  latestVersion: null,
  releaseNotes: null,
  releaseDate: null,
  progress: null,
  mode: null,
  error: null,
  automatic: false,
  checkedAt: null,
};

export const UpdaterSlice = createSlice({
  name: "updater",
  initialState,
  reducers: {
    setUpdateState(_state, action: PayloadAction<UpdateState>) {
      return action.payload;
    },

    resetUpdateState() {
      return { ...initialState };
    },
  },
});

export const { resetUpdateState, setUpdateState } = UpdaterSlice.actions;

export const selectUpdaterState = (state: RootState) => state.updater;

export default UpdaterSlice.reducer;
