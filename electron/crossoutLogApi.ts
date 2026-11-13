import { app } from "electron";
import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import type {
  CrossoutErrorCode,
  CrossoutLogCell,
  CrossoutLogRow,
  CrossoutLogStat,
  CrossoutLogStatRow,
  CrossoutLogSummaryResult,
  CrossoutLogTable,
  CrossoutLogTableResult,
  CrossoutLogTime,
  CrossoutLogTypeOption,
} from "../src/types/crossout";
import { prefetchWeaponImages, weaponImageSrc } from "./weaponImages";
import {
  fetchCrossoutText,
  getBaseUrls,
  getCrossoutApiKey,
  noteCrossoutHost,
  type CrossoutLanguage,
} from "./crossoutInfo";

const LOG_ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;
const LOG_TYPE_PATTERN = /^[a-z0-9_]{1,32}$/;
const DATA_ALL_TTL = 24 * 60 * 60 * 1000;
const TYPE_ORDER = ["kv", "pvp", "pve", "prt", "arcade", "brawl", "create", "not_defined"];

const STAT_HEADERS = [
  "Игрок / Вооружение",
  "Рейтинг",
  "Винрейт",
  "Урон",
  "Отстрел",
  "Получено",
  "Фраг",
  "Умер",
  "Очки",
];

interface NameTables {
  weapons: Record<string, string>;
  maps: Record<string, string>;
}

interface DataAllCache {
  fetchedAt: number;
  ru: NameTables;
  en: NameTables;
}

interface ApiRoundPlayer {
  nick: string;
  team: string;
  weapon: string;
  kill: number;
  damage: number;
  death: number;
  win: boolean;
  party: number;
  color: "green" | "red" | "";
}

interface ApiRound {
  round: number;
  seconds: number;
  left: ApiRoundPlayer[];
  right: ApiRoundPlayer[];
}

interface ApiBattle {
  id: string;
  map: string;
  ownerTeam: string;
  date: number;
  rounds: ApiRound[];
}

interface ApiTotals {
  damage: number;
  round: number;
  win: number;
  kill: number;
  death: number;
  score: number;
  important: number;
  tank: number;
  /** Battles played. Present on the player total, not on a weapon line. */
  battle: number;
  /** Battles won. Present on the player total, not on a weapon line. */
  winner: number;
  common: number;
  rare: number;
  epic: number;
  legendary: number;
  veryrare: number;
}

interface ApiWeapon extends ApiTotals {
  key: string;
  /** Server average for this weapon. Already per round, so it is not divided. */
  avgDamage: number | null;
  raitPerc: number | null;
  /** Filled stars out of 5. May be fractional. */
  raitStar: number | null;
}

interface ApiPlayer extends ApiTotals {
  name: string;
  /** 0 means the player was not in a party. */
  party: number;
  weapons: ApiWeapon[];
}

class LogApiError extends Error {
  readonly code: CrossoutErrorCode;

  constructor(code: CrossoutErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const summaryFailure = (
  code: CrossoutErrorCode,
  message: string,
): CrossoutLogSummaryResult => ({
  ok: false,
  error: message,
  errorCode: code,
});

const tableFailure = (
  code: CrossoutErrorCode,
  message: string,
): CrossoutLogTableResult => ({
  ok: false,
  error: message,
  errorCode: code,
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return "";
};

const asCount = (value: unknown): number => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const asOptionalNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const formatRating = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);

  return `${text}%`;
};

const dictionary = (value: unknown): Record<string, string> => {
  const record = asRecord(value);

  if (!record) return {};

  const names: Record<string, string> = {};

  for (const [key, name] of Object.entries(record)) {
    const text = asText(name);

    if (text) names[key] = text;
  }

  return names;
};

const emptyNames = (): NameTables => ({ weapons: {}, maps: {} });

const dataAllPath = () =>
  path.join(app.getPath("userData"), "crossout-data-all.json");

let dataAllMemory: DataAllCache | null = null;

const readDataAll = (): DataAllCache | null => {
  if (dataAllMemory) return dataAllMemory;

  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(dataAllPath(), "utf8"));
    const record = asRecord(parsed);

