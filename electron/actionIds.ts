import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import axios from "./api";

/**
 * Next.js server actions are referenced from client JS chunks like:
 *   (0,i.createServerReference)("6028...fdad",i.callServer,void 0,i.findSourceMapURL,"checkUpdateStatus")
 * The hash part changes on every site redeploy, so instead of hardcoding it we
 * discover the current values at runtime from the site's own JS chunks.
 */

const CHUNK_RE = /\/_next\/static\/chunks\/[A-Za-z0-9_.-]+\.js/g;
const ACTION_RE =
  /createServerReference\)?\(\s*"([a-f0-9]{32,})"[^)]*?"([A-Za-z0-9_$]+)"\s*\)/g;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Used when discovery fails (offline, site markup changed, ...). */
const FALLBACK_ACTION_IDS: Record<string, string> = {
  checkUpdateStatus: "602800bc979e30115d225b06abd01323db16a6fdad",
  getItemsPriceHistory: "408474870e141dca918d8ac4e0bcf487654c081bf0",
};

const CACHE_TTL = 24 * 60 * 60 * 1000;
const FAILURE_RETRY_DELAY = 60 * 1000;
const MAX_CHUNKS = 60;
const CONCURRENCY = 8;
const PAGE_TIMEOUT = 20000;
const CHUNK_TIMEOUT = 10000;

const CACHE_FILE = "server-action-ids.json";

interface DiskCache {
  savedAt: number;
  ids: Record<string, string>;
}

let ids: Record<string, string> | null = null;
let nextAttemptAt = 0;
let diskLoaded = false;
let inflight: Promise<Record<string, string>> | null = null;

const getCachePath = (): string | null => {
  try {
    return path.join(app.getPath("userData"), CACHE_FILE);
  } catch {
    return null;
  }
};

const loadDiskCache = () => {
  if (diskLoaded) return;
  diskLoaded = true;

  const file = getCachePath();
  if (!file) return;

  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as DiskCache;

    if (parsed?.ids && Date.now() - parsed.savedAt < CACHE_TTL) {
      ids = parsed.ids;
      nextAttemptAt = parsed.savedAt + CACHE_TTL;
    }
  } catch {
    /* no cache yet */
  }
};

const saveDiskCache = (map: Record<string, string>) => {
  const file = getCachePath();
  if (!file) return;

  try {
    const payload: DiskCache = { savedAt: Date.now(), ids: map };
    fs.writeFileSync(file, JSON.stringify(payload), "utf8");
  } catch {
    /* cache is best-effort */
  }
};

const extractChunks = (source: string): string[] =>
  Array.from(new Set(source.match(CHUNK_RE) ?? []));

const fetchChunk = async (chunkPath: string): Promise<string> => {
  const response = await axios.get(chunkPath, {
    timeout: CHUNK_TIMEOUT,
    headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
  });

  return typeof response.data === "string"
    ? response.data
    : String(response.data);
};

const fetchChunks = async (paths: string[]): Promise<string[]> => {
  const result: string[] = new Array(paths.length).fill("");
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= paths.length) return;

      try {
        result[index] = await fetchChunk(paths[index]);
      } catch {
        result[index] = "";
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, paths.length) },
    worker,
  );

  await Promise.all(workers);

  return result.filter(Boolean);
};

const fetchMarketHtml = async (): Promise<string> => {
  const response = await axios.get("/market/", {
    timeout: PAGE_TIMEOUT,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  return typeof response.data === "string"
    ? response.data
    : String(response.data);
};

const collectActionIds = (chunks: string[]): Record<string, string> => {
  const found: Record<string, string> = {};

  for (const chunk of chunks) {
    for (const match of chunk.matchAll(ACTION_RE)) {
      found[match[2]] = match[1];
    }
  }

  return found;
};

const resolveFromNetwork = async (): Promise<Record<string, string>> => {
  const html = await fetchMarketHtml();

  const initial = extractChunks(html).slice(0, MAX_CHUNKS);
  const seen = new Set(initial);

  let contents = await fetchChunks(initial);

  // Some chunks are referenced only from other chunks (lazy loaded).
  const extra = new Set<string>();

  for (const chunk of contents) {
    for (const chunkPath of extractChunks(chunk)) {
      if (!seen.has(chunkPath) && seen.size + extra.size < MAX_CHUNKS) {
        extra.add(chunkPath);
      }
    }
  }

  if (extra.size > 0) {
    const extraPaths = Array.from(extra);
    extraPaths.forEach((chunkPath) => seen.add(chunkPath));
    contents = contents.concat(await fetchChunks(extraPaths));
  }

  const found = collectActionIds(contents);

  if (Object.keys(found).length === 0) {
    throw new Error("Server action ids not found in site chunks");
  }

  return found;
};

const resolve = async (): Promise<Record<string, string>> => {
  if (!inflight) {
    inflight = (async () => {
      try {
        const found = await resolveFromNetwork();
        const merged = { ...FALLBACK_ACTION_IDS, ...found };

        ids = merged;
        nextAttemptAt = Date.now() + CACHE_TTL;
        saveDiskCache(merged);

        return merged;
      } catch {
        const merged = { ...FALLBACK_ACTION_IDS, ...(ids ?? {}) };

        ids = merged;
        nextAttemptAt = Date.now() + FAILURE_RETRY_DELAY;

        return merged;
      } finally {
        inflight = null;
      }
    })();
  }

  return inflight;
};

/**
 * Returns the current server action id for `name`.
 * Results are cached in memory and on disk for 24h; pass `force` to refresh
 * immediately (used after the server responds with 409 "Server Action
 * unavailable", which means the id is stale).
 */
export const getServerActionId = async (
  name: string,
  force = false,
): Promise<string | undefined> => {
  loadDiskCache();

  if (!force && ids && Date.now() < nextAttemptAt) {
    return ids[name] ?? FALLBACK_ACTION_IDS[name];
  }

  const map = await resolve();

  return map[name] ?? FALLBACK_ACTION_IDS[name];
};

const getStatus = (error: unknown): number | undefined => {
  const response = (error as { response?: { status?: number } })?.response;
  return response?.status;
};

/**
 * Calls a Next.js server action, retrying once with a freshly discovered id
 * when the server reports that the action is no longer available.
 */
export const postServerAction = async (
  name: string,
  url: string,
  data: unknown,
  headers: Record<string, string>,
): Promise<string> => {
  const send = async (actionId: string): Promise<string> => {
    const response = await axios.post(url, data, {
      headers: { ...headers, "Next-Action": actionId },
    });

    return typeof response.data === "string"
      ? response.data
      : String(response.data);
  };

  const actionId = await getServerActionId(name);

  if (!actionId) {
    throw new Error(`Unknown server action: ${name}`);
  }

  try {
    return await send(actionId);
  } catch (error) {
    if (getStatus(error) !== 409) {
      throw error;
    }

    const freshId = await getServerActionId(name, true);

    if (!freshId || freshId === actionId) {
      throw error;
    }

    return send(freshId);
  }
};
