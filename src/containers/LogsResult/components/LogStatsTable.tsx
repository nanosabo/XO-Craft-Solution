import classNames from "classnames";
import type { RefObject } from "react";
import type { TFunction } from "i18next";
import type { CrossoutLogStatRow } from "@src/types/crossout";
import styles from "@src/containers/Logs/styles/Logs.module.scss";
import { statColumnWeight } from "../helpers/columns";
import { logStatsLabel } from "../helpers/labels";
import StarRating from "./StarRating";

type Props = {
  headers: string[];
  rows: CrossoutLogStatRow[];
  shotRef: RefObject<HTMLDivElement>;
  t: TFunction;
  onOpenUnits: (player: string, row: CrossoutLogStatRow) => void;
};

const LogStatsTable = ({ headers, rows, shotRef, t, onOpenUnits }: Props) => (
  <div className={styles.logStats} ref={shotRef}>
                <div className={classNames(styles.logTableWrap, styles.logStatsWrap)}>
                  <table className={styles.logStatsTable}>
                    {headers.length > 0 && (
                      <colgroup>
                        {headers.map((_, index, headers) => {
                          const total = headers.reduce(
                            (sum, _header, headerIndex) =>
                              sum + statColumnWeight(headerIndex),
                            0,
                          );

                          return (
                            <col
                              key={`stat-col-${index}`}
                              style={{
                                width: `${(statColumnWeight(index) / total) * 100}%`,
                              }}
                            />
                          );
                        })}
                      </colgroup>
                    )}
                    {headers.length > 0 && (
                      <thead>
                        <tr>
                          {headers.map((header, index) => (
                            <th
                              key={`stat-head-${index}`}
                              className={
                                index === 0
                                  ? styles.logStatsName
                                  : styles.logStatsCenter
                              }
                            >
                              {logStatsLabel(t, header)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    )}

                    <tbody>
                      {rows.map((row, rowIndex) => {
                        const teamClass =
                          row.team === "red"
                            ? styles.teamRed
                            : row.team === "green"
                              ? styles.teamGreen
                              : undefined;
                        const weaponKeys = row.keys?.filter(Boolean) ?? [];
                        const canOpenUnits =
                          row.kind === "weapon" && weaponKeys.length > 0;
                        const playerName = (() => {
                          for (let index = rowIndex; index >= 0; index -= 1) {
                            const previous = rows[index];

                            if (previous.kind === "player") return previous.name;
                          }

                          return "";
                        })();

                        return (
                          <tr
                            key={`stat-row-${rowIndex}`}
                            data-team={row.team || undefined}
                            className={classNames(teamClass, {
                              [styles.logStatsPlayer]: row.kind === "player",
                              [styles.logStatsWeaponRow]: row.kind === "weapon",
                              [styles.logStatsWeaponHit]: canOpenUnits,
                            })}
                            title={
                              canOpenUnits ? t("logStats.unitsOpen") : undefined
                            }
                            onClick={
                              canOpenUnits
                                ? () => onOpenUnits(playerName, row)
                                : undefined
                            }
                          >
                            {row.cells.map((cell, cellIndex) => {
                              const isWeapon = row.kind === "weapon";
                              const isName = cellIndex === 0;
                              const isRating = isWeapon && cellIndex === 1;
                              const isDamage = isWeapon && cellIndex === 3;
                              const deltaLabel = row.delta
                                ? /^-|^\+/.test(row.delta)
                                  ? row.delta
                                  : `${row.deltaKind === "down" ? "-" : "+"}${row.delta}`
                                : "";

                              return (
                                <td
                                  key={`stat-cell-${rowIndex}-${cellIndex}`}
                                  className={classNames({
                                    [styles.logStatsName]: isName,
                                    [styles.logStatsCenter]: !isName,
                                  })}
                                  title={
                                    isName ? row.weapon || row.name || cell : undefined
                                  }
                                >
                                  {isName && isWeapon ? (
                                    <span className={styles.logStatsWeapon}>
                                      <span className={styles.logStatsWeaponIcons}>
                                        {(row.images?.length
                                          ? row.images
                                          : row.image
                                            ? [row.image]
                                            : []
                                        ).map((src, imageIndex) => (
                                          <span
                                            key={`${src}-${imageIndex}`}
                                            className={styles.logStatsWeaponIcon}
                                          >
                                            <img
                                              className={styles.logStatsWeaponImage}
                                              src={src}
                                              alt=""
                                              loading="lazy"
                                            />
                                          </span>
                                        ))}
                                      </span>
                                      <span className={styles.logStatsWeaponName}>
                                        {row.weapon || cell}
                                      </span>
                                    </span>
                                  ) : isRating && row.stars !== null ? (
                                    <span className={styles.logStatsFigure}>
                                      <StarRating value={row.stars} />
                                      {cell && (
                                        <sup className={styles.logStatsSup}>
                                          {cell}
                                        </sup>
                                      )}
                                    </span>
                                  ) : isDamage ? (
                                    <span className={styles.logStatsFigure}>
                                      <span>{row.damage || cell}</span>
                                      {deltaLabel && (
                                        <sup
                                          className={classNames(
                                            styles.logStatsSup,
                                            row.deltaKind === "up"
                                              ? styles.logStatsDeltaUp
                                              : styles.logStatsDeltaDown,
                                          )}
                                        >
                                          {deltaLabel}
                                        </sup>
                                      )}
                                    </span>
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
);

export default LogStatsTable;
