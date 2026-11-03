export type FollowPriceType = "sell" | "buy";
export type FollowLotsType = "sellLots" | "buyLots";
export type FollowMetric = FollowPriceType | FollowLotsType;

export const followMetrics: FollowMetric[] = [
  "sell",
  "buy",
  "sellLots",
  "buyLots",
];

export type FollowCondition =
  | "any"
  | "below"
  | "belowOrEqual"
  | "above"
  | "aboveOrEqual";

export interface FollowRule {
  enabled: boolean;
  condition: FollowCondition;
  value: number;
}

export interface FollowValues {
  sell: number;
  buy: number;
  sellLots: number;
  buyLots: number;
}

export type FollowRules = Record<FollowMetric, FollowRule>;

interface FollowValueSource {
  rawPrices: {
    s: number;
    b: number;
  };
  offers: {
    s: number;
    b: number;
  };
}

export const roundPrice = (value: number) =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

export const isLotsMetric = (metric: FollowMetric) =>
  metric === "sellLots" || metric === "buyLots";

export const roundFollowValue = (metric: FollowMetric, value: number) => {
  const safe = Number.isFinite(value) ? value : 0;

  return isLotsMetric(metric)
    ? Math.max(0, Math.round(safe))
    : Math.max(0, roundPrice(safe));
};

export const getItemFollowValues = (
  item: FollowValueSource,
): FollowValues => ({
  sell: item.rawPrices.s,
  buy: item.rawPrices.b,
  sellLots: item.offers.s,
  buyLots: item.offers.b,
});

export const createDefaultFollowRules = (
  values: FollowValues,
): FollowRules => ({
  sell: {
    enabled: values.sell > 0,
    condition: "below",
    value: roundFollowValue("sell", values.sell),
  },
  buy: {
    enabled: false,
    condition: "above",
    value: roundFollowValue("buy", values.buy),
  },
  sellLots: {
    enabled: false,
    condition: "below",
    value: roundFollowValue("sellLots", values.sellLots),
  },
  buyLots: {
    enabled: false,
    condition: "above",
    value: roundFollowValue("buyLots", values.buyLots),
  },
});

export const mergeFollowRules = (
  rules: Partial<FollowRules> | undefined,
  values: FollowValues,
): FollowRules => {
  const defaults = createDefaultFollowRules(values);

  if (!rules) return defaults;

  return {
    sell: { ...defaults.sell, ...(rules.sell ?? {}) },
    buy: { ...defaults.buy, ...(rules.buy ?? {}) },
    sellLots: { ...defaults.sellLots, ...(rules.sellLots ?? {}) },
    buyLots: { ...defaults.buyLots, ...(rules.buyLots ?? {}) },
  };
};

export const matchesFollowCondition = (rule: FollowRule, value: number) => {
  switch (rule.condition) {
    case "below":
      return value < rule.value;
    case "belowOrEqual":
      return value <= rule.value;
    case "above":
      return value > rule.value;
    case "aboveOrEqual":
      return value >= rule.value;
    default:
      return true;
  }
};
