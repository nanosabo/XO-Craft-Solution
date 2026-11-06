import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logError } from "@src/helpers/errorLog";
import { getLastAppRoute } from "@src/helpers/lastRoute";
import { startScreenPath } from "@src/helpers/startScreen";
import { RootState } from "../store";
import { NavigateFunction } from "react-router-dom";
import { setAppLoadedStatus } from "./app.slice";
import { setLoaderError } from "./loader.slice";
import { IIngredientInfo } from "@electron/oneItemCalc";
import {
  FollowMetric,
  FollowRule,
  FollowRules,
  followMetrics,
  FollowValues,
  mergeFollowRules,
  roundFollowValue,
} from "../follow";

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

export interface RecipeIng {
  id: number;
  amount: number;
}

export interface OwnRecipeIng extends RecipeIng {
  categoryId: number;
  rarityId: number;
  name: string;
}

export interface Recipe {
  resultAmount: number;
  ingredients: RecipeIng[];
}

export interface OwnRecipe extends Recipe {
  rent: number;
  ingredients: OwnRecipeIng[];
}

export interface IItemAnalytics {
  id: number;
  name: string;
  amount: number;
  rarityId: number;
  craftable: number;
  craftCost: number;
  recipe: "$undefined" | Recipe;
  own_ingredients: IIngredientInfo[];
  isOwn: boolean;
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
    | "profit"
    | "roi"
    | "crafting";
  sort_order: "asc" | "desc";
  followed: boolean;
  followedItems: number[];
  followRules: Record<number, FollowRules>;
  search: string;
}

export interface MarketState extends Filters {
  status: MarketStateStatus;
  categories: ICategory[];
  rarities: IRarity[];
  items: IItemAnalytics[];
  own_recipes: Record<string, OwnRecipe>;
  no_recipes: number[];
  isMirror: boolean;
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
    "followRules",
    "search",
  ];

  const dataToSave = Object.fromEntries(
    keysToSave.map((key) => [key, state[key]]),
  );

  localStorage.setItem("market", JSON.stringify(dataToSave));
};

const storage = localStorage.getItem("market");
const storageRecipes = localStorage.getItem("own");
const storageNoRecipes = localStorage.getItem("norec");

const defaultFilters: Filters = {
  categoryFilter: [],
  rarityFilter: [],
  view: "cards",
  sort_by: "sell_offers",
  sort_order: "desc",
  followed: false,
  followedItems: [],
  followRules: {},
  search: "",
};

const storedFilters = storage ? (JSON.parse(storage) as Partial<Filters>) : null;
const filters: Filters = {
  ...defaultFilters,
  ...(storedFilters ?? {}),
  followRules: storedFilters?.followRules ?? {},
};
const own_recipes = storageRecipes
  ? (JSON.parse(storageRecipes) as Record<string, OwnRecipe>)
  : {};
const no_recipes = storageNoRecipes
  ? (JSON.parse(storageNoRecipes) as number[])
  : [];

const initialState: MarketState = {
  status: MarketStateStatus.INITIAL,
  categories: [],
  rarities: [],
  items: [],
  own_recipes: own_recipes,
  no_recipes: no_recipes,
  isMirror: false,

  ...filters,
};

export const fetchData = createAsyncThunk(
  "market/fetch",
  async (navigate: NavigateFunction | null, { dispatch, getState }) => {
    try {
      const own_recipes_json = localStorage.getItem("own");
      const own_recipes = own_recipes_json ? JSON.parse(own_recipes_json) : {};

      const no_recipes_json = localStorage.getItem("norec");
      const no_recipes = no_recipes_json ? JSON.parse(no_recipes_json) : [];

      const data: FetchedData = await window.ipcRenderer.invoke("market", {
        own_rec: own_recipes,
        no_rec: no_recipes,
      });

      dispatch(setAppLoadedStatus());
      if (navigate) {
        const hashPath =
          window.location.hash.replace(/^#/, "").split("?")[0] || "/";

        // A link opened while data was loading already chose the page.
        if (hashPath === "/loading" || hashPath === "/") {
          const screen = (getState() as RootState).settings.startScreen;

          navigate(startScreenPath(screen));
        }
      }
      return data;
    } catch (error) {
      const appError = logError("market", error);
      dispatch(
        setLoaderError({ error: appError, returnTo: getLastAppRoute() }),
      );
      throw error;
    }
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
    setFollowedItem: (
      state,
      action: PayloadAction<{ id: number; values: FollowValues }>,
    ) => {
      const { id, values } = action.payload;

      if (state.followedItems.includes(id)) {
        state.followedItems = state.followedItems.filter((item) => item !== id);
        delete state.followRules[id];
      } else {
        state.followedItems = [...state.followedItems, id];
        state.followRules[id] = mergeFollowRules(
          state.followRules[id],
          values,
        );
      }

      saveFilters(state);
    },
    ensureFollowRules: (
      state,
      action: PayloadAction<{ id: number; values: FollowValues }>,
    ) => {
      const { id, values } = action.payload;

      if (!state.followedItems.includes(id)) return;

      const existing = state.followRules[id] as
        | Partial<FollowRules>
        | undefined;
      const isComplete =
        existing !== undefined &&
        followMetrics.every((metric) => existing[metric] !== undefined);

      if (isComplete) return;

      state.followRules[id] = mergeFollowRules(existing, values);
      saveFilters(state);
    },
    setFollowRule: (
      state,
      action: PayloadAction<{
        id: number;
        metric: FollowMetric;
        patch: Partial<FollowRule>;
      }>,
    ) => {
      const { id, metric, patch } = action.payload;
      const rules = state.followRules[id];

      if (!rules) return;

      let rule = rules[metric];

      if (!rule) {
        rule = { enabled: false, condition: "any", value: 0 };
        rules[metric] = rule;
      }

      if (typeof patch.enabled === "boolean") {
        rule.enabled = patch.enabled;
      }

      if (patch.condition !== undefined) {
        rule.condition = patch.condition;
      }

      if (patch.value !== undefined) {
        rule.value = roundFollowValue(metric, patch.value);
      }

      saveFilters(state);
    },
    setOwnRecipe: (
      state,
      action: PayloadAction<{ id: number; recipe: OwnRecipe }>,
    ) => {
      state.own_recipes[action.payload.id] = action.payload.recipe;
      localStorage.setItem("own", JSON.stringify(state.own_recipes));
    },
    removeOwnRecipe: (state, action: PayloadAction<number>) => {
      delete state.own_recipes[action.payload];
      localStorage.setItem("own", JSON.stringify(state.own_recipes));
    },
    switchNoRecipe: (state, action: PayloadAction<number>) => {
      const includes = state.no_recipes.includes(action.payload);

      state.no_recipes = includes
        ? state.no_recipes.filter((item) => item !== action.payload)
        : [...state.no_recipes, action.payload];

      localStorage.setItem("norec", JSON.stringify(state.no_recipes));
    },
    setIsMirror: (state, action: PayloadAction<boolean>) => {
      state.isMirror = action.payload;
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
  ensureFollowRules,
  setFollowRule,
  switchMarketFollowed,
  setOwnRecipe,
  removeOwnRecipe,
  switchNoRecipe,
  setIsMirror,
} = MarketSLice.actions;

export const selectMarketState = (state: RootState) => state.market;

export default MarketSLice.reducer;
