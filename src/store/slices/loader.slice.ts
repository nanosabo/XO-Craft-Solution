import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AppError, logError } from "@src/helpers/errorLog";
import { getLastAppRoute } from "@src/helpers/lastRoute";
import { RootState } from "../store";

export enum LoaderStateStatus {
  INITIAL = "initial",
  SOLVING = "solving",
  SOLVED = "solved",
  ERROR = "error",
}

const storage = localStorage.getItem("solution");

export interface solvedPartOrigin {
  id: string;
  name: string;
  eng_name: string;
  count: number;
}

export interface solvedPart {
  id: string;
  name: string;
  eng_name: string;
  count: number;
  /** Parts replaced by this one, kept so the originals can be restored. */
  origins?: solvedPartOrigin[];
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
  error: AppError | null;
  errorReturnTo: string | null;
}

const initialState: LoaderState = {
  status: LoaderStateStatus.INITIAL,
  solvedResult: storage ? (JSON.parse(storage) as solvedResult) : null,
  error: null,
  errorReturnTo: null,
};

export const solveData = createAsyncThunk(
  "loader/solve",
  async (_, { getState, dispatch }) => {
    try {
      const state = getState() as RootState;
      const inputs = state.solveInputs;
      const { parts, forbidden } = state.requiredParts;
      const { inventory, inventoryEnabled } = state.settings;
      const result = await window.ipcRenderer.invoke("solve", {
        inputs,
        requiredParts: parts,
        forbidden: forbidden,
        inventory,
        inventoryEnabled,
      });
      localStorage.setItem("solution", JSON.stringify(result));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return result;
    } catch (error) {
      const appError = logError("solve", error);
      dispatch(
        setLoaderError({ error: appError, returnTo: getLastAppRoute() }),
      );
      throw error;
    }
  }
);

export const LoaderSlice = createSlice({
  name: "loader",
  initialState,
  reducers: {
    setLoaderInititalStatus(state) {
      state.status = LoaderStateStatus.INITIAL;
      state.error = null;
      state.errorReturnTo = null;
    },

    setLoaderSolvingStatus(state) {
      state.status = LoaderStateStatus.SOLVING;
      state.error = null;
      state.errorReturnTo = null;
    },

    setLoaderError(
      state,
      action: PayloadAction<{
        error: AppError;
        returnTo?: string | null;
      }>,
    ) {
      state.status = LoaderStateStatus.ERROR;
      state.error = action.payload.error;
      state.errorReturnTo = action.payload.returnTo ?? null;
    },

    clearLoaderError(state) {
      state.error = null;
      state.errorReturnTo = null;

      if (state.status === LoaderStateStatus.ERROR) {
        state.status = LoaderStateStatus.INITIAL;
      }
    },

    setSolvedResult(state, action: PayloadAction<solvedResult>) {
      state.solvedResult = action.payload;
      localStorage.setItem("solution", JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(solveData.pending, (state) => {
        state.status = LoaderStateStatus.SOLVING;
        state.solvedResult = null;
        state.error = null;
        state.errorReturnTo = null;
      })
      .addCase(
        solveData.fulfilled,
        (state, action: { payload: solvedResult }) => {
          state.status = LoaderStateStatus.SOLVED;
          state.solvedResult = action.payload;
        }
      )
      .addCase(solveData.rejected, (state, action) => {
        state.status = LoaderStateStatus.ERROR;
        state.solvedResult = null;

        // The thunk normally stores the real error before rejecting. Keep a
        // fallback for failures that happen outside its try/catch block.
        if (!state.error) {
          state.error = {
            scope: "solve",
            message: action.error.message ?? "Unknown error",
            timestamp: new Date().toISOString(),
          };
        }
      });
  },
});

export const {
  clearLoaderError,
  setLoaderError,
  setLoaderInititalStatus,
  setLoaderSolvingStatus,
  setSolvedResult,
} = LoaderSlice.actions;

export const selectLoaderState = (state: RootState) => state.loader;

export default LoaderSlice.reducer;
