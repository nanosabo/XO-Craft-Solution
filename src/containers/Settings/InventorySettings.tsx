import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  clearInventory,
  removeInventoryItem,
  selectSettingsState,
  setInventoryCount,
  setInventoryEnabled,
} from "@src/store/slices/settings.slice";
import SettingsSection from "./components/SettingsSection";
import useParts from "./useParts";
import InventoryPartRow from "./inventory/InventoryPartRow";
import InventoryStatusSection from "./inventory/InventoryStatusSection";
import InventoryToolbar from "./inventory/InventoryToolbar";
import useInventoryParts from "./inventory/useInventoryParts";
import styles from "./styles/Settings.module.scss";

const InventorySettings = () => {
  const { t, i18n } = useTranslation("settingsPage");
  const dispatch = useAppDispatch();
  const { inventory, inventoryEnabled } = useAppSelector(selectSettingsState);
  const { parts, isLoading, error } = useParts();

  const [query, setQuery] = useState("");
  const [onlyOwned, setOnlyOwned] = useState(false);

  const { filteredParts, positions } = useInventoryParts({
    parts,
    inventory,
    query,
    onlyOwned,
    language: i18n.language,
  });

  const clearAll = () => {
    if (!window.confirm(t("inventory.clearConfirm"))) return;
    dispatch(clearInventory());
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>{t("inventory.title")}</h2>
        <p>{t("inventory.subtitle")}</p>
      </div>

      <InventoryStatusSection
        enabled={inventoryEnabled}
        onToggle={(enabled) => dispatch(setInventoryEnabled(enabled))}
      />

      <SettingsSection
        title={t("inventory.listTitle")}
        subtitle={t("inventory.listHint")}
      >
        <InventoryToolbar
          query={query}
          onlyOwned={onlyOwned}
          positions={positions}
          onQueryChange={setQuery}
          onToggleOwned={() => setOnlyOwned((value) => !value)}
          onClear={clearAll}
        />

        {isLoading && <p className={styles.muted}>{t("inventory.loading")}</p>}
        {error && <p className={styles.statusError}>{t("inventory.error")}</p>}

        {!isLoading && !error && filteredParts.length === 0 && (
          <p className={styles.muted}>
            {onlyOwned ? t("inventory.empty") : t("inventory.notFound")}
          </p>
        )}

        {!isLoading && !error && filteredParts.length > 0 && (
          <div className={styles.partList}>
            {filteredParts.map((part) => {
              const hasLimit = Object.prototype.hasOwnProperty.call(
                inventory,
                part.id,
              );

              return (
                <InventoryPartRow
                  key={part.id}
                  part={part}
                  count={hasLimit ? inventory[part.id] : part.maxCount}
                  hasLimit={hasLimit}
                  onCountChange={(value) =>
                    value >= part.maxCount
                      ? dispatch(removeInventoryItem(part.id))
                      : dispatch(
                          setInventoryCount({ id: part.id, count: value }),
                        )
                  }
                  onReset={() => dispatch(removeInventoryItem(part.id))}
                />
              );
            })}
          </div>
        )}
      </SettingsSection>
    </div>
  );
};

export default InventorySettings;
