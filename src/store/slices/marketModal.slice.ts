import {
  AnyAction,
  createAsyncThunk,
  createSlice,
  isAnyOf,
  Middleware,
  PayloadAction,
} from "@reduxjs/toolkit";
import { RootState } from "../store";
import { IIngredientInfo, ISolveResult } from "@electron/oneItemCalc";
import { CalcParams } from "@electron/main";
import { ChartData } from "@electron/fetchChartData";
import {
  OwnRecipe,
  OwnRecipeIng,
  removeOwnRecipe,
  setOwnRecipe,
} from "./market.slice";

export interface TreeItem {
  id: number;
  name: string;
  rarityId: number;
  isOwn: boolean;
}

export interface MarketModalState {
  open: boolean;
  item: number;
  type: "b" | "s";
  mode: "optimal" | "allcraft" | "buyIng";
  show: "craft" | "own" | "chart";
  own_set: "craft" | "edit";
  overdrive: number[];
  onlyCraft: number[];
  ingredients: IIngredientInfo[];
  cost: number | null;
  isOwn: boolean;
  tree: TreeItem[];
  chartData: ChartData;
  own_recipe: OwnRecipe;
}

const initialState: MarketModalState = {
  open: false,
  item: 1,
  ingredients: [],
  type: "b",
  mode: "optimal",
  show: "craft",
  own_set: "craft",
  overdrive: [],
  onlyCraft: [],
  cost: null,
  isOwn: false,
  tree: [],
  chartData: { t: [], s: [], b: [], so: [], bo: [] },
  own_recipe: {
    rent: 0,
    resultAmount: 1,
    ingredients: [],
  },
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

export const fetchMarketChartData = createAsyncThunk(
  "marketModal/fetchMarketChartData",
  async (item: number) => {
    const data: ChartData = await window.ipcRenderer.invoke(
      "fetchMarketChartData",
      item,
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
      action: PayloadAction<{
        item: number;
        treeItem: TreeItem;
        show: MarketModalState["show"];
      }>,
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

      newState.show = action.payload.show;

      return newState;
    },

    setMarketModalCalc: (state, { payload }: { payload: ISolveResult }) => {
      state.ingredients = payload.ingredients;
      state.cost = Math.round(payload.craftCoast * 100) / 100;
    },
    setMarketModalShow: (
      state,
      action: PayloadAction<MarketModalState["show"]>,
    ) => {
      state.show = action.payload;
      state.own_set = "craft";
    },
    setMarketModalChart: (state, { payload }: { payload: ChartData }) => {
      state.chartData = payload;
    },
    switchMarketModalOwn: (state) => {
      state.own_set = state.own_set === "craft" ? "edit" : "craft";
    },
    setModalOwnRecipe: (state, { payload }: { payload: OwnRecipe }) => {
      state.own_recipe = payload;
    },
    setOwnRecipeResult: (state, { payload }: { payload: number }) => {
      state.own_recipe.resultAmount = payload;
    },
    setOwnRecipeRent: (state, { payload }: { payload: number }) => {
      state.own_recipe.rent = payload;
    },
    addOwnRecipeIng: (state, { payload }: { payload: OwnRecipeIng }) => {
      const countRes = state.own_recipe.ingredients.filter(
        (ing) => ing.categoryId === 8,
      ).length;
      const countParts = state.own_recipe.ingredients.filter(
        (ing) => ing.categoryId !== 8,
      ).length;

      const canAddRes = countRes < 5 && payload.categoryId === 8;
      const canAddPart = countParts < 4 && payload.categoryId !== 8;

      if (canAddRes || canAddPart) {
        state.own_recipe.ingredients.push(payload);
      }
    },
    removeOwnRecipeIng: (state, { payload }: { payload: number }) => {
      state.own_recipe.ingredients = state.own_recipe.ingredients.filter(
        (ing) => ing.id !== payload,
      );
    },
    updateAmountOwnRecipeIng: (
      state,
      { payload }: { payload: { id: number; amount: number } },
    ) => {
      state.own_recipe.ingredients = state.own_recipe.ingredients.map((ing) =>
        ing.id === payload.id ? { ...ing, amount: payload.amount } : ing,
      );
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      calcMarketItem.fulfilled,
      (state, { payload }: { payload: ISolveResult }) => {
        state.ingredients = payload.ingredients;
        state.cost = Math.round(payload.craftCoast * 100) / 100;
        state.isOwn = payload.isOwn;
      },
    );
    builder.addCase(
      fetchMarketChartData.fulfilled,
      (state, { payload }: { payload: ChartData }) => {
        state.chartData = payload;
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
  setMarketModalShow,
  setMarketModalChart,
  switchMarketModalOwn,
  setOwnRecipeRent,
  setOwnRecipeResult,
  addOwnRecipeIng,
  removeOwnRecipeIng,
  updateAmountOwnRecipeIng,
  setModalOwnRecipe,
} = MarketModalSlice.actions;

export const selectMarketModalState = (state: RootState) => state.marketModal;

export default MarketModalSlice.reducer;

export const marketMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  if (
    isAnyOf(
      setMarketModalItem,
      setMarketModalFromTree,
      setMarketModalType,
      setMarketModalMode,
      setMarketModalOverdrive,
      setMarketModalOnlyCraft,
      setMarketModalShow,
      setOwnRecipe,
      removeOwnRecipe,
    )(action)
  ) {
    const dispatch = store.dispatch;

    const isRecipeChanged =
      action.type === "market/setOwnRecipe" ||
      action.type === "market/removeOwnRecipe";

    dispatch(
      calcMarketItem({
        itemId: store.getState().marketModal.item,
        type: store.getState().marketModal.type,
        mode: store.getState().marketModal.mode,
        onlyCraft: store.getState().marketModal.onlyCraft,
        overdrive: store.getState().marketModal.overdrive,
        is_own: store.getState().marketModal.show === "own",
        own_rec: isRecipeChanged
          ? store.getState().market.own_recipes
          : undefined,
      }) as unknown as AnyAction,
    );
  }

  if (
    setMarketModalShow.match(action) &&
    action.payload === "chart" &&
    store.getState().marketModal.chartData.t.length === 0
  ) {
    const dispatch = store.dispatch;

    dispatch(
      fetchMarketChartData(
        store.getState().marketModal.item,
      ) as unknown as AnyAction,
    );
  }

  return result;
};
