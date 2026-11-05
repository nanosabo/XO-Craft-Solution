import classNames from "classnames";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import LoadingLogoSection from "@src/containers/LoadingLogoSection";
import { AppError } from "@src/helpers/errorLog";
import LoadingLayout from "@src/layouts/LoadingLayout";
import { AppStateStatus, selectAppState } from "@src/store/slices/app.slice";
import { LoaderStateStatus } from "@src/store/slices/loader.slice";
import { useAppSelector } from "@src/store/store";
import styles from "./styles/LoadingErrorScreen.module.scss";

const GITHUB_NEW_ISSUE =
  "https://github.com/nanosabo/XO-Craft-Solution/issues/new";
const DISCORD_INVITE = "https://discord.gg/cwtHShAfZx";

type ReportStatus = "idle" | "copied" | "failed";

interface Props {
  error: AppError;
  returnTo?: string | null;
  onBack: () => void;
}

const LoadingErrorScreen = ({ error, returnTo, onBack }: Props) => {
  const { t } = useTranslation("loaderPage", { keyPrefix: "error" });
  const { status } = useAppSelector(selectAppState);
  const [reportStatus, setReportStatus] = useState<ReportStatus>("idle");
  const [isBusy, setIsBusy] = useState(false);

  const canReturnToApp =
    status === AppStateStatus.LOADED &&
    Boolean(returnTo && returnTo !== "/loading");

  const buildReport = async (): Promise<string> => {
    let version = "unknown";
    let logs = "";

    try {
      version = await window.electronAPI.getVersion();
    } catch {
      /* the version is optional in a report */
    }

    try {
      logs = await window.electronAPI.getErrorLogs();
    } catch {
      /* the error screen must still work without logs */
    }

    const context = error.context
      ? `Context: ${JSON.stringify(error.context, null, 2)}`
      : "";

    return [
      "XO Craft Solution error report",
      `Version: ${version}`,
      `Time: ${error.timestamp}`,
      `Scope: ${error.scope}`,
      `Message: ${error.message}`,
      context,
      "",
      "--- logs ---",
      logs || "(no logs)",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const copyReport = async (): Promise<boolean> => {
    const report = await buildReport();

    try {
      await window.electronAPI.copyText(report);
      setReportStatus("copied");
      return true;
    } catch {
      try {
        await navigator.clipboard.writeText(report);
        setReportStatus("copied");
        return true;
      } catch {
        setReportStatus("failed");
        return false;
      }
    }
  };

  const openGitHub = async () => {
    setIsBusy(true);

    try {
      await copyReport();

      const title = t("githubTitle");
      const body = t("githubBody", {
        scope: error.scope,
        message: error.message,
        interpolation: { escapeValue: false },
      });
      const url = `${GITHUB_NEW_ISSUE}?title=${encodeURIComponent(
        title,
      )}&body=${encodeURIComponent(body)}`;

      await window.electronAPI.openExternal(url);
    } catch {
      setReportStatus("failed");
    } finally {
      setIsBusy(false);
    }
  };

  const openDiscord = async () => {
    setIsBusy(true);

    try {
      await copyReport();
      await window.electronAPI.openExternal(DISCORD_INVITE);
    } catch {
      setReportStatus("failed");
    } finally {
      setIsBusy(false);
    }
  };

  const openLogs = async () => {
    setIsBusy(true);

    try {
      await window.electronAPI.openLogsFolder();
    } catch {
      setReportStatus("failed");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <LoadingLayout scrollable>
      <div className={styles.error_screen}>
        <div className={styles.logo}>
          <LoadingLogoSection
            isInitialStatus={false}
            isErrorStatus
            status={LoaderStateStatus.ERROR}
          />
        </div>

        <p className={styles.hint}>{t("reportHint")}</p>

        <div className={styles.message}>
          <span className={styles.scope}>{error.scope}</span>
          <span className={styles.error_text}>{error.message}</span>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={classNames(styles.button, styles.primary)}
            onClick={openGitHub}
            disabled={isBusy}
          >
            {t("github")}
          </button>

          <button
            type="button"
            className={styles.button}
            onClick={openDiscord}
            disabled={isBusy}
          >
            {t("discord")}
          </button>

          <button
            type="button"
            className={styles.button}
            onClick={copyReport}
            disabled={isBusy}
          >
            {t("copyLogs")}
          </button>

          <button
            type="button"
            className={styles.button}
            onClick={openLogs}
            disabled={isBusy}
          >
            {t("openLogs")}
          </button>
        </div>

        {reportStatus !== "idle" && (
          <p
            className={classNames(styles.status, {
              [styles.status_error]: reportStatus === "failed",
            })}
          >
            {reportStatus === "copied" ? t("copied") : t("copyFailed")}
          </p>
        )}

        <button
          type="button"
          className={classNames(styles.button, styles.back)}
          onClick={onBack}
          disabled={isBusy}
        >
          {canReturnToApp ? t("back") : t("retry")}
        </button>
      </div>
    </LoadingLayout>
  );
};

export default LoadingErrorScreen;
