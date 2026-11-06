import { useTranslation } from "react-i18next";
import { logWarning } from "@src/helpers/errorLog";
import { setCrossoutLogsPath } from "@src/store/slices/settings.slice";
import { useAppDispatch } from "@src/store/store";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import styles from "../styles/Settings.module.scss";

interface Props {
  logsPath: string | null;
}

const LogsPathSection = ({ logsPath }: Props) => {
  const { t } = useTranslation("settingsPage");
  const dispatch = useAppDispatch();

  const pickFolder = async () => {
    try {
      const selected = await window.electronAPI.crossoutPickLogsFolder();

      if (!selected) return;

      dispatch(setCrossoutLogsPath(selected));
    } catch (error) {
      logWarning("crossout-logs-path", error);
    }
  };

  return (
    <SettingsSection
      title={t("general.logs.title")}
      subtitle={t("general.logs.subtitle")}
    >
      <SettingRow
        title={t("general.logs.path")}
        description={logsPath ?? t("general.logs.empty")}
      >
        <div className={styles.buttonRow}>
          <button type="button" className={styles.button} onClick={() => void pickFolder()}>
            {logsPath ? t("general.logs.change") : t("general.logs.pick")}
          </button>
          {logsPath && (
            <button
              type="button"
              className={styles.button}
              onClick={() => dispatch(setCrossoutLogsPath(null))}
            >
              {t("general.logs.clear")}
            </button>
          )}
        </div>
      </SettingRow>
    </SettingsSection>
  );
};

export default LogsPathSection;
