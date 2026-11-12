import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { parseAppLogLink } from "@src/helpers/appLogLink";
import { normalizeUiLanguage } from "@src/helpers/contentLanguage";
import { logWarning } from "@src/helpers/errorLog";
import formatBytes from "@src/helpers/formatBytes";
import useScrollFade from "@src/hooks/useScrollFade";
import { selectSettingsState } from "@src/store/slices/settings.slice";
import { useAppSelector } from "@src/store/store";
import {
  type CrossoutErrorCode,
  type CrossoutDetectedLog,
  type CrossoutLogHistoryEntry,
  type CrossoutUploadProgress,
} from "@src/types/crossout";
import LogHelpModal from "./LogHelpModal";
import styles from "./styles/Logs.module.scss";

const HISTORY_PAGE_SIZE = 25;

const fileName = (filePath: string): string =>
  filePath.split(/[\\/]/).pop() || filePath;

const isCombatLogName = (filePath: string): boolean =>
  fileName(filePath).toLowerCase() === "combat.log";

const parentDir = (filePath: string): string => {
  const parts = filePath.split(/[\\/]/);

  parts.pop();

  return parts.join(filePath.includes("\\") ? "\\" : "/") || filePath;
};

const shortenPath = (value: string): string => {
  if (value.length <= 72) return value;

  return `${value.slice(0, 32)}…${value.slice(-32)}`;
};

const LOG_LINK =
  /(?:https?:\/\/)?(?:www\.)?(?:en\.)?crossout-info\.com\/log\/([A-Za-z0-9_-]{4,64})(?:\/([A-Za-z0-9_-]{1,32}))?/i;

const APP_LINK = /(?:https?:\/\/nanosabo\.github\.io\/xocs-imgs\/log\/?\?[^\s]+|xocraft:\/\/[^\s]+)/i;

const crossoutLogFromText = (
  value: string,
): { logId: string; type: string | null } | null => {
  const match = value.match(LOG_LINK);

  if (!match) return null;

  const type = match[2]?.toLowerCase() ?? "";
  const slug = /^[a-z0-9_-]{1,32}$/.test(type) ? type : null;

  return { logId: match[1], type: slug };
};

const logFromClipboard = (
  value: string,
): { logId: string; type: string | null } | null => {
  const direct = parseAppLogLink(value);

  if (direct) return direct;

  const appMatch = value.match(APP_LINK);

  if (appMatch) {
    const parsed = parseAppLogLink(appMatch[0]);

    if (parsed) return parsed;
  }

  return crossoutLogFromText(value);
};

const logResultsPath = (parsed: { logId: string; type: string | null }): string => {
  const query = parsed.type ? `?type=${encodeURIComponent(parsed.type)}` : "";

  return `/logs/${encodeURIComponent(parsed.logId)}${query}`;
};

const clampPercent = (percent: number): number =>
  Math.min(100, Math.max(0, Math.round(percent)));

const FileGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M7.5 3.5h6.8L19 8.1V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1.5-1.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M14 3.8V8.2h4.3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M9 12.5h6M9 16h6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const LinkGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M10 13.5a4.2 4.2 0 0 0 6.3.4l2.2-2.2a4.2 4.2 0 0 0-6-6L11 7.2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 10.5a4.2 4.2 0 0 0-6.3-.4L5.5 12.3a4.2 4.2 0 0 0 6 6L13 16.8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type LogsError = {
  code?: CrossoutErrorCode | null;
  message?: string | null;
  fallbackKey?: "upload.error" | "upload.wrongFile";
};