    if (!record) return null;

    const cache: DataAllCache = {
      fetchedAt: asCount(record.fetchedAt),
      ru: {
        weapons: dictionary(asRecord(record.ru)?.weapons),
        maps: dictionary(asRecord(record.ru)?.maps),
      },
      en: {
        weapons: dictionary(asRecord(record.en)?.weapons),
        maps: dictionary(asRecord(record.en)?.maps),
      },
    };

    if (
      Object.keys(cache.ru.weapons).length === 0 &&
      Object.keys(cache.en.weapons).length === 0
    ) {
      return null;
    }

    dataAllMemory = cache;

    return cache;
  } catch {
    return null;
  }
};

const writeDataAll = (cache: DataAllCache) => {
  dataAllMemory = cache;

  try {
    fs.mkdirSync(path.dirname(dataAllPath()), { recursive: true });
    fs.writeFileSync(dataAllPath(), JSON.stringify(cache));
  } catch {
    /* The in-memory copy still serves this session. */
  }
};

type JsonRead = { ok: true; value: unknown } | { ok: false };

/**
 * The English host closes long log responses before the JSON finishes.
 * Keep every value that was closed, including the player aggregate, and drop
 * only the cut-off tail.
 */
const salvageJson = (text: string): unknown | null => {
  let index = 0;
  const length = text.length;

  const skipSpace = () => {
    while (index < length && text[index] <= " ") index += 1;
  };

  const parseString = (): JsonRead => {
    if (text[index] !== '"') return { ok: false };

    index += 1;
    let value = "";

    while (index < length) {
      const char = text[index];
      index += 1;

      if (char === '"') return { ok: true, value };

      if (char !== "\\") {
        value += char;
        continue;
      }

      if (index >= length) return { ok: false };

      const escaped = text[index];
      index += 1;

      if (escaped === "u") {
        const hex = text.slice(index, index + 4);

        if (!/^[0-9a-fA-F]{4}$/.test(hex)) return { ok: false };

        index += 4;
        value += String.fromCharCode(Number.parseInt(hex, 16));
        continue;
      }

      const decoded: Record<string, string> = {
        '"': '"',
        "\\": "\\",
        "/": "/",
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t",
      };

      value += decoded[escaped] ?? escaped;
    }

    return { ok: false };
  };

  const parseNumber = (): JsonRead => {
    const start = index;

    if (text[index] === "-") index += 1;

    if (index >= length || text[index] < "0" || text[index] > "9") {
      return { ok: false };
    }

    while (index < length && text[index] >= "0" && text[index] <= "9") index += 1;

    if (text[index] === ".") {
      index += 1;
      while (index < length && text[index] >= "0" && text[index] <= "9") index += 1;
    }

    if (text[index] === "e" || text[index] === "E") {
      index += 1;
      if (text[index] === "+" || text[index] === "-") index += 1;
      while (index < length && text[index] >= "0" && text[index] <= "9") index += 1;
    }

    const raw = text.slice(start, index);
    const value = Number(raw);

    if (!raw || raw === "-" || !Number.isFinite(value)) return { ok: false };

    return { ok: true, value };
  };

  const parseLiteral = (word: string, value: unknown): JsonRead => {
    if (text.slice(index, index + word.length) !== word) return { ok: false };

    index += word.length;

    return { ok: true, value };
  };

  const parseValue = (): JsonRead => {
    skipSpace();

    if (index >= length) return { ok: false };

    const char = text[index];

    if (char === '"') return parseString();
    if (char === "{") return parseObject();
    if (char === "[") return parseArray();
    if (char === "t") return parseLiteral("true", true);
    if (char === "f") return parseLiteral("false", false);
    if (char === "n") return parseLiteral("null", null);
    if (char === "-" || (char >= "0" && char <= "9")) return parseNumber();

    return { ok: false };
  };

  const parseObject = (): JsonRead => {
    index += 1;
    const value: Record<string, unknown> = {};

    skipSpace();

    if (text[index] === "}") {
      index += 1;
      return { ok: true, value };
    }

    while (index < length) {
      skipSpace();
      const key = parseString();

      if (!key.ok || typeof key.value !== "string") return { ok: true, value };

      skipSpace();

      if (text[index] !== ":") return { ok: true, value };

      index += 1;
      const child = parseValue();

      if (!child.ok) return { ok: true, value };

      value[key.value] = child.value;
      skipSpace();

      if (text[index] === ",") {
        index += 1;
        continue;
      }

      if (text[index] === "}") {
        index += 1;
        return { ok: true, value };
      }

      return { ok: true, value };
    }

    return { ok: true, value };
  };

  const parseArray = (): JsonRead => {
    index += 1;
    const value: unknown[] = [];

    skipSpace();

    if (text[index] === "]") {
      index += 1;
      return { ok: true, value };
    }

    while (index < length) {
      const child = parseValue();

      if (!child.ok) return { ok: true, value };

      value.push(child.value);
      skipSpace();

      if (text[index] === ",") {
        index += 1;
        continue;
      }

      if (text[index] === "]") {
        index += 1;
        return { ok: true, value };
      }

      return { ok: true, value };
    }

    return { ok: true, value };
  };

  skipSpace();
  const parsed = parseValue();

  return parsed.ok ? parsed.value : null;
};

