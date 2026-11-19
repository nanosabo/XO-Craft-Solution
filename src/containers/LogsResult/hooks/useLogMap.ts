import { useCallback } from "react";
import { logWarning } from "@src/helpers/errorLog";
import { saveStatsCache } from "../helpers/saveStatsCache";
import type { LogSession } from "./logSession";

/** Loads the battle list and merges it into the stats already on screen. */
export const useLogMap = (session: LogSession) =>
  useCallback(async (
    id: string,
    slug: string,
    expectedBattles = 0,
    announce = false,
  ) => {
    const current = session.logTableRef.current;
    const key = `${id}:${slug}`;

    if (announce) session.mapAnnounceRef.current = true;
    if (current?.type === slug && current.rows.some((row) => row.battle)) return;
    if (session.mapFlight.current === key) return;

    const seq = ++session.mapSeq.current;

    session.mapFlight.current = key;
    session.setMapLoading(true);
    if (announce) session.setLogTableError(null);

    try {
      const result = await window.electronAPI.crossoutLoadLogTable(
        id,
        slug,
        expectedBattles,
        null,
        "map",
      );

      if (seq !== session.mapSeq.current) return;

      if (!result.ok) {
        if (session.mapAnnounceRef.current) {
          session.setLogTableError({
            code: result.errorCode,
            message: result.error,
            fallbackKey: "result.error",
          });
        }
        return;
      }

      const previous = session.logTableRef.current;
      const table = previous && previous.type === slug
        ? {
            ...previous,
            rows: result.table.rows,
            times: result.table.times,
            date: result.table.date || previous.date,
            nickname: result.table.nickname || previous.nickname,
          }
        : result.table;
      const stored = session.applyLoadedTable(table, false);

      saveStatsCache(session.summaryRef.current, stored, id);
    } catch (error) {
      if (seq !== session.mapSeq.current) return;

      logWarning("crossout-log", error);
      if (session.mapAnnounceRef.current) {
        session.setLogTableError({ fallbackKey: "result.error" });
      }
    } finally {
      if (seq === session.mapSeq.current) {
        if (session.mapFlight.current === key) session.mapFlight.current = "";
        session.setMapLoading(false);
      }
    }
  }, [session]);
