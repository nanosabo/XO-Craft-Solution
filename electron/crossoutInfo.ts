import { app } from "electron";
import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";
import FormData from "form-data";
import {
  CROSSOUT_BATTLE_TYPES,
  type CrossoutBattle,
  type CrossoutBattleType,
  type CrossoutBattlesResult,
  type CrossoutErrorCode,
  type CrossoutFetchBattlesParams,
  type CrossoutLogCell,
  type CrossoutLogRow,
  type CrossoutLogStat,
  type CrossoutLogStatRow,
  type CrossoutLogSummaryResult,
  type CrossoutLogTable,
  type CrossoutLogTableResult,
  type CrossoutLogTime,
  type CrossoutUploadLogParams,
  type CrossoutUploadLogResult,
  type CrossoutUploadProgress,
} from "../src/types/crossout";
import {
  extractCrossoutPage,
  loadCrossoutPage,
} from "./crossoutBrowser";
import {
  translateCrossoutWeaponName,
  translateCrossoutWeaponNameToEnglish,
} from "./crossoutNames";

const RU_HOST = "https://crossout-info.com";
const EN_HOST = "https://en.crossout-info.com";

export type CrossoutLanguage = "ru" | "en";

type WeaponTranslator = (name: string) => Promise<string>;

/**
 * The English interface prefers the English subdomain, but its battle API
 * truncates responses larger than ~256 KB, so the Russian host is kept as a
 * fallback. The Russian interface prefers the main domain and falls back to the
 * English mirror when the main domain is unavailable.
 */
const getBaseUrls = (language: CrossoutLanguage): string[] =>
  language === "en" ? [EN_HOST, RU_HOST] : [RU_HOST, EN_HOST];

const getWeaponTranslator = (
  language: CrossoutLanguage,
  baseUrl: string,
): WeaponTranslator | null => {
  if (language === "ru" && baseUrl === EN_HOST) {
    return translateCrossoutWeaponName;
  }

  if (language === "en" && baseUrl === RU_HOST) {
    return translateCrossoutWeaponNameToEnglish;
  }

  return null;
};
const API_VERSION = "api_ver1";
const UPLOAD_TIMEOUT = 120_000;
const MAX_RANGE_DAYS = 7;
const MAX_LOG_BYTES = 64 * 1024 * 1024;
const CONFIG_PATH = path.join(app.getPath("userData"), "crossout-info.json");
const USER_AGENT = `XO-Craft-Solution/${app.getVersion()}`;
const DEFAULT_API_KEY = "7b60878e44dcb651176061e2c0a67ea4";
const LOG_ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;
const LOG_TYPE_PATTERN = /^[a-z0-9_-]{1,32}$/;

interface CrossoutInfoConfig {
  apiKey?: string;
}

/**
 * The key is public and can be overridden without editing the source: in
 * development through .env.local, at runtime through CROSSOUT_INFO_API_KEY,
 * or from userData/crossout-info.json.
 */
const readDevEnv = (): Record<string, string> => {
  if (app.isPackaged) return {};

  try {
    const text = fs.readFileSync(
      path.join(process.cwd(), ".env.local"),
      "utf8",
    );
    const values: Record<string, string> = {};

    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);

      if (!match) continue;

      values[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
    }

    return values;
  } catch {
    return {};
  }
};

const readConfig = (): CrossoutInfoConfig => {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

    return parsed && typeof parsed === "object"
      ? (parsed as CrossoutInfoConfig)
      : {};
  } catch {
    return {};
  }
};

export const getCrossoutApiKey = (): string | null => {
  const envKey = process.env.CROSSOUT_INFO_API_KEY?.trim();

  if (envKey) return envKey;

  const devKey = readDevEnv().CROSSOUT_INFO_API_KEY?.trim();

  if (devKey) return devKey;

  const configKey = readConfig().apiKey?.trim();

  return configKey || DEFAULT_API_KEY;
};

/**
 * Lets the user provide a key without editing files by hand. The key is stored
 * in the application's user data folder, never in the repository.
 */
export const saveCrossoutApiKey = (apiKey: string): boolean => {
  const value = apiKey.trim();

  if (!value) return false;

  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ apiKey: value }, null, 2));

    return true;
  } catch {
    return false;
  }
};

export const clearCrossoutApiKey = (): boolean => {
  try {
    fs.rmSync(CONFIG_PATH, { force: true });

    return true;
  } catch {
    return false;
  }
};

