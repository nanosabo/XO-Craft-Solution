import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import { app, net } from "electron";
import type { IData, ICategory, IRarity } from "@src/store/slices/market.slice";
import { getFallbackActionId } from "./actionIds";
import api, { isUsingMirror } from "./api";
import { fetchUpdate } from "./fetchUpdate";
import { getLanguage } from "./main";
import type { IItem } from "./craftItemsCalc";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * The site renders the whole market catalogue into /market/, but on blocked
 * networks the only available route is the mirror, which is far too slow for
 * that page (it takes ~40s and usually comes back truncated). The sync workflow
 * publishes the same catalogue to GitHub Pages, which is reachable in those
 * networks, and prices are then refreshed through the fast checkUpdateStatus
 * server action.
 */
const CATALOG_URLS = [
  "https://nanosabo.github.io/xocs-imgs/market_items",
  "https://raw.githubusercontent.com/nanosabo/xocs-imgs/main/market_items",
];

const SITE_PAGE_TIMEOUT = 15000;
const PROBE_TIMEOUT = 5000;
const CATALOG_TIMEOUT = 20000;
const CATALOG_CACHE_PREFIX = "market-items";

/** checkUpdateStatus returns the full price table when the timestamp is stale. */
const PRICE_UPDATE_AGES = [10 * 60 * 1000, 60 * 60 * 1000];

export interface MarketCatalog {
  items: IItem[];
  rarities: IRarity[];
  categories: ICategory[];
  marketData?: Record<string, IData>;
  lastUpdateTimestamp?: number;
  [key: string]: unknown;
}

interface MarketInitialData extends MarketCatalog {
  marketData: Record<string, IData>;
  lastUpdateTimestamp: number;
  serverTime: number;
}

export interface MarketResponse {
  initialData: MarketInitialData;
}

const catalogHttp = axios.create({ timeout: CATALOG_TIMEOUT });

const isCatalog = (value: unknown): value is MarketCatalog => {
  if (!value || typeof value !== "object") return false;

  const catalog = value as MarketCatalog;
  return Array.isArray(catalog.items) && catalog.items.length > 0;
};

const getCachePath = (): string | null => {
  try {
    return path.join(
      app.getPath("userData"),
      `${CATALOG_CACHE_PREFIX}-${getLanguage()}.json`,
    );
  } catch {
    return null;
  }
};

const readCatalogCache = (): MarketCatalog | null => {
  const file = getCachePath();
  if (!file) return null;

  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return isCatalog(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveCatalogCache = (catalog: MarketCatalog) => {
  const file = getCachePath();
  if (!file) return;

  try {
    fs.writeFileSync(file, JSON.stringify(catalog), "utf8");
  } catch {
    /* cache is best-effort */
  }
};

const fetchCatalogFromNetwork = async (): Promise<MarketCatalog> => {
  const suffix = getLanguage() === "en" ? "_en.json" : ".json";

  for (const base of CATALOG_URLS) {
    try {
      const response = await catalogHttp.get(base + suffix, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });

      if (isCatalog(response.data)) return response.data;
    } catch {
      /* try the next host */
    }
  }

  throw new Error("Каталог предметов недоступен");
};

/**
 * The page payload is a React Server Component stream where one line carries
 * the `initialData` object. It is usually valid JSON, but occasionally the
 * response is cut right after the object, so the trailing part is trimmed.
 */
const parseInitialData = (payload: string): MarketResponse | null => {
  for (const line of payload.split("\n")) {
    if (!line.includes('"initialData"')) continue;

    const jsonStartIndex = line.indexOf("{");
    if (jsonStartIndex === -1) continue;

    const cleanJson = line.substring(jsonStartIndex);
    const candidates = [cleanJson];

    const lastBrace = cleanJson.lastIndexOf("}");
    if (lastBrace !== -1 && lastBrace + 1 !== cleanJson.length) {
      candidates.push(cleanJson.substring(0, lastBrace + 1));
    }

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate) as MarketResponse;

        if (parsed?.initialData?.items?.length) return parsed;
      } catch {
        /* try the next candidate */
      }
    }
  }

  return null;
};

const fetchFromSite = async (): Promise<MarketResponse | null> => {
  const lang = getLanguage();
  const url = `${lang === "en" ? "en" : ""}/market/`;

  const response = await api.get(url, {
    timeout: SITE_PAGE_TIMEOUT,
    headers: {
      RSC: "1",
      Cookie: "NEXT_LOCALE=" + lang,
      "User-Agent": USER_AGENT,
      Accept: "*/*",
    },
  });

  const payload =
    typeof response.data === "string" ? response.data : String(response.data);

  return parseInitialData(payload);
};

/**
 * A cheap request that tells us which host actually works. It also warms the
 * base URL cache used by the shared axios instance.
 */
const probeNetwork = async (): Promise<boolean> => {
  if (!net.isOnline()) return false;

  try {
    await api.get("/robots.txt", {
      timeout: PROBE_TIMEOUT,
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
    });
    return true;
  } catch {
    /* both hosts are unavailable; the caller will try the fallbacks */
    return false;
  }
};

const fetchFreshUpdate = async () => {
  const actionId = getFallbackActionId("checkUpdateStatus");

  for (const age of PRICE_UPDATE_AGES) {
    const update = await fetchUpdate(Date.now() - age, actionId);

    if (update?.updated && update.data?.marketData) return update;
  }

  return undefined;
};

const buildFromCatalog = async (): Promise<MarketResponse> => {
  const online = net.isOnline();
  let catalog: MarketCatalog | null = null;

  if (online) {
    try {
      catalog = await fetchCatalogFromNetwork();
      saveCatalogCache(catalog);
    } catch {
      catalog = readCatalogCache();
    }
  } else {
    catalog = readCatalogCache();
  }

  if (!catalog) {
    throw new Error(
      "Не удалось загрузить каталог предметов. Проверьте подключение к интернету.",
    );
  }

  let update: Awaited<ReturnType<typeof fetchFreshUpdate>>;

  if (online) {
    try {
      update = await fetchFreshUpdate();
    } catch {
      /* keep the cached catalogue when only the price update is unavailable */
    }
  }

  return {
    initialData: {
      ...catalog,
      marketData: update?.data?.marketData ?? {},
      lastUpdateTimestamp: update?.lastUpdateTimestamp ?? Date.now(),
      serverTime: update?.serverTime ?? Date.now(),
    },
  };
};

export const fetchItems = async (): Promise<MarketResponse> => {
  const online = await probeNetwork();

  // The mirror cannot render the market page, so do not waste 15 seconds on it.
  // When the probe fails, skip the slow page request as well.
  if (online && !isUsingMirror()) {
    try {
      const data = await fetchFromSite();

      if (data) return data;
    } catch {
      /* fall through to the published catalogue */
    }
  }

  return buildFromCatalog();
};
