import { IData, IItemAnalytics, Recipe } from "@src/store/slices/market.slice";
import { getOneItem } from "./oneItemCalc";
import { getNoRecipeMarked } from "./main";

export interface IItem {
  id: number;
  categoryId: number;
  amount: number;
  craftable: number;
  factionId: number;
  name: string;
  price: number;
  typeId: number;
  rarityId: number;
  recipe: "$undefined" | Recipe;
  removed: number;
}

export function getEnhancedAnalytics(
  items: IItem[],
  prices: Record<string, IData>,
): IItemAnalytics[] {
  const fnForItem = getOneItem(items, prices);

  return items.map((item) => {
    const p = prices[item.id] || { s: 0, b: 0, so: 0, bo: 0, t: 0 };
    const sellNet = Math.round(p.s * 0.9 * 100) / 100;
    const { cost, craftCoast, type, ingredients, isOwn } = fnForItem(
      item.id,
      "b",
    );

    const isNoRecipeMarked = getNoRecipeMarked(item.id);

    const optCost = type === "buy" ? cost : craftCoast;

    const roi = Math.round(((sellNet - p.b) / p.b) * 10000) / 100;
    const recipe = isNoRecipeMarked ? "$undefined" : item.recipe;
    const noRecipe =
      ((item.recipe === "$undefined" || item.craftable === 0) && !isOwn) ||
      isNoRecipeMarked;

    return {
      id: item.id,
      name: item.name,
      amount: item.amount,
      rarityId: item.rarityId,
      recipe: recipe,
      categoryId: item.categoryId,
      craftCost: noRecipe ? 0 : Math.round(craftCoast * 100) / 100,
      ingredients: isOwn ? [] : ingredients,
      own_ingredients: isOwn ? ingredients : [],
      craftable: item.craftable,
      isOwn,

      offers: {
        b: p.bo,
        s: p.so,
      },

      rawPrices: {
        s: p.s,
        b: p.b,
      },

      optimalCost: Math.round(optCost * 100) / 100,
      sellPriceNet: sellNet,
      profit: noRecipe ? 0 : Math.round((sellNet - craftCoast) * 100) / 100,
      roi: isFinite(roi) && roi > -100 ? roi : 0,
      spread: p.b > 0 && p.s > 0 ? Math.round((sellNet - p.b) * 100) / 100 : 0,
    };
  });
}
