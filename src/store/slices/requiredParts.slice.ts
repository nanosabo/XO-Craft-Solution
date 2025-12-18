import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

export interface requiredPart {
  id: string;
  name: string;
  eng_name: string;
  count: number;
  maxCount: number;
}

export interface requiredPartsState {
  parts: requiredPart[];
}

const initialState: requiredPartsState = {
  parts: [],
};

const storage = localStorage.getItem("requiredParts");

export const requiredPartsSlice = createSlice({
  name: "loader",
  initialState: storage
    ? (JSON.parse(storage) as requiredPartsState)
    : initialState,
  reducers: {
    addPart(
      state: requiredPartsState,
      action: {
        payload: {
          id: string;
          name: string;
          eng_name: string;
          maxCount: number;
        };
      }
    ) {
      state.parts = [{ ...action.payload, count: 1 }, ...state.parts];
      localStorage.setItem("requiredParts", JSON.stringify(state));
    },
    removePart(
      state: requiredPartsState,
      action: {
        payload: string;
      }
    ) {
      state.parts = state.parts.filter((part) => part.id !== action.payload);
      localStorage.setItem("requiredParts", JSON.stringify(state));
    },
    inсrementPartCount(
      state: requiredPartsState,
      action: {
        payload: string;
      }
    ) {
      const part = state.parts.find((p) => p.id === action.payload);
      if (part) {
        part.count += 1;
        localStorage.setItem("requiredParts", JSON.stringify(state));
      }
    },
    decrementPartCount(
      state: requiredPartsState,
      action: {
        payload: string;
      }
    ) {
      const part = state.parts.find((p) => p.id === action.payload);
      if (part && part.count > 1) {
        part.count -= 1;
      } else if (part && part.count === 1) {
        state.parts = state.parts.filter((p) => p.id !== action.payload);
      }

      localStorage.setItem("requiredParts", JSON.stringify(state));
    },
  },
});

export const { addPart, removePart, inсrementPartCount, decrementPartCount } =
  requiredPartsSlice.actions;

export const selectRequiredPartsState = (state: RootState) =>
  state.requiredParts;

export default requiredPartsSlice.reducer;
