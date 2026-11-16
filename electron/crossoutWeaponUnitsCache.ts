import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type {
  CrossoutWeaponUnit,
  CrossoutWeaponUnitsCache,
  CrossoutWeaponUnitsCacheInput,
} from "../src/types/crossout";
import { weaponUnitsCacheKey } from "./weaponUnitTable";

const CACHE_LIMIT = 300;

const cacheFile = () =>
  path.join(app.getPath("userData"), "crossout-weapon-units-cache.json");

interface StoredWeaponUnits {
  key: string;
  logId: string;
  savedAt: number;
  units: CrossoutWeaponUnit[];
  summary: CrossoutWeaponUnitsCache["summary"];
}

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const normalizeUnit = (value: unknown): CrossoutWeaponUnit | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<CrossoutWeaponUnit>;
  const key = asString(raw.key).trim();

  if (!key) return null;

  return {
    key,
    name: asString(raw.name),
    image: asString(raw.image),
    importantPercent: asString(raw.importantPercent),
    important: asString(raw.important),
    average: asString(raw.average),
    total: asString(raw.total),
  };
};

const normalizeSummary = (
  value: unknown,
): CrossoutWeaponUnitsCache["summary"] => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<NonNullable<CrossoutWeaponUnitsCache["summary"]>>;

  return {
    name: asString(raw.name),
    rounds: asString(raw.rounds),
    winrate: asString(raw.winrate),
  };
};

const normalizeEntry = (value: unknown): StoredWeaponUnits | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<StoredWeaponUnits>;
  const key = asString(raw.key);
  const logId = asString(raw.logId).trim();
  const units = (Array.isArray(raw.units) ? raw.units : [])
    .map(normalizeUnit)
    .filter((unit): unit is CrossoutWeaponUnit => unit !== null);

  if (!key || !logId || units.length === 0) return null;

  return {
    key,
    logId,
    savedAt:
      typeof raw.savedAt === "number" && Number.isFinite(raw.savedAt)
        ? raw.savedAt
        : 0,
    units,
    summary: normalizeSummary(raw.summary),
  };
};

const readCache = (): StoredWeaponUnits[] => {
  try {
    const raw = fs.readFileSync(cacheFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeEntry)
      .filter((entry): entry is StoredWeaponUnits => entry !== null)
      .sort((left, right) => right.savedAt - left.savedAt)
      .slice(0, CACHE_LIMIT);
  } catch {
    return [];
  }
};

const writeCache = (entries: StoredWeaponUnits[]) => {
  try {
    fs.mkdirSync(path.dirname(cacheFile()), { recursive: true });
    fs.writeFileSync(
      cacheFile(),
      JSON.stringify(entries.slice(0, CACHE_LIMIT)),
      "utf8",
    );
  } catch (error) {
    console.error("Failed to save the weapon units cache:", error);
  }
};

const toHit = (entry: StoredWeaponUnits): CrossoutWeaponUnitsCache => ({
  units: entry.units,
  summary: entry.summary,
});

export const getCrossoutWeaponUnitsCache = (
  request: CrossoutWeaponUnitsCacheInput,
): CrossoutWeaponUnitsCache | null => {
  const key = weaponUnitsCacheKey(request);

  if (!key) return null;

  const entries = readCache();
  const found = entries.find((entry) => entry.key === key);

  if (!found) return null;

  const next = { ...found, savedAt: Date.now() };

  writeCache(
    [next, ...entries.filter((entry) => entry.key !== key)].sort(
      (left, right) => right.savedAt - left.savedAt,
    ),
  );

  return toHit(next);
};

export const saveCrossoutWeaponUnitsCache = (
  input: CrossoutWeaponUnitsCacheInput,
): void => {
  const key = weaponUnitsCacheKey(input);
  const units = (Array.isArray(input?.units) ? input.units : [])
    .map(normalizeUnit)
    .filter((unit): unit is CrossoutWeaponUnit => unit !== null);

  if (!key || units.length === 0) return;

  const entries = readCache();
  const next: StoredWeaponUnits = {
    key,
    logId: input.logId.trim(),
    savedAt: Date.now(),
    units,
    summary: normalizeSummary(input.summary),
  };

  writeCache(
    [next, ...entries.filter((entry) => entry.key !== key)].sort(
      (left, right) => right.savedAt - left.savedAt,
    ),
  );
};

export const forgetCrossoutWeaponUnitsCache = (logId: string): void => {
  const id = String(logId ?? "").trim();

  if (!id) return;

  writeCache(readCache().filter((entry) => entry.logId !== id));
};

export const clearCrossoutWeaponUnitsCache = (): void => {
  writeCache([]);
};
