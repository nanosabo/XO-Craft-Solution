import WebSocket from "ws";
import type { ClanLog, ClanMate, ClanState, ClanSyncDetail, ClanSyncStatus, ClanSyncStep } from "@src/types/clan";
import {
  ensureSecret,
  keepAllowedLogs,
  mergeLogs,
  parseProfileId,
  readClanArchive,
  sameNick,
  sanitizeLog,
  writeClanArchive,
  type ClanArchive,
} from "./clanArchive";
import {
  decryptPayload,
  encryptPayload,
  payloadHash,
  publicKeyOf,
  roomIdFor,
  signEvent,
  verifyEvent,
  type NostrEvent,
} from "./clanCrypto";
import { extractCrossoutPage } from "./crossoutBrowser";
import { listCrossoutHistory } from "./crossoutHistory";
import { writeLog } from "./logger";

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
];

const STORED_KIND = 30078;
const WANT_KIND = 24444;
const GIVE_KIND = 24445;
const FETCH_INTERVAL = 30 * 60 * 1000;
const REPUBLISH_INTERVAL = 12 * 60 * 60 * 1000;

const PROFILE_SCRIPT = `
(() => {
  var heading = Array.prototype.find.call(
    document.querySelectorAll("h2"),
    function (el) {
      return /соклан|clanmate|clan member/i.test(el.textContent || "");
    }
  );
  var title = document.querySelector("h1");
  var raw = title && title.textContent ? title.textContent : "";
  var nickname = raw.replace(/^[^:：]*[:：]\\s*/, "").trim();
  var root = heading ? heading.parentElement : null;
  var nodes = root ? root.querySelectorAll("a[href*='/pers/']") : [];
  var mates = [];
  for (var i = 0; i < nodes.length; i += 1) {
    var href = nodes[i].getAttribute("href") || "";
    var match = href.match(/\\/pers\\/([A-Za-z0-9]+)/);
    var name = (nodes[i].textContent || "").trim();
    if (name && match) mates.push({ nickname: name, profileId: match[1] });
  }
  return { nickname: nickname, mates: mates };
})()
`;

interface SyncOptions {
  getLanguage: () => "ru" | "en";
  onState: (state: ClanState) => void;
}

let options: SyncOptions = {
  getLanguage: () => "ru",
  onState: () => undefined,
};

let archive: ClanArchive = {
  code: "",
  profileId: "",
  nickname: "",
  mates: [],
  secretKey: "",
  logs: [],
  publishedHash: "",
  lastFetchAt: 0,
  lastRepublish: 0,
};
let loaded = false;
let syncing = false;
let step: ClanSyncStep = "";
let notice: ClanSyncDetail | "" = "";
let message = "";
let chain: Promise<unknown> = Promise.resolve();
let relays: Relay[] = [];
let activeRoom = "";
let emitTimer: NodeJS.Timeout | null = null;
let wantTimer: NodeJS.Timeout | null = null;
const wantCooldown = new Map<string, number>();

const exclusive = <T>(task: () => Promise<T>): Promise<T> => {
  const run = chain.then(task, task);

  chain = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
};

const profileHost = (language: "ru" | "en"): string =>
  language === "en" ? "https://en.crossout-info.com" : "https://crossout-info.com";

const relaySnapshot = () =>
  RELAYS.map((url) => ({
    url,
    connected: relays.some((relay) => relay.url === url && relay.connected),
  }));

const toState = (): ClanState => {
  const connected = relaySnapshot().some((relay) => relay.connected);
  let status: ClanSyncStatus = "idle";
  let detail: ClanSyncDetail = "";

  if (!archive.code.trim()) {
    detail = "need-code";
  } else if (!archive.profileId) {
    detail = "need-profile";
  } else if (syncing) {
    status = "syncing";
    detail = "syncing";
  } else if (notice === "bad-profile") {
    detail = "bad-profile";
  } else if (!connected) {
    status = "offline";
    detail = "offline";
  } else if (notice === "profile-failed" && archive.mates.length === 0) {
    status = "online";
    detail = "profile-failed";
  } else {
    status = "online";
    detail = "online";
  }

  return {
    code: archive.code,
    profileId: archive.profileId,
    nickname: archive.nickname,
    mates: archive.mates,
    logs: archive.logs,
    status,
    detail,
    message,
    step,
    relays: relaySnapshot(),
    updatedAt: Date.now(),
  };
};

const emit = (): void => {
  if (emitTimer) return;

  emitTimer = setTimeout(() => {
    emitTimer = null;
    options.onState(toState());
  }, 200);
};

const persist = (): void => {
  writeClanArchive(archive);
  emit();
};

const ownLogs = (source: ClanArchive): ClanLog[] =>
  source.logs.filter((log) => sameNick(log.nickname, source.nickname));

const publishEvent = (
  kind: number,
  tags: string[][],
  payload: unknown,
): void => {
  if (!archive.code.trim() || !archive.secretKey) return;

  const event = signEvent(
    archive.secretKey,
    kind,
    tags,
    encryptPayload(archive.code, payload),
  );

  for (const relay of relays) relay.send(event);
};

