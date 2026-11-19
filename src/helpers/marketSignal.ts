import type { ChartData } from "@electron/fetchChartData";
import {
  buildPriceAdvice,
  type PriceAdvice,
} from "@src/containers/MarketModalChart/priceAdvice";
import { buildPriceScale } from "@src/containers/MarketModalChart/priceScale";
import { buildMarketTrends } from "@src/containers/MarketModalChart/priceTrend";
import type { PriceScalePeriod } from "@src/store/slices/settings.slice";
import type { PriceSignalKind } from "@src/store/signals";

export interface PriceSignal {
  kind: PriceSignalKind;
  advice: PriceAdvice;
  /** Changes only when the meaning of the advice changes. */
  key: string;
}

export interface PriceSignalResult {
  signal: PriceSignal | null;
  /** False when there is not enough history to judge the price. */
  hasScale: boolean;
}

/**
 * Reuses the same scale, trend and advice code as the chart, so a notification
 * never tells a different story than the price scale in the item modal.
 */
export const buildPriceSignal = (
  chart: ChartData,
  currentPrice: number,
  period: PriceScalePeriod,
): PriceSignalResult => {
  const empty: PriceSignalResult = { signal: null, hasScale: false };

  if (chart.ts.length === 0) return empty;

  const scale = buildPriceScale(
    chart.s.map((price, index) => ({
      price,
      time: chart.ts[index] ?? 0,
    })),
    currentPrice,
    period,
  );

  if (!scale) return empty;

  const trends = buildMarketTrends(
    chart.s.map((price, index) => ({
      price,
      lots: chart.so[index] ?? 0,
      time: chart.ts[index] ?? 0,
    })),
  );

  const advice = buildPriceAdvice(scale.trend, trends);
  const direction = trends.price?.direction;

  let kind: PriceSignalKind | null = null;

  if (advice.tone === "buy") {
    kind = "buy";
  } else if (direction === "up") {
    kind = "hold";
  } else if (direction === "down") {
    kind = "down";
  } else if (scale.trend === "expensive") {
    kind = "sell";
  }

  if (!kind) return { signal: null, hasScale: true };

  return {
    hasScale: true,
    signal: {
      kind,
      advice,
      key: `${kind}|${advice.key}|${advice.lotsKey ?? ""}`,
    },
  };
};
