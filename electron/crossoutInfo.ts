import { app } from "electron";
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
} from "../src/types/crossout";

const BASE_URLS = [
  "https://crossout-info.com",
  "https://en.crossout-info.com",
];
const API_VERSION = "api_ver1";
const REQUEST_TIMEOUT = 30_000;
const UPLOAD_TIMEOUT = 120_000;
const MAX_RANGE_DAYS = 7;
const MAX_LOG_BYTES = 64 * 1024 * 1024;
const CONFIG_PATH = path.join(app.getPath("userData"), "crossout-info.json");
const USER_AGENT = `XO-Craft-Solution/${app.getVersion()}`;

interface CrossoutInfoConfig {
  apiKey?: string;
}

/**
 * The key is intentionally not committed. In development it can be placed in
 * .env.local, and in a packaged build it is read from the user data folder.
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

  return configKey || null;
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

const describeError = (error: unknown): CrossoutFailure => {
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

export const fetchCrossoutBattles = async (
  params: CrossoutFetchBattlesParams,
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

  for (const baseUrl of BASE_URLS) {
    try {
      const response = await axios.get<unknown>(`${baseUrl}/${path}`, {
        timeout: REQUEST_TIMEOUT,
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
      });

      return normalizeResponse(response.data);
    } catch (error) {
      lastError = error;

      if (!shouldTryNextHost(error)) break;
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
): Promise<CrossoutUploadLogResult> => {
  const filePath = params.filePath.trim();

  if (!filePath) {
    return uploadFailure("no-file", "Не выбран файл лога.");
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

  for (const baseUrl of BASE_URLS) {
    const form = new FormData();

    form.append("file", file, {
      filename: "combat.log",
    });

    try {
      const response = await axios.post<string>(
        `${baseUrl}/public/autoUploadLog.php?${query.toString()}`,
        form,
        {
          headers: {
            ...form.getHeaders(),
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

      return { ok: true, logId, logUrl: `${baseUrl}/log/${logId}` };
    } catch (error) {
      lastError = error;

      if (!shouldTryNextHost(error)) break;
    }
  }

  const failure = describeError(lastError);

  return uploadFailure(failure.code, failure.message);
};
