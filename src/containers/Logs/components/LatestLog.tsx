import classNames from "classnames";
import type { TFunction } from "i18next";
import type { CrossoutDetectedLog } from "@src/types/crossout";
import { formatLogTime } from "../helpers/labels";
import { fileName, parentDir, shortenPath } from "../helpers/paths";
import { FileGlyph } from "./glyphs";
import styles from "../styles/Logs.module.scss";

type Props = {
  t: TFunction;
  latestLog: CrossoutDetectedLog | null | undefined;
  logsPath: string | null;
  filePath: string | null;
  locale: string;
  onSettings: () => void;
  onUpload: (path: string) => void;
  onPick: () => void;
};

const LatestLog = ({
  t,
  latestLog,
  logsPath,
  filePath,
  locale,
  onSettings,
  onUpload,
  onPick,
}: Props) => (
  <div className={classNames(styles.latest, { [styles.latestPlain]: !latestLog })}>
    {latestLog === undefined && (
      <p className={styles.latestStatus}>{t("upload.latestLoading")}</p>
    )}
    {latestLog === null && (
      <div className={styles.latestMissing}>
        <p>{logsPath ? t("upload.latestMissingCustom") : t("upload.latestMissing")}</p>
        <button
          type="button"
          className={classNames(styles.secondaryButton, styles.latestButton)}
          onClick={onSettings}
        >
          {t("upload.openSettings")}
        </button>
      </div>
    )}
    {latestLog ? (
      <div className={styles.latestBody}>
        <div className={styles.latestInfo}>
          <span className={styles.latestEyebrow}>{t("upload.latestTitle")}</span>
          <strong className={styles.latestName}>
            {latestLog.session.toLowerCase() === "logs" ? "combat.log" : latestLog.session}
          </strong>
          <span className={styles.latestMeta}>
            {formatLogTime(latestLog.modifiedAt / 1000, locale)}
          </span>
          <span className={styles.latestPath} title={latestLog.filePath}>
            {shortenPath(parentDir(latestLog.filePath))}
          </span>
        </div>
        <div className={styles.latestActions}>
          <button
            type="button"
            className={classNames(styles.primaryButton, styles.latestButton)}
            onClick={() => onUpload(latestLog.filePath)}
          >
            {t("upload.latestUpload")}
          </button>
          <button
            type="button"
            className={classNames(styles.secondaryButton, styles.latestButton)}
            onClick={onPick}
            title={filePath ?? t("upload.pick")}
          >
            {t("upload.pickOther")}
          </button>
        </div>
      </div>
    ) : (
      <button
        type="button"
        className={classNames(styles.pickButton, filePath && styles.pickButtonSelected)}
        onClick={onPick}
        title={filePath ?? t("upload.pick")}
      >
        <span className={styles.pickIcon}>
          <FileGlyph />
        </span>
        <span className={styles.pickCopy}>
          <strong>{filePath ? fileName(filePath) : t("upload.pick")}</strong>
          <span>{filePath ? t("upload.selectedHint") : t("upload.pickHint")}</span>
        </span>
      </button>
    )}
  </div>
);

export default LatestLog;
