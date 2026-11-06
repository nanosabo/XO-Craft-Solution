import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { ClanMate } from "@src/types/clan";
import type { CrossoutBattle } from "@src/types/crossout";
import { createSecretKey } from "./clanCrypto";

const MAX_BATTLES = 8000;

export interface ClanArchive {
  code: string;
  profileId: string;
  nickname: string;
  mates: ClanMate[];
  secretKey: string;
  battles: CrossoutBattle[];
  /** Keys of battles fetched with this install's own API key. */
  ownKeys: string[];
  /** Hash of the last payload published for each own day chunk. */
  published: Record<string, string>;
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

export const battleKey = (battle: CrossoutBattle): string =>
  `${battle.nickname}\0${battle.battle_id}\0${battle.type}\0${battle.date}`;

export const battleDay = (battle: CrossoutBattle): string => {
  const ms = battle.date > 10_000_000_000 ? battle.date : battle.date * 1000;

  return new Date(ms).toISOString().slice(0, 10);
};

export const sanitizeBattle = (value: unknown): CrossoutBattle | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const nickname = asString(raw.nickname).trim();
  const battleId = Number(raw.battle_id);

  if (!nickname || nickname.length > 40) return null;
  if (!Number.isSafeInteger(battleId) || battleId < 0) return null;

  const type = asString(raw.type).slice(0, 16);
  const weapon = asString(raw.weapon).slice(0, 80);
  const map = asString(raw.map).slice(0, 64);

  return {
    nickname,
    important: asNumber(raw.important),
    ur: asNumber(raw.ur),
    damage: asNumber(raw.damage),
    kill: asNumber(raw.kill),
    death: asNumber(raw.death),
    score: asNumber(raw.score),
    tank: asNumber(raw.tank),
    weapon,
    win: asNumber(raw.win) > 0 ? 1 : asNumber(raw.win) < 0 ? -1 : 0,
    party: asNumber(raw.party),
    timebattle: asNumber(raw.timebattle),
    type,
    battle_id: battleId,
    teams: asNumber(raw.teams),
    map,
    date: asNumber(raw.date),
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
  battles: [],
  ownKeys: [],
  published: {},
  lastFetchAt: 0,
  lastRepublish: 0,
});

export const readClanArchive = (): ClanArchive => {
  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(archivePath(), "utf8"),
    );

    if (!parsed || typeof parsed !== "object") return emptyArchive();

    const raw = parsed as Partial<ClanArchive>;
    const battles = (Array.isArray(raw.battles) ? raw.battles : [])
      .map(sanitizeBattle)
      .filter((battle): battle is CrossoutBattle => battle !== null);
    const mates = (Array.isArray(raw.mates) ? raw.mates : [])
      .map(sanitizeMate)
      .filter((mate): mate is ClanMate => mate !== null);
    const published =
      raw.published && typeof raw.published === "object" ? raw.published : {};

    return {
      code: asString(raw.code),
      profileId: asString(raw.profileId),
      nickname: asString(raw.nickname).trim(),
      mates,
      secretKey: /^[0-9a-f]{64}$/.test(asString(raw.secretKey))
        ? asString(raw.secretKey)
        : "",
      battles,
      ownKeys: Array.isArray(raw.ownKeys)
        ? raw.ownKeys.filter((key): key is string => typeof key === "string")
        : [],
      published: Object.fromEntries(
        Object.entries(published).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
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

const byDate = (left: CrossoutBattle, right: CrossoutBattle) =>
  right.date - left.date || right.battle_id - left.battle_id;

export const trimBattles = (archive: ClanArchive): void => {
  if (archive.battles.length <= MAX_BATTLES) return;

  const own = new Set(archive.ownKeys);
  const ownBattles = archive.battles.filter((battle) => own.has(battleKey(battle)));
  const otherBattles = archive.battles.filter(
    (battle) => !own.has(battleKey(battle)),
  );
  const room = Math.max(0, MAX_BATTLES - ownBattles.length);

  archive.battles = [...ownBattles, ...otherBattles.slice(0, room)].sort(byDate);
};

export const mergeBattles = (
  archive: ClanArchive,
  incoming: CrossoutBattle[],
  own: boolean,
): number => {
  const allowed = new Set(archive.mates.map((mate) => mate.nickname));

  if (archive.nickname) allowed.add(archive.nickname);

  const byKey = new Map(
    archive.battles.map((battle) => [battleKey(battle), battle]),
  );
  const ownKeys = new Set(archive.ownKeys);
  let added = 0;

  for (const battle of incoming) {
    if (!own && allowed.size > 0 && !allowed.has(battle.nickname)) continue;
    if (!own && allowed.size === 0) continue;

    const key = battleKey(battle);
    if (!byKey.has(key)) added += 1;

    byKey.set(key, battle);

    if (own) ownKeys.add(key);
  }

  archive.ownKeys = [...ownKeys].filter((key) => byKey.has(key));
  archive.battles = [...byKey.values()].sort(byDate);
  trimBattles(archive);

  return added;
};

export const keepAllowedBattles = (archive: ClanArchive): void => {
  const allowed = new Set(archive.mates.map((mate) => mate.nickname));

  if (archive.nickname) allowed.add(archive.nickname);

  const own = new Set(archive.ownKeys);

  archive.battles = archive.battles.filter(
    (battle) => own.has(battleKey(battle)) || allowed.has(battle.nickname),
  );

  const keys = new Set(archive.battles.map((battle) => battleKey(battle)));

  archive.ownKeys = archive.ownKeys.filter((key) => keys.has(key));
};

export const parseProfileId = (value: string): string | null => {
  const text = value.trim();
  const fromUrl = text.match(/pers\/([A-Za-z0-9]{4,32})/i);

  if (fromUrl) return fromUrl[1];
  if (/^[A-Za-z0-9]{4,32}$/.test(text)) return text;

  return null;
};
