import classNames from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import CrossoutLogo from "@src/components/CrossoutLogo";
import type { CrossoutWeaponUnit } from "@src/types/crossout";
import styles from "./WeaponUnitsDialog.module.scss";

type Props = {
  open: boolean;
  status: "loading" | "ready" | "error";
  units: CrossoutWeaponUnit[];
  nameOf: (unit: CrossoutWeaponUnit) => string;
  onClose: () => void;
};

const isQuiet = (unit: CrossoutWeaponUnit) =>
  unit.important === "0" && unit.average === "0" && unit.total === "0";

const WeaponUnitsDialog = ({ open, status, units, nameOf, onClose }: Props) => {
  const { t } = useTranslation("logsPage");

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
                  <th className={styles.name}>{t("logStats.unitsWeapon")}</th>
                  <th className={classNames(styles.center, styles.important)}>
                    {t("logStats.unitsImportantPercent")}
                  </th>
                  <th className={classNames(styles.center, styles.important)}>
                    {t("logStats.unitsImportant")}
                  </th>
                  <th className={styles.center}>{t("logStats.unitsAverage")}</th>
                  <th>{t("logStats.unitsTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
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
