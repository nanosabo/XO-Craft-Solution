import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { IIngredientInfo, ISolveResult } from "@electron/oneItemCalc";
import { CalcParams } from "@electron/main";

export interface TreeItem {
  id: number;
  name: string;
  rarityId: number;
}

export interface MarketModalState {
  open: boolean;
  item: number;
  type: "b" | "s";
  mode: "optimal" | "allcraft" | "buyIng";
  overdrive: number[];
  onlyCraft: number[];
  ingredients: IIngredientInfo[];
  cost: number | null;
  tree: TreeItem[];
}

const initialState: MarketModalState = {
  open: false,
  item: 1,
  ingredients: [],
  type: "b",
  mode: "optimal",
  overdrive: [],
  onlyCraft: [],
  cost: null,
  tree: [],
};

export const calcMarketItem = createAsyncThunk(
  "marketModal/getItem",
  async (dto: CalcParams) => {
    const data: ISolveResult = await window.ipcRenderer.invoke(
      "marketCraft",
      dto,
    );
    return data;
  },
);

export const MarketModalSlice = createSlice({
  name: "marketModal",
  initialState,
  reducers: {
    setMarketModalItem: (_, action: PayloadAction<number>) => {
      return { ...initialState, open: true, item: action.payload };
    },
    closeMarketModal: (state) => {
      state.open = false;
    },
    setMarketModalType: (
      state,
      action: PayloadAction<MarketModalState["type"]>,
    ) => {
      state.type = action.payload;
    },
    setMarketModalMode: (
      state,
      action: PayloadAction<{ mode: MarketModalState["mode"]; ings: number[] }>,
    ) => {
      state.mode = action.payload.mode;

      switch (action.payload.mode) {
        case "optimal":
          state.overdrive = [];
          state.onlyCraft = [];
          break;
        case "allcraft":
          state.overdrive = [];
          state.onlyCraft = action.payload.ings;
          break;
        case "buyIng":
          state.overdrive = action.payload.ings;
          state.onlyCraft = [];
          break;
      }
    },
    setMarketModalOverdrive: (state, action: PayloadAction<number>) => {
      state.onlyCraft = state.onlyCraft.filter((o) => o !== action.payload);
      state.overdrive.push(action.payload);
    },
    setMarketModalOnlyCraft: (state, action: PayloadAction<number>) => {
      state.overdrive = state.overdrive.filter((o) => o !== action.payload);
      state.onlyCraft.push(action.payload);
    },
    setMarketModalFromTree: (
      state,
      action: PayloadAction<{ item: number; treeItem: TreeItem }>,
    ) => {
      const newState = {
        ...initialState,
        item: action.payload.item,
        open: true,
        tree: [...state.tree],
      };

      const index = newState.tree.findIndex(
        (item) => item.id === action.payload.treeItem.id,
      );

      if (index === -1) {
        newState.tree.push(action.payload.treeItem);
      } else {
        newState.tree.length = index;
      }

      return newState;
    },

    setMarketModalCalc: (state, { payload }: { payload: ISolveResult }) => {
      state.ingredients = payload.ingredients;
      state.cost = Math.round(payload.craftCoast * 100) / 100;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      calcMarketItem.fulfilled,
      (state, { payload }: { payload: ISolveResult }) => {
        state.ingredients = payload.ingredients;
        state.cost = Math.round(payload.craftCoast * 100) / 100;
      },
    );
  },
});

export const {
  setMarketModalItem,
  closeMarketModal,
  setMarketModalType,
  setMarketModalMode,
  setMarketModalFromTree,
  setMarketModalOnlyCraft,
  setMarketModalOverdrive,
  setMarketModalCalc,
} = MarketModalSlice.actions;

export const selectMarketModalState = (state: RootState) => state.marketModal;

export default MarketModalSlice.reducer;
