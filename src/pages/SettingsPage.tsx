import classNames from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import AnalogSettings from "@src/containers/Settings/AnalogSettings";
import ExcludedSettings from "@src/containers/Settings/ExcludedSettings";
import GeneralSettings from "@src/containers/Settings/GeneralSettings";
import InventorySettings from "@src/containers/Settings/InventorySettings";
import LogsSettings from "@src/containers/Settings/LogsSettings";
import MarketSettings from "@src/containers/Settings/MarketSettings";
import SelectionSettings from "@src/containers/Settings/SelectionSettings";
import SettingsSidebar from "@src/containers/Settings/SettingsSidebar";
import { SettingsTab } from "@src/containers/Settings/types";
import useScrollFade from "@src/hooks/useScrollFade";
import AnimatePageLayout from "@src/layouts/AnimatePageLayout";
import styles from "@src/containers/Settings/styles/Settings.module.scss";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const contentRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade(contentRef);

  return (
    <AnimatePageLayout fill>
      <div className={styles.layout}>
        <SettingsSidebar activeTab={activeTab} onChange={setActiveTab} />

        <div
          ref={contentRef}
          className={classNames(styles.content, {
            [styles.fadeTop]: fade.top,
            [styles.fadeBottom]: fade.bottom,
          })}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              className={styles.tabContent}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
            >
              {activeTab === "selection" && <SelectionSettings />}
              {activeTab === "inventory" && <InventorySettings />}
              {activeTab === "excluded" && <ExcludedSettings />}
              {activeTab === "analog" && <AnalogSettings />}
              {activeTab === "market" && <MarketSettings />}
              {activeTab === "logs" && <LogsSettings />}
              {activeTab === "general" && <GeneralSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AnimatePageLayout>
  );
};

export default SettingsPage;
