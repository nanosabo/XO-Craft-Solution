import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
import {
  emptyTalismans,
  normalizeTalismans,
  TalismanSlots,
} from "@src/helpers/durabilityBonus";

export interface solveInputsState {
  durability: number;
  weight: number;
  tonnage: number;
  parts: number;
  maxParts: number;
  powerScores: number;
  maxPowerScores: number;
  minPartHp: number;
  durabilityCabin: boolean;
  coDriver: boolean;
  talismans: TalismanSlots;
}

const initialState: solveInputsState = {
  durability: 0,
  weight: 0,
  tonnage: 0,
  parts: 0,
  maxParts: 80,
  powerScores: 0,
  maxPowerScores: 0,
  minPartHp: 0,
  durabilityCabin: false,
  coDriver: false,
  talismans: emptyTalismans(),
};

const storage = localStorage.getItem("solveInputs");

const readStoredInputs = (): solveInputsState => {
  if (!storage) return initialState;

  try {
    const parsed = JSON.parse(storage) as Partial<solveInputsState>;

    return {
      ...initialState,
      ...parsed,
      talismans: normalizeTalismans(parsed.talismans),
    };
  } catch {
    return initialState;
  }
};

export const solveInputsSlice = createSlice({
  name: "loader",
  initialState: readStoredInputs(),
  reducers: {
    setSolveInput<K extends keyof solveInputsState>(
      state: solveInputsState,
      action: {
        payload: {
          key: K;
          value: solveInputsState[K];
        };
      },
    ) {
      state[action.payload.key] = action.payload.value;
      localStorage.setItem("solveInputs", JSON.stringify(state));
    },
    setSolveValues(
      _,
      action: PayloadAction<
        Omit<solveInputsState, "talismans"> & { talismans?: unknown }
      >,
    ) {
      const next: solveInputsState = {
        ...action.payload,
        talismans: normalizeTalismans(action.payload.talismans),
      };
      localStorage.setItem("solveInputs", JSON.stringify(next));
      return next;
    },
  },
});

export const { setSolveInput, setSolveValues } = solveInputsSlice.actions;

export const selectSolveInputsState = (state: RootState) => state.solveInputs;

export default solveInputsSlice.reducer;
