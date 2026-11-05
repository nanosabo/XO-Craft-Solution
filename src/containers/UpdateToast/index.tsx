import classNames from "classnames";
import { motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { logWarning } from "@src/helpers/errorLog";
import formatBytes from "@src/helpers/formatBytes";
import { selectLoaderState } from "@src/store/slices/loader.slice";
import { selectUpdaterState } from "@src/store/slices/updater.slice";
import { useAppSelector } from "@src/store/store";
import { CloseIcon, RefreshIcon } from "@src/ui/icons";
import styles from "./styles/UpdateToast.module.scss";

const clampPercent = (percent: number): number =>
  Math.min(100, Math.max(0, Math.round(percent)));

const UpdateToast = () => {
  const { t } = useTranslation("updater");
  const location = useLocation();
  const update = useAppSelector(selectUpdaterState);
  const { error: loaderError } = useAppSelector(selectLoaderState);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Check failures stay in the settings page; the notification is reserved for
  // a real update flow or a failed download.
  const canShow =
    update.stage === "available" ||
    update.stage === "downloading" ||
    update.stage === "downloaded" ||
    (update.stage === "error" &&
      Boolean(update.latestVersion || update.mode));

  const version = update.latestVersion ? `v${update.latestVersion}` : "";
  const progress = update.progress;
  const percent = clampPercent(progress?.percent ?? 0);
  const toastKey = `${update.stage}:${update.latestVersion ?? ""}:${
    update.mode ?? ""
  }`;
  const isHidden = dismissedKey === toastKey;
  const isOnLoadingScreen =
    location.pathname === "/loading" || Boolean(loaderError);

  const run = async (action: () => Promise<unknown>) => {
    setIsBusy(true);

    try {
      await action();
    } catch (error) {
      logWarning("update-action", error);
    } finally {
      setIsBusy(false);
    }
  };

  const startNow = () =>
    run(() => window.electronAPI.downloadUpdate("now"));

  const startLater = () =>
    run(() => window.electronAPI.downloadUpdate("later"));

  const restart = () => run(() => window.electronAPI.installUpdate());

  const retry = () =>
    run(() =>
      update.latestVersion
        ? window.electronAPI.downloadUpdate(update.mode ?? "now")
        : window.electronAPI.checkForUpdates(false),
    );

  const hide = () => setDismissedKey(toastKey);

  const pillText =
    update.stage === "downloading"
      ? t("collapsed.downloading", { percent })
      : update.stage === "downloaded"
        ? t("collapsed.downloaded")
        : update.stage === "error"
          ? t("collapsed.error")
          : t("collapsed.available", { version });

  if (isOnLoadingScreen) return null;

  if (!canShow) return null;

  if (isHidden) {
    return (
      <button
        type="button"
        className={styles.pill}
        onClick={() => setDismissedKey(null)}
        aria-label={t("collapsed.open")}
      >
        <RefreshIcon />
        <span>{pillText}</span>
        {update.stage === "downloading" && (
          <span className={styles.pillPercent}>{percent}%</span>
        )}
      </button>
    );
  }

  return (
    <motion.aside
      className={styles.toast}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      role="status"
      aria-live="polite"
      aria-busy={update.stage === "downloading"}
    >
      <div className={styles.header}>
        <span
          className={classNames(styles.icon, {
            [styles.spinning]: update.stage === "downloading",
          })}
        >
          <RefreshIcon />
        </span>

        <div className={styles.heading}>
          <span className={styles.eyebrow}>{t("eyebrow")}</span>
          <h3>
            {update.stage === "available" && t("available.title")}
            {update.stage === "downloading" && t("downloading.title")}
            {update.stage === "downloaded" && t("downloaded.title")}
            {update.stage === "error" && t("error.title")}
            {version && <span className={styles.version}>{version}</span>}
          </h3>
        </div>

        <button
          type="button"
          className={styles.close}
          onClick={hide}
          aria-label={t("actions.hide")}
          disabled={isBusy}
        >
          <CloseIcon />
        </button>
      </div>

      {update.stage === "available" && (
        <>
          <p className={styles.text}>
            {t("available.hint", {
              version,
              current: `v${update.currentVersion}`,
            })}
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={classNames(styles.button, styles.primary)}
              onClick={startNow}
              disabled={isBusy}
            >
              {t("actions.updateNow")}
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={startLater}
              disabled={isBusy}
            >
              {t("actions.nextLaunch")}
            </button>
          </div>
        </>
      )}

      {update.stage === "downloading" && (
        <>
          <p className={styles.text}>{t("downloading.hint")}</p>

          <div className={styles.progressBlock}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className={styles.progressMeta}>
              <span>
                {t("downloading.progress", {
                  percent,
                  transferred: formatBytes(progress?.transferred ?? 0),
                  total: formatBytes(progress?.total ?? 0),
                })}
              </span>
              <span>
                {t("downloading.speed", {
                  speed: formatBytes(progress?.bytesPerSecond ?? 0),
                })}
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              onClick={hide}
              disabled={isBusy}
            >
              {t("actions.hide")}
            </button>
          </div>
        </>
      )}

      {update.stage === "downloaded" && (
        <>
          <p className={styles.text}>
            {update.mode === "later"
              ? t("downloaded.later")
              : t("downloaded.now")}
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={classNames(styles.button, styles.primary)}
              onClick={restart}
              disabled={isBusy}
            >
              {t("actions.restart")}
            </button>
            {update.mode !== "later" && (
              <button
                type="button"
                className={styles.button}
                onClick={startLater}
                disabled={isBusy}
              >
                {t("actions.nextLaunch")}
              </button>
            )}
          </div>
        </>
      )}

      {update.stage === "error" && (
        <>
          <p className={styles.text} title={update.error ?? undefined}>
            {t("error.download")}
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={classNames(styles.button, styles.primary)}
              onClick={retry}
              disabled={isBusy}
            >
              {t("actions.retry")}
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={hide}
              disabled={isBusy}
            >
              {t("actions.close")}
            </button>
          </div>
        </>
      )}
    </motion.aside>
  );
};

export default UpdateToast;