const DATE_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;

const parseDate = (value: string): Date | null => {
  const match = DATE_PATTERN.exec(value.trim());

  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const rangeInDays = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;

const asString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";

  return String(value);
};

const asNumber = (value: unknown): number => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const battlesFailure = (
  code: CrossoutErrorCode,
  message: string,
): CrossoutBattlesResult => ({
  battles: [],
  error: message,
  errorCode: code,
});

const uploadFailure = (
  code: CrossoutErrorCode,
  message: string,
): CrossoutUploadLogResult => ({
  ok: false,
  error: message,
  errorCode: code,
});

const createUploadTracker = (
  total: number,
  onProgress?: (progress: CrossoutUploadProgress) => void,
) => {
  let transferred = 0;
  let lastBytes = 0;
  let lastAt = Date.now();
  let bytesPerSecond = 0;
  let lastEmit = 0;

  const emit = (
    phase: CrossoutUploadProgress["phase"],
    force = false,
  ) => {
    if (!onProgress) return;

    const now = Date.now();

    if (!force && phase === "uploading" && now - lastEmit < 120) return;

    const elapsed = (now - lastAt) / 1000;

    if (elapsed >= 0.2 && transferred !== lastBytes) {
      bytesPerSecond = Math.max(0, (transferred - lastBytes) / elapsed);
      lastBytes = transferred;
      lastAt = now;
    }

    lastEmit = now;

    onProgress({
      phase,
      percent:
        phase === "processing"
          ? 100
          : total > 0
            ? Math.min(99, Math.round((transferred / total) * 100))
            : 0,
      transferred: phase === "processing" ? total : transferred,
      total,
      bytesPerSecond: Math.round(bytesPerSecond),
    });
  };

  return {
    start: () => emit("uploading", true),
    chunk: (size: number) => {
      transferred += size;
      emit("uploading");
    },
    done: () => {
      transferred = total;
      emit("processing", true);
    },
  };
};

const logSummaryFailure = (
  code: CrossoutErrorCode,
  message: string,
): CrossoutLogSummaryResult => ({
  ok: false,
  error: message,
  errorCode: code,
});

const logTableFailure = (
  code: CrossoutErrorCode,
  message: string,
): CrossoutLogTableResult => ({
  ok: false,
  error: message,
  errorCode: code,
});

const normalizeBattle = (value: unknown): CrossoutBattle | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;

  return {
    nickname: asString(raw.nickname),
    important: asNumber(raw.important),
    ur: asNumber(raw.ur),
    damage: asNumber(raw.damage),
    kill: asNumber(raw.kill),
    death: asNumber(raw.death),
    score: asNumber(raw.score),
    tank: asNumber(raw.tank),
    weapon: asString(raw.weapon),
    win: asNumber(raw.win),
    party: asNumber(raw.party),
    timebattle: asNumber(raw.timebattle),
    type: asString(raw.type),
    battle_id: asNumber(raw.battle_id),
    teams: asNumber(raw.teams),
    map: asString(raw.map),
    date: asNumber(raw.date),
  };
};

const normalizeResponse = (data: unknown): CrossoutBattlesResult => {
  if (!data || typeof data !== "object") {
    return battlesFailure(
      "unexpected-response",
      "Сервис вернул неожиданный ответ.",
    );
  }

  const payload = data as Record<string, unknown>;
  const rawError = payload.error;
  const error =
    typeof rawError === "string" && rawError.trim()
      ? rawError.trim()
      : rawError && typeof rawError === "number"
        ? String(rawError)
        : null;

  const rawResult = payload.result;
  const items = Array.isArray(rawResult)
    ? rawResult
    : rawResult && typeof rawResult === "object"
      ? [rawResult]
      : [];

  const battles = items
    .map(normalizeBattle)
    .filter((battle): battle is CrossoutBattle => battle !== null);

  const serviceError = error && error !== "0" ? error : null;

  return {
    battles,
    error: serviceError,
    errorCode: serviceError ? "server" : null,
  };
};

interface CrossoutFailure {
  code: CrossoutErrorCode;
  message: string;
}

class CrossoutServiceError extends Error {
  readonly code: CrossoutErrorCode;