const parseBody = (text: string): Record<string, unknown> => {
  const trimmed = text.trim();

  if (trimmed.toLowerCase() === "forbidden") {
    throw new LogApiError(
      "forbidden",
      "Сервис отклонил запрос (403). Проверьте доступ к crossout-info.com.",
    );
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new LogApiError(
      "unexpected-response",
      "Сервис вернул неожиданный ответ.",
    );
  }

  let data: unknown;

  try {
    data = JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    data = salvageJson(trimmed.slice(start));
  }

  const record = asRecord(data);

  if (!record) {
    throw new LogApiError(
      "unexpected-response",
      "Сервис вернул неожиданный ответ.",
    );
  }

  const error = record.error;
  const ok = error === 0 || error === "0" || error === null || error === undefined;

  if (!ok) {
    throw new LogApiError(
      "server",
      asText(error) || "Сервис crossout-info вернул ошибку.",
    );
  }

  return record;
};

const apiUrl = (baseUrl: string, resource: string): string => {
  const apiKey = getCrossoutApiKey();

  if (!apiKey) {
    throw new LogApiError("no-key", "Не задан API-ключ crossout-info.");
  }

  return `${baseUrl}/api_ver1/${encodeURIComponent(apiKey)}/${resource}`;
};

const fetchJsonAt = async (
  baseUrl: string,
  resource: string,
): Promise<Record<string, unknown>> => {
  try {
    return parseBody(await fetchCrossoutText(apiUrl(baseUrl, resource)));
  } catch (error) {
    if (error instanceof LogApiError) throw error;

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new LogApiError(
          "forbidden",
          "Сервис отклонил запрос (403). Проверьте доступ к crossout-info.com.",
        );
      }

      if (!error.response) {
        throw new LogApiError(
          "network",
          "Не удалось связаться с crossout-info.com.",
        );
      }
    }

    throw error;
  }
};

