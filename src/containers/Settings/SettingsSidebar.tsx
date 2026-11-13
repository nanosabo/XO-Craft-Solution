import classNames from "classnames";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  BellIcon,
  CraftIcon,
  InventoryIcon,
  LogsIcon,
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

const groups: Array<{
  key: "app" | "craft" | "market" | "stats";
  items: Array<{ key: SettingsTab; icon: ReactNode }>;
}> = [
  {
    key: "app",
    items: [{ key: "general", icon: <SettingsIcon /> }],
  },
  {
    key: "craft",
    items: [
      { key: "selection", icon: <CraftIcon /> },
      { key: "inventory", icon: <InventoryIcon /> },
      { key: "excluded", icon: <UnavaibleIcon /> },
      { key: "analog", icon: <SlidersIcon /> },
    ],
  },
  {
    key: "market",
    items: [{ key: "market", icon: <BellIcon /> }],
  },
  {
    key: "stats",
    items: [{ key: "logs", icon: <LogsIcon /> }],
  },
];

const SettingsSidebar = ({ activeTab, onChange }: Props) => {
  const { t } = useTranslation("settingsPage");
  const { inventory, excludedParts } = useAppSelector(selectSettingsState);
  const version = useAppVersion();

  const inventoryCount = Object.keys(inventory).length;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTabs}>
        {groups.map((group) => (
          <div key={group.key} className={styles.sidebarGroup}>
            <p className={styles.sidebarGroupLabel}>
              {t(`groups.${group.key}`)}
            </p>
            {group.items.map(({ key, icon }) => (
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
                  <span className={styles.sidebarBadge}>
                    {excludedParts.length}
                  </span>
                )}
              </button>
            ))}
          </div>
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
