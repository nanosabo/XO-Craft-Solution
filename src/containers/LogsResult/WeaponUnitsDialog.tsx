import classNames from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import CrossoutLogo from "@src/components/CrossoutLogo";
import type {
  CrossoutWeaponUnit,
  CrossoutWeaponUnitSummary,
} from "@src/types/crossout";
import styles from "./WeaponUnitsDialog.module.scss";

type Props = {
  open: boolean;
  status: "loading" | "ready" | "error";
  units: CrossoutWeaponUnit[];
  summary: CrossoutWeaponUnitSummary | null;
  nameOf: (unit: CrossoutWeaponUnit) => string;
  onClose: () => void;
};

type SortKey = "name" | "importantPercent" | "important" | "average" | "total";
type SortDirection = "desc" | "asc";

const isQuiet = (unit: CrossoutWeaponUnit) =>
  unit.important === "0" && unit.average === "0" && unit.total === "0";

const amount = (value: string) => {
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
};

const winrateTone = (value: string): "high" | "low" | null => {
  const match = /(\d+(?:[.,]\d+)?)\s*%/.exec(value);

  if (!match) return null;

  return Number(match[1].replace(",", ".")) >= 50 ? "high" : "low";
};

const WeaponUnitsDialog = ({
  open,
  status,
  units,
  summary,
  nameOf,
  onClose,
}: Props) => {
  const { t, i18n } = useTranslation("logsPage");
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>(null);
  const unitsKey = units.map((unit) => unit.key).join("\0");

  useEffect(() => {
    setSort(null);
  }, [unitsKey]);

  const sortedUnits = useMemo(() => {
    if (!sort) return units;

    const direction = sort.direction === "desc" ? -1 : 1;

    return [...units].sort((left, right) => {
      const delta =
        sort.key === "name"
          ? nameOf(left).localeCompare(nameOf(right), i18n.language, {
              sensitivity: "base",
            })
          : amount(left[sort.key]) - amount(right[sort.key]);

      if (delta !== 0) return delta * direction;

      return nameOf(left).localeCompare(nameOf(right), i18n.language, {
        sensitivity: "base",
      });
    });
  }, [i18n.language, nameOf, sort, units]);

  const toggleSort = (key: SortKey) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "desc" };

      return {
        key,
        direction: current.direction === "desc" ? "asc" : "desc",
      };
    });
  };

  const columns: { key: SortKey; label: string; className: string }[] = [
    { key: "name", label: t("logStats.unitsWeapon"), className: styles.name },
    {
      key: "importantPercent",
      label: t("logStats.unitsImportantPercent"),
      className: classNames(styles.center, styles.important),
    },
    {
      key: "important",
      label: t("logStats.unitsImportant"),
      className: classNames(styles.center, styles.important),
    },
    {
      key: "average",
      label: t("logStats.unitsAverage"),
      className: styles.center,
    },
    { key: "total", label: t("logStats.unitsTotal"), className: "" },
  ];
  const summaryStats = [
    summary?.rounds
      ? {
          kind: "rounds" as const,
          tone: null,
          label: t("logStats.unitsRounds"),
          value: summary.rounds,
        }
      : null,
    summary?.winrate
      ? {
          kind: "winrate" as const,
          tone: winrateTone(summary.winrate),
          label: t("logStats.unitsWinrate"),
          value: summary.winrate,
        }
      : null,
  ].filter((item) => item !== null);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="weapon-units"
          className={styles.root}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="weapon-units-title"
            aria-busy={status === "loading"}
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
        <div className={styles.head}>
          <h2 id="weapon-units-title">{t("logStats.unitsTitle")}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label={t("logStats.unitsClose")}>
            ×
          </button>
        </div>

        {summary && (summary.name || summaryStats.length > 0) && (
          <div className={styles.summary}>
            {summary.name && <p className={styles.summaryName}>{summary.name}</p>}
            {summaryStats.length > 0 && (
              <dl className={styles.summaryStats}>
                {summaryStats.map((item) => (
                  <div
                    key={item.kind}
                    className={classNames(
                      styles[item.kind],
                      item.tone === "high" && styles.winrateHigh,
                      item.tone === "low" && styles.winrateLow,
                    )}
                  >
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}

        {status === "loading" && (
          <div className={styles.loading} role="status" aria-live="polite">
            <CrossoutLogo />
            <strong>{t("logStats.unitsLoading")}</strong>
            <p>{t("logStats.unitsLoadingHint")}</p>
          </div>
        )}
        {status === "error" && (
          <p className={styles.message}>{t("logStats.unitsError")}</p>
        )}
        {status === "ready" && units.length === 0 && (
          <p className={styles.message}>{t("logStats.unitsEmpty")}</p>
        )}

        {status === "ready" && units.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {columns.map((column) => {
                    const active = sort?.key === column.key;

                    return (
                      <th
                        key={column.key}
                        className={column.className}
                        aria-sort={
                          active
                            ? sort.direction === "desc"
                              ? "descending"
                              : "ascending"
                            : "none"
                        }
                      >
                        <button
                          type="button"
                          className={classNames(
                            styles.sortButton,
                            active && styles.sortOn,
                          )}
                          onClick={() => toggleSort(column.key)}
                        >
                          <span>{column.label}</span>
                          {active && (
                            <span
                              className={classNames(
                                styles.sortMark,
                                sort.direction === "desc"
                                  ? styles.sortDesc
                                  : styles.sortAsc,
                              )}
                              aria-hidden
                            />
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedUnits.map((unit) => (
                  <tr
                    key={unit.key}
                    className={isQuiet(unit) ? styles.quiet : undefined}
                  >
                    <td className={styles.name}>
                      <span className={styles.weapon}>
                        {unit.image && (
                          <span className={styles.icon}>
                            <img src={unit.image} alt="" draggable={false} />
                          </span>
                        )}
                        <span>{nameOf(unit)}</span>
                      </span>
                    </td>
                    <td className={classNames(styles.center, styles.important)}>
                      {unit.importantPercent}
                    </td>
                    <td className={classNames(styles.center, styles.important)}>
                      {unit.important}
                    </td>
                    <td className={classNames(styles.center, styles.number)}>
                      {unit.average}
                    </td>
                    <td className={styles.number}>{unit.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default WeaponUnitsDialog;
