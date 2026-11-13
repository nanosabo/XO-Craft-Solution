import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AppError, logError } from "@src/helpers/errorLog";
import { getLastAppRoute } from "@src/helpers/lastRoute";
import {
  mergeInstalledParts,
  placeInstalledParts,
} from "@src/helpers/installedParts";
import { partsToRemove } from "@src/helpers/partsToRemove";
import { RootState } from "../store";

export enum LoaderStateStatus {
  INITIAL = "initial",
  SOLVING = "solving",
  SOLVED = "solved",
  ERROR = "error",
}

const storage = localStorage.getItem("solution");
const INSTALLED_PARTS_KEY = "installedParts";

export interface installedPart {
  id: string;
  name: string;
  eng_name: string;
  count: number;
  /** False when the player mounted fewer than the recommended amount. */
  full?: boolean;
}

const readInstalledParts = (): installedPart[] => {
  try {
    const raw = localStorage.getItem(INSTALLED_PARTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];

      const part = item as Partial<installedPart>;
      const count = Math.round(Number(part.count));

      if (typeof part.id !== "string" || !part.id) return [];
      if (!Number.isFinite(count) || count <= 0) return [];

      return [
        {
          id: part.id,
          name: typeof part.name === "string" ? part.name : "",
          eng_name: typeof part.eng_name === "string" ? part.eng_name : "",
          count,
          ...(part.full === false || part.full === true
            ? { full: part.full }
            : {}),
        },
      ];
    });
  } catch {
    return [];
  }
};

const saveInstalledParts = (parts: installedPart[]) => {
  localStorage.setItem(INSTALLED_PARTS_KEY, JSON.stringify(parts));
};

const withFullFlag = (
  part: installedPart,
  full: boolean | undefined,
): installedPart => {
  if (full === false) return { ...part, full: false };
  if (full === true) return { ...part, full: true };
  return part;
};

/**
 * A partial mark is remembered even if the part leaves, so a later solve can
 * bring the recommendation back without freezing it at the mounted amount.
 * A full mark is dropped once that part is gone.
 */
const syncInstalledParts = (
  state: LoaderState,
  previousCounts?: Map<string, number>,
) => {
  const solution = state.solvedResult?.solution;
  if (!solution) return;

  const rows = new Map(solution.map((part) => [part.id, part]));
  const next = state.installedParts.flatMap((part) => {
    const row = rows.get(part.id);
    const wasPartial =
      part.full === false ||
      (part.full !== true &&
        (previousCounts?.get(part.id) ?? 0) > part.count);

    if (!row) return wasPartial ? [withFullFlag(part, false)] : [];

    return [
      withFullFlag(
        {
          id: row.id,
          name: row.name,
          eng_name: row.eng_name,
          count: Math.min(part.count, row.count),
        },
        wasPartial ? false : part.full,
      ),
    ];
  });

  state.installedParts = next;
  saveInstalledParts(next);
};

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
  /** Selection captured when the current removal batch started. */
  removalSnapshot: solvedResult | null;
  solutionBeforeSolve: solvedPart[] | null;
  /** Parts marked on the solution screen as already mounted. */
  installedParts: installedPart[];
}

