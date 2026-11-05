import classNames from "classnames";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { logWarning } from "@src/helpers/errorLog";
import formatBytes from "@src/helpers/formatBytes";
import { selectUpdaterState } from "@src/store/slices/updater.slice";
import { useAppSelector } from "@src/store/store";
import { RefreshIcon } from "@src/ui/icons";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import Switch from "../components/Switch";
import styles from "../styles/Settings.module.scss";

interface Props {
  version: string;
  autoUpdate: boolean;
  onAutoUpdate: (enabled: boolean) => void;
}

const UpdatesSection: FC<Props> = ({ version, autoUpdate, onAutoUpdate }) => {
  const { t } = useTranslation("settingsPage");
  const update = useAppSelector(selectUpdaterState);
  const [isBusy, setIsBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setIsBusy(true);

    try {
      await action();
    } catch (error) {
      logWarning("update", error);
    } finally {
      setIsBusy(false);
    }
  };

  const checkForUpdates = () =>
    run(() => window.electronAPI.checkForUpdates(false));

  const download = (mode: "now" | "later") =>
    run(() => window.electronAPI.downloadUpdate(mode));

  const restart = () => run(() => window.electronAPI.installUpdate());

  const retry = () =>
    run(() =>
      update.latestVersion
        ? window.electronAPI.downloadUpdate(update.mode ?? "now")
        : window.electronAPI.checkForUpdates(false),
    );

  const isChecking = update.stage === "checking";
  const isDownloading = update.stage === "downloading";
  const isDownloaded = update.stage === "downloaded";
  const latestVersion = update.latestVersion
    ? `v${update.latestVersion}`
    : "";

  const percent = Math.min(
    100,
    Math.max(0, Math.round(update.progress?.percent ?? 0)),
  );

  const errorIsDownload = Boolean(update.latestVersion || update.mode);
  const hideAutomaticCheckError =
    update.stage === "error" && update.automatic && !errorIsDownload;

  const showStatus =
    update.stage !== "idle" &&
    update.stage !== "up-to-date" &&
    !hideAutomaticCheckError;

  let statusTitle = "";
  let statusHint = "";

  if (update.stage === "available") {
    statusTitle = t("general.updates.available", { version: latestVersion });
    statusHint = t("general.updates.availableHint");
  } else if (update.stage === "downloading") {
    statusTitle = t("general.updates.downloading");
    statusHint = t("general.updates.downloadingHint");
  } else if (update.stage === "downloaded") {
    statusTitle = t("general.updates.downloaded");
    statusHint =
      update.mode === "later"
        ? t("general.updates.downloadedLater")
        : t("general.updates.downloadedNow", { version: latestVersion });
  } else if (update.stage === "error") {
    statusTitle = errorIsDownload
      ? t("general.updates.downloadError")
      : t("general.updates.error");
  }

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
          disabled={isBusy || isChecking || isDownloading || isDownloaded}
        >
          <RefreshIcon />
          {isChecking
            ? t("general.updates.checking")
            : t("general.updates.check")}
        </button>
      </SettingRow>

      {showStatus && statusTitle && (
        <div
          className={classNames(styles.updateCard, {
            [styles.updateCardError]: update.stage === "error",
          })}
        >
          <div className={styles.updateCardHeader}>
            <div>
              <p className={styles.updateCardTitle}>{statusTitle}</p>
              {statusHint && (
                <span className={styles.updateCardHint}>{statusHint}</span>
              )}
            </div>
            {latestVersion && update.stage !== "downloading" && (
              <span className={styles.updateVersion}>{latestVersion}</span>
            )}
          </div>

          {isDownloading && (
            <div className={styles.updateProgress}>
              <div className={styles.updateProgressTrack}>
                <div
                  className={styles.updateProgressFill}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className={styles.updateProgressMeta}>
                <span>
                  {t("general.updates.downloadingProgress", {
                    percent,
                    transferred: formatBytes(
                      update.progress?.transferred ?? 0,
                    ),
                    total: formatBytes(update.progress?.total ?? 0),
                  })}
                </span>
                <span>
                  {t("general.updates.downloadingSpeed", {
                    speed: formatBytes(update.progress?.bytesPerSecond ?? 0),
                  })}
                </span>
              </div>
            </div>
          )}

          {update.stage === "available" && (
            <div className={styles.updateActions}>
              <button
                type="button"
                className={classNames(styles.button, styles.primaryButton)}
                onClick={() => download("now")}
                disabled={isBusy}
              >
                {t("general.updates.downloadNow")}
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => download("later")}
                disabled={isBusy}
              >
                {t("general.updates.downloadLater")}
              </button>
            </div>
          )}

          {isDownloaded && (
            <div className={styles.updateActions}>
              <button
                type="button"
                className={classNames(styles.button, styles.primaryButton)}
                onClick={restart}
                disabled={isBusy}
              >
                {t("general.updates.restart")}
              </button>
            </div>
          )}

          {update.stage === "error" && (
            <div className={styles.updateActions}>
              <button
                type="button"
                className={classNames(styles.button, styles.primaryButton)}
                onClick={retry}
                disabled={isBusy}
              >
                {t("general.updates.retry")}
              </button>
            </div>
          )}
        </div>
      )}

      {update.stage === "up-to-date" && (
        <p className={styles.statusMessage}>{t("general.updates.upToDate")}</p>
      )}
    </SettingsSection>
  );
};

export default UpdatesSection;
