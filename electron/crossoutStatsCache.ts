import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type {
  CrossoutCachedLogStats,
  CrossoutLogStat,
  CrossoutLogSummary,
  CrossoutLogTable,
  CrossoutLogTime,
  CrossoutLogTypeOption,
  CrossoutStatsCacheInput,
} from "../src/types/crossout";

const CACHE_LIMIT = 10;

const cacheFile = () =>
  path.join(app.getPath("userData"), "crossout-stats-cache.json");

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const normalizeType = (value: unknown): CrossoutLogTypeOption | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<CrossoutLogTypeOption>;
  const key = asString(raw.key).trim();
  const label = asString(raw.label).trim();
  const count = Number(raw.count);

  if (!key || !Number.isFinite(count) || count <= 0) return null;

  return { key, label, count };
};

const normalizeSummary = (value: unknown): CrossoutLogSummary | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<CrossoutLogSummary>;
  const logId = asString(raw.logId).trim();

  if (!logId) return null;

  const types = (Array.isArray(raw.types) ? raw.types : [])
    .map(normalizeType)
    .filter((type): type is CrossoutLogTypeOption => type !== null);

  return {
    logId,
    nickname: asString(raw.nickname).trim(),
    title: asString(raw.title).trim(),
    types,
  };
};

const normalizeTimes = (value: unknown): CrossoutLogTime[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const raw = item as Partial<CrossoutLogTime>;
    const at = Number(raw.at);
    const label = asString(raw.label);

    if (!Number.isFinite(at) || at <= 0) return [];

    return [{ at, label }];
  });
};

const normalizeStat = (value: unknown): CrossoutLogStat | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<CrossoutLogStat>;

  if (!Array.isArray(raw.headers) || !Array.isArray(raw.rows)) return null;

  return raw as CrossoutLogStat;
};

const normalizeTable = (value: unknown): CrossoutLogTable | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<CrossoutLogTable>;
  const type = asString(raw.type).trim().toLowerCase();

  if (!type || !Array.isArray(raw.rows)) return null;

  const nickname = asString(raw.nickname).trim();

  return {
    type,
    date: asString(raw.date),
    times: normalizeTimes(raw.times),
    stats: normalizeStat(raw.stats),
    rows: raw.rows,
    ...(nickname ? { nickname } : {}),
  };
};

const normalizeEntry = (value: unknown): CrossoutCachedLogStats | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<CrossoutCachedLogStats>;
  const summary = normalizeSummary(raw.summary);
  const language = raw.language === "en" ? "en" : raw.language === "ru" ? "ru" : null;

  if (!summary || !language) return null;

  const tables = (Array.isArray(raw.tables) ? raw.tables : [])
    .map(normalizeTable)
    .filter((table): table is CrossoutLogTable => table !== null);

  if (tables.length === 0) return null;

  return {
    logId: summary.logId,
    language,
    viewedAt:
      typeof raw.viewedAt === "number" && Number.isFinite(raw.viewedAt)
        ? raw.viewedAt
        : 0,
    summary,
    tables,
  };
};

const readCache = (): CrossoutCachedLogStats[] => {
  try {
    const raw = fs.readFileSync(cacheFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeEntry)
      .filter((entry): entry is CrossoutCachedLogStats => entry !== null)
      .sort((left, right) => right.viewedAt - left.viewedAt)
      .slice(0, CACHE_LIMIT);
  } catch {
    return [];
  }
};

const writeCache = (entries: CrossoutCachedLogStats[]) => {
  try {
    fs.mkdirSync(path.dirname(cacheFile()), { recursive: true });
    fs.writeFileSync(cacheFile(), JSON.stringify(entries.slice(0, CACHE_LIMIT)), "utf8");
  } catch (error) {
    console.error("Failed to save the Crossout stats cache:", error);
  }
};

export const getCrossoutStatsCache = (
  logId: string,
  _language: "ru" | "en",
): CrossoutCachedLogStats | null => {
  const id = String(logId ?? "").trim();

  if (!id) return null;

  const entries = readCache();
  const found = entries.find((entry) => entry.logId === id);

  if (!found) return null;

  const next = { ...found, viewedAt: Date.now() };
  const rest = entries.filter(
    (entry) => entry.logId !== id || entry.language !== found.language,
  );

  writeCache(
    [next, ...rest].sort((left, right) => right.viewedAt - left.viewedAt),
  );

  return next;
};

export const saveCrossoutStatsCache = (
  input: CrossoutStatsCacheInput,
  language: "ru" | "en",
): void => {
  const summary = normalizeSummary(input?.summary);
  const table = normalizeTable(input?.table);

  if (!summary || !table) return;

  const entries = readCache();
  const previous = entries.find(
    (entry) => entry.logId === summary.logId && entry.language === language,
  );
  const tables = [
    ...(previous?.tables.filter((item) => item.type !== table.type) ?? []),
    table,
  ];
  const next: CrossoutCachedLogStats = {
    logId: summary.logId,
    language,
    viewedAt: Date.now(),
    summary,
    tables,
  };
  const rest = entries.filter((entry) => entry.logId !== summary.logId);

  writeCache(
    [next, ...rest].sort((left, right) => right.viewedAt - left.viewedAt),
  );
};

export const forgetCrossoutStatsCache = (logId: string): void => {
  const id = String(logId ?? "").trim();

  if (!id) return;

  writeCache(readCache().filter((entry) => entry.logId !== id));
};

export const clearCrossoutStatsCache = (): void => {
  writeCache([]);
};
