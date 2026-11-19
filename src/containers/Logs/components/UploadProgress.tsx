import classNames from "classnames";
import type { TFunction } from "i18next";
import formatBytes from "@src/helpers/formatBytes";
import type { CrossoutUploadProgress } from "@src/types/crossout";
import styles from "../styles/Logs.module.scss";

const clampPercent = (percent: number): number =>
  Math.min(100, Math.max(0, Math.round(percent)));

const UploadProgress = ({
  t,
  progress,
}: {
  t: TFunction;
  progress: CrossoutUploadProgress;
}) => {
  const percent = clampPercent(progress.percent);

  return (
    <div
      className={classNames(styles.statusBlock, styles.statusBlockOnly)}
      role="status"
      aria-live="polite"
    >
      <div className={styles.progressBlock}>
        <div className={styles.progressHead}>
          <span>
            {progress.phase === "processing"
              ? t("upload.processing")
              : t("upload.uploadingHint")}
          </span>
          <span>{percent}%</span>
        </div>
        {progress.phase === "processing" && (
          <p className={styles.progressHint}>{t("upload.processingHint")}</p>
        )}
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>
        <div className={styles.progressMeta}>
          <span>
            {t("upload.progress", {
              percent,
              transferred: formatBytes(progress.transferred),
              total: formatBytes(progress.total),
            })}
          </span>
          <span>
            {t("upload.speed", { speed: formatBytes(progress.bytesPerSecond) })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UploadProgress;
