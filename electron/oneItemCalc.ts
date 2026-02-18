import { IData, OwnRecipe, Recipe } from "@src/store/slices/market.slice";
import { IItem } from "./craftItemsCalc";
import { getNoRecipeMarked, getOwnRecipe } from "./main";

export interface IIngredientInfo {
  id: number;
  amount: number;
  buyCost: number;
  craftCost: number;
  rarityId: number;
  categoryId: number;
  hasRecipe: boolean;
  type: "buy" | "craft";
  isOwn: boolean;
}

export interface ISolveResult {
  cost: number;
  craftCoast: number;
  ingredients: IIngredientInfo[];
  type: "buy" | "craft";
  isOwn: boolean;
}

const FEES: Record<number, number> = {
  0: 0,
  1: 0,
  2: 3,
  3: 15,
  4: 75,
  5: 0,
  6: 6,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function getOneItem(items: IItem[], prices: Record<string, IData>) {
  const itemsMap = new Map(items.map((i) => [i.id, i]));
  const memo = new Map<string, ISolveResult>();

  function getMarketPrice(id: number, type: "b" | "s") {
    const p = prices[id];
    if (!p) return 0;
    return p[type] > 0 ? p[type] : type === "b" ? p.s : p.b;
  }

  function solveItem(
    itemId: number,
    type: "b" | "s",
    {
      overdrive = [],
      onlyCraft = [],
      needed = 1,
      isCraftAll = false,
      isIngredient = false,
      ownPriority = false,
      initialPriority = false,
    }: {
      overdrive?: number[];
      onlyCraft?: number[];
      needed?: number;
      isCraftAll?: boolean;
      isIngredient?: boolean;
      ownPriority?: boolean;
      initialPriority?: boolean;
    } = {},
  ): ISolveResult {
    const cacheKey = `${itemId}_${type}_${needed}_${isCraftAll}`;
    if (memo.has(cacheKey)) return memo.get(cacheKey)!;

    const item = itemsMap.get(itemId);
    if (!item) {
      return {
        cost: 0,
        craftCoast: 0,
        ingredients: [],
        type: "buy",
        isOwn: false,
      };
    }

    const own_recipe = getOwnRecipe(item.id);
    const isNoRecipeMarked = getNoRecipeMarked(item.id);

    needed = Math.max(1, needed);

    const marketPrice = getMarketPrice(item.id, type);
    const itemAmount = Math.max(1, item.amount);
    const buyCost = (needed / itemAmount) * marketPrice;

    const noInitialRecipe =
      item.recipe === "$undefined" || item.craftable === 0;

    const noOwnRecipe = own_recipe === undefined;
    const noAnyRecipes = noInitialRecipe && noOwnRecipe;

    const noRecipeIfInitial = initialPriority && noInitialRecipe;
    const noRecipeIfOwn = ownPriority && noOwnRecipe;

    if (
      noAnyRecipes ||
      noRecipeIfInitial ||
      noRecipeIfOwn ||
      isNoRecipeMarked
    ) {
      const result = {
        cost: buyCost,
        craftCoast: buyCost,
        ingredients: [],
        type: "buy" as const,
        isOwn: false,
      };
      memo.set(cacheKey, result);
      return result;
    }

    let recipe: Recipe | OwnRecipe | undefined;

    if (item.recipe !== "$undefined" && item.craftable !== 0) {
      recipe = item.recipe;
    }

    if ((ownPriority && !noOwnRecipe) || (noInitialRecipe && !noOwnRecipe)) {
      recipe = own_recipe;
    }

    if (!recipe) {
      throw new Error("Bad recipe for item " + item.id);
    }

    const rent = "rent" in recipe ? recipe.rent : FEES[item.rarityId];

    const cycles = needed / recipe.resultAmount;
    const ingredients: IIngredientInfo[] = [];

    let craftCost = rent * cycles;

    for (const ing of recipe.ingredients) {
      const isNoRecipeMarkedIng = getNoRecipeMarked(ing.id);
      const ingItem = itemsMap.get(ing.id);
      const amountNeeded = ing.amount * cycles;

      const ingBuyPrice = getMarketPrice(ing.id, type);
      const ingAmount = Math.max(1, ingItem?.amount ?? 1);

      const buyIngCost = (amountNeeded / ingAmount) * ingBuyPrice;
      const ingHasOwnRecipe = getOwnRecipe(ing.id) !== undefined;
      const hasRecipe =
        (!!(ingItem?.recipe && ingItem.craftable) || ingHasOwnRecipe) &&
        !isNoRecipeMarkedIng;

      const solved = solveItem(ing.id, type, {
        overdrive,
        onlyCraft,
        needed: amountNeeded,
        isCraftAll,
        isIngredient: true,
      });

      const forceBuy = overdrive.includes(ing.id);
      const forceCraft =
        (onlyCraft.includes(ing.id) || isCraftAll) && hasRecipe;

      const finalType = forceBuy
        ? "buy"
        : forceCraft
          ? "craft"
          : solved.craftCoast < buyIngCost
            ? "craft"
            : "buy";

      const finalCost = finalType === "craft" ? solved.craftCoast : buyIngCost;

      craftCost += finalCost;

      ingredients.push({
        id: ing.id,
        amount: amountNeeded,
        rarityId: ingItem?.rarityId ?? 0,
        categoryId: ingItem?.categoryId ?? 0,
        buyCost: round2(buyIngCost),
        craftCost: round2(solved.craftCoast),
        type: finalType,
        hasRecipe,
        isOwn: solved.isOwn,
      });
    }

    const result: ISolveResult = {
      cost: buyCost,
      craftCoast: craftCost,
      ingredients: isIngredient ? [] : ingredients,
      type: craftCost < buyCost ? "craft" : "buy",
      isOwn: "rent" in recipe || ownPriority,
    };

    memo.set(cacheKey, result);
    return result;
  }

  return solveItem;
}
