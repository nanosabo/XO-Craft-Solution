import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { logFromClipboard, logResultsPath } from "@src/helpers/appLogLink";
import { contentLanguage } from "@src/helpers/contentLanguage";
import { logWarning } from "@src/helpers/errorLog";
import { teamColorVars } from "@src/helpers/teamColors";
import { selectSettingsState } from "@src/store/slices/settings.slice";
import { useAppSelector } from "@src/store/store";
import type { CrossoutNameCatalog } from "@src/types/crossout";
import CrossoutLogo from "@src/components/CrossoutLogo";
import styles from "@src/containers/Logs/styles/Logs.module.scss";
import LogBoard from "./components/LogBoard";
import LogHeading from "./components/LogHeading";
import LogTimeFilter from "./components/LogTimeFilter";
import LogTypeTabs from "./components/LogTypeTabs";
import WeaponUnitsDialog from "./components/WeaponUnitsDialog";
import { errorText } from "./helpers/labels";
import { timeZoneLabel } from "./helpers/logTime";
import { useLogFilters } from "./hooks/useLogFilters";
import { useLogLoader } from "./hooks/useLogLoader";
import { useLogShare } from "./hooks/useLogShare";
import { useWeaponUnits } from "./hooks/useWeaponUnits";
import type { ResultView } from "./helpers/types";

