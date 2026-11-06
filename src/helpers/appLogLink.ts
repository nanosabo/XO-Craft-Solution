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

export const findAppLogLink = (argv: string[]): AppLogLink | null => {
  for (const arg of argv) {
    const parsed = parseAppLogLink(arg);

    if (parsed) return parsed;
  }

  return null;
};
