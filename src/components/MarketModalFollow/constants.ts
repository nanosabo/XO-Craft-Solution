import { FollowCondition, FollowMetric } from "@src/store/follow";

export type FollowGroup = "price" | "lots" | "signals";

export const followGroups: FollowGroup[] = ["price", "lots", "signals"];

export const groupMetrics: Record<FollowGroup, FollowMetric[]> = {
  price: ["sell", "buy"],
  lots: ["sellLots", "buyLots"],
  signals: [],
};

export const followConditions: FollowCondition[] = [
  "any",
  "below",
  "belowOrEqual",
  "above",
  "aboveOrEqual",
];
