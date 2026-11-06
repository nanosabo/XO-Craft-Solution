import type { CrossoutBattle } from "./crossout";

export interface ClanMate {
  nickname: string;
  profileId: string;
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
  battles: CrossoutBattle[];
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
