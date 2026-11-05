import { useTranslation } from "react-i18next";
import { logWarning } from "@src/helpers/errorLog";
import { invalidateCustomSound } from "@src/helpers/notificationSound";
import { resetSettings } from "@src/store/slices/settings.slice";
import { useAppDispatch } from "@src/store/store";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import styles from "../styles/Settings.module.scss";

const CACHE_KEYS = [
  "market",
  "own",
  "norec",
  "requiredParts",
  "solveInputs",
  "solution",
  "version",
];

const DataSection = () => {
  const { t } = useTranslation("settingsPage");
  const dispatch = useAppDispatch();

  const clearCache = () => {
    if (!window.confirm(t("general.data.clearCacheConfirm"))) return;

    for (const key of CACHE_KEYS) {
      localStorage.removeItem(key);
    }

    window.location.reload();
  };

  const resetAllSettings = async () => {
    if (!window.confirm(t("general.data.resetConfirm"))) return;

    try {
      await window.electronAPI.removeNotificationSound();
    } catch (error) {
      /* Settings must still reset if the sound file cannot be removed. */
      logWarning("settings-data", error);
    }

    invalidateCustomSound();
    dispatch(resetSettings());
    window.location.reload();
  };

  return (
    <SettingsSection
      title={t("general.data.title")}
      subtitle={t("general.data.subtitle")}
    >
      <SettingRow
        title={t("general.data.clearCache")}
        description={t("general.data.clearCacheHint")}
      >
        <button type="button" className={styles.button} onClick={clearCache}>
          {t("general.data.clearCache")}
        </button>
      </SettingRow>

      <SettingRow
        title={t("general.data.openFolder")}
        description={t("general.data.subtitle")}
      >
        <button
          type="button"
          className={styles.button}
          onClick={() =>
            void window.electronAPI
              .openUserData()
              .catch((error) => logWarning("settings-data", error))
          }
        >
          {t("general.data.openFolder")}
        </button>
      </SettingRow>

      <SettingRow
        title={t("general.data.reset")}
        description={t("general.data.resetHint")}
      >
        <button
          type="button"
          className={`${styles.button} ${styles.dangerButton}`}
          onClick={resetAllSettings}
        >
          {t("general.data.reset")}
        </button>
      </SettingRow>
    </SettingsSection>
  );
};

export default DataSection;
