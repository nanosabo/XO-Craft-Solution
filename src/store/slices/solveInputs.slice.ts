import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

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
};

const storage = localStorage.getItem("solveInputs");

export const solveInputsSlice = createSlice({
  name: "loader",
  initialState: storage
    ? (JSON.parse(storage) as solveInputsState)
    : initialState,
  reducers: {
    setSolveInput<K extends keyof solveInputsState>(
      state: solveInputsState,
      action: {
        payload: {
          key: K;
          value: solveInputsState[K];
        };
      }
    ) {
      state[action.payload.key] = action.payload.value;
      localStorage.setItem("solveInputs", JSON.stringify(state));
    },
  },
});

export const { setSolveInput } = solveInputsSlice.actions;

export const selectSolveInputsState = (state: RootState) => state.solveInputs;

export default solveInputsSlice.reducer;