const LogsResult = () => {
  const { logId = "" } = useParams<{ logId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preferredType = (searchParams.get("type") ?? "").trim().toLowerCase();
  const { t, i18n } = useTranslation("logsPage");
  const namesLanguage = contentLanguage(i18n.language);
  const isRu = namesLanguage === "ru";
  const [nameCatalog, setNameCatalog] = useState<CrossoutNameCatalog | null>(null);
  const [view, setView] = useState<ResultView>("stats");
  const [alliesOnly, setAlliesOnly] = useState(true);
  const [statsQuery, setStatsQuery] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [barStuck, setBarStuck] = useState(false);
  const statsShotRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const barSentinelRef = useRef<HTMLDivElement>(null);
  const battlesSentinelRef = useRef<HTMLDivElement>(null);
  const { teamColors } = useAppSelector(selectSettingsState);
  const teamStyle = useMemo(() => teamColorVars(teamColors), [teamColors]);
  const zoneLabel = useMemo(() => timeZoneLabel(), []);
  const loaded = useLogLoader(logId, preferredType);
  const filters = useLogFilters({
    logTable: loaded.logTable,
    nameCatalog,
    namesLanguage,
    isRu,
    nickname: loaded.summary?.nickname ?? "",
    timeFiltered: loaded.timeFiltered,
    timeFrom: loaded.timeFrom,
    timeTo: loaded.timeTo,
    alliesOnly,
    statsQuery,
    mapQuery,
    view,
    logId,
    scrollRef,
    battlesSentinelRef,
  });
  const units = useWeaponUnits(
    loaded.summary,
    loaded.logType,
    logId,
    nameCatalog,
    namesLanguage,
  );
  const share = useLogShare(
    statsShotRef,
    filters.allyTeam,
    loaded.summary?.logId ?? "",
    loaded.logType,
    isRu,
  );
  const timeSelectOptions = useMemo(
    () => loaded.timeOptions.map((option) => ({
      value: String(option.at),
      label: option.label,
    })),
    [loaded.timeOptions],
  );
  const partyPending =
    loaded.mapLoading &&
    !loaded.logTable?.rows.some((row) => (row.battle?.plays?.length ?? 0) > 0);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = barSentinelRef.current;

    if (!root || !sentinel) {
      setBarStuck(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setBarStuck(!entry.isIntersecting),
      { root, threshold: 1 },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loaded.logTable, loaded.logTableLoading, view]);

  useEffect(() => {
    let cancelled = false;

    void window.electronAPI
      .crossoutNames()
      .then((catalog) => {
        if (!cancelled) setNameCatalog(catalog);
      })
      .catch((error) => logWarning("crossout-names", error));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setView("stats");
    setAlliesOnly(true);
    setStatsQuery("");
    setMapQuery("");
  }, [logId, loaded.logType]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const element = event.target instanceof HTMLElement ? event.target : null;
      const typing =
        element &&
        (element.tagName === "TEXTAREA" ||
          element.tagName === "INPUT" ||
          element.isContentEditable);

      if (typing) return;

      const parsed = logFromClipboard(event.clipboardData?.getData("text") ?? "");

      if (!parsed) return;

      event.preventDefault();
      navigate(logResultsPath(parsed));
    };

    window.addEventListener("paste", onPaste);

    return () => window.removeEventListener("paste", onPaste);
  }, [navigate]);

  const applyTimeFilter = () => {
    if (!loaded.summary || !loaded.logType || loaded.timeOptions.length === 0 || loaded.logTableLoading) {
      return;
    }

    const from = Math.min(loaded.timeFrom, loaded.timeTo);
    const to = Math.max(loaded.timeFrom, loaded.timeTo);
    const full =
      from === loaded.timeOptions[0].at &&
      to === loaded.timeOptions[loaded.timeOptions.length - 1].at;

    loaded.setTimeFrom(from);
    loaded.setTimeTo(to);
    loaded.setTimeFiltered(!full);
  };

  const resetTimeFilter = () => {
    if (!loaded.summary || !loaded.logType || loaded.logTableLoading || loaded.timeOptions.length === 0) {
      return;
    }

    loaded.setTimeFrom(loaded.timeOptions[0].at);
    loaded.setTimeTo(loaded.timeOptions[loaded.timeOptions.length - 1].at);
    loaded.setTimeFiltered(false);
  };

  const openBattles = () => {
    setView("battles");

    if (!loaded.summary || !loaded.logType) return;

    const count = loaded.summary.types.find((type) => type.key === loaded.logType)?.count ?? 0;

    if (loaded.logTableLoading) {
      loaded.wantMapRef.current = true;
      return;
    }

    void loaded.loadMap(loaded.summary.logId, loaded.logType, count, true);
  };

  return (
    <div ref={scrollRef} className={classNames(styles.root, styles.scrollPlain)}>
      <LogHeading
        t={t}
        summary={loaded.summary}
        uploadDate={loaded.uploadDate}
        error={Boolean(loaded.error)}
        isRu={isRu}
        onBack={() => navigate("/logs")}
      />
      <section className={styles.card}>
        {loaded.error && <p className={styles.error}>{errorText(t, i18n, loaded.error)}</p>}
        {loaded.loading && !loaded.error && (
          <div className={styles.processingLogo} role="status" aria-live="polite">
            <CrossoutLogo />
            <strong>{t("log.loading")}</strong>
            <p>{t("result.loading")}</p>
          </div>
        )}
        {loaded.summary && loaded.summary.types.length > 0 && (
          <LogTypeTabs
            t={t}
            i18n={i18n}
            summary={loaded.summary}
            logType={loaded.logType}
            timeOptions={loaded.timeOptions}
            timeOpen={loaded.timeOpen}
            timeFiltered={loaded.timeFiltered}
            onToggleTime={() => loaded.setTimeOpen((open) => !open)}
            onSelect={(key, count) => {
              loaded.setTimeOptions([]);
              loaded.setTimeFiltered(false);
              loaded.setTimeOpen(false);
              void loaded.loadLogType(loaded.summary?.logId ?? logId, key, count);
            }}
          />
        )}
        {loaded.summary && loaded.summary.types.length === 0 && !loaded.loading && (
          <p className={styles.empty}>{t("log.empty")}</p>
        )}
        {loaded.timeOpen && loaded.timeOptions.length > 1 && (
          <LogTimeFilter
            t={t}
            options={timeSelectOptions}
            timeFrom={loaded.timeFrom}
            timeTo={loaded.timeTo}
            timeFiltered={loaded.timeFiltered}
            disabled={loaded.logTableLoading}
            zoneLabel={zoneLabel}
            onFrom={loaded.setTimeFrom}
            onTo={loaded.setTimeTo}
            onApply={applyTimeFilter}
            onReset={resetTimeFilter}
          />
        )}
        {(partyPending || (loaded.logTableLoading && !loaded.logTable)) && (
          <div className={styles.processingLogo} role="status" aria-live="polite">
            <CrossoutLogo />
            <strong>{t("log.tableLoading")}</strong>
          </div>
        )}
        {loaded.logTableError && (
          <p className={styles.error}>{errorText(t, i18n, loaded.logTableError)}</p>
        )}
        {loaded.logTable && !partyPending && (
          <LogBoard
            t={t}
            view={view}
            barStuck={barStuck}
            teamStyle={teamStyle}
            barSentinelRef={barSentinelRef}
            statsShotRef={statsShotRef}
            battlesSentinelRef={battlesSentinelRef}
            statsHeaders={loaded.logTable.stats?.headers ?? []}
            filteredStats={filters.filteredStats}
            statsEmpty={!loaded.logTable.stats?.rows.length}
            mapLoading={loaded.mapLoading}
            battlesEmpty={loaded.logTable.rows.length === 0}
            filteredBattlesEmpty={filters.filteredBattles.length === 0}
            visibleBattles={filters.visibleBattles}
            battleColumns={filters.battleColumns}
            hasMoreBattles={filters.hasMoreBattles}
            mapLabel={filters.mapLabel}
            statsQuery={statsQuery}
            mapQuery={mapQuery}
            alliesOnly={alliesOnly}
            shotBusy={share.shotBusy}
            shotCopied={share.shotCopied}
            linksCopied={share.linksCopied}
            linksDisabled={!loaded.summary}
            onStats={() => setView("stats")}
            onBattles={openBattles}
            onStatsQuery={setStatsQuery}
            onMapQuery={setMapQuery}
            onAlliesOnly={setAlliesOnly}
            onShot={() => void share.copyScreenshot()}
            onLinks={() => void share.copyLinks()}
            onOpenUnits={units.openWeaponUnits}
          />
        )}
      </section>
      <WeaponUnitsDialog
        open={units.weaponUnits != null}
        status={units.weaponUnits?.status ?? "loading"}
        units={units.weaponUnits?.units ?? []}
        summary={units.weaponUnits?.summary ?? null}
        nameOf={units.weaponUnitName}
        onClose={units.closeWeaponUnits}
      />
    </div>
  );
};

export default LogsResult;
