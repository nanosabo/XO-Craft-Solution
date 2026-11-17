export type PriceTrend = "cheap" | "normal" | "expensive";

export interface PricePoint {
  price: number;
  /** Unix seconds. */
  time: number;
}

export interface PriceScale {
  current: number;
  normalLow: number;
  normalHigh: number;
  /** Marker position on the bar, in percent. */
  position: number;
  /** "Usual" band position and width on the bar, in percent. */
  bandLeft: number;
  bandWidth: number;
  trend: PriceTrend;
}

/** A handful of points is not enough to say what "usual" means. */
const MIN_POINTS = 24;

/**
 * Two months is a good balance: prices from before updates and events fade out,
 * while the market still has time to show its usual level. The user can pick a
 * longer window in the market settings.
 */
const DEFAULT_WINDOW_MONTHS = 2;

/** The bar ends are cut off so one odd resale does not stretch the whole scale. */
const EDGE_PERCENTILE = 5;

/** Half of the history falls into the "usual" band. */
const NORMAL_LOW_PERCENTILE = 25;
const NORMAL_HIGH_PERCENTILE = 75;

const percentile = (sorted: number[], value: number) => {
  if (sorted.length === 0) return 0;

  const index = (sorted.length - 1) * (value / 100);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower];

  const weight = index - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const buildPriceScale = (
  points: PricePoint[],
  currentPrice: number,
  windowMonths: number = DEFAULT_WINDOW_MONTHS,
): PriceScale | null => {
  const valid = points.filter(
    (point) => Number.isFinite(point.price) && point.price > 0,
  );

  if (valid.length < MIN_POINTS) return null;

  const windowSeconds = windowMonths * 30 * 24 * 60 * 60;
  const lastTime = valid.reduce(
    (latest, point) => Math.max(latest, point.time),
    0,
  );
  const recent = valid.filter(
    (point) => point.time >= lastTime - windowSeconds,
  );

  /** Rarely traded items may have too few points in the window: take all we have. */
  const window = recent.length >= MIN_POINTS ? recent : valid;

  const values = window
    .map((point) => point.price)
    .sort((left, right) => left - right);

  const lastKnown = valid.reduce((latest, point) =>
    point.time >= latest.time ? point : latest,
  );

  const current = currentPrice > 0 ? currentPrice : lastKnown.price;

  const low = percentile(values, EDGE_PERCENTILE);
  const high = percentile(values, 100 - EDGE_PERCENTILE);
  const normalLow = percentile(values, NORMAL_LOW_PERCENTILE);
  const normalHigh = percentile(values, NORMAL_HIGH_PERCENTILE);

  const spread = high - low;

  const position =
    spread > 0 ? clamp(((current - low) / spread) * 100, 1.5, 98.5) : 50;

  const bandLeft =
    spread > 0 ? clamp(((normalLow - low) / spread) * 100, 0, 100) : 40;
  const bandRight =
    spread > 0 ? clamp(((normalHigh - low) / spread) * 100, 0, 100) : 60;

  const trend: PriceTrend =
    current < normalLow
      ? "cheap"
      : current > normalHigh
        ? "expensive"
        : "normal";

  return {
    current,
    normalLow,
    normalHigh,
    position,
    bandLeft,
    bandWidth: Math.max(bandRight - bandLeft, 2),
    trend,
  };
};
