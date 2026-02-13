import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "../store";

export enum LoaderStateStatus {
  INITIAL = "initial",
  SOLVING = "solving",
  SOLVED = "solved",
  ERROR = "error",
}

const storage = localStorage.getItem("solution");

export interface solvedPart {
  id: string;
  name: string;
  eng_name: string;
  count: number;
}

export interface solvedResult {
  solution: solvedPart[];
  totalWeight: number;
  totalPower: number;
  totalDurability: number;
  totalParts: number;
}

export interface LoaderState {
  status: LoaderStateStatus;
  solvedResult: solvedResult | null;
}

const initialState: LoaderState = {
  status: LoaderStateStatus.INITIAL,
  solvedResult: storage ? (JSON.parse(storage) as solvedResult) : null,
};

export const solveData = createAsyncThunk(
  "loader/solve",
  async (_, { getState }) => {
    const state = getState() as RootState;
    const inputs = state.solveInputs;
    const { parts, forbidden } = state.requiredParts;
    const result = await window.ipcRenderer.invoke("solve", {
      inputs,
      requiredParts: parts,
      forbidden: forbidden,
    });
    localStorage.setItem("solution", JSON.stringify(result));
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return result;
  }
);

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
  extraReducers: (builder) => {
    builder
      .addCase(solveData.pending, (state) => {
        state.status = LoaderStateStatus.SOLVING;
        state.solvedResult = null;
      })
      .addCase(
        solveData.fulfilled,
        (state, action: { payload: solvedResult }) => {
          state.status = LoaderStateStatus.SOLVED;
          state.solvedResult = action.payload;
        }
      )
      .addCase(solveData.rejected, (state) => {
        state.status = LoaderStateStatus.ERROR;
        state.solvedResult = null;
      });
  },
});

export const {
  setLoaderErrorStatus,
  setLoaderInititalStatus,
  setLoaderSolvingStatus,
} = LoaderSlice.actions;

export const selectLoaderState = (state: RootState) => state.loader;

export default LoaderSlice.reducer;
