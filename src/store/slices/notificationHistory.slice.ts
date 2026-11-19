import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { FollowMetric } from "../follow";
import type { PriceSignalKind } from "../signals";
import type { RootState } from "../store";

/** Kept in memory only, so quitting the app drops the list. */
const HISTORY_LIMIT = 100;

export type NotificationEntryKind = "rule" | "price" | "craft";

export interface NotificationHistoryEntry {
  id: string;
  itemId: number;
  name: string;
  kind: NotificationEntryKind;
  at: number;
  seen: boolean;
  /** Rule-based entries. */
  metric?: FollowMetric;
  value?: number;
  previous?: number;
  /** Smart price entries. */
  signal?: PriceSignalKind;
  adviceKey?: string;
  lotsKey?: string | null;
  /** Smart craft entries. */
  profit?: number;
  isOwn?: boolean;
}

interface NotificationHistoryState {
  entries: NotificationHistoryEntry[];
}

const initialState: NotificationHistoryState = {
  entries: [],
};

const notificationHistorySlice = createSlice({
  name: "notificationHistory",
  initialState,
  reducers: {
    pushNotificationHistory(
      state,
      action: PayloadAction<Omit<NotificationHistoryEntry, "seen">>,
    ) {
      state.entries.unshift({ ...action.payload, seen: false });

      if (state.entries.length > HISTORY_LIMIT) {
        state.entries.length = HISTORY_LIMIT;
      }
    },
    markNotificationHistorySeen(state) {
      for (const entry of state.entries) {
        entry.seen = true;
      }
    },
    clearNotificationHistory(state) {
      state.entries = [];
    },
  },
});

export const {
  pushNotificationHistory,
  markNotificationHistorySeen,
  clearNotificationHistory,
} = notificationHistorySlice.actions;

export const selectNotificationHistory = (state: RootState) =>
  state.notificationHistory.entries;

export default notificationHistorySlice.reducer;
