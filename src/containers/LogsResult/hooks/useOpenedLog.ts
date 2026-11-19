import { useEffect } from "react";
import { logWarning } from "@src/helpers/errorLog";
import type { CrossoutLogSummary } from "@src/types/crossout";
import { cachedTable, cachedTableReady } from "../helpers/tableCache";
import type { LogSession } from "./logSession";

type LoadMap = (
  id: string,
  slug: string,
  expectedBattles?: number,
  announce?: boolean,
) => Promise<void>;

type LoadStats = (
  id: string,
  slug: string,
  expectedBattles?: number,
) => Promise<void>;

const rememberSummary = (
  session: LogSession,
  next: CrossoutLogSummary,
) => {
  session.summaryRef.current = next;
  session.setSummary(next);
  void window.electronAPI
    .crossoutHistorySave({
      logId: next.logId,
      nickname: next.nickname,
      title: next.title,
      types: next.types,
    })
    .catch((historyError) => {
      logWarning("crossout-history", historyError);
    });
};

/** Opens a log from cache, or downloads its summary and the first battle type. */
export const useOpenedLog = (
  session: LogSession,
  loadMap: LoadMap,
  loadStats: LoadStats,
  logId: string,
  preferredType: string,
) => {
  useEffect(() => {
    let cancelled = false;
    const logoTimer = window.setTimeout(() => {
      if (!cancelled) session.setLoading(true);
    }, 160);

    session.summaryRef.current = null;
    session.logTableRef.current = null;
    session.mapSeq.current += 1;
    session.mapFlight.current = "";
    session.mapAnnounceRef.current = false;
    session.wantMapRef.current = false;
    session.setSummary(null);
    session.setError(null);
    session.setLogType(null);
    session.setLogTable(null);
    session.setLogTableError(null);
    session.setUploadDate("");
    session.setTimeOptions([]);
    session.setTimeFrom(0);
    session.setTimeTo(0);
    session.setTimeFiltered(false);
    session.setTimeOpen(false);
    session.setLoading(false);

    const load = async () => {
      try {
        const cached = await window.electronAPI.crossoutStatsCacheGet(logId);

        if (cancelled) return;

        if (cached) {
          rememberSummary(session, cached.summary);

          const matched = cached.summary.types.find(
            (type) => type.key.toLowerCase() === preferredType,
          );
          const firstType = matched ?? cached.summary.types[0];
          const table = firstType
            ? cachedTable(cached.tables, firstType.key)
            : null;

          window.clearTimeout(logoTimer);
          session.setLoading(false);

          if (cachedTableReady(table) && firstType) {
            session.setLogType(firstType.key);
            const stored = session.applyLoadedTable(table, false);

            if (!stored.rows.some((row) => row.battle)) {
              void loadMap(logId, firstType.key, firstType.count, false);
            }

            return;
          }

          if (firstType) void loadStats(logId, firstType.key, firstType.count);

          return;
        }
      } catch (cacheError) {
        logWarning("crossout-stats-cache", cacheError);
      }

      if (cancelled) return;

      session.setLoading(true);

      try {
        const result = await window.electronAPI.crossoutLoadLog(logId);

        if (cancelled) return;

        if (!result.ok) {
          session.setError({
            code: result.errorCode,
            message: result.error,
            fallbackKey: "result.error",
          });
          return;
        }

        rememberSummary(session, result.summary);

        const matched = result.summary.types.find(
          (type) => type.key.toLowerCase() === preferredType,
        );
        const firstType = matched ?? result.summary.types[0];

        if (firstType) void loadStats(logId, firstType.key, firstType.count);
      } catch (loadError) {
        if (cancelled) return;

        logWarning("crossout-log", loadError);
        session.setError({ fallbackKey: "result.error" });
      } finally {
        window.clearTimeout(logoTimer);
        if (!cancelled) session.setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      window.clearTimeout(logoTimer);
    };
  }, [loadMap, loadStats, logId, preferredType, session]);
};
