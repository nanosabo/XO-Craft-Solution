export interface ClanMate {
  nickname: string;
  profileId: string;
}

export interface ClanLogType {
  key: string;
  label: string;
  count: number;
}

/** A stats link shared with the clan. Opens the same log screen as a pasted link. */
export interface ClanLog {
  logId: string;
  nickname: string;
  title: string;
  types: ClanLogType[];
  /** Site upload date as local-midnight unix milliseconds. 0 when unknown. */
  uploadedAt: number;
  /** When this install first saved the log, in unix milliseconds. */
  savedAt: number;
}

export interface ClanRelayStatus {
  url: string;
  connected: boolean;
}

export type ClanSyncStatus = "idle" | "syncing" | "online" | "offline";

export type ClanSyncDetail =
  | ""
  | "need-code"
  | "need-profile"
  | "bad-profile"
  | "profile-failed"
  | "online"
  | "offline"
  | "syncing";

export type ClanSyncStep = "" | "profile" | "battles" | "publish" | "live";

export interface ClanState {
  code: string;
  profileId: string;
  nickname: string;
  mates: ClanMate[];
  logs: ClanLog[];
  status: ClanSyncStatus;
  detail: ClanSyncDetail;
  /** Unexpected failure text. Empty when `detail` covers the situation. */
  message: string;
  step: ClanSyncStep;
  relays: ClanRelayStatus[];
  updatedAt: number;
}

export interface ClanSyncInput {
  profile: string;
  code: string;
}
