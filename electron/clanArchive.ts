import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { ClanLog, ClanLogType, ClanMate } from "@src/types/clan";
import { createSecretKey } from "./clanCrypto";

const MAX_LOGS = 200;
const MAX_MATES = 100;

export interface ClanArchive {
  code: string;
  profileId: string;
  nickname: string;
  mates: ClanMate[];
  secretKey: string;
  logs: ClanLog[];
  publishedHash: string;
  lastFetchAt: number;
  lastRepublish: number;
}

const archivePath = () => path.join(app.getPath("userData"), "clan-archive.json");

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const asNumber = (value: unknown): number => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

export const sameNick = (left: string, right: string): boolean => {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();

  return Boolean(a) && a === b;
};

const sanitizeType = (value: unknown): ClanLogType | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<ClanLogType>;
  const key = asString(raw.key).trim().toLowerCase();
  const label = asString(raw.label).trim();
  const count = Number(raw.count);

  if (!/^[a-z0-9_-]{1,32}$/.test(key)) return null;
  if (!Number.isFinite(count) || count <= 0) return null;

  return { key, label: label || key, count };
};

export const sanitizeLog = (value: unknown): ClanLog | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<ClanLog>;
  const logId = asString(raw.logId).trim();
  const nickname = asString(raw.nickname).trim();

  if (!/^[A-Za-z0-9_-]{4,64}$/.test(logId)) return null;
  if (!nickname || nickname.length > 40) return null;

  const types = (Array.isArray(raw.types) ? raw.types : [])
    .map(sanitizeType)
    .filter((type): type is ClanLogType => type !== null);

  return {
    logId,
    nickname,
    title: asString(raw.title).trim().slice(0, 120),
    types,
    uploadedAt: Math.max(0, Math.trunc(asNumber(raw.uploadedAt))),
    savedAt: Math.max(0, Math.trunc(asNumber(raw.savedAt))),
  };
};

const sanitizeMate = (value: unknown): ClanMate | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const nickname = asString(raw.nickname).trim();
  const profileId = asString(raw.profileId).trim();

  if (!nickname || nickname.length > 40) return null;
  if (!/^[A-Za-z0-9]{4,32}$/.test(profileId)) return null;

  return { nickname, profileId };
};

const emptyArchive = (): ClanArchive => ({
  code: "",
  profileId: "",
  nickname: "",
  mates: [],
  secretKey: "",
  logs: [],
  publishedHash: "",
  lastFetchAt: 0,
  lastRepublish: 0,
});

const logOrder = (log: ClanLog): number =>
  log.uploadedAt > 0 ? log.uploadedAt : log.savedAt;

export const readClanArchive = (): ClanArchive => {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(archivePath(), "utf8"));

    if (!parsed || typeof parsed !== "object") return emptyArchive();

    const raw = parsed as Partial<ClanArchive>;
    const logs = (Array.isArray(raw.logs) ? raw.logs : [])
      .map(sanitizeLog)
      .filter((log): log is ClanLog => log !== null);
    const mates = (Array.isArray(raw.mates) ? raw.mates : [])
      .map(sanitizeMate)
      .filter((mate): mate is ClanMate => mate !== null);

    return {
      code: asString(raw.code),
      profileId: asString(raw.profileId),
      nickname: asString(raw.nickname).trim(),
      mates,
      secretKey: /^[0-9a-f]{64}$/.test(asString(raw.secretKey))
        ? asString(raw.secretKey)
        : "",
      logs: logs.sort((left, right) => logOrder(right) - logOrder(left)),
      publishedHash: asString(raw.publishedHash),
      lastFetchAt: asNumber(raw.lastFetchAt),
      lastRepublish: asNumber(raw.lastRepublish),
    };
  } catch {
    return emptyArchive();
  }
};

export const writeClanArchive = (archive: ClanArchive): void => {
  const file = archivePath();
  const temporary = `${file}.tmp`;

  fs.writeFileSync(temporary, JSON.stringify(archive));
  fs.renameSync(temporary, file);
};

export const ensureSecret = (archive: ClanArchive): void => {
  if (/^[0-9a-f]{64}$/.test(archive.secretKey)) return;

  archive.secretKey = createSecretKey();
};

const allowedNicks = (archive: ClanArchive): Set<string> => {
  const allowed = new Set(
    archive.mates.map((mate) => mate.nickname.trim().toLowerCase()),
  );

  if (archive.nickname.trim()) allowed.add(archive.nickname.trim().toLowerCase());

  return allowed;
};

/** Union of clanmate lists. A shorter profile page must not wipe people learned from others. */
export const mergeMates = (archive: ClanArchive, incoming: unknown[]): number => {
  const byId = new Map(archive.mates.map((mate) => [mate.profileId, mate]));
  let added = 0;

  for (const value of incoming) {
    const mate = sanitizeMate(value);

    if (!mate || mate.profileId === archive.profileId) continue;

    const previous = byId.get(mate.profileId);

    if (!previous) {
      added += 1;
      byId.set(mate.profileId, mate);
      continue;
    }

    if (mate.nickname !== previous.nickname) {
      byId.set(mate.profileId, mate);
    }
  }

  archive.mates = [...byId.values()]
    .sort((left, right) => left.nickname.localeCompare(right.nickname))
    .slice(0, MAX_MATES);

  return added;
};

export const mergeLogs = (
  archive: ClanArchive,
  incoming: ClanLog[],
  own: boolean,
): number => {
  const allowed = allowedNicks(archive);
  const byId = new Map(archive.logs.map((log) => [log.logId, log]));
  let added = 0;

  for (const log of incoming) {
    const nick = log.nickname.trim().toLowerCase();

    if (!own && (allowed.size === 0 || !allowed.has(nick))) continue;

    if (!byId.has(log.logId)) added += 1;

    const previous = byId.get(log.logId);

    byId.set(
      log.logId,
      previous && logOrder(previous) > logOrder(log) ? previous : log,
    );
  }

  archive.logs = [...byId.values()]
    .sort((left, right) => logOrder(right) - logOrder(left))
    .slice(0, MAX_LOGS);

  return added;
};

export const keepAllowedLogs = (archive: ClanArchive): void => {
  const allowed = allowedNicks(archive);

  if (allowed.size === 0) return;

  archive.logs = archive.logs.filter((log) =>
    allowed.has(log.nickname.trim().toLowerCase()),
  );
};

export const parseProfileId = (value: string): string | null => {
  const text = value.trim();
  const fromUrl = text.match(/pers\/([A-Za-z0-9]{4,32})/i);

  if (fromUrl) return fromUrl[1];
  if (/^[A-Za-z0-9]{4,32}$/.test(text)) return text;

  return null;
};