const Logs = () => {
  const { t, i18n } = useTranslation("logsPage");
  const navigate = useNavigate();
  const logsPath = useAppSelector(selectSettingsState).crossoutLogsPath;
  const uiLanguage = normalizeUiLanguage(i18n.language);
  const numberLocale =
    uiLanguage === "uk" ? "uk-UA" : uiLanguage === "en" ? "en-US" : "ru-RU";
  const contentRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade(contentRef);

  const [source, setSource] = useState<"file" | "link">("file");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [latestLog, setLatestLog] = useState<
    CrossoutDetectedLog | null | undefined
  >(undefined);
  const [linkError, setLinkError] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] =
    useState<CrossoutUploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<LogsError | null>(null);
  const uploadingRef = useRef(false);
  const mountedRef = useRef(true);

  const [history, setHistory] = useState<CrossoutLogHistoryEntry[] | null>(
    null,
  );
  const [historyError, setHistoryError] = useState(false);
  const [historyDate, setHistoryDate] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyConfirm, setHistoryConfirm] = useState<
    { kind: "clear" } | { kind: "remove"; id: string; name: string } | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    let requestId = 0;
    let focusTimer = 0;

    const refresh = (replaceOnError: boolean) => {
      const id = ++requestId;

      window.electronAPI
        .crossoutFindLatestLog(logsPath)
        .then((found) => {
          if (cancelled || id !== requestId) return;

          setLatestLog(found);
        })
        .catch((error) => {
          if (cancelled || id !== requestId) return;

          logWarning("crossout-log-find", error);
          setLatestLog((current) =>
            current === undefined || replaceOnError ? null : current,
          );
        });
    };

    refresh(true);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "hidden") return;

      window.clearTimeout(focusTimer);
      // Minimizing and restoring fires both focus and visibilitychange.
      focusTimer = window.setTimeout(() => refresh(false), 200);
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(focusTimer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [logsPath]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return window.electronAPI.onCrossoutUploadProgress((progress) => {
      if (!uploadingRef.current) return;

      setUploadProgress(progress);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    window.electronAPI
      .crossoutHistoryList()
      .then((entries) => {
        if (cancelled) return;

        setHistory(entries);
      })
      .catch((error) => {
        if (cancelled) return;

        logWarning("crossout-history", error);
        setHistoryError(true);
        setHistory([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleHistory = useMemo(() => {
    if (!history) return null;
    if (!historyDate) return history;

    const [year, month, day] = historyDate.split("-").map(Number);
    const from = new Date(year, month - 1, day).getTime();

    if (!Number.isFinite(from)) return history;

    const to = from + 24 * 60 * 60 * 1000;

    return history.filter((entry) => {
      const stamp = entry.uploadedAt > 0 ? entry.uploadedAt : entry.savedAt;

      return stamp >= from && stamp < to;
    });
  }, [history, historyDate]);

  const historyPageCount = Math.max(
    1,
    Math.ceil((visibleHistory?.length ?? 0) / HISTORY_PAGE_SIZE),
  );
  const historyPageSafe = Math.min(historyPage, historyPageCount);
  const pagedHistory =
    visibleHistory?.slice(
      (historyPageSafe - 1) * HISTORY_PAGE_SIZE,
      historyPageSafe * HISTORY_PAGE_SIZE,
    ) ?? null;

  const formatDate = (unix: number) =>
    new Date(unix * 1000).toLocaleString(numberLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const logTypeLabel = (key: string, fallback: string) => {
    const slug = key.toLowerCase().trim().replace(/[\s-]+/g, "_");

    if (i18n.exists(`logTypes.${slug}`, { ns: "logsPage" })) {
      return t(`logTypes.${slug}`);
    }

    const upper = slug.toUpperCase();

    if (i18n.exists(`types.${upper}`, { ns: "logsPage" })) {
      return t(`types.${upper}`);
    }

    return fallback || upper;
  };

  const errorText = (error: LogsError) => {
    if (
      error.code &&
      i18n.exists(`errors.${error.code}`, { ns: "logsPage" })
    ) {
      return t(`errors.${error.code}`);
    }

    return error.fallbackKey
      ? t(error.fallbackKey)
      : error.message || t("upload.error");
  };

  const removeHistory = async (id: string) => {
    try {
      const entries = await window.electronAPI.crossoutHistoryRemove(id);

      setHistory(entries);
    } catch (error) {
      logWarning("crossout-history", error);
      setHistoryError(true);
    }
  };

  const clearHistory = async () => {
    try {
      const entries = await window.electronAPI.crossoutHistoryClear();

      setHistory(entries);
      setHistoryDate("");
      setHistoryPage(1);
    } catch (error) {
      logWarning("crossout-history", error);
      setHistoryError(true);
    }
  };

  useEffect(() => {
    if (!historyConfirm) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHistoryConfirm(null);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [historyConfirm]);

  const confirmHistory = () => {
    if (!historyConfirm) return;

    const pending = historyConfirm;

    setHistoryConfirm(null);

    if (pending.kind === "clear") {
      void clearHistory();
      return;
    }

    void removeHistory(pending.id);
  };

  const upload = async (selectedPath: string) => {
    if (!selectedPath || uploadingRef.current) return;

    uploadingRef.current = true;
    setUploading(true);
    setUploadError(null);
    setUploadProgress({
      phase: "uploading",
      percent: 0,
      transferred: 0,
      total: 0,
      bytesPerSecond: 0,
    });

    try {
      const result = await window.electronAPI.crossoutUploadLog({
        nickname: "",
        filePath: selectedPath,
      });

      if (!mountedRef.current) return;

      if (result.ok) {
        navigate(`/logs/${result.logId}`);
      } else {
        setUploadError({
          code: result.errorCode,
          message: result.error,
          fallbackKey: "upload.error",
        });
      }
    } catch (error) {
      logWarning("crossout-upload", error);

      if (mountedRef.current) {
        setUploadError({ fallbackKey: "upload.error" });
      }
    } finally {
      uploadingRef.current = false;

      if (mountedRef.current) {
        setUploading(false);
        setUploadProgress(null);
      }
    }
  };

  const pickFile = async () => {
    if (uploadingRef.current) return;

    try {
      const selected = await window.electronAPI.crossoutPickLog();

      if (!selected) return;

      setFilePath(selected);

      if (!isCombatLogName(selected)) {
        setUploadError({ fallbackKey: "upload.wrongFile" });
        setUploadProgress(null);
        return;
      }

      setUploadError(null);
      void upload(selected);
    } catch (error) {
      logWarning("crossout-upload", error);
    }
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (helpOpen || historyConfirm) return;

      const element = event.target instanceof HTMLElement ? event.target : null;
      const typing =
        element &&
        (element.tagName === "TEXTAREA" ||
          element.tagName === "INPUT" ||
          element.isContentEditable);

      if (typing) return;

      const text = event.clipboardData?.getData("text") ?? "";
      const parsed = logFromClipboard(text);

      if (!parsed) {
        if (source === "link" && text.trim()) setLinkError(true);
        return;
      }

      event.preventDefault();
      setLinkError(false);
      navigate(logResultsPath(parsed));
    };

    window.addEventListener("paste", onPaste);

    return () => window.removeEventListener("paste", onPaste);
  }, [helpOpen, historyConfirm, navigate, source]);

  return (
    <div
      ref={contentRef}
      className={classNames(styles.root, {
        [styles.fadeTop]: fade.top,
        [styles.fadeBottom]: fade.bottom,
      })}
    >
      <div className={styles.heading}>
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </div>

      <div className={styles.workspace}>
      <section className={classNames(styles.card, styles.uploadCard)} aria-busy={uploading}>
        <div className={styles.cardHeader}>
          <h2>{t("upload.title")}</h2>
          <p>{t("upload.subtitle")}</p>
        </div>

        {!uploading && (
          <div className={styles.sourceSwitch} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={source === "file"}
              className={classNames(styles.sourceOption, {
                [styles.sourceOptionActive]: source === "file",
              })}
              onClick={() => setSource("file")}
            >
              <span className={styles.sourceIcon}>
                <FileGlyph />
              </span>
              <span className={styles.sourceCopy}>
                <strong>{t("upload.sourceFile")}</strong>
                <span>{t("upload.sourceFileHint")}</span>
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={source === "link"}
              className={classNames(styles.sourceOption, {
                [styles.sourceOptionActive]: source === "link",
              })}
              onClick={() => {
                setLinkError(false);
                setSource("link");
              }}
            >
              <span className={styles.sourceIcon}>
                <LinkGlyph />
              </span>
              <span className={styles.sourceCopy}>
                <strong>{t("upload.sourceLink")}</strong>
                <span>{t("upload.sourceLinkHint")}</span>
              </span>
            </button>
          </div>
        )}

        {!uploading && source === "file" && (
            <div
              className={classNames(styles.latest, {
                [styles.latestPlain]: !latestLog,
              })}
            >
              {latestLog === undefined && (
                <p className={styles.latestStatus}>{t("upload.latestLoading")}</p>
              )}

              {latestLog === null && (
                <div className={styles.latestMissing}>
                  <p>
                    {logsPath
                      ? t("upload.latestMissingCustom")
                      : t("upload.latestMissing")}
                  </p>
                  <button
                    type="button"
                    className={classNames(
                      styles.secondaryButton,
                      styles.latestButton,
                    )}
                    onClick={() => navigate("/settings")}
                  >
                    {t("upload.openSettings")}
                  </button>
                </div>
              )}

              {latestLog && (
                <>
                  <span className={styles.latestEyebrow}>
                    {t("upload.latestTitle")}
                  </span>
                  <strong className={styles.latestName}>
                    {latestLog.session.toLowerCase() === "logs"
                      ? "combat.log"
                      : latestLog.session}
                  </strong>
                  <span className={styles.latestMeta}>
                    {formatDate(latestLog.modifiedAt / 1000)}
                  </span>
                  <span
                    className={styles.latestPath}
                    title={latestLog.filePath}
                  >
                    {shortenPath(parentDir(latestLog.filePath))}
                  </span>
                  <button
                    type="button"
                    className={classNames(styles.primaryButton, styles.latestButton)}
                    onClick={() => {
                      setFilePath(latestLog.filePath);
                      setUploadError(null);
                      void upload(latestLog.filePath);
                    }}
                  >
                    {t("upload.latestUpload")}
                  </button>
                </>
              )}

              <button
                type="button"
                className={classNames(
                  latestLog
                    ? styles.secondaryButton
                    : styles.pickButton,
                  latestLog && styles.latestButton,
                  !latestLog && filePath && styles.pickButtonSelected,
                )}
                onClick={() => void pickFile()}
                title={filePath ?? t("upload.pick")}
              >
                {latestLog ? (
                  t("upload.pickOther")
                ) : (
                  <>
                    <span className={styles.pickIcon}>
                      <FileGlyph />
                    </span>
                    <span className={styles.pickCopy}>
                      <strong>
                        {filePath ? fileName(filePath) : t("upload.pick")}
                      </strong>
                      <span>
                        {filePath
                          ? t("upload.selectedHint")
                          : t("upload.pickHint")}
                      </span>
                    </span>
                  </>
                )}
              </button>
            </div>
        )}

        {!uploading && source === "link" && (
          <div className={styles.pasteNotice}>
            <span className={styles.pasteIcon} aria-hidden="true">
              <LinkGlyph />
            </span>
            <div className={styles.pasteCopy}>
              <strong>{t("upload.pasteTitle")}</strong>
              <p>{t("upload.pasteHint")}</p>
            </div>
            <span className={styles.pasteKeys}>
              <kbd>Ctrl</kbd>
              <span aria-hidden="true">+</span>
              <kbd>V</kbd>
            </span>
          </div>
        )}

        {uploadProgress && (
          <div
            className={classNames(styles.statusBlock, styles.statusBlockOnly)}
            role="status"
            aria-live="polite"
          >
            <div className={styles.progressBlock}>
              <div className={styles.progressHead}>
                <span>
                  {uploadProgress.phase === "processing"
                    ? t("upload.processing")
                    : t("upload.uploadingHint")}
                </span>
                <span>{clampPercent(uploadProgress.percent)}%</span>
              </div>
              {uploadProgress.phase === "processing" && (
                <p className={styles.progressHint}>
                  {t("upload.processingHint")}
                </p>
              )}
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${clampPercent(uploadProgress.percent)}%`,
                  }}
                />
              </div>
              <div className={styles.progressMeta}>
                <span>
                  {t("upload.progress", {
                    percent: clampPercent(uploadProgress.percent),
                    transferred: formatBytes(uploadProgress.transferred),
                    total: formatBytes(uploadProgress.total),
                  })}
                </span>
                <span>
                  {t("upload.speed", {
                    speed: formatBytes(uploadProgress.bytesPerSecond),
                  })}
                </span>
              </div>
            </div>
          </div>
        )}

        {uploadError && (
          <p className={styles.error}>{errorText(uploadError)}</p>
        )}
        {source === "link" && linkError && (
          <p className={styles.error}>{t("upload.linkError")}</p>
        )}
      </section>

      <section className={styles.guide}>
        <h2>
          {t("upload.guideTitle")}{" "}
          <span>{t("upload.guideFile")}</span>
        </h2>
        <ol>
          <li>{t("upload.guideStep1")}</li>
          <li>
            {t("upload.guideStep2")}{" "}
            <span className={styles.guidePath}>{t("upload.guidePath")}</span>
          </li>
          <li>
            {t("upload.guideStep3")}{" "}
            <span className={styles.guideFileName}>combat.log</span>{" "}
            {t("upload.guideStep3b")}
          </li>
          <li>{t("upload.guideStep4")}</li>
        </ol>
        <button
          type="button"
          className={classNames(styles.secondaryButton, styles.guideHelp)}
          onClick={() => setHelpOpen(true)}
        >
          {t("upload.help.open")}
        </button>
      </section>

      <section className={classNames(styles.card, styles.historyCard)}>
        <div className={styles.historyHead}>
          <div className={styles.cardHeader}>
            <h2>{t("history.title")}</h2>
            <p>{t("history.subtitle")}</p>
          </div>
          {history && history.length > 0 && (
            <div className={styles.historyTools}>
            <label className={styles.historyDate}>
              <span>{t("history.date")}</span>
              <span className={styles.historyDateField}>
                <input
                  type="date"
                  className={styles.date}
                  value={historyDate}
                  aria-label={t("history.date")}
                  onChange={(event) => {
                    setHistoryDate(event.target.value);
                    setHistoryPage(1);
                  }}
                />
                <svg
                  className={styles.historyDateIcon}
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="2.25"
                    y="3.25"
                    width="11.5"
                    height="10.5"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M2.25 6.5h11.5M5.25 1.75v2.5M10.75 1.75v2.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </label>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={!historyDate}
              onClick={() => {
                setHistoryDate("");
                setHistoryPage(1);
              }}
            >
              {t("history.reset")}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setHistoryConfirm({ kind: "clear" })}
            >
              {t("history.clear")}
            </button>
            </div>
          )}
        </div>

        {historyError && <p className={styles.error}>{t("history.error")}</p>}

        {history === null && (
          <p className={styles.empty}>{t("history.loading")}</p>
        )}

        {history && history.length === 0 && (
          <p className={styles.empty}>{t("history.empty")}</p>
        )}

        {visibleHistory && history && history.length > 0 && visibleHistory.length === 0 && (
          <p className={styles.empty}>{t("history.dateEmpty")}</p>
        )}

        {pagedHistory && pagedHistory.length > 0 && (
          <div className={styles.historyTableWrap}>
          <table className={styles.historyTable}>
            <colgroup>
              <col className={styles.historyColPlayer} />
              <col className={styles.historyColBattles} />
              <col className={styles.historyColId} />
              <col />
              <col className={styles.historyColDate} />
              <col className={styles.historyColAction} />
            </colgroup>
            <thead>
              <tr>
                <th>{t("history.player")}</th>
                <th className={styles.historyBattles}>{t("history.battles")}</th>
                <th>{t("history.log")}</th>
                <th>{t("history.types")}</th>
                <th>{t("history.when")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pagedHistory.map((entry) => (
                <tr
                  key={entry.logId}
                  className={styles.historyRow}
                  tabIndex={0}
                  onClick={() => navigate(`/logs/${entry.logId}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") navigate(`/logs/${entry.logId}`);
                  }}
                >
                  <td className={styles.historyNick}>
                    {entry.nickname || entry.logId}
                  </td>
                  <td className={styles.historyBattles}>
                    {entry.types.reduce((sum, type) => sum + type.count, 0)}
                  </td>
                  <td className={styles.historyId}>{entry.logId}</td>
                  <td>
                    {entry.types.length > 0 && (
                      <span className={styles.historyTypes}>
                        {entry.types.map((type) => (
                          <span key={type.key} className={styles.historyType}>
                            {logTypeLabel(type.key, type.label)}
                            <span className={styles.historyTypeCount}>{type.count}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className={styles.historyMeta}>
                    {new Date(
                      entry.uploadedAt > 0 ? entry.uploadedAt : entry.savedAt,
                    ).toLocaleDateString(numberLocale, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.historyRemove}
                      onClick={(event) => {
                        event.stopPropagation();
                        setHistoryConfirm({
                          kind: "remove",
                          id: entry.logId,
                          name: entry.nickname || entry.logId,
                        });
                      }}
                      title={t("history.remove")}
                      aria-label={t("history.remove")}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {visibleHistory && visibleHistory.length > HISTORY_PAGE_SIZE && (
          <div className={styles.historyPager}>
            <button
              type="button"
              className={styles.historyPageButton}
              disabled={historyPageSafe <= 1}
              onClick={() => setHistoryPage(Math.max(1, historyPageSafe - 1))}
            >
              {t("history.prev")}
            </button>
            <span>
              {t("history.page", {
                page: historyPageSafe,
                total: historyPageCount,
              })}
            </span>
            <button
              type="button"
              className={styles.historyPageButton}
              disabled={historyPageSafe >= historyPageCount}
              onClick={() =>
                setHistoryPage(Math.min(historyPageCount, historyPageSafe + 1))
              }
            >
              {t("history.next")}
            </button>
          </div>
        )}
      </section>
      </div>
      <LogHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      {historyConfirm &&
        createPortal(
          <div
            className={styles.confirmRoot}
            onMouseDown={() => setHistoryConfirm(null)}
          >
            <div
              className={styles.confirmDialog}
              role="dialog"
              aria-modal="true"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2>
                {historyConfirm.kind === "clear"
                  ? t("history.confirmClearTitle")
                  : t("history.confirmRemoveTitle")}
              </h2>
              <p>
                {historyConfirm.kind === "clear"
                  ? t("history.confirmClear")
                  : t("history.confirmRemove", { name: historyConfirm.name })}
              </p>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setHistoryConfirm(null)}
                >
                  {t("history.cancel")}
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={confirmHistory}
                >
                  {historyConfirm.kind === "clear"
                    ? t("history.clear")
                    : t("history.remove")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};


export default Logs;
