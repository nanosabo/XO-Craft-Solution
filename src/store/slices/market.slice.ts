import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { NavigateFunction } from "react-router-dom";
import { setAppLoadedStatus } from "./app.slice";
import { IIngredientInfo } from "@electron/oneItemCalc";

export interface ICategory {
  id: number;
  name: string;
}

export interface IRarity {
  id: number;
  name: string;
}

export interface IData {
  s: number;
  b: number;
  so: number;
  bo: number;
  t: number;
}

export enum MarketStateStatus {
  INITIAL = "initial",
  LOADING = "loading",
  LOADED = "loaded",
  ERROR = "error",
}

export interface IItemAnalytics {
  id: number;
  name: string;
  amount: number;
  rarityId: number;
  craftable: number;
  craftCost: number;
  recipe:
    | "$undefined"
    | {
        resultAmount: number;
        ingredients: {
          id: number;
          amount: number;
        }[];
      };
  ingredients: IIngredientInfo[];
  categoryId: number;
  offers: {
    b: number;
    s: number;
  };
  rawPrices: {
    s: number;
    b: number;
  };
  optimalCost: number;
  sellPriceNet: number;
  profit: number;
  roi: number;
  spread: number;
}

export interface Filters {
  categoryFilter: number[];
  rarityFilter: number[];
  view: "cards" | "table";
  sort_by:
    | "sell_offers"
    | "buy_offers"
    | "sell_price"
    | "buy_price"
    | "spread"
    | "profit";
  sort_order: "asc" | "desc";
  followed: boolean;
  followedItems: number[];
  search: string;
}

export interface MarketState extends Filters {
  status: MarketStateStatus;
  categories: ICategory[];
  rarities: IRarity[];
  items: IItemAnalytics[];
}

export interface FetchedData {
  categories: ICategory[];
  rarities: IRarity[];
  items: IItemAnalytics[];
}

const saveFilters = (state: MarketState) => {
  const keysToSave: Array<keyof MarketState> = [
    "categoryFilter",
    "rarityFilter",
    "view",
    "sort_by",
    "sort_order",
    "followed",
    "followedItems",
    "search",
  ];

  const dataToSave = Object.fromEntries(
    keysToSave.map((key) => [key, state[key]]),
  );

  localStorage.setItem("market", JSON.stringify(dataToSave));
};

const storage = localStorage.getItem("market");

const defaultFilters: Filters = {
  categoryFilter: [],
  rarityFilter: [],
  view: "cards",
  sort_by: "sell_offers",
  sort_order: "desc",
  followed: false,
  followedItems: [],
  search: "",
};

const filters = storage ? (JSON.parse(storage) as Filters) : defaultFilters;

const initialState: MarketState = {
  status: MarketStateStatus.INITIAL,
  categories: [],
  rarities: [],
  items: [],
  ...filters,
};

export const fetchData = createAsyncThunk(
  "market/fetch",
  async (navigate: NavigateFunction, { dispatch }) => {
    const data: FetchedData = await window.ipcRenderer.invoke("market");
    dispatch(setAppLoadedStatus());
    navigate("/");
    return data;
  },
);

export const MarketSLice = createSlice({
  name: "market",
  initialState,
  reducers: {
    updateMarket: (state, { payload }: { payload: IItemAnalytics[] }) => {
      state.items = payload;
    },
    setCategoryFilter: (state, action: PayloadAction<number>) => {
      state.categoryFilter = state.categoryFilter.includes(action.payload)
        ? state.categoryFilter.filter((cat) => cat !== action.payload)
        : [...state.categoryFilter, action.payload];
      saveFilters(state);
    },
    setRarityFilter: (state, action: PayloadAction<number>) => {
      state.rarityFilter = state.rarityFilter.includes(action.payload)
        ? state.rarityFilter.filter((cat) => cat !== action.payload)
        : [...state.rarityFilter, action.payload];
      saveFilters(state);
    },
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
      saveFilters(state);
    },
    resetMarketFilter: (state) => {
      state.search = "";
      state.categoryFilter = [];
      state.rarityFilter = [];
      state.sort_by = "sell_offers";
      state.sort_order = "desc";
      saveFilters(state);
    },
    setMarketSort: (state, action: PayloadAction<MarketState["sort_by"]>) => {
      if (state.sort_by === action.payload) {
        state.sort_order = state.sort_order === "asc" ? "desc" : "asc";
      } else {
        state.sort_order = "desc";
      }
      state.sort_by = action.payload;

      saveFilters(state);
    },
    setMarketView: (state, action: PayloadAction<MarketState["view"]>) => {
      state.view = action.payload;
      saveFilters(state);
    },
    switchMarketFollowed: (state) => {
      state.followed = !state.followed;
      saveFilters(state);
    },
    setFollowedItem: (state, action: PayloadAction<number>) => {
      state.followedItems = state.followedItems.includes(action.payload)
        ? state.followedItems.filter((cat) => cat !== action.payload)
        : [...state.followedItems, action.payload];
      saveFilters(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchData.pending, (state) => {
        state = { ...initialState };
        state.status = MarketStateStatus.LOADING;
      })
      .addCase(
        fetchData.fulfilled,
        (state, { payload }: { payload: FetchedData }) => {
          state.status = MarketStateStatus.LOADED;
          state.categories = payload.categories;
          state.items = payload.items;
          state.rarities = payload.rarities;
        },
      )
      .addCase(fetchData.rejected, (state) => {
        state.status = MarketStateStatus.ERROR;
      });
  },
});

export const {
  updateMarket,
  setCategoryFilter,
  setRarityFilter,
  setSearch,
  resetMarketFilter,
  setMarketSort,
  setMarketView,
  setFollowedItem,
  switchMarketFollowed,
} = MarketSLice.actions;

export const selectMarketState = (state: RootState) => state.market;

export default MarketSLice.reducer;
