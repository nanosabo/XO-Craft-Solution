import { useCallback } from "react";
import { logWarning } from "@src/helpers/errorLog";
import type { CrossoutLogTable } from "@src/types/crossout";
import { saveStatsCache } from "../helpers/saveStatsCache";
import { cachedTable, cachedTableReady } from "../helpers/tableCache";
import type { LogSession } from "./logSession";

const battleCount = (value: CrossoutLogTable | null) =>
  value?.rows.filter((row) => row.battle).length ?? 0;

type LoadMap = (
  id: string,
  slug: string,
  expectedBattles?: number,
  announce?: boolean,
) => Promise<void>;

/** Loads the stats table, using a ready cache and asking for battles afterwards. */
export const useLogStats = (session: LogSession, loadMap: LoadMap) =>
  useCallback(async (
    id: string,
    slug: string,
    expectedBattles = 0,
    range?: { from: number; to: number } | null,
  ) => {
    const seq = ++session.loadSeq.current;

    session.mapSeq.current += 1;
    session.mapFlight.current = "";
    session.mapAnnounceRef.current = false;
    session.wantMapRef.current = false;
    session.setMapLoading(false);
    session.setLogTableLoading(true);
    session.setLogType(slug);

    let staleTable: CrossoutLogTable | null = null;

    if (!range) {
      try {
        const cached = await window.electronAPI.crossoutStatsCacheGet(id);

        if (seq !== session.loadSeq.current) return;

        const table = cached ? cachedTable(cached.tables, slug) : null;

        if (table?.rows.some((row) => row.battle)) staleTable = table;

        if (cachedTableReady(table)) {
          session.setLogTableError(null);
          session.setLogTableLoading(false);
          const stored = session.applyLoadedTable(table, false);
          const announce = session.wantMapRef.current;

          session.wantMapRef.current = false;

          if (!stored.rows.some((row) => row.battle)) {
            void loadMap(id, slug, expectedBattles, announce);
          }

          return;
        }
      } catch (error) {
        logWarning("crossout-stats-cache", error);
      }

      if (seq !== session.loadSeq.current) return;

      session.logTableRef.current = null;
      session.setLogTable(null);
    }

    session.setLogTableError(null);
    session.setLogTableLoading(true);

    try {
      const result = await window.electronAPI.crossoutLoadLogTable(
        id,
        slug,
        expectedBattles,
        range,
        "stats",
      );

      if (seq !== session.loadSeq.current) return;

      if (!result.ok) {
        session.setLogTableError({
          code: result.errorCode,
          message: result.error,
          fallbackKey: "result.error",
        });
        return;
      }

      const incomingBattles = battleCount(result.table) > 0;
      const keepRows = Boolean(
        staleTable && battleCount(result.table) < battleCount(staleTable),
      );
      const table = keepRows && staleTable
        ? {
            ...staleTable,
            stats: result.table.stats ?? staleTable.stats,
            nickname: result.table.nickname || staleTable.nickname,
            partyGrouped: true,
          }
        : result.table;
      const stored = session.applyLoadedTable(table, Boolean(range));
      const worthSaving = Boolean(
        result.table.stats?.rows.length || incomingBattles || keepRows,
      );

      if (!range && worthSaving) {
        saveStatsCache(session.summaryRef.current, stored, id);
      }

      const announce = session.wantMapRef.current;

      session.wantMapRef.current = false;

      if (!range && !stored.rows.some((row) => row.battle)) {
        void loadMap(id, slug, expectedBattles, announce);
      }
    } catch (error) {
      logWarning("crossout-log", error);
      session.setLogTableError({ fallbackKey: "result.error" });
    } finally {
      if (seq === session.loadSeq.current) session.setLogTableLoading(false);
    }
  }, [loadMap, session]);
