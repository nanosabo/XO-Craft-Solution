import classNames from "classnames";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import PartImage from "../components/PartImage";
import PartSummary from "../components/PartSummary";
import Stepper from "../components/Stepper";
import { getPartName, Part } from "../types";
import styles from "../styles/Settings.module.scss";

interface Props {
  part: Part;
  count: number;
  hasLimit: boolean;
  onCountChange: (count: number) => void;
  onReset: () => void;
}

const InventoryPartRow: FC<Props> = ({
  part,
  count,
  hasLimit,
  onCountChange,
  onReset,
}) => {
  const { t, i18n } = useTranslation("settingsPage");

  return (
    <div
      className={classNames(styles.partRow, {
        [styles.partRowChanged]: hasLimit,
      })}
    >
      <PartImage id={part.id} />
      <PartSummary
        part={part}
        name={getPartName(part, i18n.language)}
        badge={
          hasLimit ? (
            <span className={styles.changedBadge}>
              {t("inventory.changedBadge")}
            </span>
          ) : undefined
        }
      />

      <div className={styles.partLimit}>
        {t("inventory.limit", { count: part.maxCount })}
      </div>

      <Stepper
        value={count}
        max={part.maxCount}
        onChange={onCountChange}
        label={t("inventory.owned")}
      />

      <button
        type="button"
        className={styles.resetButton}
        title={t("inventory.resetHint")}
        disabled={!hasLimit}
        onClick={onReset}
      >
        {t("inventory.reset")}
      </button>
    </div>
  );
};

export default InventoryPartRow;
