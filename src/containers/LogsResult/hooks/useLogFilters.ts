import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import type { CrossoutLogTable, CrossoutNameCatalog } from "@src/types/crossout";
import {
  allyTeamOf,
  battleColumnWidths,
  filterBattleRows,
  filterStatRows,
  pageBattles,
} from "../helpers/filterRows";
import { mapTitle } from "../helpers/mapTitle";
import { localizeLogTable } from "../helpers/localizeTable";
import { statsForRange } from "../helpers/rangeStats";

const BATTLE_PAGE_SIZE = 10;

type Args = {
  logTable: CrossoutLogTable | null;
  nameCatalog: CrossoutNameCatalog | null;
  namesLanguage: "ru" | "en";
  isRu: boolean;
  nickname: string;
  timeFiltered: boolean;
  timeFrom: number;
  timeTo: number;
  alliesOnly: boolean;
  statsQuery: string;
  mapQuery: string;
  view: "stats" | "battles";
  logId: string;
  scrollRef: RefObject<HTMLDivElement>;
  battlesSentinelRef: RefObject<HTMLDivElement>;
};

export const useLogFilters = ({
  logTable,
  nameCatalog,
  namesLanguage,
  isRu,
  nickname,
  timeFiltered,
  timeFrom,
  timeTo,
  alliesOnly,
  statsQuery,
  mapQuery,
  view,
  logId,
  scrollRef,
  battlesSentinelRef,
}: Args) => {
  const [battleLimit, setBattleLimit] = useState(BATTLE_PAGE_SIZE);
  const mapLabel = useCallback((map: string) => mapTitle(map, isRu), [isRu]);
  const shownTable = useMemo(
    () => localizeLogTable(logTable, nameCatalog, namesLanguage),
    [logTable, nameCatalog, namesLanguage],
  );
  const allyTeam = useMemo(
    () => allyTeamOf(shownTable, nickname),
    [nickname, shownTable],
  );
  const rangedStats = useMemo(() => {
    if (!timeFiltered || !shownTable) return null;

    return statsForRange(
      shownTable,
      Math.min(timeFrom, timeTo),
      Math.max(timeFrom, timeTo),
      nameCatalog,
      namesLanguage,
    );
  }, [nameCatalog, namesLanguage, shownTable, timeFiltered, timeFrom, timeTo]);
  const filteredStats = useMemo(
    () => filterStatRows(rangedStats ?? shownTable?.stats?.rows ?? [], {
      query: statsQuery,
      alliesOnly,
      allyTeam,
      nickname: shownTable?.nickname || nickname,
    }),
    [alliesOnly, allyTeam, nickname, rangedStats, shownTable, statsQuery],
  );
  const filteredBattles = useMemo(
    () => filterBattleRows(shownTable?.rows ?? [], {
      query: mapQuery,
      timeFiltered,
      from: Math.min(timeFrom, timeTo),
      to: Math.max(timeFrom, timeTo),
      mapLabel,
    }),
    [mapLabel, mapQuery, shownTable, timeFiltered, timeFrom, timeTo],
  );
  const battleColumns = useMemo(
    () => battleColumnWidths(filteredBattles),
    [filteredBattles],
  );
  const visibleBattles = useMemo(
    () => pageBattles(filteredBattles, battleLimit),
    [battleLimit, filteredBattles],
  );
  const hasMoreBattles = visibleBattles.length < filteredBattles.length;

  useEffect(() => {
    setBattleLimit(BATTLE_PAGE_SIZE);
  }, [logId, mapQuery, timeFiltered, timeFrom, timeTo]);

  useEffect(() => {
    const sentinel = battlesSentinelRef.current;

    if (view !== "battles" || !hasMoreBattles || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBattleLimit((prev) => prev + BATTLE_PAGE_SIZE);
        }
      },
      { root: scrollRef.current, rootMargin: "600px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [battleLimit, battlesSentinelRef, hasMoreBattles, scrollRef, view]);

  return {
    mapLabel,
    allyTeam,
    filteredStats,
    filteredBattles,
    battleColumns,
    visibleBattles,
    hasMoreBattles,
  };
};
