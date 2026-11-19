import type { TFunction } from "i18next";
import type { CrossoutLogSummary } from "@src/types/crossout";
import { ExternalIcon } from "@src/ui/icons";
import { siteLogUrl } from "../helpers/siteUrl";
import styles from "@src/containers/Logs/styles/Logs.module.scss";

type Props = {
  t: TFunction;
  summary: CrossoutLogSummary | null;
  uploadDate: string;
  error: boolean;
  isRu: boolean;
  onBack: () => void;
};

const LogHeading = ({ t, summary, uploadDate, error, isRu, onBack }: Props) => (
  <div className={styles.heading}>
    <button type="button" className={styles.backButton} onClick={onBack}>
      <span className={styles.backArrow} aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 3.5 5.5 8 10 12.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {t("result.back")}
    </button>
    <div className={styles.headingTitle}>
      <h1>{t("result.title")}</h1>
      {summary && (
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            void siteLogUrl(summary.logId, isRu).then((url) =>
              window.electronAPI.openExternal(url),
            );
          }}
        >
          <ExternalIcon />
          {t("result.openSite")}
        </button>
      )}
    </div>
    <p>
      {summary
        ? uploadDate
          ? t("result.subtitle", {
              logId: summary.logId,
              date: uploadDate,
              nickname: summary.nickname || "—",
            })
          : t("result.subtitlePlain", {
              logId: summary.logId,
              nickname: summary.nickname || "—",
            })
        : error
          ? t("result.error")
          : t("result.loading")}
    </p>
  </div>
);

export default LogHeading;
