import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import AnalogSettings from "@src/containers/Settings/AnalogSettings";
import GeneralSettings from "@src/containers/Settings/GeneralSettings";
import InventorySettings from "@src/containers/Settings/InventorySettings";
import MarketSettings from "@src/containers/Settings/MarketSettings";
import SettingsSidebar from "@src/containers/Settings/SettingsSidebar";
import { SettingsTab } from "@src/containers/Settings/types";
import AnimatePageLayout from "@src/layouts/AnimatePageLayout";
import styles from "@src/containers/Settings/styles/Settings.module.scss";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  return (
    <AnimatePageLayout fill>
      <div className={styles.layout}>
        <SettingsSidebar activeTab={activeTab} onChange={setActiveTab} />

        <div className={styles.content}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              className={styles.tabContent}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
            >
              {activeTab === "general" && <GeneralSettings />}
              {activeTab === "inventory" && <InventorySettings />}
              {activeTab === "analog" && <AnalogSettings />}
              {activeTab === "market" && <MarketSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AnimatePageLayout>
  );
};

export default SettingsPage;
