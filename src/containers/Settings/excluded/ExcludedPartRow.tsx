import classNames from "classnames";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import PartImage from "../components/PartImage";
import PartSummary from "../components/PartSummary";
import { getPartName, Part } from "../types";
import styles from "../styles/Settings.module.scss";

interface Props {
  part: Part;
  excluded: boolean;
  onToggle: () => void;
}

const ExcludedPartRow: FC<Props> = ({ part, excluded, onToggle }) => {
  const { t, i18n } = useTranslation("settingsPage");
  const name = getPartName(part, i18n.language);

  return (
    <div
      className={classNames(styles.partRow, {
        [styles.partRowChanged]: excluded,
      })}
    >
      <PartImage id={part.id} />
      <PartSummary
        part={part}
        name={name}
        badge={
          excluded ? (
            <span className={styles.changedBadge}>
              {t("excluded.badge")}
            </span>
          ) : undefined
        }
      />
      <button
        type="button"
        className={classNames(styles.resetButton, {
          [styles.excludeButton]: !excluded,
        })}
        onClick={onToggle}
      >
        {excluded ? t("excluded.restore") : t("excluded.hide")}
      </button>
    </div>
  );
};

export default ExcludedPartRow;