  constructor(code: CrossoutErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const describeError = (error: unknown): CrossoutFailure => {
  if (error instanceof CrossoutServiceError) {
    return { code: error.code, message: error.message };
  }

  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) {
      return {
        code: "forbidden",
        message:
          "Сервис отклонил запрос (403). Проверьте API-ключ и доступ к crossout-info.com.",
      };
    }

    if (!error.response) {
      return { code: "network", message: error.message };
    }

    const data = error.response.data;

    if (typeof data === "string" && data.trim() && data.trim() !== "Forbidden") {
      return { code: "server", message: data.trim() };
    }

    return { code: "server", message: error.message };
  }

  return {
    code: "server",
    message: error instanceof Error ? error.message : String(error),
  };
};

const isForbiddenText = (text: string): boolean =>
  text.trim().toLowerCase() === "forbidden";

/**
 * crossout-info is occasionally unreachable from some regions. The English
 * subdomain mirrors the same API, so a blocked or failed request is retried
 * there before the error is reported.
 */
const shouldTryNextHost = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return true;
  if (!error.response) return true;

  return [403, 429, 500, 502, 503, 504].includes(error.response.status);
};

const translateBattles = async (
  battles: CrossoutBattle[],
  translate: WeaponTranslator,
): Promise<CrossoutBattle[]> => {
  const unique = new Set(
    battles.map((battle) => battle.weapon).filter((weapon) => Boolean(weapon)),
  );
  const translations = new Map<string, string>();

  for (const weapon of unique) {
    translations.set(weapon, await translate(weapon));
  }

  return battles.map((battle) => {
    const translated = translations.get(battle.weapon);

    return translated && translated !== battle.weapon
      ? { ...battle, weapon: translated }
      : battle;
  });
};

const translateLogStatRow = async (
  row: CrossoutLogStatRow,
  translate: WeaponTranslator,
): Promise<CrossoutLogStatRow> => {
  if (row.kind !== "weapon") return row;

  const cells = row.cells.length > 0 ? [...row.cells] : [];

  if (cells[0]) {
    cells[0] = await translate(cells[0]);
  }

  return {
    ...row,
    name: await translate(row.name),
    weapon: await translate(row.weapon || row.name),
    cells,
  };
};

const translateLogTable = async (
  table: CrossoutLogTable,
  translate: WeaponTranslator,
): Promise<CrossoutLogTable> => {
  const stats = table.stats
    ? {
        ...table.stats,
        rows: await Promise.all(
          table.stats.rows.map((row) => translateLogStatRow(row, translate)),
        ),
      }
    : null;

  const rows = await Promise.all(
    table.rows.map(async (row) => ({
      ...row,
      cells: await Promise.all(
        row.cells.map(async (cell) => {
          if (cell.images.length === 0 && !cell.weapon) return cell;

          const images = await Promise.all(
            cell.images.map(async (item) => ({
              ...item,
              name: item.name ? await translate(item.name) : item.name,
            })),
          );

          return {
            ...cell,
            images,
            weapon: images.find((item) => item.name)?.name || cell.weapon,
          };
        }),
      ),
    })),
  );

  return { ...table, stats, rows };
};

export const fetchCrossoutBattles = async (
  params: CrossoutFetchBattlesParams,
  language: CrossoutLanguage = "ru",
): Promise<CrossoutBattlesResult> => {
  const apiKey = getCrossoutApiKey();

  if (!apiKey) {
    return battlesFailure("no-key", "Не задан API-ключ crossout-info.");
  }

  const type = params.type.toUpperCase() as CrossoutBattleType;

  if (!CROSSOUT_BATTLE_TYPES.some((option) => option.value === type)) {
    return battlesFailure("unknown-type", "Неизвестный тип боя.");
  }

  const from = parseDate(params.from);

  if (!from) {
    return battlesFailure("invalid-from", "Некорректная дата начала.");
  }

  const to = params.to ? parseDate(params.to) : null;

  if (params.to && !to) {
    return battlesFailure("invalid-to", "Некорректная дата окончания.");
  }

  if (to) {
    if (to.getTime() < from.getTime()) {
      return battlesFailure(
        "to-before-from",
        "Дата окончания раньше даты начала.",
      );
    }

    if (rangeInDays(from, to) > MAX_RANGE_DAYS) {
      return battlesFailure("range-too-long", "Максимальный период — 7 дней.");
    }
  }

  const path = [
    API_VERSION,
    encodeURIComponent(apiKey),
    `battles_${type.toLowerCase()}`,
    ...(params.excludeMap ? [encodeURIComponent(params.excludeMap)] : []),
    encodeURIComponent(params.from),
    ...(params.to ? [encodeURIComponent(params.to)] : []),
  ].join("/");

  let lastError: unknown = null;

  for (const baseUrl of getBaseUrls(language)) {
    try {
      const page = await loadCrossoutPage(`${baseUrl}/${path}`);
      const text = page.text.trim();

      if (isForbiddenText(text)) {
        lastError = new CrossoutServiceError(
          "forbidden",
          "Сервис отклонил запрос (403). Проверьте API-ключ и доступ к crossout-info.com.",
        );
        continue;
      }

      if (!text.startsWith("{") && !text.startsWith("[")) {
        lastError = new CrossoutServiceError(
          "unexpected-response",
          "Сервис вернул неожиданный ответ.",
        );
        continue;
      }

      let data: unknown;

      try {
        data = JSON.parse(text);
      } catch {
        lastError = new CrossoutServiceError(
          "unexpected-response",
          "Сервис вернул неожиданный ответ.",
        );
        continue;
      }

      const result = normalizeResponse(data);
      const translate = getWeaponTranslator(language, baseUrl);

      if (!translate) return result;

      const battles = await translateBattles(result.battles, translate);

      return { ...result, battles };
    } catch (error) {
      lastError = error;
    }
  }

  const failure = describeError(lastError);

  return battlesFailure(failure.code, failure.message);
};

