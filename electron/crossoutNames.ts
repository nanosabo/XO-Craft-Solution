import { app } from "electron";
import axios from "axios";
import fs from "node:fs";
import path from "node:path";

/**
 * crossout-info localizes weapon names on the server. When the Russian host is
 * unavailable and the request falls back to the English subdomain, the UI still
 * has to show Russian names. The market catalogue already contains the same
 * items in both languages, so it is used as an EN -> RU dictionary.
 *
 * The catalogue is cached by the market screen under the same file names, and
 * is downloaded here when the cache is missing (for example, when the app has
 * only ever been used with the English interface).
 */
const CATALOG_URLS = [
  "https://nanosabo.github.io/xocs-imgs/market_items",
  "https://raw.githubusercontent.com/nanosabo/xocs-imgs/main/market_items",
];
const CATALOG_TIMEOUT = 20_000;
const USER_AGENT = `XO-Craft-Solution/${app.getVersion()}`;

interface CatalogItem {
  id?: unknown;
  name?: unknown;
}

interface Catalog {
  items?: unknown;
}

interface WeaponPair {
  en: string;
  ru: string;
  enKey: string;
  ruKey: string;
  enWords: string[];
  ruWords: string[];
}

type TranslationDirection = "en-ru" | "ru-en";

const isCatalog = (value: unknown): value is Catalog => {
  if (!value || typeof value !== "object") return false;

  const catalog = value as Catalog;

  return Array.isArray(catalog.items) && catalog.items.length > 0;
};

const cachePath = (language: "ru" | "en"): string =>
  path.join(app.getPath("userData"), `market-items-${language}.json`);

const readCatalogCache = (language: "ru" | "en"): Catalog | null => {
  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath(language), "utf8"));

    return isCatalog(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveCatalogCache = (language: "ru" | "en", catalog: Catalog): void => {
  try {
    fs.writeFileSync(cachePath(language), JSON.stringify(catalog), "utf8");
  } catch {
    /* cache is best-effort */
  }
};

const fetchCatalog = async (language: "ru" | "en"): Promise<Catalog | null> => {
  const suffix = language === "en" ? "_en.json" : ".json";

  for (const base of CATALOG_URLS) {
    try {
      const response = await axios.get<Catalog>(base + suffix, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        timeout: CATALOG_TIMEOUT,
      });

      if (isCatalog(response.data)) {
        saveCatalogCache(language, response.data);
        return response.data;
      }
    } catch {
      /* try the next host */
    }
  }

  return null;
};

const loadCatalog = async (language: "ru" | "en"): Promise<Catalog | null> =>
  readCatalogCache(language) ?? (await fetchCatalog(language));

const readItems = (catalog: Catalog): CatalogItem[] =>
  (Array.isArray(catalog.items) ? catalog.items : []).filter(
    (item): item is CatalogItem =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/з/g, "3")
    .replace(/[^0-9a-zа-я]+/g, "");

const buildPairs = (ruCatalog: Catalog, enCatalog: Catalog): WeaponPair[] => {
  const ruNames = new Map<number, string>();

  for (const item of readItems(ruCatalog)) {
    const id = Number(item.id);
    const name = String(item.name ?? "").trim();

    if (Number.isFinite(id) && name) ruNames.set(id, name);
  }

  const pairs: WeaponPair[] = [];

  for (const item of readItems(enCatalog)) {
    const id = Number(item.id);
    const en = String(item.name ?? "").trim();
    const ru = ruNames.get(id);

    if (!en || !ru) continue;

    pairs.push({
      en,
      ru,
      enKey: normalize(en),
      ruKey: normalize(ru),
      enWords: en.split(/\s+/).filter(Boolean),
      ruWords: ru.split(/\s+/).filter(Boolean),
    });
  }

  return pairs;
};

/**
 * Names that are not present in the market catalogue but still appear in battle
 * logs (for example, the leviathan build name).
 */
const FALLBACK_EN_TO_RU: Record<string, string> = {
  leviathan: "Левиафан",
};

const FALLBACK_RU_TO_EN: Record<string, string> = {
  левиафан: "Leviathan",
  спмшершень: "SPM Hornet",
};

const getPairKey = (
  pair: WeaponPair,
  direction: TranslationDirection,
): string => (direction === "en-ru" ? pair.enKey : pair.ruKey);

const getTargetWords = (
  pair: WeaponPair,
  direction: TranslationDirection,
): string[] => (direction === "en-ru" ? pair.ruWords : pair.enWords);

