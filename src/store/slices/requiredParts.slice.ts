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
  switched: "parts" | "forbidden";
  parts: requiredPart[];
  forbidden: requiredPart[];
}

const initialState: requiredPartsState = {
  switched: "parts",
  parts: [],
  forbidden: [],
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
      state[state.switched] = [
        { ...action.payload, count: 1 },
        ...state[state.switched],
      ];
      localStorage.setItem("requiredParts", JSON.stringify(state));
    },
    excludePart(
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
      state.forbidden = [{ ...action.payload, count: 1 }, ...state.forbidden];
      localStorage.setItem("requiredParts", JSON.stringify(state));
    },
    returnPart(
      state: requiredPartsState,
      action: {
        payload: string;
      }
    ) {
      state.forbidden = state.forbidden.filter(
        (part) => part.id !== action.payload
      );
      localStorage.setItem("requiredParts", JSON.stringify(state));
    },
    removePart(
      state: requiredPartsState,
      action: {
        payload: string;
      }
    ) {
      state[state.switched] = state[state.switched].filter(
        (part) => part.id !== action.payload
      );
      localStorage.setItem("requiredParts", JSON.stringify(state));
    },
    inсrementPartCount(
      state: requiredPartsState,
      action: {
        payload: string;
      }
    ) {
      const part = state[state.switched].find((p) => p.id === action.payload);
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
      const part = state[state.switched].find((p) => p.id === action.payload);
      if (part && part.count > 1) {
        part.count -= 1;
      } else if (part && part.count === 1) {
        state[state.switched] = state[state.switched].filter(
          (p) => p.id !== action.payload
        );
      }

      localStorage.setItem("requiredParts", JSON.stringify(state));
    },
    setSwitched(
      state: requiredPartsState,
      action: { payload: requiredPartsState["switched"] }
    ) {
      state.switched = action.payload;
      localStorage.setItem("requiredParts", JSON.stringify(state));
    },
  },
});

export const {
  addPart,
  removePart,
  inсrementPartCount,
  decrementPartCount,
  setSwitched,
  excludePart,
  returnPart,
} = requiredPartsSlice.actions;

export const selectRequiredPartsState = (state: RootState) =>
  state.requiredParts;

export default requiredPartsSlice.reducer;