const timezoneOffset = (): string => {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");

  return `${sign}${hours}${minutes}`;
};

export const uploadCrossoutLog = async (
  params: CrossoutUploadLogParams,
  language: CrossoutLanguage = "ru",
  onProgress?: (progress: CrossoutUploadProgress) => void,
): Promise<CrossoutUploadLogResult> => {
  const filePath = params.filePath.trim();

  if (!filePath) {
    return uploadFailure("no-file", "Не выбран файл лога.");
  }

  if (path.basename(filePath).toLowerCase() !== "combat.log") {
    return uploadFailure(
      "wrong-file",
      "Выбран не тот файл. Нужен combat.log.",
    );
  }

  try {
    const stats = await fs.promises.stat(filePath);

    if (!stats.isFile()) {
      return uploadFailure("not-a-file", "Указанный путь не является файлом.");
    }

    if (stats.size > MAX_LOG_BYTES) {
      return uploadFailure("file-too-large", "Файл лога слишком большой.");
    }
  } catch {
    return uploadFailure("file-not-found", "Файл лога не найден.");
  }

  const query = new URLSearchParams();
  const nickname = params.nickname.trim();

  if (nickname) query.set("nick", nickname);

  query.set("zone", timezoneOffset());

  let file: Buffer;

  try {
    file = await fs.promises.readFile(filePath);
  } catch {
    return uploadFailure("file-read", "Не удалось прочитать файл лога.");
  }

  let lastError: unknown = null;

  for (const baseUrl of getBaseUrls(language)) {
    const form = new FormData();

    form.append("file", file, {
      filename: "combat.log",
      knownLength: file.length,
      contentType: "text/plain",
    });

    let total = file.length;

    try {
      total = form.getLengthSync();
    } catch {
      total = file.length;
    }

    const tracker = createUploadTracker(total, onProgress);
    // Count bytes as axios reads the multipart body, then mark the log as
    // processing once that body has been handed to the socket.
    const body = new Transform({
      transform(chunk, _encoding, callback) {
        const size = Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(String(chunk));

        tracker.chunk(size);
        callback(null, chunk);
      },
      flush(callback) {
        tracker.done();
        callback();
      },
    });

    tracker.start();
    form.pipe(body);

    try {
      const response = await axios.post<string>(
        `${baseUrl}/public/autoUploadLog.php?${query.toString()}`,
        body,
        {
          headers: {
            ...form.getHeaders(),
            "Content-Length": String(total),
            Accept: "text/plain",
            "User-Agent": USER_AGENT,
          },
          timeout: UPLOAD_TIMEOUT,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      const logId = String(response.data ?? "").trim();

      if (!logId) {
        return uploadFailure(
          "empty-log-id",
          "Сервис не вернул идентификатор лога.",
        );
      }

      if (!LOG_ID_PATTERN.test(logId)) {
        return uploadFailure(
          "server",
          `Сервис вернул неожиданный ответ: ${logId.slice(0, 200)}`,
        );
      }

      return { ok: true, logId, logUrl: `${baseUrl}/log/${logId}` };
    } catch (error) {
      body.destroy();
      form.destroy();
      lastError = error;

      if (!shouldTryNextHost(error)) break;
    }
  }

  const failure = describeError(lastError);

  return uploadFailure(failure.code, failure.message);
};

interface RawLogType {
  key?: unknown;
  label?: unknown;
  count?: unknown;
}

interface RawLogSummary {
  forbidden?: unknown;
  title?: unknown;
  nickname?: unknown;
  types?: unknown;
}

interface RawLogCell {
  text?: unknown;
  colSpan?: unknown;
  rowSpan?: unknown;
  cls?: unknown;
  weapon?: unknown;
  image?: unknown;
  images?: unknown;
  destroyed?: unknown;
}

interface RawLogBattle {
  index?: unknown;
  map?: unknown;
  duration?: unknown;
}

interface RawLogRow {
  cells?: unknown;
  map?: unknown;
  cls?: unknown;
  battle?: unknown;
}

interface RawLogStatRow {
  kind?: unknown;
  name?: unknown;
  weapon?: unknown;
  image?: unknown;
  images?: unknown;
  stars?: unknown;
  team?: unknown;
  damage?: unknown;
  delta?: unknown;
  deltaKind?: unknown;
  cells?: unknown;
}

interface RawLogStat {
  headers?: unknown;
  rows?: unknown;
}

interface RawLogTime {
  at?: unknown;
  label?: unknown;
}

interface RawLogTable {
  forbidden?: unknown;
  date?: unknown;
  times?: unknown;
  rows?: unknown;
  stats?: unknown;
}

const LOG_SUMMARY_SCRIPT = `(() => {
  const bodyText = document.body ? document.body.innerText.trim() : "";
  if (bodyText === "Forbidden") return { forbidden: true };

  const anchors = Array.from(document.querySelectorAll('a.button[href*="/log/"]'));
  const types = anchors.map((anchor) => {
    const href = anchor.getAttribute("href") || "";
    const parts = href.split("/").filter(Boolean);
    const key = parts[parts.length - 1] || "";
    const countNode = anchor.querySelector(".bold.black");
    const labelNode = anchor.querySelector(".bold.roboto.s18");
    return {
      key,
      label: labelNode ? labelNode.textContent.trim() : "",
      count: countNode ? parseInt(countNode.textContent.trim(), 10) || 0 : 0
    };
  }).filter((type) => type.key && type.key !== "log");

  const title = document.title || "";
  const match = title.match(/игрока\\s+(.+)$/i) || title.match(/player\\s+(.+)$/i);

  return {
    forbidden: false,
    title,
    nickname: match ? match[1].trim() : "",
    types
  };
})()`;

const LOG_TABLE_SCRIPT = `(() => {
  const bodyText = document.body ? document.body.innerText.trim() : "";
  if (bodyText === "Forbidden") return { forbidden: true };

  const absoluteUrl = (value) => {
    if (!value) return "";
    try {
      return new URL(value, location.origin).href;
    } catch {
      return value;
    }
  };

  const cellText = (span) => {
    const parts = Array.from(span.children).filter((child) => child.tagName === "SPAN");
    if (parts.length > 1) {
      return parts
        .map((part) => (part.innerText || part.textContent || "").replace(/\\s+/g, " ").trim())
        .filter(Boolean)
        .join(" ");
    }
    return (span.innerText || span.textContent || "").replace(/\\s+/g, " ").trim();
  };

  const readImages = (root) => {
    const images = [];
    const push = (src, name, destroyed) => {
      const url = absoluteUrl(src || "");
      if (!url) return;
      images.push({
        src: url,
        name: (name || "").replace(/\\s+/g, " ").trim(),
        destroyed: Boolean(destroyed)
      });
    };

    root.querySelectorAll("img").forEach((img) => {
      push(
        img.getAttribute("src") || img.getAttribute("data-src") || "",
        img.getAttribute("title") || img.getAttribute("alt") || "",
        img.classList.contains("trought") || Boolean(img.closest(".trought"))
      );
    });

    root.querySelectorAll(".imgweap").forEach((node) => {
      if (node.querySelector("img")) return;
      const match = /url\\(["']?([^"')]+)["']?\\)/.exec(
        window.getComputedStyle(node).backgroundImage || ""
      );
      if (match) push(match[1], node.getAttribute("title") || "", node.classList.contains("trought"));
    });

    return images;
  };

  const statsNode = document.querySelector("div.stat");
  let stats = null;
  if (statsNode) {
    const headerNode = Array.from(statsNode.children).find((child) => child.classList.contains("sticDiv"));
    const headers = headerNode
      ? Array.from(headerNode.children)
          .filter((child) => child.tagName === "SPAN")
          .map(cellText)
      : [];
    const statRows = [];
    let currentTeam = "";
    for (const row of Array.from(statsNode.children)) {
      const body = row.querySelector(".statBody");
      const isPlayer = Boolean(row.getAttribute("data-nickprofile"));
      const isWeapon = row.getAttribute("data-edite") === "getWeaponData";
      if (!isPlayer && !isWeapon) continue;
      const bodyRow = body ? body.querySelector(".row") : null;
      const spans = bodyRow
        ? Array.from(bodyRow.children).filter((child) => child.tagName === "SPAN")
        : [];
      const cells = spans
        .filter((span) => !span.className.includes("imgweap"))
        .map(cellText);
      if (isPlayer) {
        const teamMatch = body ? body.className.match(/red|green/) : null;
        currentTeam = teamMatch ? teamMatch[0] : "";
      }
      const images = isWeapon ? readImages(row).map((item) => item.src) : [];
      const img = images[0] || "";
      const starRect = row.querySelector(".div-star-mask rect");
      const starWidth = starRect ? parseFloat(starRect.getAttribute("width") || "") : NaN;
      const afterData = Array.from(row.querySelectorAll(".afterData"));
      const deltaNode = afterData.length > 1 ? afterData[afterData.length - 1] : null;
      const delta = deltaNode ? (deltaNode.textContent || "").replace(/\\s+/g, " ").trim() : "";
      const deltaKind = deltaNode
        ? deltaNode.className.includes("igreen")
          ? "up"
          : deltaNode.className.includes("ired")
            ? "down"
            : delta.startsWith("-")
              ? "down"
              : delta
                ? "up"
                : null
        : null;
      const damageNode = deltaNode ? deltaNode.parentElement : null;
      const damage = isWeapon && damageNode
        ? Array.from(damageNode.childNodes)
            .filter((node) => node.nodeType === 3)
            .map((node) => node.textContent || "")
            .join(" ")
            .replace(/\\s+/g, " ")
            .trim()
        : (cells[3] || "");
      statRows.push({
        kind: isPlayer ? "player" : "weapon",
        name: isPlayer
          ? (row.getAttribute("data-nick") || cells[0] || "")
          : (row.getAttribute("data-weaponfind") || cells[0] || ""),
        weapon: isWeapon
          ? (row.getAttribute("data-weaponfind") || cells[0] || "")
          : "",
        image: img,
        images,
        stars: isWeapon && Number.isFinite(starWidth)
          ? Math.max(0, Math.min(100, starWidth))
          : null,
        team: currentTeam,
        damage,
        delta: isWeapon ? delta : "",
        deltaKind: isWeapon ? deltaKind : null,
        cells
      });
    }
    stats = { headers, rows: statRows };
  }

  const table = document.querySelector("table.maps");
  const rows = table ? Array.from(table.rows).map((row) => {
    const cells = Array.from(row.cells).map((cell) => {
      const images = readImages(cell);
      const first = images[0];
      return {
        text: (cell.innerText || "").replace(/\\s+/g, " ").trim(),
        colSpan: cell.colSpan || 1,
        rowSpan: cell.rowSpan || 1,
        cls: cell.className || "",
        weapon: first ? first.name : "",
        image: first ? first.src : "",
        images,
        destroyed: images.length
          ? images.every((item) => item.destroyed)
          : Boolean(cell.querySelector(".trought"))
      };
    });

    const headerCell = cells.length === 1 && cells[0].colSpan > 1 ? cells[0] : null;
    const headerText = headerCell ? headerCell.text : "";
    const battleMatch = headerText.match(/(?:Бой|Battle)\\s*#(\\d+)\\s*\\|\\s*(?:Карта|Map):\\s*(.+?)\\s*\\|\\s*(?:Время боя|Battle time):\\s*(.+)$/i);

    return {
      cells,
      map: row.getAttribute("data-maps") || "",
      cls: row.className || "",
      battle: battleMatch
        ? {
            index: parseInt(battleMatch[1], 10) || 0,
            map: battleMatch[2].trim(),
            duration: battleMatch[3].trim()
          }
        : null
    };
  }).filter((row) => row.cells.length > 0).slice(0, 3000) : [];

  const dateNode = document.querySelector(".grays.bold400.roboto");
  const dateMatch = dateNode ? (dateNode.textContent || "").match(/\\d{2}\\.\\d{2}\\.\\d{4}/) : null;
  const fromSelect = document.querySelector('select[name="t_from"]');
  const times = fromSelect
    ? Array.from(fromSelect.options).map((option) => ({
        at: parseInt(option.value, 10) || 0,
        label: (option.textContent || "").replace(/\\s+/g, " ").trim()
      })).filter((item) => item.at > 0 && item.label)
    : [];

  return {
    forbidden: false,
    date: dateMatch ? dateMatch[0] : "",
    times,
    rows,
    stats
  };
})()`;

const normalizeLogImages = (value: unknown): CrossoutLogCell["images"] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const raw = item as { src?: unknown; name?: unknown; destroyed?: unknown };
    const src = asString(raw.src).trim();

    if (!src) return [];

    return [
      {
        src,
        name: asString(raw.name).trim(),
        destroyed: Boolean(raw.destroyed),
      },
    ];
  });
};