const cloneSolvedResult = (result: solvedResult): solvedResult => ({
  solution: result.solution.map((part) => ({
    id: part.id,
    name: part.name,
    eng_name: part.eng_name,
    count: part.count,
    origins: part.origins?.map((origin) => ({ ...origin })),
  })),
  totalWeight: result.totalWeight,
  totalPower: result.totalPower,
  totalDurability: result.totalDurability,
  totalParts: result.totalParts,
});

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
  removalSnapshot: null,
  solutionBeforeSolve: null,
  installedParts: readInstalledParts(),
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
      const { inventory, inventoryEnabled, keepInstalledParts } = state.settings;
      const shown =
        state.loader.solvedResult?.solution ??
        state.loader.solutionBeforeSolve ??
        [];
      const required = mergeInstalledParts(
        parts,
        state.loader.installedParts,
        forbidden,
        keepInstalledParts,
        new Map(shown.map((part) => [part.id, part.count])),
      );
      const result = (await window.ipcRenderer.invoke("solve", {
        inputs,
        requiredParts: required.parts,
        forbidden: forbidden,
        inventory,
        inventoryEnabled,
        lockedPartIds: required.lockedPartIds,
      })) as solvedResult;
      const ordered = {
        ...result,
        solution: placeInstalledParts(
          result.solution,
          parts,
          state.loader.installedParts,
        ),
      };
      localStorage.setItem("solution", JSON.stringify(ordered));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return ordered;
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
      const { inventory, inventoryEnabled, keepInstalledParts } = state.settings;
      const shown = state.loader.solvedResult?.solution ?? [];
      const required = mergeInstalledParts(
        parts,
        state.loader.installedParts,
        forbidden,
        keepInstalledParts,
        new Map(shown.map((part) => [part.id, part.count])),
      );
      const result = (await window.ipcRenderer.invoke("solve", {
        inputs: state.solveInputs,
        requiredParts: required.parts,
        forbidden,
        inventory,
        inventoryEnabled,
        lockedPartIds: required.lockedPartIds,
      })) as solvedResult;

      return {
        ...result,
        solution: placeInstalledParts(
          result.solution,
          parts,
          state.loader.installedParts,
        ),
      };
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
      const previousCounts = countsById(state.solvedResult?.solution);
      state.solvedResult = action.payload;
      localStorage.setItem("solution", JSON.stringify(action.payload));
      syncInstalledParts(state, previousCounts);
    },

    toggleInstalledPart(state, action: PayloadAction<solvedPart>) {
      const { id, name, eng_name, count } = action.payload;
      const index = state.installedParts.findIndex((part) => part.id === id);

      if (index >= 0) {
        state.installedParts.splice(index, 1);
      } else {
        state.installedParts.push({
          id,
          name,
          eng_name,
          count: Math.max(1, Math.round(count)),
          full: true,
        });
      }

      saveInstalledParts(state.installedParts);
    },

    setInstalledCount(
      state,
      action: PayloadAction<{ id: string; count: number; full?: boolean }>,
    ) {
      const part = state.installedParts.find(
        (item) => item.id === action.payload.id,
      );
      if (!part) return;

      const count = Math.round(action.payload.count);

      if (count <= 0) {
        state.installedParts = state.installedParts.filter(
          (item) => item.id !== action.payload.id,
        );
      } else {
        part.count = count;
        if (action.payload.full === false) part.full = false;
        else if (action.payload.full === true) part.full = true;
      }

      saveInstalledParts(state.installedParts);
    },

    removeInstalledPart(state, action: PayloadAction<string>) {
      state.installedParts = state.installedParts.filter(
        (part) => part.id !== action.payload,
      );
      saveInstalledParts(state.installedParts);
    },

    setInstalledParts(state, action: PayloadAction<installedPart[]>) {
      state.installedParts = action.payload.map((part) =>
        withFullFlag(
          {
            id: part.id,
            name: part.name,
            eng_name: part.eng_name,
            count: Math.max(1, Math.round(part.count)),
          },
          part.full,
        ),
      );
      saveInstalledParts(state.installedParts);
    },

    clearDroppedParts(state) {
      state.droppedParts = [];
      state.explicitlyRemoved = [];
      state.removalSnapshot = null;
      state.solutionBaseline = snapshotSolution(state.solvedResult?.solution);
    },

    noteRemovedPart(state, action: PayloadAction<solvedPart>) {
      if (state.explicitlyRemoved.length === 0 && state.solvedResult) {
        state.removalSnapshot = cloneSolvedResult(state.solvedResult);
      }

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
      state.refreshRequest = null;
      state.refreshing = false;

      if (state.explicitlyRemoved.length === 0 && state.removalSnapshot) {
        const previousCounts = countsById(state.solvedResult?.solution);
        const restored = cloneSolvedResult(state.removalSnapshot);
        state.removalSnapshot = null;
        state.solvedResult = restored;
        localStorage.setItem("solution", JSON.stringify(restored));
        syncInstalledParts(state, previousCounts);
      }

      publishDropped(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(solveData.pending, (state) => {
        state.solutionBeforeSolve = state.solvedResult?.solution ?? null;
        state.explicitlyRemoved = [];
        state.removalSnapshot = null;
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
          const previousCounts = countsById(state.solutionBeforeSolve);
          state.solutionBaseline = snapshotSolution(state.solutionBeforeSolve);
          state.droppedParts = partsToRemove(
            state.solutionBeforeSolve,
            action.payload.solution,
          );
          state.solutionBeforeSolve = null;
          state.solvedResult = action.payload;
          syncInstalledParts(state, previousCounts);
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

        const previousCounts = countsById(state.solvedResult?.solution);
        state.solvedResult = action.payload;
        localStorage.setItem("solution", JSON.stringify(action.payload));
        syncInstalledParts(state, previousCounts);

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
  setInstalledParts,
  removeInstalledPart,
  setInstalledCount,
  toggleInstalledPart,
} = LoaderSlice.actions;

export const selectLoaderState = (state: RootState) => state.loader;

export default LoaderSlice.reducer;
