import { IData } from "@src/store/slices/market.slice";
import axios from "axios";

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

export const fetchChartData = async (id: number) => {
  try {
    const response: string = (
      await axios.post("https://crossoutcore.ru/market/", [id], {
        headers: {
          Cookie: "NEXT_LOCALE=ru",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Next-Action": "40ea4e1a3b4d888504e984f76944b046896edb072c",
        },
      })
    ).data;

    const cleanJson: IData[] = response
      .split("\n")
      .filter(Boolean)
      .map((line, i) => {
        const jsonPart = line.substring(
          i === 0 ? line.indexOf("{") : line.indexOf("["),
        );
        return JSON.parse(jsonPart);
      })[1];

    return cleanJson;
  } catch (error) {
    /* empty */
  }
};

export function buildChartData(
  data: IData[],
  range: TimeRange,
  locale: string = "ru-RU",
): ChartData {
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
