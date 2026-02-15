import { IData, IItemAnalytics } from "@src/store/slices/market.slice";
import { getOneItem } from "./oneItemCalc";

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
  recipe:
    | "$undefined"
    | {
        resultAmount: number;
        ingredients: {
          id: number;
          amount: number;
        }[];
      };
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
    const { cost, craftCoast, type, ingredients } = fnForItem(item.id, "b");

    const optCost = type === "buy" ? cost : craftCoast;

    return {
      id: item.id,
      name: item.name,
      amount: item.amount,
      rarityId: item.rarityId,
      recipe: item.recipe,
      categoryId: item.categoryId,
      craftCost: Math.round(craftCoast * 100) / 100,
      ingredients,
      craftable: item.craftable,

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
      profit:
        item.recipe === "$undefined" || item.craftable === 0
          ? 0
          : Math.round((sellNet - craftCoast) * 100) / 100,
      roi: Math.round(((sellNet - p.b) / p.b) * 10000) / 100,
      spread: p.b > 0 ? Math.round((sellNet - p.b) * 100) / 100 : 0,
    };
  });
}