const fetchJson = async (
  resource: string,
): Promise<Record<string, unknown>> => {
  let lastError: unknown = null;

  for (const baseUrl of await getBaseUrls()) {
    try {
      const payload = await fetchJsonAt(baseUrl, resource);

      noteCrossoutHost(baseUrl);

      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof LogApiError) throw lastError;

  throw new LogApiError(
    "network",
    lastError instanceof Error
      ? lastError.message
      : "Не удалось связаться с crossout-info.com.",
  );
};

const namesFromResult = (result: Record<string, unknown> | null): DataAllCache | null => {
  const weapons = asRecord(result?.weapons);
  const maps = asRecord(result?.maps);

  if (!weapons && !maps) return null;

  return {
    fetchedAt: Date.now(),
    ru: {
      weapons: dictionary(weapons?.ru),
      maps: dictionary(maps?.ru),
    },
    en: {
      weapons: dictionary(weapons?.en),
      maps: dictionary(maps?.en),
    },
  };
};

export const getCrossoutNameCatalog = async (): Promise<{
  ru: NameTables;
  en: NameTables;
}> => {
  const names = await loadDataAll();

  return { ru: names.ru, en: names.en };
};

const loadDataAll = async (): Promise<DataAllCache> => {
  const cached = readDataAll();

  if (cached && Date.now() - cached.fetchedAt < DATA_ALL_TTL) return cached;

  try {
    const payload = await fetchJson("data_all");
    const fresh = namesFromResult(asRecord(payload.result));

    if (!fresh) throw new LogApiError("unexpected-response", "Пустой справочник.");

    writeDataAll(fresh);

    return fresh;
  } catch {
    return (
      cached ?? {
        fetchedAt: 0,
        ru: emptyNames(),
        en: emptyNames(),
      }
    );
  }
};

const translateKey = (
  names: DataAllCache,
  language: CrossoutLanguage,
  group: "weapons" | "maps",
  key: string,
): string => {
  const primary = language === "en" ? names.en : names.ru;
  const secondary = language === "en" ? names.ru : names.en;

  return primary[group][key] || secondary[group][key] || key;
};

const averageInt = (total: number, rounds: number): string =>
  rounds > 0 ? String(Math.round(total / rounds)) : "0";

const averageFixed = (total: number, rounds: number): string =>
  (rounds > 0 ? total / rounds : 0).toFixed(2);

/** Site column is the total and the per-round average, for example `2/0.50`. */
const countAndAverage = (total: number, rounds: number): string =>
  `${total}/${averageFixed(total, rounds)}`;

const rateLabel = (part: number, total: number): string => {
  if (total <= 0) return "0/0 0%";

  return `${part}/${total} ${Math.round((part / total) * 100)}%`;
};

const partsShot = (totals: ApiTotals): number =>
  totals.common + totals.rare + totals.epic + totals.legendary + totals.veryrare;

const readTotals = (value: Record<string, unknown>): ApiTotals => ({
  damage: asCount(value.damage),
  round: asCount(value.round),
  win: asCount(value.win),
  kill: asCount(value.kill),
  death: asCount(value.death),
  score: asCount(value.score),
  important: asCount(value.important),
  tank: asCount(value.tank),
  battle: asCount(value.battle),
  winner: asCount(value.winner),
  common: asCount(value.common),
  rare: asCount(value.rare),
  epic: asCount(value.epic),
  legendary: asCount(value.legendary),
  veryrare: asCount(value.veryrare),
});

const statCells = (
  name: string,
  totals: ApiTotals,
  kind: CrossoutLogStatRow["kind"],
): string[] => {
  const rounds = totals.round;

  return [
    name,
    "",
    kind === "player"
      ? rateLabel(totals.winner, totals.battle)
      : rateLabel(totals.win, rounds),
    averageInt(totals.damage, rounds),
    averageFixed(partsShot(totals), rounds),
    averageInt(totals.tank, rounds),
    countAndAverage(totals.kill, rounds),
    countAndAverage(totals.death, rounds),
    averageInt(totals.score, rounds),
  ];
};

const statRow = (
  kind: CrossoutLogStatRow["kind"],
  name: string,
  weapon: string,
  team: "green" | "red" | "",
  totals: ApiTotals,
  images: string[] = [],
): CrossoutLogStatRow => ({
  kind,
  name,
  weapon,
  image: images[0] ?? "",
  images,
  stars: null,
  team,
  damage: averageInt(totals.damage, totals.round),
  delta: "",
  deltaKind: null,
  cells: statCells(kind === "weapon" ? weapon : name, totals, kind),
});

const readPlayers = (value: unknown): ApiPlayer[] => {
  const record = asRecord(value);

  if (!record) return [];

  return Object.entries(record).flatMap(([name, raw]) => {
    const player = asRecord(raw);

    if (!player) return [];

    const weapons = asRecord(player.weapons);
    const weaponRows: ApiWeapon[] = weapons
      ? Object.values(weapons).flatMap((item) => {
          const weapon = asRecord(item);

          if (!weapon) return [];

          const key = asText(weapon.weapon);

          if (!key) return [];

          return [
            {
              key,
              ...readTotals(weapon),
              avgDamage: asOptionalNumber(weapon.avg_damage),
              raitPerc: asOptionalNumber(weapon.rait_perc),
              raitStar: asOptionalNumber(weapon.rait_star),
            },
          ];
        })
      : [];

    return [
      {
        name,
        party: asCount(player.party),
        weapons: weaponRows.sort((left, right) => right.damage - left.damage),
        ...readTotals(player),
      },
    ];
  });
};

const readPlayer = (value: unknown): ApiRoundPlayer | null => {
  const record = asRecord(value);
  const nick = asText(record?.nick);

  if (!record || !nick) return null;

  const color = record.class === "green" || record.class === "red" ? record.class : "";
  const win = record.win;

  return {
    nick,
    team: asText(record.team),
    weapon: asText(record.weapon),
    kill: asCount(record.kill),
    damage: asCount(record.damage),
    death: asCount(record.death),
    win: win === true || win === 1 || win === "1" || win === "true",
    party: asCount(record.party),
    color,
  };
};

const readBattles = (
  maps: unknown,
  shared: unknown,
): ApiBattle[] => {
  if (!Array.isArray(maps)) return [];

  const dates = new Map<string, number>();

  if (Array.isArray(shared)) {
    for (const item of shared) {
      const record = asRecord(item);
      const id = asText(record?.id);
      // `date` is one stamp for a whole group of battles. The site list uses
      // `time`, the start of that battle.
      const date = asCount(record?.time) || asCount(record?.date);

      if (id && date > 0) dates.set(id, date);
    }
  }

  return maps.flatMap((item) => {
    const battle = asRecord(item);

    if (!battle) return [];

    const rounds = Array.isArray(battle.rounds)
      ? battle.rounds.flatMap((round) => {
          const record = asRecord(round);

          if (!record) return [];

          const readSide = (value: unknown) =>
            Array.isArray(value)
              ? value.flatMap((player) => {
                  const parsed = readPlayer(player);

                  return parsed ? [parsed] : [];
                })
              : [];

          return [
            {
              round: asCount(record.round),
              seconds: asCount(record.timebattle),
              left: readSide(record.left),
              right: readSide(record.right),
            },
          ];
        })
      : [];

    const id = asText(battle.id);

    return [
      {
        id,
        map: asText(battle.map),
        ownerTeam: asText(battle.teamUser),
        date: dates.get(id) ?? 0,
        rounds,
      },
    ];
  });
};

/**
 * Premade group of the log owner. The player total's `party` is often unique
 * now; the shared id is the one on each round in `sharedBattle.ownRounds`.
 * Party 0 is matchmaking, not a group.
 */
const partyAllies = (
  players: ApiPlayer[],
  owner: string,
  shared?: unknown,
): Set<string> => {
  const ownerKey = owner.trim().toLowerCase();
  const allies = new Set<string>();

  if (ownerKey) allies.add(ownerKey);

  const ownerPlayer = players.find(
    (player) => player.name.trim().toLowerCase() === ownerKey,
  );
  const party = ownerPlayer?.party ?? 0;

  if (party !== 0) {
    for (const player of players) {
      if (player.party === party) allies.add(player.name.trim().toLowerCase());
    }
  }

  if (!Array.isArray(shared)) return allies;

  for (const item of shared) {
    const battle = asRecord(item);
    const ownRounds = battle?.ownRounds;
    const rounds = Array.isArray(ownRounds) ? ownRounds : [];
    const groups = new Map<number, string[]>();

    for (const round of rounds) {
      const record = asRecord(round);
      const nick = asText(record?.nickname);
      const roundParty = asCount(record?.party);

      if (!nick || roundParty === 0) continue;

      const list = groups.get(roundParty) ?? [];

      list.push(nick);
      groups.set(roundParty, list);
    }

    for (const list of groups.values()) {
      const withOwner = list.some(
        (nick) => nick.trim().toLowerCase() === ownerKey,
      );

      if (!withOwner) continue;

      for (const nick of list) allies.add(nick.trim().toLowerCase());
    }
  }

  return allies;
};

const weaponKeys = (value: string): string[] =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^[A-Za-z0-9_.-]{1,160}$/.test(part));

