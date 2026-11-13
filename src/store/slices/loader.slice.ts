import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AppError, logError } from "@src/helpers/errorLog";
import { getLastAppRoute } from "@src/helpers/lastRoute";
import { partsToRemove } from "@src/helpers/partsToRemove";
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

interface TrackedRemoval extends solvedPart {
  /** False until the recalculation after the click has finished. */
  settled: boolean;
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
  /** A solution update running without leaving the current page. */
  refreshing: boolean;
  refreshRequest: string | null;
  /** Parts that left the solution since solutionBaseline. */
  droppedParts: solvedPart[];
  /** The selection the take-off list is compared with. Stays until it is hidden. */
  solutionBaseline: solvedPart[] | null;
  /** Parts the user removed by hand. Kept even if they were not in the baseline. */
  explicitlyRemoved: TrackedRemoval[];
  solutionBeforeSolve: solvedPart[] | null;
}

const snapshotSolution = (
  parts: solvedPart[] | null | undefined,
): solvedPart[] | null =>
  parts?.map((part) => ({
    id: part.id,
    name: part.name,
    eng_name: part.eng_name,
    count: part.count,
  })) ?? null;

const initialState: LoaderState = {
  status: LoaderStateStatus.INITIAL,
  solvedResult: storage ? (JSON.parse(storage) as solvedResult) : null,
  error: null,
  errorReturnTo: null,
  refreshing: false,
  refreshRequest: null,
  droppedParts: [],
  solutionBaseline: null,
  explicitlyRemoved: [],
  solutionBeforeSolve: null,
};

const countsById = (parts: solvedPart[] | null | undefined) => {
  const counts = new Map<string, number>();

  for (const part of parts ?? []) {
    counts.set(part.id, (counts.get(part.id) ?? 0) + part.count);
  }

  return counts;
};

const publishDropped = (state: LoaderState) => {
  const next = state.solvedResult?.solution;
  const nextCounts = countsById(next);
  const merged = new Map<string, solvedPart>();

  for (const part of partsToRemove(state.solutionBaseline, next ?? [])) {
    merged.set(part.id, part);
  }

  state.explicitlyRemoved = state.explicitlyRemoved.filter((part) => {
    if (!part.settled) return true;

    return (nextCounts.get(part.id) ?? 0) < part.count;
  });

  for (const part of state.explicitlyRemoved) {
    const stillThere = part.settled ? (nextCounts.get(part.id) ?? 0) : 0;
    const count = part.count - stillThere;

    if (count <= 0) continue;

    const existing = merged.get(part.id);

    if (existing) {
      existing.count = Math.max(existing.count, count);
    } else {
      merged.set(part.id, {
        id: part.id,
        name: part.name,
        eng_name: part.eng_name,
        count,
      });
    }
  }

  state.droppedParts = [...merged.values()];
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

export const refreshSolution = createAsyncThunk(
  "loader/refresh",
  async (_, { getState }) => {
    try {
      const state = getState() as RootState;
      const { parts, forbidden } = state.requiredParts;
      const { inventory, inventoryEnabled } = state.settings;
      const result = await window.ipcRenderer.invoke("solve", {
        inputs: state.solveInputs,
        requiredParts: parts,
        forbidden,
        inventory,
        inventoryEnabled,
      });
      return result as solvedResult;
    } catch (error) {
      logError("solve", error);
      throw error;
    }
  },
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

    clearDroppedParts(state) {
      state.droppedParts = [];
      state.explicitlyRemoved = [];
      state.solutionBaseline = snapshotSolution(state.solvedResult?.solution);
    },

    noteRemovedPart(state, action: PayloadAction<solvedPart>) {
      if (!state.solutionBaseline) {
        state.solutionBaseline = snapshotSolution(state.solvedResult?.solution);
      }

      const part = action.payload;
      const existing = state.explicitlyRemoved.find((item) => item.id === part.id);

      if (existing) {
        existing.count = Math.max(existing.count, part.count);
        existing.name = part.name;
        existing.eng_name = part.eng_name;
        existing.settled = false;
      } else {
        state.explicitlyRemoved.unshift({
          id: part.id,
          name: part.name,
          eng_name: part.eng_name,
          count: part.count,
          settled: false,
        });
      }

      publishDropped(state);
    },

    forgetRemovedPart(state, action: PayloadAction<string>) {
      state.explicitlyRemoved = state.explicitlyRemoved.filter(
        (part) => part.id !== action.payload,
      );
      publishDropped(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(solveData.pending, (state) => {
        state.solutionBeforeSolve = state.solvedResult?.solution ?? null;
        state.explicitlyRemoved = [];
        state.status = LoaderStateStatus.SOLVING;
        state.solvedResult = null;
        state.error = null;
        state.errorReturnTo = null;
        state.refreshing = false;
        state.refreshRequest = null;
      })
      .addCase(
        solveData.fulfilled,
        (state, action: { payload: solvedResult }) => {
          state.status = LoaderStateStatus.SOLVED;
          state.solutionBaseline = snapshotSolution(state.solutionBeforeSolve);
          state.droppedParts = partsToRemove(
            state.solutionBeforeSolve,
            action.payload.solution,
          );
          state.solutionBeforeSolve = null;
          state.solvedResult = action.payload;
        }
      )
      .addCase(refreshSolution.pending, (state, action) => {
        state.refreshing = true;
        state.refreshRequest = action.meta.requestId;
      })
      .addCase(refreshSolution.fulfilled, (state, action) => {
        if (state.refreshRequest !== action.meta.requestId) return;
        state.refreshing = false;
        state.refreshRequest = null;

        if (state.status === LoaderStateStatus.SOLVING) return;

        if (!state.solutionBaseline) {
          state.solutionBaseline = snapshotSolution(state.solvedResult?.solution);
        }

        state.solvedResult = action.payload;
        localStorage.setItem("solution", JSON.stringify(action.payload));

        for (const part of state.explicitlyRemoved) {
          part.settled = true;
        }

        publishDropped(state);
      })
      .addCase(refreshSolution.rejected, (state, action) => {
        if (state.refreshRequest !== action.meta.requestId) return;
        state.refreshing = false;
        state.refreshRequest = null;
      })
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
  clearDroppedParts,
  clearLoaderError,
  forgetRemovedPart,
  noteRemovedPart,
  setLoaderError,
  setLoaderInititalStatus,
  setLoaderSolvingStatus,
  setSolvedResult,
} = LoaderSlice.actions;

export const selectLoaderState = (state: RootState) => state.loader;

export default LoaderSlice.reducer;
