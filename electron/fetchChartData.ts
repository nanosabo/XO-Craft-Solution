import type { IData } from "@src/store/slices/market.slice";
import { getFallbackActionId, postServerAction } from "./actionIds";
import { getLanguage } from "./main";

export type TimeRange = "1h" | "6h" | "12h" | "1d" | "1w" | "1m" | "2m" | "6m";

export interface ChartData {
  t: string[];
  s: number[];
  b: number[];
  so: number[];
  bo: number[];
}

const TIME_RANGE_SECONDS: Record<TimeRange, number> = {
  "1h": 60 * 60,
  "6h": 6 * 60 * 60,
  "12h": 12 * 60 * 60,
  "1d": 24 * 60 * 60,
  "1w": 7 * 24 * 60 * 60,
  "1m": 30 * 24 * 60 * 60,
  "2m": 60 * 24 * 60 * 60,
  "6m": 180 * 24 * 60 * 60,
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Asking for six months of hourly points is very expensive for the site: on
 * the fallback mirror such a response takes ~40s and arrives truncated, so the
 * chart stays empty. Four-hour points are cheap and complete, while a separate
 * one-week hourly request keeps the default (most recent) view detailed.
 */
const HISTORY_DAYS = 180;
const HISTORY_AGGREGATION_MINUTES = 240;
const RECENT_DAYS = 7;
const RECENT_AGGREGATION_MINUTES = 60;

const requestHistory = async (
  id: number,
  days: number,
  aggregationMinutes: number,
): Promise<IData[] | null> => {
  try {
    const lang = getLanguage();
    const url = `${lang === "en" ? "en" : ""}/market/`;

    const response = await postServerAction(
      "getItemsPriceHistory",
      url,
      [{ itemIds: [id], days, aggregationMinutes }],
      {
        Cookie: "NEXT_LOCALE=" + lang,
        "User-Agent": USER_AGENT,
        Accept: "*/*",
      },
      getFallbackActionId("getItemsPriceHistory"),
    );

    const resultLine = response
      .split("\n")
      .filter(Boolean)
      .find((line) => line.startsWith("1:"));

    if (!resultLine) return null;

    const raw = resultLine.slice(2).trim();

    if (!raw || raw === "null" || raw === "{}") return [];

    const cleanJson: Record<string, IData[]> = JSON.parse(raw);

    return cleanJson[String(id)] ?? [];
  } catch {
    return null;
  }
};

/**
 * Uses the hourly points for the recent week and the four-hour points for the
 * older history, so the chart opens quickly and still covers six months.
 */
const mergeHistory = (
  history: IData[] | null,
  recent: IData[] | null,
): IData[] => {
  if (!history) return recent ?? [];
  if (!recent?.length) return history;

  const recentStart = recent.reduce(
    (min, point) => Math.min(min, point.t),
    Number.POSITIVE_INFINITY,
  );

  const merged = new Map<number, IData>();

  for (const point of history) {
    if (point.t < recentStart) merged.set(point.t, point);
  }

  for (const point of recent) {
    merged.set(point.t, point);
  }

  return Array.from(merged.values()).sort((a, b) => a.t - b.t);
};

export const fetchChartData = async (id: number) => {
  const [history, recent] = await Promise.all([
    requestHistory(id, HISTORY_DAYS, HISTORY_AGGREGATION_MINUTES),
    requestHistory(id, RECENT_DAYS, RECENT_AGGREGATION_MINUTES),
  ]);

  if (history === null && recent === null) return undefined;

  return mergeHistory(history, recent);
};

export function buildChartData(
  data: IData[],
  range: TimeRange,
  lang: string = "ru",
): ChartData {
  const locale = lang === "ru" ? "ru-RU" : "en-US";

  if (!data.length) {
    return { t: [], s: [], b: [], so: [], bo: [] };
  }

  const now = Math.floor(Date.now() / 1000);
  const fromTime = now - TIME_RANGE_SECONDS[range];

  const formatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const result: ChartData = {
    t: [],
    s: [],
    b: [],
    so: [],
    bo: [],
  };

  for (const item of data) {
    if (item.t >= fromTime) {
      result.t.push(formatter.format(new Date(item.t * 1000)));
      result.s.push(item.s);
      result.b.push(item.b);
      result.so.push(item.so);
      result.bo.push(item.bo);
    }
  }

  return result;
}
