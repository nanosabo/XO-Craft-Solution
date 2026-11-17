import { PriceTrend } from "./priceScale";
import { MarketTrends, TrendDirection } from "./priceTrend";

/** Colors the advice strip: a good moment, a reason to wait, or nothing special. */
export type AdviceTone = "buy" | "wait" | "neutral";

export interface PriceAdvice {
  /** Translation key for the main sentence. */
  key: string;
  tone: AdviceTone;
  /** Translation key for the lots clause, when lots add something useful. */
  lotsKey: string | null;
}

const TONES: Record<`${PriceTrend}-${TrendDirection}`, AdviceTone> = {
  "cheap-down": "wait",
  "cheap-flat": "buy",
  "cheap-up": "buy",
  "normal-down": "wait",
  "normal-flat": "neutral",
  "normal-up": "buy",
  "expensive-down": "wait",
  "expensive-flat": "wait",
  "expensive-up": "wait",
};

const POSITION_TONES: Record<PriceTrend, AdviceTone> = {
  cheap: "buy",
  normal: "neutral",
  expensive: "wait",
};

/**
 * Lots are only mentioned when they support the weekly price move.
 * Otherwise "the price is falling" and "the price may rise" would fight each
 * other in the same line and read like a contradiction.
 */
const lotsClause = (
  direction: TrendDirection | undefined,
  lots: TrendDirection | undefined,
) => {
  if (!direction || !lots || lots === "flat" || direction === "flat") {
    return null;
  }

  if (direction === "down" && lots === "up") {
    return "advice.lots.moreFalling";
  }

  if (direction === "up" && lots === "down") {
    return "advice.lots.lessRising";
  }

  return null;
};

/**
 * Turns the three signals into one plain sentence:
 * where the price is now, where it is heading and what lots say about supply.
 */
export const buildPriceAdvice = (
  position: PriceTrend,
  trends: MarketTrends,
): PriceAdvice => {
  const direction = trends.price?.direction;

  return {
    key: direction
      ? `advice.${position}.${direction}`
      : `advice.only.${position}`,
    tone: direction
      ? TONES[`${position}-${direction}`]
      : POSITION_TONES[position],
    lotsKey: lotsClause(direction, trends.lots?.direction),
  };
};
