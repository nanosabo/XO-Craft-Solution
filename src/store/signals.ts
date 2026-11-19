/** How a price signal should read in a notification title. */
export type PriceSignalKind = "buy" | "sell" | "hold" | "down";

/** Per-item switches for the smart market notifications. */
export interface ItemSignalRules {
  price: boolean;
  craft: boolean;
  /** Profit per unit that makes crafting worth a notification. */
  minProfit: number;
}

export const DEFAULT_SIGNAL_RULES: ItemSignalRules = {
  price: true,
  craft: true,
  minProfit: 100,
};

export const mergeSignalRules = (
  rules?: Partial<ItemSignalRules>,
): ItemSignalRules => {
  const minProfit = Number(rules?.minProfit);

  return {
    price: rules?.price ?? DEFAULT_SIGNAL_RULES.price,
    craft: rules?.craft ?? DEFAULT_SIGNAL_RULES.craft,
    minProfit: Number.isFinite(minProfit)
      ? Math.max(0, Math.round(minProfit))
      : DEFAULT_SIGNAL_RULES.minProfit,
  };
};