const normalizeLogCell = (value: unknown): CrossoutLogCell | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as RawLogCell;
  const image = asString(raw.image).trim();
  const weapon = asString(raw.weapon).trim();
  const images = normalizeLogImages(raw.images);

  if (images.length === 0 && image) {
    images.push({ src: image, name: weapon, destroyed: Boolean(raw.destroyed) });
  }

  return {
    text: asString(raw.text),
    colSpan: Math.max(1, asNumber(raw.colSpan)),
    rowSpan: Math.max(1, asNumber(raw.rowSpan)),
    cls: asString(raw.cls),
    weapon: images[0]?.name || weapon,
    image: images[0]?.src || image,
    images,
    destroyed: Boolean(raw.destroyed),
  };
};

const normalizeLogTimes = (value: unknown): CrossoutLogTime[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();

  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];

      const raw = item as RawLogTime;
      const at = Math.trunc(asNumber(raw.at));
      const label = asString(raw.label).replace(/\s+/g, " ").trim();

      if (at <= 0 || !label || seen.has(at)) return [];

      seen.add(at);

      return [{ at, label }];
    })
    .sort((left, right) => left.at - right.at);
};

const normalizeLogRow = (value: unknown): CrossoutLogRow | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as RawLogRow;
  const rawCells = Array.isArray(raw.cells) ? raw.cells : [];
  const cells = rawCells
    .map(normalizeLogCell)
    .filter((cell): cell is CrossoutLogCell => cell !== null);

  if (cells.length === 0) return null;

  const rawBattle =
    raw.battle && typeof raw.battle === "object"
      ? (raw.battle as RawLogBattle)
      : null;

  return {
    cells,
    map: asString(raw.map),
    cls: asString(raw.cls),
    battle: rawBattle
      ? {
          index: asNumber(rawBattle.index),
          map: asString(rawBattle.map),
          duration: asString(rawBattle.duration),
        }
      : null,
  };
};

