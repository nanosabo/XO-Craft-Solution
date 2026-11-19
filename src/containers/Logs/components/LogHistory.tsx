import classNames from "classnames";
import type { TFunction } from "i18next";
import type { i18n as I18n } from "i18next";
import type { CrossoutLogHistoryEntry } from "@src/types/crossout";
import { HISTORY_PAGE_SIZE } from "../helpers/historyPage";
import { logTypeLabel } from "../helpers/labels";
import styles from "../styles/Logs.module.scss";

type Props = {
  t: TFunction;
  i18n: I18n;
  locale: string;
  history: CrossoutLogHistoryEntry[] | null;
  visibleCount: number;
  rows: CrossoutLogHistoryEntry[] | null;
  historyError: boolean;
  historyDate: string;
  page: number;
  pageCount: number;
  onDate: (value: string) => void;
  onResetDate: () => void;
  onClear: () => void;
  onPage: (page: number) => void;
  onOpen: (logId: string) => void;
  onRemove: (id: string, name: string) => void;
};

const LogHistory = ({
  t,
  i18n,
  locale,
  history,
  visibleCount,
  rows,
  historyError,
  historyDate,
  page,
  pageCount,
  onDate,
  onResetDate,
  onClear,
  onPage,
  onOpen,
  onRemove,
}: Props) => (
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
                onChange={(event) => onDate(event.target.value)}
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
            onClick={onResetDate}
          >
            {t("history.reset")}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={onClear}>
            {t("history.clear")}
          </button>
        </div>
      )}
    </div>
    {historyError && <p className={styles.error}>{t("history.error")}</p>}
    {history === null && <p className={styles.empty}>{t("history.loading")}</p>}
    {history && history.length === 0 && <p className={styles.empty}>{t("history.empty")}</p>}
    {history && history.length > 0 && visibleCount === 0 && (
      <p className={styles.empty}>{t("history.dateEmpty")}</p>
    )}
    {rows && rows.length > 0 && (
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
            {rows.map((entry) => (
              <tr
                key={entry.logId}
                className={styles.historyRow}
                tabIndex={0}
                onClick={() => onOpen(entry.logId)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onOpen(entry.logId);
                }}
              >
                <td className={styles.historyNick}>{entry.nickname || entry.logId}</td>
                <td className={styles.historyBattles}>
                  {entry.types.reduce((sum, type) => sum + type.count, 0)}
                </td>
                <td className={styles.historyId}>{entry.logId}</td>
                <td>
                  {entry.types.length > 0 && (
                    <span className={styles.historyTypes}>
                      {entry.types.map((type) => (
                        <span key={type.key} className={styles.historyType}>
                          {logTypeLabel(t, i18n, type.key, type.label)}
                          <span className={styles.historyTypeCount}>{type.count}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className={styles.historyMeta}>
                  {new Date(entry.uploadedAt > 0 ? entry.uploadedAt : entry.savedAt)
                    .toLocaleDateString(locale, {
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
                      onRemove(entry.logId, entry.nickname || entry.logId);
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
    {visibleCount > HISTORY_PAGE_SIZE && (
      <div className={styles.historyPager}>
        <button
          type="button"
          className={styles.historyPageButton}
          disabled={page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
        >
          {t("history.prev")}
        </button>
        <span>{t("history.page", { page, total: pageCount })}</span>
        <button
          type="button"
          className={styles.historyPageButton}
          disabled={page >= pageCount}
          onClick={() => onPage(Math.min(pageCount, page + 1))}
        >
          {t("history.next")}
        </button>
      </div>
    )}
  </section>
);

export default LogHistory;
