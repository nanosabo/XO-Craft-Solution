import { app, net } from "electron";
import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import FormData from "form-data";
import {
  CROSSOUT_BATTLE_TYPES,
  type CrossoutBattle,
  type CrossoutBattleType,
  type CrossoutBattlesResult,
  type CrossoutErrorCode,
  type CrossoutFetchBattlesParams,
  type CrossoutUploadLogParams,
  type CrossoutUploadLogResult,
  type CrossoutUploadProgress,
} from "../src/types/crossout";
import {
  translateCrossoutWeaponName,
  translateCrossoutWeaponNameToEnglish,
} from "./crossoutNames";

const RU_HOST = "https://crossout-info.com";
const EN_HOST = "https://en.crossout-info.com";

export type CrossoutLanguage = "ru" | "en";

type WeaponTranslator = (name: string) => Promise<string>;

const PROBE_TIMEOUT = 4_000;

let preferredHost = RU_HOST;
let probeTask: Promise<void> | null = null;
const unavailableHosts = new Set<string>();

const hostOf = (url: string): string | null => {
  if (url.startsWith(EN_HOST)) return EN_HOST;
  if (url.startsWith(RU_HOST)) return RU_HOST;

  return null;
};

/** Remember the host that actually answered, so the next request starts there. */
export const noteCrossoutHost = (url: string): void => {
  const host = hostOf(url);

  if (!host) return;

  unavailableHosts.delete(host);
  preferredHost = host;
};

/** Skip a host that timed out until one request to it succeeds. */
const noteCrossoutHostDown = (url: string): void => {
  const host = hostOf(url);

  if (host) unavailableHosts.add(host);
};

/**
 * One cheap check at startup. Any answer from the main domain keeps it.
 * A timeout or a network error switches the session to the English subdomain.
 * Log requests still try the other host if the preferred one fails.
 */
export const probeCrossoutHost = (): Promise<void> => {
  if (probeTask) return probeTask;

  probeTask = (async () => {
    if (!net.isOnline()) return;

    try {
      const response = await axios.get(`${RU_HOST}/`, {
        timeout: PROBE_TIMEOUT,
        headers: {
          Accept: "*/*",
          "User-Agent": API_USER_AGENT,
        },
        validateStatus: () => true,
      });

      if (response.status >= 500) {
        noteCrossoutHostDown(RU_HOST);
        preferredHost = EN_HOST;
      } else {
        preferredHost = RU_HOST;
      }
    } catch {
      noteCrossoutHostDown(RU_HOST);
      preferredHost = EN_HOST;
    }
  })();

  return probeTask;
};

export const getBaseUrls = async (): Promise<string[]> => {
  await probeCrossoutHost();

  const ordered = preferredHost === EN_HOST ? [EN_HOST, RU_HOST] : [RU_HOST, EN_HOST];
  const alive = ordered.filter((host) => !unavailableHosts.has(host));

  return alive.length > 0 ? alive : ordered;
};

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
const API_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const API_TIMEOUT = 45_000;

export const fetchCrossoutText = async (url: string): Promise<string> => {
  try {
    const response = await axios.get<string>(url, {
      timeout: API_TIMEOUT,
      responseType: "text",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent": API_USER_AGENT,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return String(response.data ?? "");
  } catch (error) {
    if (axios.isAxiosError(error) && !error.response) {
      noteCrossoutHostDown(url);
    }

    throw error;
  }
};
/** Public crossout-info key. One place for every log and battle request. */
const DEFAULT_API_KEY = "025ffb8e0248088848a57b8831c23987";
const LOG_ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

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
  let lastRate = 0;
  let lastEmit = 0;

  const emit = (
    loaded: number,
    phase: CrossoutUploadProgress["phase"],
    force = false,
  ) => {
    if (!onProgress) return;

    const now = Date.now();

    if (!force && phase === "uploading" && now - lastEmit < 120) return;

    lastEmit = now;

    const complete = phase === "processing";

    onProgress({
      phase,
      percent: complete
        ? 100
        : total > 0
          ? Math.min(99, Math.round((loaded / total) * 100))
          : 0,
      transferred: complete ? total : loaded,
      total,
      bytesPerSecond: Math.round(lastRate),
    });
  };

  return {
    start: () => emit(0, "uploading", true),
    progress: (loaded: number, rate?: number) => {
      if (typeof rate === "number" && rate > 0) lastRate = rate;

      if (total > 0 && loaded >= total) {
        emit(total, "processing", true);
        return;
      }

      emit(loaded, "uploading");
    },
    done: () => emit(total, "processing", true),
  };
};

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

  for (const baseUrl of await getBaseUrls()) {
    try {
      const text = (await fetchCrossoutText(`${baseUrl}/${path}`)).trim();

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

      noteCrossoutHost(baseUrl);

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
  _language: CrossoutLanguage = "ru",
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

  for (const baseUrl of await getBaseUrls()) {
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

    tracker.start();

    try {
      const response = await axios.post<string>(
        `${baseUrl}/public/autoUploadLog.php?${query.toString()}`,
        form,
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
          onUploadProgress: (event) => {
            tracker.progress(event.loaded, event.rate);
          },
        },
      );

      tracker.done();

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

      noteCrossoutHost(baseUrl);

      return { ok: true, logId, logUrl: `${baseUrl}/log/${logId}` };
    } catch (error) {
      form.destroy();
      lastError = error;

      if (axios.isAxiosError(error) && !error.response) {
        noteCrossoutHostDown(baseUrl);
      }

      if (!shouldTryNextHost(error)) break;
    }
  }

  const failure = describeError(lastError);

  return uploadFailure(failure.code, failure.message);
};
