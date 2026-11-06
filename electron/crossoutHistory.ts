import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type {
  CrossoutLogHistoryEntry,
  CrossoutLogHistoryInput,
  CrossoutLogTypeOption,
} from "../src/types/crossout";

const historyFile = () =>
  path.join(app.getPath("userData"), "crossout-history.json");

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

const normalizeEntry = (value: unknown): CrossoutLogHistoryEntry | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<CrossoutLogHistoryEntry>;
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
    savedAt:
      typeof raw.savedAt === "number" && Number.isFinite(raw.savedAt)
        ? raw.savedAt
        : 0,
    uploadedAt:
      typeof raw.uploadedAt === "number" && Number.isFinite(raw.uploadedAt)
        ? raw.uploadedAt
        : 0,
  };
};

const historyOrder = (entry: CrossoutLogHistoryEntry) =>
  entry.uploadedAt > 0 ? entry.uploadedAt : entry.savedAt;

const sortHistory = (entries: CrossoutLogHistoryEntry[]) =>
  [...entries].sort(
    (left, right) =>
      historyOrder(right) - historyOrder(left) || right.savedAt - left.savedAt,
  );

const readHistory = (): CrossoutLogHistoryEntry[] => {
  try {
    const raw = fs.readFileSync(historyFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return sortHistory(
      parsed
        .map(normalizeEntry)
        .filter((entry): entry is CrossoutLogHistoryEntry => entry !== null),
    );
  } catch {
    return [];
  }
};

const writeHistory = (entries: CrossoutLogHistoryEntry[]) => {
  try {
    fs.mkdirSync(path.dirname(historyFile()), { recursive: true });
    fs.writeFileSync(
      historyFile(),
      JSON.stringify(sortHistory(entries), null, 2),
      "utf8",
    );
  } catch (error) {
    console.error("Failed to save the Crossout log history:", error);
  }
};

export const listCrossoutHistory = (): CrossoutLogHistoryEntry[] =>
  readHistory();

export const saveCrossoutHistory = (
  input: CrossoutLogHistoryInput,
): CrossoutLogHistoryEntry[] => {
  const logId = asString(input?.logId).trim();

  if (!logId) return readHistory();

  const current = readHistory();
  const previous = current.find((item) => item.logId === logId);
  const incomingUpload = Math.trunc(Number(input.uploadedAt));
  const entry: CrossoutLogHistoryEntry = {
    logId,
    nickname: asString(input.nickname).trim(),
    title: asString(input.title).trim(),
    types: (Array.isArray(input.types) ? input.types : [])
      .map(normalizeType)
      .filter((type): type is CrossoutLogTypeOption => type !== null),
    savedAt: previous && previous.savedAt > 0 ? previous.savedAt : Date.now(),
    uploadedAt:
      Number.isFinite(incomingUpload) && incomingUpload > 0
        ? incomingUpload
        : (previous?.uploadedAt ?? 0),
  };

  // A log id is unique, so re-opening or re-uploading the same log updates the
  // existing history item instead of adding a duplicate. Opening it again does
  // not change the upload date used for sorting.
  const entries = current.filter((item) => item.logId !== logId);
  entries.unshift(entry);
  writeHistory(entries);

  return sortHistory(entries);
};

export const clearCrossoutHistory = (): CrossoutLogHistoryEntry[] => {
  writeHistory([]);

  return [];
};

export const removeCrossoutHistory = (
  logId: string,
): CrossoutLogHistoryEntry[] => {
  const id = String(logId ?? "").trim();
  const entries = readHistory().filter((item) => item.logId !== id);

  writeHistory(entries);

  return sortHistory(entries);
};