const logsPayload = (logs: ClanLog[]) => ({
  v: 1,
  op: "logs" as const,
  nickname: archive.nickname,
  profileId: archive.profileId,
  logs: logs.slice(0, 100),
});

const publishOwn = (force: boolean): void => {
  if (!archive.code.trim()) return;

  const logs = ownLogs(archive);

  if (logs.length === 0) return;

  ensureSecret(archive);

  const room = roomIdFor(archive.code);
  const pubkey = publicKeyOf(archive.secretKey);
  const payload = logsPayload(logs);
  const hash = payloadHash(payload);
  const stale = Date.now() - archive.lastRepublish > REPUBLISH_INTERVAL;

  if (!force && !stale && archive.publishedHash === hash) return;

  publishEvent(STORED_KIND, [
    ["d", `${room}:${pubkey}:logs`],
    ["t", room],
  ], payload);
  archive.publishedHash = hash;
  archive.lastRepublish = Date.now();
};

const answerWant = (from: string): void => {
  const now = Date.now();
  const previous = wantCooldown.get(from) ?? 0;

  if (now - previous < 60_000 || archive.logs.length === 0) return;

  wantCooldown.set(from, now);
  publishEvent(
    GIVE_KIND,
    [["t", roomIdFor(archive.code)]],
    logsPayload(archive.logs),
  );
};

const ensureLoaded = (): void => {
  if (loaded) return;

  archive = readClanArchive();
  loaded = true;
};

const requestMissing = (): void => {
  if (!archive.code.trim()) return;

  publishEvent(WANT_KIND, [["t", roomIdFor(archive.code)]], {
    v: 1,
    op: "want",
    full: true,
  });
};

const scheduleWant = (): void => {
  if (wantTimer) return;

  wantTimer = setTimeout(() => {
    wantTimer = null;
    void exclusive(async () => {
      requestMissing();
    });
  }, 1500);
};

const acceptPayload = (event: NostrEvent, payload: unknown): void => {
  if (!payload || typeof payload !== "object") return;

  const raw = payload as Record<string, unknown>;
  const op = raw.op;

  if (op === "logs" || op === "give") {
    const logs = (Array.isArray(raw.logs) ? raw.logs : [])
      .map(sanitizeLog)
      .filter((log): log is ClanLog => log !== null);
    const added = mergeLogs(archive, logs, false);

    if (added > 0) persist();

    return;
  }

  if (op === "want") {
    if (event.pubkey === publicKeyOf(archive.secretKey)) return;

    answerWant(event.pubkey);
  }
};

const onRelayEvent = (event: NostrEvent): void => {
  if (!verifyEvent(event) || !archive.code.trim()) return;

  let payload: unknown;

  try {
    payload = decryptPayload(archive.code, event.content);
  } catch {
    return;
  }

  void exclusive(async () => {
    acceptPayload(event, payload);
  });
};

class Relay {
  readonly url: string;
  connected = false;

  private socket: WebSocket | null = null;
  private stopped = false;
  private timer: NodeJS.Timeout | null = null;
  private pending: string[] = [];
  private room = "";

  constructor(
    url: string,
    private readonly onEvent: (event: NostrEvent) => void,
    private readonly onStatus: () => void,
    private readonly onStored: () => void,
  ) {
    this.url = url;
  }

  start(room: string): void {
    this.room = room;
    this.stopped = false;
    this.open();
  }

  stop(): void {
    this.stopped = true;
    this.connected = false;

    if (this.timer) clearTimeout(this.timer);

    this.socket?.close();
    this.socket = null;
  }

  send(event: NostrEvent): void {
    const data = JSON.stringify(["EVENT", event]);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data);

      return;
    }

    this.pending.push(data);

    if (this.pending.length > 200) this.pending.shift();
  }

  private open(): void {
    if (this.stopped) return;

    const socket = new WebSocket(this.url);

    this.socket = socket;

    socket.on("open", () => {
      this.connected = true;

      const since = Math.floor(Date.now() / 1000) - 20;

      socket.send(JSON.stringify([
        "REQ",
        "stored",
        { kinds: [STORED_KIND], "#t": [this.room], limit: 1000 },
      ]));
      socket.send(JSON.stringify([
        "REQ",
        "live",
        { kinds: [WANT_KIND, GIVE_KIND], "#t": [this.room], since },
      ]));

      for (const data of this.pending) socket.send(data);

      this.pending = [];
      this.onStatus();
    });

    socket.on("message", (data) => {
      this.onMessage(data.toString());
    });

    socket.on("close", () => {
      this.connected = false;
      this.onStatus();

      if (!this.stopped) {
        this.timer = setTimeout(() => this.open(), 5000);
      }
    });

    socket.on("error", () => {
      socket.close();
    });
  }

  private onMessage(text: string): void {
    let message: unknown;

    try {
      message = JSON.parse(text);
    } catch {
      return;
    }

    if (!Array.isArray(message)) return;

    if (message[0] === "EVENT" && message[2] && typeof message[2] === "object") {
      this.onEvent(message[2] as NostrEvent);

      return;
    }

    if (message[0] === "EOSE" && message[1] === "stored") {
      this.onStored();

      return;
    }

    if (message[0] === "OK" && message[2] === false) {
      writeLog("warn", "clan", "Relay rejected an event", {
        relay: this.url,
        reason: typeof message[3] === "string" ? message[3] : "",
      });
    }
  }
}

