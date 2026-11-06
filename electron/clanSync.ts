import WebSocket from "ws";
import type { CrossoutBattle, CrossoutBattleType } from "@src/types/crossout";
import type {
  ClanMate,
  ClanState,
  ClanSyncDetail,
  ClanSyncStatus,
  ClanSyncStep,
} from "@src/types/clan";
import {
  battleDay,
  battleKey,
  ensureSecret,
  keepAllowedBattles,
  mergeBattles,
  parseProfileId,
  readClanArchive,
  sanitizeBattle,
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
import { fetchCrossoutBattles, getCrossoutApiKey } from "./crossoutInfo";
import { writeLog } from "./logger";

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
];

const STORED_KIND = 30078;
const WANT_KIND = 24444;
const GIVE_KIND = 24445;
const BATTLE_TYPES: CrossoutBattleType[] = [
  "KV",
  "PRT",
  "PVP",
  "PVE",
  "ARCADE",
  "BRAWL",
  "CREATE",
];
const DAY_CHUNK = 40;
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

interface DayIndex {
  nickname: string;
  days: string[];
}

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
  battles: [],
  ownKeys: [],
  published: {},
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
const indexes = new Map<string, DayIndex>();
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

const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}.${month}.${date.getFullYear()}`;
};

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
  } else if (notice === "no-key") {
    status = "online";
    detail = "no-key";
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
    battles: archive.battles,
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

const ownBattles = (source: ClanArchive): CrossoutBattle[] => {
  const own = new Set(source.ownKeys);

  return source.battles.filter((battle) => own.has(battleKey(battle)));
};

const groupedOwnDays = (source: ClanArchive): Map<string, CrossoutBattle[]> => {
  const days = new Map<string, CrossoutBattle[]>();

  for (const battle of ownBattles(source)) {
    const day = battleDay(battle);
    const list = days.get(day) ?? [];

    list.push(battle);
    days.set(day, list);
  }

  return days;
};

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

const publishOwn = (force: boolean): void => {
  if (!archive.code.trim()) return;

  ensureSecret(archive);

  const room = roomIdFor(archive.code);
  const pubkey = publicKeyOf(archive.secretKey);
  const days = groupedOwnDays(archive);
  const stale = Date.now() - archive.lastRepublish > REPUBLISH_INTERVAL;
  const dayNames = [...days.keys()].sort();

  for (const day of dayNames) {
    const battles = days.get(day) ?? [];
    const parts = Math.max(1, Math.ceil(battles.length / DAY_CHUNK));

    for (let part = 0; part < parts; part += 1) {
      const slice = battles.slice(part * DAY_CHUNK, (part + 1) * DAY_CHUNK);
      const payload = {
        v: 1,
        op: "day",
        nickname: archive.nickname,
        profileId: archive.profileId,
        day,
        part,
        battles: slice,
      };
      const hash = payloadHash(payload);
      const hashKey = `${day}:${part}`;

      if (!force && !stale && archive.published[hashKey] === hash) continue;

      publishEvent(STORED_KIND, [
        ["d", `${room}:${pubkey}:day:${day}:${part}`],
        ["t", room],
      ], payload);
      archive.published[hashKey] = hash;
    }
  }

  publishEvent(STORED_KIND, [
    ["d", `${room}:${pubkey}:index`],
    ["t", room],
  ], {
    v: 1,
    op: "index",
    nickname: archive.nickname,
    profileId: archive.profileId,
    days: dayNames,
  });

  if (stale || force) archive.lastRepublish = Date.now();
};

const battlesByDay = (
  nickname: string,
  day: string,
): CrossoutBattle[] =>
  archive.battles.filter(
    (battle) => battle.nickname === nickname && battleDay(battle) === day,
  );

const sendGive = (nickname: string, day: string): void => {
  const battles = battlesByDay(nickname, day);

  if (battles.length === 0) return;

  const room = roomIdFor(archive.code);

  for (let part = 0; part < battles.length; part += DAY_CHUNK) {
    publishEvent(
      GIVE_KIND,
      [["t", room]],
      {
        v: 1,
        op: "give",
        nickname,
        day,
        battles: battles.slice(part, part + DAY_CHUNK),
      },
    );
  }
};

const answerWant = (from: string, payload: Record<string, unknown>): void => {
  const now = Date.now();
  const previous = wantCooldown.get(from) ?? 0;

  if (now - previous < 60_000) return;

  wantCooldown.set(from, now);

  if (payload.full === true) {
    const newest = new Map<string, string>();

    for (const battle of archive.battles) {
      const day = battleDay(battle);
      const key = `${battle.nickname}\0${day}`;

      newest.set(key, day);
    }

    const items = [...newest.keys()].slice(0, 120);

    for (const key of items) {
      const [nickname, day] = key.split("\0");

      if (nickname && day) sendGive(nickname, day);
    }

    return;
  }

  const items = Array.isArray(payload.items) ? payload.items : [];

  for (const item of items.slice(0, 60)) {
    if (!item || typeof item !== "object") continue;

    const raw = item as Record<string, unknown>;
    const nickname = typeof raw.nickname === "string" ? raw.nickname.trim() : "";
    const day = typeof raw.day === "string" ? raw.day : "";

    if (!nickname || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;

    sendGive(nickname, day);
  }
};

const ensureLoaded = (): void => {
  if (loaded) return;

  archive = readClanArchive();
  loaded = true;
};

const requestMissing = (): void => {
  if (!archive.code.trim()) return;

  const room = roomIdFor(archive.code);
  const have = new Set(
    archive.battles.map((battle) => `${battle.nickname}\0${battleDay(battle)}`),
  );

  if (indexes.size === 0) {
    publishEvent(WANT_KIND, [["t", room]], { v: 1, op: "want", full: true });

    return;
  }

  const items: { nickname: string; day: string }[] = [];

  for (const entry of indexes.values()) {
    if (entry.nickname && entry.nickname === archive.nickname) continue;

    for (const day of entry.days) {
      if (have.has(`${entry.nickname}\0${day}`)) continue;

      items.push({ nickname: entry.nickname, day });
    }
  }

  if (items.length === 0) return;

  publishEvent(WANT_KIND, [["t", room]], {
    v: 1,
    op: "want",
    items: items.slice(0, 60),
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

  if (op === "index") {
    const nickname = typeof raw.nickname === "string" ? raw.nickname.trim() : "";
    const days = Array.isArray(raw.days)
      ? raw.days.filter((day): day is string => typeof day === "string")
      : [];

    if (!nickname) return;

    indexes.set(event.pubkey, { nickname, days });
    scheduleWant();

    return;
  }

  if (op === "day" || op === "give") {
    const battles = (Array.isArray(raw.battles) ? raw.battles : [])
      .map(sanitizeBattle)
      .filter((battle): battle is CrossoutBattle => battle !== null);
    const added = mergeBattles(archive, battles, false);

    if (added > 0) persist();

    return;
  }

  if (op === "want") {
    if (event.pubkey === publicKeyOf(archive.secretKey)) return;

    answerWant(event.pubkey, raw);
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
  indexes.clear();
};

const ensureRelays = (room: string): void => {
  if (activeRoom === room && relays.length > 0) return;

  stopRelays();
  activeRoom = room;
  relays = RELAYS.map(
    (url) =>
      new Relay(url, onRelayEvent, emit, () => {
        scheduleWant();
      }),
  );

  for (const relay of relays) relay.start(room);
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

  keepAllowedBattles(archive);
};

const fetchOwnBattles = async (): Promise<void> => {
  if (!getCrossoutApiKey()) {
    notice = "no-key";

    return;
  }

  const to = new Date();
  const from = new Date();

  from.setDate(from.getDate() - 6);

  const collected: CrossoutBattle[] = [];
  let failed = 0;

  for (const type of BATTLE_TYPES) {
    const result = await fetchCrossoutBattles(
      {
        type,
        from: formatDate(from),
        to: formatDate(to),
      },
      options.getLanguage(),
    );

    if (result.errorCode && result.battles.length === 0) {
      failed += 1;
      continue;
    }

    collected.push(...result.battles);
  }

  if (failed === BATTLE_TYPES.length) {
    message = "battles";

    return;
  }

  if (message === "battles") message = "";

  const nickname = collected.find((battle) => battle.nickname)?.nickname;

  if (nickname && !archive.nickname) archive.nickname = nickname;

  mergeBattles(archive, collected, true);
  archive.lastFetchAt = Date.now();

  if (notice === "no-key") notice = "";
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
    const own = new Set(archive.ownKeys);

    archive.battles = archive.battles.filter((battle) =>
      own.has(battleKey(battle)),
    );
    archive.mates = [];
    archive.published = {};
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

    if (fetchFresh) await fetchOwnBattles();

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