const buildStats = (
  players: ApiPlayer[],
  names: DataAllCache,
  language: CrossoutLanguage,
  allies: Set<string>,
  owner: string,
): CrossoutLogStat | null => {
  if (players.length === 0) return null;

  const ownerKey = owner.trim().toLowerCase();
  const teamOf = (name: string): "green" | "red" =>
    allies.has(name.trim().toLowerCase()) ? "green" : "red";

  const ordered = [...players].sort((left, right) => {
    const leftOwner = left.name.trim().toLowerCase() === ownerKey;
    const rightOwner = right.name.trim().toLowerCase() === ownerKey;

    if (leftOwner !== rightOwner) return leftOwner ? -1 : 1;

    const team = Number(teamOf(right.name) === "green") - Number(teamOf(left.name) === "green");

    return team || right.damage - left.damage;
  });

  const rows: CrossoutLogStatRow[] = [];
  const images: string[] = [];

  for (const player of ordered) {
    const team = teamOf(player.name);

    rows.push(statRow("player", player.name, "", team, player));

    for (const weapon of player.weapons) {
      const keys = weaponKeys(weapon.key);
      const parts = (keys.length > 0 ? keys : [weapon.key]).map((key) => ({
        key,
        name: translateKey(names, language, "weapons", key),
      }));
      const weaponName = parts.map((part) => part.name).join(", ");

      images.push(...parts.map((part) => part.key));
      const row = statRow(
        "weapon",
        weaponName,
        weaponName,
        team,
        weapon,
        parts.map((part) => weaponImageSrc(part.key)).filter(Boolean),
      );
      const shownDamage =
        weapon.round > 0 ? Math.round(weapon.damage / weapon.round) : 0;
      const diff =
        weapon.avgDamage === null || weapon.round <= 0
          ? null
          : Math.round(shownDamage - weapon.avgDamage);

      if (weapon.raitPerc !== null) row.cells[1] = formatRating(weapon.raitPerc);

      rows.push({
        ...row,
        keys: parts.map((part) => part.key),
        stars: weapon.raitStar,
        rating: weapon.raitPerc,
        delta: diff === null ? "" : String(Math.abs(diff)),
        deltaKind: diff === null ? null : diff < 0 ? "down" : "up",
      });
    }
  }

  prefetchWeaponImages(images);

  return { headers: STAT_HEADERS, rows };
};

