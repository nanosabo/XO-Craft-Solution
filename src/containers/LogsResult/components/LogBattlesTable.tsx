import classNames from "classnames";
import type { RefObject } from "react";
import type { TFunction } from "i18next";
import type { CrossoutLogRow } from "@src/types/crossout";
import styles from "@src/containers/Logs/styles/Logs.module.scss";
import { logCellLabel } from "../helpers/labels";

type Props = {
  rows: CrossoutLogRow[];
  columns: number[];
  hasMore: boolean;
  sentinelRef: RefObject<HTMLDivElement>;
  t: TFunction;
  mapLabel: (map: string) => string;
  formatDuration: (value: string) => string;
};

const LogBattlesTable = ({
  rows,
  columns,
  hasMore,
  sentinelRef,
  t,
  mapLabel,
  formatDuration,
}: Props) => (
              <div className={styles.logTableWrap}>
                <table
                  className={classNames(styles.logTable, {
                    [styles.logTableFixed]: columns.length > 0,
                  })}
                >
                  {columns.length > 0 && (
                    <colgroup>
                      {columns.map((width, index) => (
                        <col
                          key={`battle-col-${index}`}
                          style={{ width: `${width}%` }}
                        />
                      ))}
                    </colgroup>
                  )}
                  <tbody>
                    {rows.map((row, rowIndex) => {
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
                              <div className={styles.logBattleMeta}>
                                <span>
                                  {t("logTable.battle")} #{row.battle.index}
                                </span>
                                <span>
                                  {t("logTable.map")}: {mapLabel(row.battle.map)}
                                </span>
                                <span>
                                  {t("logTable.time")}:{" "}
                                  {formatDuration(row.battle.duration)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const isHeader =
                        row.cls.includes("sticDiv") ||
                        (rowIndex === 0 &&
                          row.cells.every((cell) => !cell.image && !cell.weapon));

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

                            const pictures =
                              cell.images?.length
                                ? cell.images
                                : cell.image
                                  ? [
                                      {
                                        src: cell.image,
                                        name: cell.weapon,
                                        destroyed: cell.destroyed,
                                      },
                                    ]
                                  : [];
                            const pictureNames = pictures
                              .map((item) => item.name)
                              .filter(Boolean)
                              .join(", ");

                            const alignLeft = cell.cls.includes("alignleft");
                            const alignRight = cell.cls.includes("alignright");

                            return (
                              <td
                                key={`cell-${rowIndex}-${cellIndex}`}
                                colSpan={cell.colSpan}
                                rowSpan={cell.rowSpan}
                                title={pictureNames || cell.weapon || undefined}
                                className={classNames(styles.logCell, teamClass, {
                                  [styles.destroyed]:
                                    cell.destroyed && pictures.length === 0,
                                  [styles.logWeaponCell]:
                                    !isHeader && pictures.length > 0,
                                  [styles.logAlignLeft]: alignLeft,
                                  [styles.logAlignRight]: alignRight,
                                  [styles.logBorderLeft]: cell.cls.includes("brl"),
                                  [styles.logBorderRight]: cell.cls.includes("brr"),
                                })}
                              >
                                {!isHeader && pictures.length > 0 ? (
                                  <span
                                    className={classNames(styles.logWeaponStrip, {
                                      [styles.logWeaponStripStart]: alignLeft,
                                      [styles.logWeaponStripEnd]: alignRight,
                                    })}
                                  >
                                    {pictures.map((item, imageIndex) => (
                                      <span
                                        key={`${item.src}-${imageIndex}`}
                                        className={styles.logWeaponFrame}
                                        title={item.name || undefined}
                                      >
                                        <img
                                          className={classNames(
                                            styles.logWeaponImage,
                                            {
                                              [styles.logWeaponDestroyed]:
                                                item.destroyed,
                                            },
                                          )}
                                          src={item.src}
                                          alt={item.name}
                                          loading="lazy"
                                        />
                                      </span>
                                    ))}
                                  </span>
                                ) : isHeader ? (
                                  logCellLabel(t, cell.text)
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
                {hasMore && (
                  <div
                    ref={sentinelRef}
                    className={styles.logBattlesSentinel}
                    aria-hidden="true"
                  />
                )}
              </div>
);

export default LogBattlesTable;