const stopRelays = (): void => {
  for (const relay of relays) relay.stop();

  relays = [];
  activeRoom = "";
};

const ensureRelays = (room: string): void => {
  if (activeRoom === room && relays.length > 0) return;

  stopRelays();

  const next = RELAYS.map(
    (url) =>
      new Relay(url, onRelayEvent, emit, () => {
        scheduleWant();
      }),
  );

  try {
    for (const relay of next) relay.start(room);
  } catch (error) {
    for (const relay of next) relay.stop();
    throw error;
  }

  relays = next;
  activeRoom = room;
};

const refreshProfile = async (): Promise<void> => {
  const language = options.getLanguage();
  const page = await extractCrossoutPage<{
    nickname?: string;
    mates?: { nickname?: string; profileId?: string }[];
  }>(
    `${profileHost(language)}/pers/${archive.profileId}`,
    PROFILE_SCRIPT,
  );
  const mates = (page.value.mates ?? [])
    .map((mate) => ({
      nickname: mate.nickname?.trim() ?? "",
      profileId: mate.profileId?.trim() ?? "",
    }))
    .filter(
      (mate): mate is ClanMate =>
        Boolean(mate.nickname) && /^[A-Za-z0-9]{4,32}$/.test(mate.profileId),
    );
  const seen = new Set<string>();
  const unique = mates.filter((mate) => {
    if (seen.has(mate.profileId)) return false;

    seen.add(mate.profileId);

    return true;
  });

  if (unique.length === 0) {
    notice = "profile-failed";

    return;
  }

  archive.mates = unique;

  const nickname = page.value.nickname?.trim() ?? "";

  if (nickname && nickname.length <= 40) archive.nickname = nickname;

  if (notice === "profile-failed") notice = "";

  keepAllowedLogs(archive);
};

const fetchOwnLogs = (): void => {
  const mine = listCrossoutHistory()
    .filter((entry) => sameNick(entry.nickname, archive.nickname))
    .map((entry) => ({
      logId: entry.logId,
      nickname: entry.nickname,
      title: entry.title,
      types: entry.types,
      uploadedAt: entry.uploadedAt,
      savedAt: entry.savedAt,
    }));

  if (mine.length === 0) {
    message = "logs";

    return;
  }

  if (message === "logs") message = "";

  mergeLogs(archive, mine, true);
  archive.lastFetchAt = Date.now();
};

const applyInput = (profile: string, code: string): boolean => {
  const profileId = parseProfileId(profile);
  const nextCode = code.trim();

  if (!nextCode) {
    notice = "need-code";
    message = "";

    return false;
  }

  if (!profileId) {
    notice = "bad-profile";
    message = "";

    return false;
  }

  if (nextCode !== archive.code) {
    archive.logs = [];
    archive.mates = [];
    archive.publishedHash = "";
    archive.nickname = "";
    stopRelays();
  }

  archive.code = nextCode;
  archive.profileId = profileId;
  notice = "";
  message = "";
  ensureSecret(archive);

  return true;
};

const runSync = async (fetchFresh: boolean): Promise<void> => {
  if (!archive.code.trim() || !archive.profileId) return;

  syncing = true;
  step = "profile";
  emit();

  try {
    await refreshProfile();
    step = "battles";
    emit();

    if (fetchFresh) fetchOwnLogs();

    step = "publish";
    emit();
    ensureRelays(roomIdFor(archive.code));
    publishOwn(false);
    step = "live";
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
    writeLog("error", "clan", "Clan sync failed", message);
  } finally {
    syncing = false;
    persist();
  }
};

export const configureClanSync = (next: SyncOptions): void => {
  options = next;
};

export const getClanState = (): ClanState => {
  ensureLoaded();

  return toState();
};

export const syncClan = (
  profile: string,
  code: string,
): Promise<ClanState> =>
  exclusive(async () => {
    ensureLoaded();

    if (!applyInput(profile, code)) {
      persist();

      return toState();
    }

    await runSync(true);

    return toState();
  });

export const startClanSync = (): Promise<void> =>
  exclusive(async () => {
    archive = readClanArchive();
    loaded = true;

    if (!archive.code.trim() || !archive.profileId) {
      emit();

      return;
    }

    const fresh = Date.now() - archive.lastFetchAt > FETCH_INTERVAL;

    await runSync(fresh);
  });

export const stopClanSync = (): void => {
  if (wantTimer) clearTimeout(wantTimer);
  if (emitTimer) clearTimeout(emitTimer);

  stopRelays();
};