const cell = (
  text: string,
  extra: Partial<CrossoutLogCell> = {},
): CrossoutLogCell => ({
  text,
  colSpan: 1,
  rowSpan: 1,
  cls: "",
  weapon: "",
  image: "",
  images: [],
  destroyed: false,
  ...extra,
});

const blankSide = (): CrossoutLogCell[] => [cell(""), cell(""), cell(""), cell("")];

const sideCells = (
  player: ApiRoundPlayer | undefined,
  side: "left" | "right",
  weaponName: string,
  pictures: { src: string; name: string; key: string }[] = [],
): CrossoutLogCell[] => {
  if (!player) return blankSide();

  const tone = player.color;
  const nameAlign = side === "left" ? "alignleft" : "alignright";
  const weaponAlign = side === "left" ? "alignright" : "alignleft";
  const nick = cell(player.nick, {
    cls: [tone, nameAlign, "nick"].filter(Boolean).join(" "),
    destroyed: player.death > 0,
  });
  const weapon = cell(weaponName, {
    cls: [tone, weaponAlign].filter(Boolean).join(" "),
    weapon: weaponName,
    image: pictures[0]?.src ?? "",
    images: pictures.map((picture) => ({
      src: picture.src,
      name: picture.name,
      destroyed: false,
    })),
    keys: pictures.map((picture) => picture.key),
  });
  const damage = cell(String(player.damage), { cls: tone });
  const frag = cell(String(player.kill), { cls: tone });

  return side === "left"
    ? [nick, weapon, damage, frag]
    : [frag, damage, weapon, nick];
};

