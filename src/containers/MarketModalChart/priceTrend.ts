export type TrendDirection = "down" | "flat" | "up";

export interface Trend {
  direction: TrendDirection;
  /** A move big enough to call out separately. */
  strong: boolean;
}

export interface MarketTrends {
  price: Trend | null;
  lots: Trend | null;
}

export interface TrendPoint {
  price: number;
  lots: number;
  /** Unix seconds. */
  time: number;
}

/** The last week is compared with the week before it. */
const WINDOW_SECONDS = 7 * 24 * 60 * 60;
const MIN_POINTS = 4;

const PRICE_FLAT_THRESHOLD = 0.05;
const PRICE_STRONG_THRESHOLD = 0.15;

const LOTS_FLAT_THRESHOLD = 0.12;

const median = (values: number[]) => {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const mean = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;

const priceTrend = (recent: number[], prior: number[]): Trend | null => {
  if (recent.length < MIN_POINTS || prior.length < MIN_POINTS) return null;

  const base = median(prior);

  if (base <= 0) return null;

  const change = median(recent) / base - 1;

  return {
    direction:
      change <= -PRICE_FLAT_THRESHOLD
        ? "down"
        : change >= PRICE_FLAT_THRESHOLD
          ? "up"
          : "flat",
    strong: Math.abs(change) >= PRICE_STRONG_THRESHOLD,
  };
};

const lotsTrend = (recent: number[], prior: number[]): Trend | null => {
  if (recent.length < MIN_POINTS || prior.length < MIN_POINTS) return null;

  const base = mean(prior);
  const current = mean(recent);

  if (base <= 0) {
    return { direction: current > 0 ? "up" : "flat", strong: false };
  }

  const change = current / base - 1;

  return {
    direction:
      change <= -LOTS_FLAT_THRESHOLD
        ? "down"
        : change >= LOTS_FLAT_THRESHOLD
          ? "up"
          : "flat",
    strong: false,
  };
};

export const buildMarketTrends = (points: TrendPoint[]): MarketTrends => {
  const valid = points.filter(
    (point) => Number.isFinite(point.time) && point.time > 0,
  );

  if (valid.length < MIN_POINTS * 2) {
    return { price: null, lots: null };
  }

  const lastTime = valid.reduce(
    (latest, point) => Math.max(latest, point.time),
    0,
  );
  const recentStart = lastTime - WINDOW_SECONDS;
  const priorStart = lastTime - WINDOW_SECONDS * 2;

  const recent = valid.filter((point) => point.time >= recentStart);
  const prior = valid.filter(
    (point) => point.time >= priorStart && point.time < recentStart,
  );

  const prices = (items: TrendPoint[]) =>
    items
      .map((point) => point.price)
      .filter((price) => Number.isFinite(price) && price > 0);

  const lots = (items: TrendPoint[]) =>
    items
      .map((point) => point.lots)
      .filter((value) => Number.isFinite(value) && value >= 0);

  return {
    price: priceTrend(prices(recent), prices(prior)),
    lots: lotsTrend(lots(recent), lots(prior)),
  };
};
