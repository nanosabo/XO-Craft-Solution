import classNames from "classnames";
import type { TFunction } from "i18next";
import type { i18n as I18n } from "i18next";
import type { CrossoutDetectedLog, CrossoutUploadProgress } from "@src/types/crossout";
import { errorText, type LogsError } from "../helpers/labels";
import { FileGlyph, LinkGlyph } from "./glyphs";
import LatestLog from "./LatestLog";
import UploadProgress from "./UploadProgress";
import styles from "../styles/Logs.module.scss";

type Props = {
  t: TFunction;
  i18n: I18n;
  uploading: boolean;
  source: "file" | "link";
  latestLog: CrossoutDetectedLog | null | undefined;
  logsPath: string | null;
  filePath: string | null;
  locale: string;
  progress: CrossoutUploadProgress | null;
  uploadError: LogsError | null;
  linkError: boolean;
  onSource: (source: "file" | "link") => void;
  onSettings: () => void;
  onUpload: (path: string) => void;
  onPick: () => void;
};

const UploadCard = ({
  t,
  i18n,
  uploading,
  source,
  latestLog,
  logsPath,
  filePath,
  locale,
  progress,
  uploadError,
  linkError,
  onSource,
  onSettings,
  onUpload,
  onPick,
}: Props) => (
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
          onClick={() => onSource("file")}
        >
          <span className={styles.sourceIcon}><FileGlyph /></span>
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
          onClick={() => onSource("link")}
        >
          <span className={styles.sourceIcon}><LinkGlyph /></span>
          <span className={styles.sourceCopy}>
            <strong>{t("upload.sourceLink")}</strong>
            <span>{t("upload.sourceLinkHint")}</span>
          </span>
        </button>
      </div>
    )}
    {!uploading && source === "file" && (
      <LatestLog
        t={t}
        latestLog={latestLog}
        logsPath={logsPath}
        filePath={filePath}
        locale={locale}
        onSettings={onSettings}
        onUpload={onUpload}
        onPick={onPick}
      />
    )}
    {!uploading && source === "link" && (
      <div className={styles.pasteNotice}>
        <span className={styles.pasteIcon} aria-hidden="true"><LinkGlyph /></span>
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
    {progress && <UploadProgress t={t} progress={progress} />}
    {uploadError && <p className={styles.error}>{errorText(t, i18n, uploadError)}</p>}
    {source === "link" && linkError && (
      <p className={styles.error}>{t("upload.linkError")}</p>
    )}
  </section>
);

export default UploadCard;
