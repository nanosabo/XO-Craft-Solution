import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { logWarning } from "@src/helpers/errorLog";
import useScrollFade from "@src/hooks/useScrollFade";
import {
  CROSSOUT_MAPS,
  type CrossoutErrorCode,
  type CrossoutLogSummary,
  type CrossoutLogTable,
} from "@src/types/crossout";
import styles from "@src/containers/Logs/styles/Logs.module.scss";

const SITE_URL = "https://crossout-info.com";

const pad = (value: number) => String(value).padStart(2, "0");

const normalizeMap = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s-]+/g, "_");

const STAR_PATH =
  "M31.547 12a.848.848 0 00-.677-.577l-9.427-1.376-4.224-8.532a.847.847 0 00-1.516 0l-4.218 8.534-9.427 1.355a.847.847 0 00-.467 1.467l6.823 6.664-1.612 9.375a.847.847 0 001.23.893l8.428-4.434 8.432 4.432a.847.847 0 001.229-.894l-1.615-9.373 6.822-6.665a.845.845 0 00.214-.869z";

type ResultError = {
  code?: CrossoutErrorCode | null;
  message?: string | null;
  fallbackKey?: "result.error";
};

const StarDefs = () => (
  <svg className={styles.starDefs} width="0" height="0" aria-hidden="true">
    <defs>
      <linearGradient id="xocs-grad-orange" x1="0" x2="100%" y1="0" y2="0">
        <stop offset="0%" stopColor="gray" />
        <stop offset="80%" stopColor="#5f3dc4" />
      </linearGradient>
      <mask id="xocs-stars-mask">
        {[0, 20, 40, 60, 80].map((x) => (
          <use key={x} href="#xocs-star" x={x} />
        ))}
      </mask>
      <symbol viewBox="0 0 32 32" id="xocs-star">
        <path fill="#fff" d={STAR_PATH} />
      </symbol>
      <linearGradient id="xocs-white-star-mask" x1="0" x2="100%" y1="0" y2="0">
        <stop offset="0%" stopColor="#151620" />
        <stop offset="100%" stopColor="#151620" />
      </linearGradient>
      <mask id="xocs-stars-mask-back">
        {[0, 20, 40, 60, 80].map((x) => (
          <use key={x} href="#xocs-star" x={x} />
        ))}
      </mask>
    </defs>
  </svg>
);

const StarRating = ({ value }: { value: number }) => {
  const fill = Math.max(0, Math.min(100, value));

  return (
    <span className={styles.logStars} title={`${Math.round(value)}%`}>
      <svg
        className={styles.logStarsSvg}
        width="100"
        height="20"
        aria-hidden="true"
      >
        <g mask="url(#xocs-stars-mask-back)">
          <rect width="100%" height="100%" fill="url(#xocs-white-star-mask)" />
        </g>
      </svg>
      <svg
        className={classNames(styles.logStarsSvg, styles.logStarsFill)}
        width="100"
        height="20"
        aria-hidden="true"
      >
        <g mask="url(#xocs-stars-mask)">
          <rect
            width={`${fill}%`}
            height="100%"
            fill="url(#xocs-grad-orange)"
          />
        </g>
      </svg>
    </span>
  );
};

