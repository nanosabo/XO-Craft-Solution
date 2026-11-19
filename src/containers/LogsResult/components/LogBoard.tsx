import classNames from "classnames";
import type { CSSProperties, RefObject } from "react";
import type { TFunction } from "i18next";
import type { CrossoutLogRow, CrossoutLogStatRow } from "@src/types/crossout";
import CrossoutLogo from "@src/components/CrossoutLogo";
import Switch from "@src/containers/Settings/components/Switch";
import Input from "@src/ui/Input";
import { CameraIcon, LinkIcon } from "@src/ui/icons";
import { formatBattleDuration } from "../helpers/logTime";
import styles from "@src/containers/Logs/styles/Logs.module.scss";
import LogBattlesTable from "./LogBattlesTable";
import LogStatsTable from "./LogStatsTable";

type Props = {
  t: TFunction;
  view: "stats" | "battles";
  barStuck: boolean;
  teamStyle: CSSProperties;
  barSentinelRef: RefObject<HTMLDivElement>;
  statsShotRef: RefObject<HTMLDivElement>;
  battlesSentinelRef: RefObject<HTMLDivElement>;
  statsHeaders: string[];
  filteredStats: CrossoutLogStatRow[];
  statsEmpty: boolean;
  mapLoading: boolean;
  battlesEmpty: boolean;
  filteredBattlesEmpty: boolean;
  visibleBattles: CrossoutLogRow[];
  battleColumns: number[];
  hasMoreBattles: boolean;
  mapLabel: (map: string) => string;
  statsQuery: string;
  mapQuery: string;
  alliesOnly: boolean;
  shotBusy: boolean;
  shotCopied: boolean;
  linksCopied: boolean;
  linksDisabled: boolean;
  onStats: () => void;
  onBattles: () => void;
  onStatsQuery: (value: string) => void;
  onMapQuery: (value: string) => void;
  onAlliesOnly: (value: boolean) => void;
  onShot: () => void;
  onLinks: () => void;
  onOpenUnits: (player: string, row: CrossoutLogStatRow) => void;
};

const LogBoard = ({
  t,
  view,
  barStuck,
  teamStyle,
  barSentinelRef,
  statsShotRef,
  battlesSentinelRef,
  statsHeaders,
  filteredStats,
  statsEmpty,
  mapLoading,
  battlesEmpty,
  filteredBattlesEmpty,
  visibleBattles,
  battleColumns,
  hasMoreBattles,
  mapLabel,
  statsQuery,
  mapQuery,
  alliesOnly,
  shotBusy,
  shotCopied,
  linksCopied,
  linksDisabled,
  onStats,
  onBattles,
  onStatsQuery,
  onMapQuery,
  onAlliesOnly,
  onShot,
  onLinks,
  onOpenUnits,
}: Props) => (
  <div
    className={classNames(styles.logView, {
      [styles.logViewStuck]: barStuck,
    })}
    style={teamStyle}
  >
    <div ref={barSentinelRef} className={styles.logViewSentinel} />
    <div className={styles.logViewCorners} aria-hidden="true">
      <span />
      <span />
    </div>
    <div
      className={classNames(styles.logViewBar, {
        [styles.logViewBarStuck]: barStuck,
      })}
    >
      <div className={styles.logSegment} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={view === "stats"}
          className={classNames(styles.logSegmentButton, {
            [styles.logSegmentActive]: view === "stats",
          })}
          onClick={onStats}
        >
          {t("logView.stats")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "battles"}
          className={classNames(styles.logSegmentButton, {
            [styles.logSegmentActive]: view === "battles",
          })}
          onClick={onBattles}
        >
          {t("logView.battles")}
        </button>
      </div>
      {view === "stats" ? (
        <div className={styles.logViewTools}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={shotBusy || filteredStats.length === 0}
            onClick={onShot}
          >
            <CameraIcon />
            {shotCopied ? t("logView.shotCopied") : t("logView.copyShot")}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={linksDisabled}
            onClick={onLinks}
          >
            <LinkIcon />
            {linksCopied ? t("logView.linksCopied") : t("logView.copyLinks")}
          </button>
          <div className={styles.logSearch}>
            <Input
              type="search"
              value={statsQuery}
              placeholder={t("logView.searchPlayer")}
              onChange={(event) => onStatsQuery(event.target.value)}
            />
          </div>
          <div className={styles.logEnemyToggle}>
            <span>{t("logView.alliesOnly")}</span>
            <Switch
              checked={alliesOnly}
              onChange={onAlliesOnly}
              label={t("logView.alliesOnly")}
            />
          </div>
        </div>
      ) : (
        <div className={styles.logViewTools}>
          <div className={styles.logSearch}>
            <Input
              type="search"
              value={mapQuery}
              placeholder={t("logView.searchMap")}
              onChange={(event) => onMapQuery(event.target.value)}
            />
          </div>
        </div>
      )}
    </div>
    {view === "stats" && statsEmpty && (
      <p className={styles.empty}>{t("log.tableEmpty")}</p>
    )}
    {view === "stats" && !statsEmpty && filteredStats.length === 0 && (
      <p className={styles.empty}>{t("logView.nothing")}</p>
    )}
    {view === "battles" && mapLoading && (
      <div className={styles.processingLogo} role="status" aria-live="polite">
        <CrossoutLogo />
        <strong>{t("log.tableLoading")}</strong>
      </div>
    )}
    {view === "battles" && !mapLoading && battlesEmpty && (
      <p className={styles.empty}>{t("log.tableEmpty")}</p>
    )}
    {view === "battles" && !battlesEmpty && filteredBattlesEmpty && (
      <p className={styles.empty}>{t("logView.nothing")}</p>
    )}
    {view === "stats" && filteredStats.length > 0 && (
      <LogStatsTable
        headers={statsHeaders}
        rows={filteredStats}
        shotRef={statsShotRef}
        t={t}
        onOpenUnits={onOpenUnits}
      />
    )}
    {view === "battles" && !filteredBattlesEmpty && (
      <LogBattlesTable
        rows={visibleBattles}
        columns={battleColumns}
        hasMore={hasMoreBattles}
        sentinelRef={battlesSentinelRef}
        t={t}
        mapLabel={mapLabel}
        formatDuration={formatBattleDuration}
      />
    )}
  </div>
);

export default LogBoard;
