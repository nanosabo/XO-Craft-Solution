import { IData, IItemAnalytics } from "@src/store/slices/market.slice";

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
  const FEES: Record<number, number> = {
    0: 0,
    1: 0,
    2: 3,
    3: 15,
    4: 75,
    5: 0,
    6: 6,
  };

  const getLotPrice = (id: number) => {
    const p = prices[id];
    return p ? (p.b > 0 ? p.b : p.s) : 0;
  };

  const solveOpt = (item: IItem, needed: number, isIng?: boolean): number => {
    const buyCost = (needed / item.amount) * getLotPrice(item.id);
    if (item.recipe === "$undefined") return buyCost;

    const cycles = Math.round((needed / item.recipe.resultAmount) * 100) / 100;

    const craftCost = item.recipe.ingredients.reduce((acc, ing) => {
      const ingItem = items.find((i) => i.id === ing.id);
      const cost = ingItem
        ? solveOpt(ingItem, ing.amount * cycles, true)
        : ing.amount * cycles * getLotPrice(ing.id);
      return acc + cost;
    }, FEES[item.rarityId] * cycles);

    return isIng
      ? buyCost > 0 && buyCost <= craftCost
        ? buyCost
        : craftCost
      : craftCost;
  };

  return items.map((item) => {
    const p = prices[item.id] || { s: 0, b: 0, so: 0, bo: 0, t: 0 };
    const sellNet = Math.round(p.s * 0.9 * 100) / 100;
    const optCost = solveOpt(item, item.amount);

    return {
      id: item.id,
      name: item.name,
      amount: item.amount,
      rarityId: item.rarityId,
      recipe: item.recipe,
      categoryId: item.categoryId,
      craftCost: optCost,

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
        item.recipe === "$undefined"
          ? 0
          : Math.round((sellNet - optCost) * 100) / 100,
      roi:
        optCost > 0
          ? Math.round(((sellNet - optCost) / optCost) * 10000) / 100
          : 0,
      spread: p.b > 0 ? Math.round((sellNet - p.b) * 100) / 100 : 0,
    };
  });
}