const LogsResult = () => {
  const { logId = "" } = useParams<{ logId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("logsPage");
  const isRu = Boolean(i18n.language?.startsWith("ru"));
  const contentRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade(contentRef);

  const [summary, setSummary] = useState<CrossoutLogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ResultError | null>(null);
  const [logType, setLogType] = useState<string | null>(null);
  const [logTable, setLogTable] = useState<CrossoutLogTable | null>(null);
  const [logTableLoading, setLogTableLoading] = useState(false);
  const [logTableError, setLogTableError] = useState<ResultError | null>(null);

  const loadLogType = useCallback(async (id: string, slug: string) => {
    setLogType(slug);
    setLogTable(null);
    setLogTableError(null);
    setLogTableLoading(true);

    try {
      const result = await window.electronAPI.crossoutLoadLogTable(id, slug);

      if (result.ok) {
        setLogTable(result.table);
      } else {
        setLogTableError({
          code: result.errorCode,
          message: result.error,
          fallbackKey: "result.error",
        });
      }
    } catch (error) {
      logWarning("crossout-log", error);
      setLogTableError({ fallbackKey: "result.error" });
    } finally {
      setLogTableLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    setSummary(null);
    setError(null);
    setLogType(null);
    setLogTable(null);
    setLogTableError(null);
    setLoading(true);

    const load = async () => {
      try {
        const result = await window.electronAPI.crossoutLoadLog(logId);

        if (cancelled) return;

        if (result.ok) {
          setSummary(result.summary);
          void window.electronAPI
            .crossoutHistorySave({
              logId: result.summary.logId,
              nickname: result.summary.nickname,
              title: result.summary.title,
              types: result.summary.types,
            })
            .catch((historyError) => {
              logWarning("crossout-history", historyError);
            });

          const firstType = result.summary.types[0];

          if (firstType) {
            void loadLogType(logId, firstType.key);
          }
        } else {
          setError({
            code: result.errorCode,
            message: result.error,
            fallbackKey: "result.error",
          });
        }
      } catch (loadError) {
        if (cancelled) return;

        logWarning("crossout-log", loadError);
        setError({ fallbackKey: "result.error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [logId, loadLogType]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = Math.floor(seconds % 60);

    return hours > 0
      ? `${hours}:${pad(minutes)}:${pad(rest)}`
      : `${minutes}:${pad(rest)}`;
  };

  const formatBattleDuration = (value: string) => {
    const minutes = /(\d+)\s*(?:м|m|min)\.?\s*(\d+)\s*(?:с|s|sec)\.?/i.exec(value);

    if (minutes) {
      return formatDuration(Number(minutes[1]) * 60 + Number(minutes[2]));
    }

    const clock = /^(\d+):(\d{1,2})$/.exec(value.trim());

    if (clock) {
      return formatDuration(Number(clock[1]) * 60 + Number(clock[2]));
    }

    return value;
  };

  const mapLabel = (map: string) => {
    if (!map) return "";

    const normalized = normalizeMap(map);
    const option = CROSSOUT_MAPS.find(
      (item) =>
        item.value === normalized ||
        normalizeMap(item.ru) === normalized ||
        normalizeMap(item.en) === normalized,
    );

    if (!option) return map;

    return isRu ? option.ru : option.en;
  };

  const logTypeLabel = (key: string, fallback: string) => {
    const slug = key.toLowerCase();

    if (i18n.exists(`logTypes.${slug}`, { ns: "logsPage" })) {
      return t(`logTypes.${slug}`);
    }

    return fallback || slug.toUpperCase();
  };

  const logCellLabel = (text: string) => {
    const normalized = text.trim().toLowerCase();
    const labels: Record<string, string> = {
      "команда 1": t("logTable.team1"),
      "команда 2": t("logTable.team2"),
      "team 1": t("logTable.team1"),
      "team 2": t("logTable.team2"),
      вооружение: t("logTable.weapon"),
      weapon: t("logTable.weapon"),
      урон: t("logTable.damage"),
      damage: t("logTable.damage"),
      фраг: t("logTable.frag"),
      frag: t("logTable.frag"),
      раунд: t("logTable.round"),
      round: t("logTable.round"),
    };

    return labels[normalized] ?? text;
  };

  const logStatsLabel = (text: string) => {
    const normalized = text.trim().toLowerCase();
    const labels: Record<string, string> = {
      "игрок / вооружение": t("logStats.player"),
      "player / weapon": t("logStats.player"),
      "player / armament": t("logStats.player"),
      рейтинг: t("logStats.rating"),
      rating: t("logStats.rating"),
      винрейт: t("logStats.winrate"),
      winrate: t("logStats.winrate"),
      "win rate": t("logStats.winrate"),
      урон: t("logStats.damage"),
      damage: t("logStats.damage"),
      отстрел: t("logStats.parts"),
      parts: t("logStats.parts"),
      получено: t("logStats.received"),
      received: t("logStats.received"),
      фраг: t("logStats.frags"),
      frag: t("logStats.frags"),
      frags: t("logStats.frags"),
      kills: t("logStats.frags"),
      умер: t("logStats.deaths"),
      deaths: t("logStats.deaths"),
      очки: t("logStats.score"),
      score: t("logStats.score"),
    };

    return labels[normalized] ?? text;
  };

  const errorText = (value: ResultError) => {
    if (
      value.code &&
      i18n.exists(`errors.${value.code}`, { ns: "logsPage" })
    ) {
      return t(`errors.${value.code}`);
    }

    return value.fallbackKey
      ? t(value.fallbackKey)
      : value.message || t("result.error");
  };

  return (
    <div
      ref={contentRef}
      className={classNames(styles.root, {
        [styles.fadeTop]: fade.top,
        [styles.fadeBottom]: fade.bottom,
      })}
    >
      <div className={styles.heading}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate("/logs")}
        >
          ← {t("result.back")}
        </button>
        <h1>{t("result.title")}</h1>
        <p>
          {summary
            ? t("result.subtitle", {
                logId: summary.logId,
                nickname: summary.nickname || "—",
              })
            : error
              ? t("result.error")
              : t("result.loading")}
        </p>
        {summary && (
          <button
            type="button"
            className={styles.linkButton}
            onClick={() =>
              void window.electronAPI.openExternal(
                `${SITE_URL}/log/${summary.logId}`,
              )
            }
          >
            {t("result.openSite")}
          </button>
        )}
      </div>

      <section className={styles.card}>
        {error && <p className={styles.error}>{errorText(error)}</p>}

        {loading && !error && (
          <p className={styles.empty}>{t("result.loading")}</p>
        )}

        {summary && summary.types.length > 0 && (
          <div className={styles.logTabs}>
            {summary.types.map((type) => (
              <button
                key={type.key}
                type="button"
                className={classNames(styles.logTab, {
                  [styles.logTabActive]: logType === type.key,
                })}
                onClick={() => void loadLogType(summary.logId, type.key)}
              >
                <span>{logTypeLabel(type.key, type.label)}</span>
                <span className={styles.logTabCount}>{type.count}</span>
              </button>
            ))}
          </div>
        )}

        {summary && summary.types.length === 0 && !loading && (
          <p className={styles.empty}>{t("log.empty")}</p>
        )}

        {logTableLoading && (
          <p className={styles.empty}>{t("log.tableLoading")}</p>
        )}

        {logTableError && (
          <p className={styles.error}>{errorText(logTableError)}</p>
        )}

        {logTable && !logTableLoading && logTable.rows.length === 0 && (
          <p className={styles.empty}>{t("log.tableEmpty")}</p>
        )}

        {logTable?.stats && logTable.stats.rows.length > 0 && (
          <div className={styles.logStats}>
            <h3 className={styles.logStatsTitle}>{t("logStats.title")}</h3>

            <StarDefs />

            <div className={styles.logTableWrap}>
              <table className={styles.logStatsTable}>
                {logTable.stats.headers.length > 0 && (
                  <thead>
                    <tr>
                      {logTable.stats.headers.map((header, index) => (
                        <th
                          key={`stat-head-${index}`}
                          className={
                            index === 0
                              ? styles.logStatsName
                              : styles.logStatsCenter
                          }
                        >
                          {logStatsLabel(header)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}

                <tbody>
                  {logTable.stats.rows.map((row, rowIndex) => {
                    const teamClass =
                      row.team === "red"
                        ? styles.teamRed
                        : row.team === "green"
                          ? styles.teamGreen
                          : undefined;

                    return (
                      <tr
                        key={`stat-row-${rowIndex}`}
                        className={classNames(teamClass, {
                          [styles.logStatsPlayer]: row.kind === "player",
                          [styles.logStatsWeaponRow]: row.kind === "weapon",
                        })}
                      >
                        {row.cells.map((cell, cellIndex) => {
                          const isWeapon = row.kind === "weapon";
                          const isName = cellIndex === 0;
                          const isRating = isWeapon && cellIndex === 1;
                          const isDamage = isWeapon && cellIndex === 3;

                          return (
                            <td
                              key={`stat-cell-${rowIndex}-${cellIndex}`}
                              className={classNames({
                                [styles.logStatsName]: isName,
                                [styles.logStatsCenter]: !isName,
                                [styles.logStatsRatingCell]: isRating,
                                [styles.logStatsDamageCell]: isDamage,
                              })}
                              title={
                                isName && isWeapon
                                  ? row.weapon || cell
                                  : undefined
                              }
                            >
                              {isName && isWeapon ? (
                                <span className={styles.logStatsWeapon}>
                                  <span className={styles.logStatsWeaponName}>
                                    {row.weapon || cell}
                                  </span>
                                  {row.image && (
                                    <img
                                      className={styles.logStatsWeaponImage}
                                      src={row.image}
                                      alt={row.weapon || cell}
                                      title={row.weapon || cell}
                                      loading="lazy"
                                    />
                                  )}
                                </span>
                              ) : isRating && row.stars !== null ? (
                                <>
                                  <StarRating value={row.stars} />
                                  {cell && (
                                    <span className={styles.logStatsRatingValue}>
                                      {cell}
                                    </span>
                                  )}
                                </>
                              ) : isDamage ? (
                                <>
                                  {row.damage || cell}
                                  {row.delta && (
                                    <span
                                      className={classNames(
                                        styles.logStatsDelta,
                                        row.deltaKind === "up"
                                          ? styles.logStatsDeltaUp
                                          : styles.logStatsDeltaDown,
                                      )}
                                    >
                                      {row.deltaKind === "up" ? "+" : ""}
                                      {row.delta}
                                    </span>
                                  )}
                                </>
                              ) : (
                                cell
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {logTable && logTable.rows.length > 0 && (
          <div className={styles.logTableWrap}>
            <table className={styles.logTable}>
              <tbody>
                {logTable.rows.map((row, rowIndex) => {
                  if (row.battle) {
                    return (
                      <tr
                        key={`battle-${rowIndex}`}
                        className={styles.logBattleRow}
                      >
                        <td
                          className={styles.logBattleCell}
                          colSpan={row.cells[0]?.colSpan || 1}
                        >
                          <span>
                            {t("logTable.battle")} #{row.battle.index}
                          </span>
                          <span>
                            {t("logTable.map")}: {mapLabel(row.battle.map)}
                          </span>
                          <span>
                            {t("logTable.time")}:{" "}
                            {formatBattleDuration(row.battle.duration)}
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  const isHeader =
                    row.cls.includes("sticDiv") || rowIndex === 0;

                  return (
                    <tr
                      key={`row-${rowIndex}`}
                      className={classNames({
                        [styles.logHeadRow]: isHeader,
                      })}
                    >
                      {row.cells.map((cell, cellIndex) => {
                        const teamClass = cell.cls.includes("red")
                          ? styles.teamRed
                          : cell.cls.includes("green")
                            ? styles.teamGreen
                            : undefined;

                        return (
                          <td
                            key={`cell-${rowIndex}-${cellIndex}`}
                            colSpan={cell.colSpan}
                            rowSpan={cell.rowSpan}
                            title={cell.weapon || undefined}
                            className={classNames(styles.logCell, teamClass, {
                              [styles.logCellCenter]:
                                cell.cls.includes("center"),
                              [styles.logCellRight]:
                                cell.cls.includes("alignright"),
                              [styles.logCellLeft]:
                                cell.cls.includes("alignleft"),
                              [styles.destroyed]: cell.destroyed,
                              [styles.logWeaponCell]:
                                !isHeader && Boolean(cell.weapon),
                            })}
                          >
                            {!isHeader && cell.image ? (
                              <img
                                className={styles.logWeaponImage}
                                src={cell.image}
                                alt={cell.weapon}
                                title={cell.weapon}
                                loading="lazy"
                              />
                            ) : isHeader ? (
                              logCellLabel(cell.text)
                            ) : (
                              cell.text || cell.weapon
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default LogsResult;
