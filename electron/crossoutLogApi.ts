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
    throw new LogApiError(
      "unexpected-response",
      "Сервис вернул неожиданный ответ.",
    );
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

          return [{ key, ...readTotals(weapon) }];
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

  return {
    nick,
    team: asText(record.team),
    weapon: asText(record.weapon),
    kill: asCount(record.kill),
    damage: asCount(record.damage),
    death: asCount(record.death),
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
      const date = asCount(record?.date);

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

/** Same non-zero party id as the log owner. Teammates from matchmaking stay outside. */
const partyAllies = (players: ApiPlayer[], owner: string): Set<string> => {
  const ownerKey = owner.trim().toLowerCase();
  const ownerPlayer = players.find(
    (player) => player.name.trim().toLowerCase() === ownerKey,
  );
  const party = ownerPlayer?.party ?? 0;
  const allies = new Set<string>();

  if (ownerKey) allies.add(ownerKey);

  if (party !== 0) {
    for (const player of players) {
      if (player.party === party) allies.add(player.name.trim().toLowerCase());
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
): CrossoutLogStat | null => {
  if (players.length === 0) return null;

  const teamOf = (name: string): "green" | "red" =>
    allies.has(name.trim().toLowerCase()) ? "green" : "red";

  const ordered = [...players].sort((left, right) => {
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
      rows.push({
        ...statRow(
          "weapon",
          weaponName,
          weaponName,
          team,
          weapon,
          parts.map((part) => weaponImageSrc(part.key)).filter(Boolean),
        ),
        keys: parts.map((part) => part.key),
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

    rows.push({
      cls: "",
      map: mapName,
      mapKey: battle.map,
      battle: {
        index,
        map: mapName,
        mapKey: battle.map,
        duration: clock(seconds),
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

      if (expectedBattles > 0 && !hasRange && battles.length < expectedBattles) {
        lastError = new LogApiError(
          "unexpected-response",
          "Сервис вернул неполную таблицу боя.",
        );
        continue;
      }

      const start = Math.min(from, to);
      const end = Math.max(from, to);
      const visible = battles.flatMap((battle, index) => {
        if (hasRange && (battle.date < start || battle.date > end)) return [];

        return [{ battle, index: index + 1 }];
      });
      const nickname = asText(log?.nick);
      const uploaded = asCount(log?.time);
      const table: CrossoutLogTable = {
        type: slug,
        date: uploaded > 0 ? dayStamp(uploaded) : "",
        times: buildTimes(battles),
        stats: buildStats(
          readPlayers(result.battles),
          names,
          language,
          partyAllies(readPlayers(result.battles), nickname),
        ),
        rows: buildRows(visible, names, language),
        nickname,
      };

      noteCrossoutHost(baseUrl);
      best = table;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (best) return { ok: true, table: best };

  const failure = failureOf(lastError);

  return tableFailure(failure.code, failure.message);
};
