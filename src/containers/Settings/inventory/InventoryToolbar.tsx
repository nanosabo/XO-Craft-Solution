import classNames from "classnames";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import Input from "@src/ui/Input";
import styles from "../styles/Settings.module.scss";

interface Props {
  query: string;
  onlyOwned: boolean;
  positions: number;
  onQueryChange: (query: string) => void;
  onToggleOwned: () => void;
  onClear: () => void;
}

const InventoryToolbar: FC<Props> = ({
  query,
  onlyOwned,
  positions,
  onQueryChange,
  onToggleOwned,
  onClear,
}) => {
  const { t } = useTranslation("settingsPage");

  return (
    <div className={styles.toolbar}>
      <div className={styles.searchField}>
        <Input
          type="search"
          value={query}
          placeholder={t("inventory.search")}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <button
        type="button"
        className={classNames(styles.filterButton, {
          [styles.filterButtonActive]: onlyOwned,
        })}
        onClick={onToggleOwned}
      >
        {t("inventory.onlyChanged")}
        {positions > 0 && (
          <span className={styles.filterCount}>{positions}</span>
        )}
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.dangerButton}`}
        onClick={onClear}
        disabled={positions === 0}
        title={t("inventory.clearHint")}
      >
        {t("inventory.clear")}
      </button>
    </div>
  );
};

export default InventoryToolbar;