const clock = (seconds: number): string => {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;

  return `${minutes}:${String(rest).padStart(2, "0")}`;
};

const dayStamp = (unix: number): string => {
  const date = new Date(unix * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

const timeLabel = (unix: number): string => {
  const date = new Date(unix * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${pad(date.getHours())}:${pad(date.getMinutes())}, ${dayStamp(unix)}`;
};

const buildRows = (
  battles: { battle: ApiBattle; index: number }[],
  names: DataAllCache,
  language: CrossoutLanguage,
): CrossoutLogRow[] => {
  if (battles.length === 0) return [];

  const header: CrossoutLogRow = {
    cls: "sticDiv",
    map: "",
    battle: null,
    cells: [
      cell("Команда 1"),
      cell("Вооружение"),
      cell("Урон"),
      cell("Фраг"),
      cell("Раунд"),
      cell("Фраг"),
      cell("Урон"),
      cell("Вооружение", { cls: "alignright" }),
      cell("Команда 2", { cls: "alignright" }),
    ],
  };

  const rows: CrossoutLogRow[] = [header];
  const images: string[] = [];

  for (const { battle, index } of battles) {
    const mapName = battle.map
      ? translateKey(names, language, "maps", battle.map)
      : "";
    const seconds = battle.rounds.reduce((sum, round) => sum + round.seconds, 0);
    const plays = battle.rounds.flatMap((round) =>
      [...round.left, ...round.right].map((player) => {
        const keys = weaponKeys(player.weapon);

        return {
          nick: player.nick,
          weapon: player.weapon,
          keys,
          images: (keys.length > 0 ? keys : []).map((key) => weaponImageSrc(key)),
          damage: player.damage,
          kill: player.kill,
          death: player.death,
          win: player.win,
          party: player.party,
        };
      }),
    );

    rows.push({
      cls: "",
      map: mapName,
      mapKey: battle.map,
      battle: {
        index,
        map: mapName,
        mapKey: battle.map,
        duration: clock(seconds),
        at: battle.date,
        plays,
      },
      cells: [cell("", { colSpan: 9 })],
    });

    for (const round of battle.rounds) {
      const height = Math.max(round.left.length, round.right.length, 1);

      for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
        const leftPlayer = round.left[rowIndex];
        const rightPlayer = round.right[rowIndex];
        const picturesOf = (raw: string) => {
          const keys = weaponKeys(raw);

          return (keys.length > 0 ? keys : raw ? [raw] : []).map((key) => {
            images.push(key);

            return {
              src: weaponImageSrc(key),
              name: translateKey(names, language, "weapons", key),
              key,
            };
          });
        };
        const leftPictures = picturesOf(leftPlayer?.weapon ?? "");
        const rightPictures = picturesOf(rightPlayer?.weapon ?? "");
        const left = sideCells(
          leftPlayer,
          "left",
          leftPictures.map((picture) => picture.name).join(", "),
          leftPictures,
        );
        const right = sideCells(
          rightPlayer,
          "right",
          rightPictures.map((picture) => picture.name).join(", "),
          rightPictures,
        );
        const middle =
          rowIndex === 0
            ? [cell(round.round > 0 ? String(round.round) : "", { rowSpan: height })]
            : [];

        rows.push({
          cls: "",
          map: mapName,
          mapKey: battle.map,
          battle: null,
          cells: [...left, ...middle, ...right],
        });
      }
    }
  }

  prefetchWeaponImages(images);

  return rows;
};

const buildTimes = (battles: ApiBattle[]): CrossoutLogTime[] => {
  const seen = new Set<number>();

  return battles
    .flatMap((battle) => {
      if (battle.date <= 0 || seen.has(battle.date)) return [];

      seen.add(battle.date);

      return [{ at: battle.date, label: timeLabel(battle.date) }];
    })
    .sort((left, right) => left.at - right.at);
};

const failureOf = (error: unknown): { code: CrossoutErrorCode; message: string } => {
  if (error instanceof LogApiError) {
    return { code: error.code, message: error.message };
  }

  return {
    code: "server",
    message: error instanceof Error ? error.message : "Сервис crossout-info вернул ошибку.",
  };
};

export const loadCrossoutLog = async (
  logId: string,
  _language: CrossoutLanguage = "ru",
): Promise<CrossoutLogSummaryResult> => {
  const id = logId.trim();

  if (!LOG_ID_PATTERN.test(id)) {
    return summaryFailure("invalid-log-id", "Некорректный идентификатор лога.");
  }

  try {
    const payload = await fetchJson(`log_${id}/type`);
    const result = asRecord(payload.result);

    if (!result) {
      return summaryFailure(
        "unexpected-response",
        "Сервис вернул неожиданный ответ.",
      );
    }

    const types: CrossoutLogTypeOption[] = Object.entries(result)
      .flatMap(([key, count]) => {
        const slug = key.trim().toLowerCase().replace(/[\s-]+/g, "_");
        const battles = asCount(count);

        if (!LOG_TYPE_PATTERN.test(slug) || battles <= 0) return [];

        return [{ key: slug, label: key.trim().toUpperCase(), count: battles }];
      })
      .sort((left, right) => {
        const leftIndex = TYPE_ORDER.indexOf(left.key);
        const rightIndex = TYPE_ORDER.indexOf(right.key);

        return (leftIndex < 0 ? TYPE_ORDER.length : leftIndex) -
          (rightIndex < 0 ? TYPE_ORDER.length : rightIndex);
      });

    return {
      ok: true,
      summary: {
        logId: id,
        nickname: "",
        title: "",
        types,
      },
    };
  } catch (error) {
    const failure = failureOf(error);

    return summaryFailure(failure.code, failure.message);
  }
};

export const loadCrossoutLogTable = async (
  logId: string,
  type: string,
  language: CrossoutLanguage = "ru",
  expectedBattles = 0,
  range?: { from: number; to: number } | null,
): Promise<CrossoutLogTableResult> => {
  const id = logId.trim();
  const slug = type.trim().toLowerCase();
  const from = Math.trunc(range?.from ?? 0);
  const to = Math.trunc(range?.to ?? 0);
  const hasRange = from > 0 && to > 0;

  if (!LOG_ID_PATTERN.test(id) || !LOG_TYPE_PATTERN.test(slug)) {
    return tableFailure("invalid-log-id", "Некорректный идентификатор лога.");
  }

  const names = await loadDataAll();
  let lastError: unknown = null;
  let best: CrossoutLogTable | null = null;
  let partial: CrossoutLogTable | null = null;

  for (const baseUrl of await getBaseUrls()) {
    try {
      const payload = await fetchJsonAt(baseUrl, `log_${id}/${slug}`);
      const result = asRecord(payload.result);

      if (!result) {
        throw new LogApiError(
          "unexpected-response",
          "Сервис вернул неожиданный ответ.",
        );
      }

      const log = asRecord(result.log);
      const battles = readBattles(result.map, log?.sharedBattle);
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      const visible = battles.flatMap((battle, index) => {
        if (hasRange && (battle.date < start || battle.date > end)) return [];

        return [{ battle, index: index + 1 }];
      });
      const nickname = asText(log?.nick);
      const uploaded = asCount(log?.time);
      const players = readPlayers(result.battles);
      const table: CrossoutLogTable = {
        type: slug,
        date: uploaded > 0 ? dayStamp(uploaded) : "",
        times: buildTimes(battles),
        stats: buildStats(
          players,
          names,
          language,
          partyAllies(players, nickname, log?.sharedBattle),
          nickname,
        ),
        rows: buildRows(visible, names, language),
        nickname,
        partyGrouped: true,
      };

      if (expectedBattles > 0 && !hasRange && battles.length < expectedBattles) {
        noteCrossoutHost(baseUrl);
        partial = table;
        lastError = new LogApiError(
          "unexpected-response",
          "Сервис вернул неполную таблицу боя.",
        );
        continue;
      }

      noteCrossoutHost(baseUrl);
      best = table;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (best) return { ok: true, table: best };
  if (partial?.stats) return { ok: true, table: partial };

  const failure = failureOf(lastError);

  return tableFailure(failure.code, failure.message);
};
