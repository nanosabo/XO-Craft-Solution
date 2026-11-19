const LOG_ID = /^[A-Za-z0-9_-]{4,64}$/;
const LOG_TYPE = /^[a-z0-9_-]{1,32}$/;

export const APP_LOG_PROTOCOL = "xocraft";

const APP_LOG_PAGE = "https://nanosabo.github.io/xocs-imgs/log/";

export interface AppLogLink {
  logId: string;
  type: string | null;
}

const withType = (
  logId: string,
  type: string | null | undefined,
): AppLogLink | null => {
  if (!LOG_ID.test(logId)) return null;

  const normalized = (type ?? "").trim().toLowerCase();

  return {
    logId,
    type: LOG_TYPE.test(normalized) ? normalized : null,
  };
};

export const buildAppLogLink = (
  logId: string,
  type?: string | null,
): string => {
  const url = new URL(APP_LOG_PAGE);

  url.searchParams.set("id", logId);

  if (type && LOG_TYPE.test(type)) {
    url.searchParams.set("type", type);
  }

  return url.toString();
};

const parseProtocolLink = (url: URL): AppLogLink | null => {
  if (url.protocol !== `${APP_LOG_PROTOCOL}:`) return null;

  const parts = [url.hostname, ...url.pathname.split("/")].filter(Boolean);
  const logId = decodeURIComponent(parts[0] === "logs" ? (parts[1] ?? "") : "");

  return withType(logId, url.searchParams.get("type"));
};

const parsePageLink = (url: URL): AppLogLink | null => {
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.hostname !== "nanosabo.github.io") return null;
  if (url.pathname.replace(/\/+$/, "") !== "/xocs-imgs/log") return null;

  return withType(
    decodeURIComponent(url.searchParams.get("id") ?? ""),
    url.searchParams.get("type"),
  );
};

export const parseAppLogLink = (raw: string): AppLogLink | null => {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  return parseProtocolLink(url) ?? parsePageLink(url);
};

const SITE_LOG =
  /(?:https?:\/\/)?(?:www\.)?(?:en\.)?crossout-info\.com\/log\/([A-Za-z0-9_-]{4,64})(?:\/([A-Za-z0-9_-]{1,32}))?/i;

const APP_LINK =
  /(?:https?:\/\/nanosabo\.github\.io\/xocs-imgs\/log\/?\?[^\s]+|xocraft:\/\/[^\s]+)/i;

/** A crossout-info log link, an app link, or text that contains one of them. */
export const logFromClipboard = (value: string): AppLogLink | null => {
  const direct = parseAppLogLink(value);

  if (direct) return direct;

  const appMatch = value.match(APP_LINK);

  if (appMatch) {
    const parsed = parseAppLogLink(appMatch[0]);

    if (parsed) return parsed;
  }

  const match = value.match(SITE_LOG);

  if (!match) return null;

  return withType(match[1], match[2] ?? "");
};

export const logResultsPath = (parsed: AppLogLink): string => {
  const query = parsed.type ? `?type=${encodeURIComponent(parsed.type)}` : "";

  return `/logs/${encodeURIComponent(parsed.logId)}${query}`;
};

export const findAppLogLink = (argv: string[]): AppLogLink | null => {
  for (const arg of argv) {
    const parsed = parseAppLogLink(arg);

    if (parsed) return parsed;
  }

  return null;
};