const normalizeLogStatRow = (value: unknown): CrossoutLogStatRow | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as RawLogStatRow;
  const kind = raw.kind === "weapon" ? "weapon" : "player";
  const rawCells = Array.isArray(raw.cells) ? raw.cells : [];
  const cells = rawCells.map(asString);
  const name = asString(raw.name).trim() || cells[0] || "";

  if (!name && cells.length === 0) return null;

  const image = asString(raw.image).trim();
  const images = (Array.isArray(raw.images) ? raw.images : [])
    .map(asString)
    .map((src) => src.trim())
    .filter(Boolean);

  if (images.length === 0 && image) images.push(image);

  return {
    kind,
    name,
    weapon: asString(raw.weapon).trim(),
    image: images[0] || image,
    images,
    stars:
      typeof raw.stars === "number" && Number.isFinite(raw.stars)
        ? Math.max(0, Math.min(100, raw.stars))
        : null,
    team: asString(raw.team).trim(),
    damage: asString(raw.damage),
    delta: asString(raw.delta).trim(),
    deltaKind:
      raw.deltaKind === "up" || raw.deltaKind === "down" ? raw.deltaKind : null,
    cells,
  };
};

const normalizeLogStat = (value: unknown): CrossoutLogStat | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as RawLogStat;
  const headers = (Array.isArray(raw.headers) ? raw.headers : []).map(asString);
  const rawRows = Array.isArray(raw.rows) ? raw.rows : [];
  const rows = rawRows
    .map(normalizeLogStatRow)
    .filter((row): row is CrossoutLogStatRow => row !== null);

  if (headers.length === 0 && rows.length === 0) return null;

  return { headers, rows };
};