const getTargetName = (
  pair: WeaponPair,
  direction: TranslationDirection,
): string => (direction === "en-ru" ? pair.ru : pair.en);

const translatePart = (
  part: string,
  pairs: WeaponPair[],
  direction: TranslationDirection,
): string => {
  const key = normalize(part);

  if (!key) return part;

  const fallback = (
    direction === "en-ru" ? FALLBACK_EN_TO_RU : FALLBACK_RU_TO_EN
  )[key];

  if (fallback) return fallback;

  const exact = pairs.find((pair) => getPairKey(pair, direction) === key);

  if (exact) return getTargetName(exact, direction);

  if (key.length < 3) return part;

  let best: WeaponPair | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const pair of pairs) {
    const pairKey = getPairKey(pair, direction);

    // crossout-info drops or adds manufacturer prefixes and suffixes: "AA Gun-4
    // Starfall" is shown as "Starfall", while "Всполох I" is shown as "Всполох".
    if (
      !pairKey.endsWith(key) &&
      !pairKey.startsWith(key) &&
      !key.endsWith(pairKey) &&
      !key.startsWith(pairKey)
    ) {
      continue;
    }

    const score = Math.abs(pairKey.length - key.length);

    if (
      best === null ||
      score < bestScore ||
      (score === bestScore && pairKey.length < getPairKey(best, direction).length)
    ) {
      best = pair;
      bestScore = score;
    }
  }

  if (!best) return part;

  // Keep only the same number of leading/trailing words as in the query so
  // that "Starfall" maps to "Звездопад" rather than "ЗА-4 Звездопад".
  const queryWords = part.split(/\s+/).filter(Boolean).length;
  const targetWords = getTargetWords(best, direction);

  if (queryWords > 0 && queryWords < targetWords.length) {
    const pairKey = getPairKey(best, direction);

    if (pairKey.startsWith(key)) {
      return targetWords.slice(0, queryWords).join(" ");
    }

    // The Russian host drops manufacturer prefixes ("Тайфун"), while the
    // English host keeps them ("CC-18 Typhoon"). Restore the full English name.
    if (direction === "ru-en" && pairKey.endsWith(key)) {
      return getTargetName(best, direction);
    }

    return targetWords.slice(-queryWords).join(" ");
  }

  return getTargetName(best, direction);
};

let pairsPromise: Promise<WeaponPair[]> | null = null;

const loadPairs = async (): Promise<WeaponPair[]> => {
  const [ruCatalog, enCatalog] = await Promise.all([
    loadCatalog("ru"),
    loadCatalog("en"),
  ]);

  if (!ruCatalog || !enCatalog) return [];

  return buildPairs(ruCatalog, enCatalog);
};

const getPairs = async (): Promise<WeaponPair[]> => {
  if (!pairsPromise) {
    pairsPromise = loadPairs().catch(() => []);
  }

  const pairs = await pairsPromise;

  if (pairs.length === 0) {
    // Allow a later request to retry when the catalogue was unreachable.
    pairsPromise = null;
  }

  return pairs;
};

const translationCaches: Record<TranslationDirection, Map<string, string>> = {
  "en-ru": new Map(),
  "ru-en": new Map(),
};

const translateWeaponName = async (
  name: string,
  direction: TranslationDirection,
): Promise<string> => {
  const value = name.trim();

  if (!value) return name;

  const cache = translationCaches[direction];
  const cached = cache.get(value);

  if (cached !== undefined) return cached;

  const pairs = await getPairs();

  if (pairs.length === 0) return name;

  const translated = value
    .split(",")
    .map((part) => {
      const trimmed = part.trim();

      if (!trimmed) return part;

      return translatePart(trimmed, pairs, direction);
    })
    .join(", ");

  cache.set(value, translated);

  return translated;
};

/**
 * Translates a weapon name returned by the English crossout-info host into the
 * Russian name from the market catalogue. Unknown names are returned unchanged,
 * and comma-separated multi-weapon values are translated part by part.
 */
export const translateCrossoutWeaponName = async (
  name: string,
): Promise<string> => translateWeaponName(name, "en-ru");

/**
 * The reverse of {@link translateCrossoutWeaponName}: used when the English
 * interface has to fall back to the Russian host (for example, the English
 * subdomain truncates very large battle responses).
 */
export const translateCrossoutWeaponNameToEnglish = async (
  name: string,
): Promise<string> => translateWeaponName(name, "ru-en");
