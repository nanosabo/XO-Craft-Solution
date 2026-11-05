import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { logWarning } from "@src/helpers/errorLog";
import { RefreshIcon } from "@src/ui/icons";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import Switch from "../components/Switch";
import styles from "../styles/Settings.module.scss";

type UpdateStatus = "idle" | "checking" | "upToDate" | "available" | "error";

interface Props {
  version: string;
  autoUpdate: boolean;
  onAutoUpdate: (enabled: boolean) => void;
}

const UpdatesSection: FC<Props> = ({ version, autoUpdate, onAutoUpdate }) => {
  const { t } = useTranslation("settingsPage");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");

  const checkForUpdates = async () => {
    setUpdateStatus("checking");

    try {
      const result = await window.electronAPI.checkForUpdates();

      if (!result.ok) {
        logWarning("update", result.message ?? "Update check failed", {
          current: result.current,
          latest: result.latest,
        });
        setUpdateStatus("error");
        return;
      }

      if (result.latest && result.latest !== result.current) {
        setLatestVersion(result.latest);
        setUpdateStatus("available");
      } else {
        setLatestVersion(null);
        setUpdateStatus("upToDate");
      }
    } catch (error) {
      logWarning("update", error);
      setUpdateStatus("error");
    }
  };

  const updateMessage = {
    idle: "",
    checking: t("general.updates.checking"),
    upToDate: t("general.updates.upToDate"),
    available: t("general.updates.available", {
      version: latestVersion ?? "",
    }),
    error: t("general.updates.error"),
  }[updateStatus];

  return (
    <SettingsSection
      title={t("general.updates.title")}
      subtitle={t("general.updates.subtitle")}
    >
      <SettingRow
        title={t("general.updates.auto")}
        description={t("general.updates.autoHint")}
      >
        <Switch
          checked={autoUpdate}
          onChange={onAutoUpdate}
          label={t("general.updates.auto")}
        />
      </SettingRow>

      <SettingRow
        title={t("general.updates.current")}
        description={`v${version}`}
      >
        <button
          type="button"
          className={styles.button}
          onClick={checkForUpdates}
          disabled={updateStatus === "checking"}
        >
          <RefreshIcon />
          {t("general.updates.check")}
        </button>
      </SettingRow>

      {updateMessage && (
        <p
          className={`${styles.statusMessage} ${
            updateStatus === "error" ? styles.statusError : ""
          }`}
        >
          {updateMessage}
        </p>
      )}
    </SettingsSection>
  );
};

export default UpdatesSection;
