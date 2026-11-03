import { FollowCondition, FollowMetric } from "@src/store/follow";

export type FollowGroup = "price" | "lots";

export const followGroups: FollowGroup[] = ["price", "lots"];

export const groupMetrics: Record<FollowGroup, FollowMetric[]> = {
  price: ["sell", "buy"],
  lots: ["sellLots", "buyLots"],
};

export const followConditions: FollowCondition[] = [
  "any",
  "below",
  "belowOrEqual",
  "above",
  "aboveOrEqual",
];