export const loadCrossoutLog = async (
  logId: string,
  language: CrossoutLanguage = "ru",
): Promise<CrossoutLogSummaryResult> => {
  const id = logId.trim();

  if (!LOG_ID_PATTERN.test(id)) {
    return logSummaryFailure(
      "invalid-log-id",
      "Некорректный идентификатор лога.",
    );
  }

  let lastError: unknown = null;

  for (const baseUrl of getBaseUrls(language)) {
    try {
      const page = await extractCrossoutPage<RawLogSummary>(
        `${baseUrl}/log/${id}`,
        LOG_SUMMARY_SCRIPT,
      );

      if (page.value?.forbidden) {
        lastError = new CrossoutServiceError(
          "forbidden",
          "Сервис отклонил запрос (403).",
        );
        continue;
      }

      if (!page.value || typeof page.value !== "object") {
        lastError = new CrossoutServiceError(
          "unexpected-response",
          "Сервис вернул неожиданный ответ.",
        );
        continue;
      }

      const rawTypes = Array.isArray(page.value.types)
        ? (page.value.types as RawLogType[])
        : [];
      const types = rawTypes
        .map((type) => ({
          key: asString(type.key).trim(),
          label: asString(type.label).trim(),
          count: asNumber(type.count),
        }))
        .filter((type) => type.key.length > 0 && type.count > 0);

      return {
        ok: true,
        summary: {
          logId: id,
          nickname: asString(page.value.nickname),
          title: asString(page.value.title),
          types,
        },
      };
    } catch (error) {
      lastError = error;
    }
  }

  const failure = describeError(lastError);

  return logSummaryFailure(failure.code, failure.message);
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
  // The site applies the time filter by navigating to
  // /log/{id}/{type}/f_{unix}/t_{unix}, not by posting the form.
  const rangePath =
    from > 0 && to > 0
      ? `/f_${Math.min(from, to)}/t_${Math.max(from, to)}`
      : "";

  if (!LOG_ID_PATTERN.test(id) || !LOG_TYPE_PATTERN.test(slug)) {
    return logTableFailure("invalid-log-id", "Некорректный идентификатор лога.");
  }

  let lastError: unknown = null;

  for (const baseUrl of getBaseUrls(language)) {
    try {
      const page = await extractCrossoutPage<RawLogTable>(
        `${baseUrl}/log/${id}/${slug}${rangePath}`,
        LOG_TABLE_SCRIPT,
      );

      if (page.value?.forbidden) {
        lastError = new CrossoutServiceError(
          "forbidden",
          "Сервис отклонил запрос (403).",
        );
        continue;
      }

      if (!page.value || typeof page.value !== "object") {
        lastError = new CrossoutServiceError(
          "unexpected-response",
          "Сервис вернул неожиданный ответ.",
        );
        continue;
      }

      const rawRows = Array.isArray(page.value.rows)
        ? (page.value.rows as RawLogRow[])
        : [];
      const rows = rawRows
        .map(normalizeLogRow)
        .filter((row): row is CrossoutLogRow => row !== null);

      // The English mirror occasionally returns a truncated log table (for
      // example, the last battle is missing) and caches it. The log summary
      // knows how many battles the type contains, so use that to reject an
      // incomplete table and retry on the next host.
      if (expectedBattles > 0 && !rangePath) {
        const battles = new Set(
          rows
            .map((row) => row.battle?.index)
            .filter((index): index is number => Boolean(index)),
        );

        if (battles.size < expectedBattles) {
          lastError = new CrossoutServiceError(
            "unexpected-response",
            "Сервис вернул неполную таблицу боя.",
          );
          continue;
        }
      }

      const table: CrossoutLogTable = {
        type: slug,
        date: asString(page.value.date),
        times: normalizeLogTimes(page.value.times),
        stats: normalizeLogStat(page.value.stats),
        rows,
      };
      const translate = getWeaponTranslator(language, baseUrl);

      return {
        ok: true,
        table: translate ? await translateLogTable(table, translate) : table,
      };
    } catch (error) {
      lastError = error;
    }
  }

  const failure = describeError(lastError);

  return logTableFailure(failure.code, failure.message);
};
