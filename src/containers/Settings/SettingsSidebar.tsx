import classNames from "classnames";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  BellIcon,
  InventoryIcon,
  SettingsIcon,
  SlidersIcon,
  UnavaibleIcon,
} from "@src/ui/icons";
import { selectSettingsState } from "@src/store/slices/settings.slice";
import { useAppSelector } from "@src/store/store";
import useAppVersion from "./useAppVersion";
import { SettingsTab } from "./types";
import styles from "./styles/Settings.module.scss";

interface Props {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

const tabs: Array<{
  key: SettingsTab;
  icon: ReactNode;
}> = [
  { key: "general", icon: <SettingsIcon /> },
  { key: "inventory", icon: <InventoryIcon /> },
  { key: "excluded", icon: <UnavaibleIcon /> },
  { key: "analog", icon: <SlidersIcon /> },
  { key: "market", icon: <BellIcon /> },
];

const SettingsSidebar = ({ activeTab, onChange }: Props) => {
  const { t } = useTranslation("settingsPage");
  const { inventory, excludedParts } = useAppSelector(selectSettingsState);
  const version = useAppVersion();

  const inventoryCount = Object.keys(inventory).length;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTabs}>
        {tabs.map(({ key, icon }) => (
          <button
            key={key}
            type="button"
            className={classNames(styles.sidebarItem, {
              [styles.sidebarItemActive]: activeTab === key,
            })}
            onClick={() => onChange(key)}
          >
            <span className={styles.sidebarIcon}>{icon}</span>
            <span className={styles.sidebarLabel}>{t(`tabs.${key}`)}</span>
            {key === "inventory" && inventoryCount > 0 && (
              <span className={styles.sidebarBadge}>{inventoryCount}</span>
            )}
            {key === "excluded" && excludedParts.length > 0 && (
              <span className={styles.sidebarBadge}>{excludedParts.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.sidebarFooter}>
        <span>XO Craft Solution</span>
        <span>v{version}</span>
      </div>
    </aside>
  );
};

export default SettingsSidebar;
