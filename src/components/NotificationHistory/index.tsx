import MarketItemImage from "@src/components/MarketItem/MarketItemImage";
import { notificationKeys } from "@src/hooks/useMarketNotifications";
import { isLotsMetric } from "@src/store/follow";
import { setMarketModalItem } from "@src/store/slices/marketModal.slice";
import {
  clearNotificationHistory,
  markNotificationHistorySeen,
  selectNotificationHistory,
} from "@src/store/slices/notificationHistory.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import { BellIcon, TrashIcon } from "@src/ui/icons";
import classNames from "classnames";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./NotificationHistory.module.scss";

const formatWhen = (at: number, language: string) => {
  const date = new Date(at);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return date.toLocaleString(
    language,
    sameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        },
  );
};

const NotificationHistory = () => {
  const { t, i18n } = useTranslation("marketPage");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const entries = useAppSelector(selectNotificationHistory);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const unseen = entries.reduce(
    (count, entry) => count + (entry.seen ? 0 : 1),
    0,
  );

  useEffect(() => {
    if (!open) return;

    if (entries.some((entry) => !entry.seen)) {
      dispatch(markNotificationHistorySeen());
    }

    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [dispatch, entries, open]);

  const openItem = (itemId: number) => {
    dispatch(setMarketModalItem(itemId));
    if (pathname !== "/market") navigate("/market");
    setOpen(false);
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={classNames(styles.button, { [styles.buttonOn]: open })}
        title={t("history.open")}
        aria-expanded={open}
        aria-controls={titleId}
        onClick={() => setOpen((current) => !current)}
      >
        <BellIcon />
        {unseen > 0 && (
          <span className={styles.badge}>{unseen > 9 ? "9+" : unseen}</span>
        )}
      </button>

      {open && (
        <section className={styles.panel} aria-labelledby={titleId}>
          <header className={styles.head}>
            <h3 id={titleId}>{t("history.title")}</h3>
            <button
              type="button"
              className={styles.clear}
              disabled={entries.length === 0}
              onClick={() => dispatch(clearNotificationHistory())}
            >
              <TrashIcon />
              {t("history.clear")}
            </button>
          </header>

          {entries.length === 0 ? (
            <p className={styles.empty}>{t("history.empty")}</p>
          ) : (
            <ul className={styles.list}>
              {entries.map((entry) => {
                const keys = notificationKeys[entry.metric];
                const numbers = isLotsMetric(entry.metric)
                  ? { amount: entry.value, previous: entry.previous }
                  : { price: entry.value, previous: entry.previous };

                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={styles.item}
                      onClick={() => openItem(entry.itemId)}
                    >
                      <span className={styles.image}>
                        <MarketItemImage id={entry.itemId} title={entry.name} />
                      </span>
                      <span className={styles.copy}>
                        <span className={styles.itemTitle}>
                          {i18n.t(keys.title)}
                        </span>
                        <span className={styles.itemBody}>
                          {i18n.t(keys.body, {
                            name: entry.name,
                            ...numbers,
                          })}
                        </span>
                      </span>
                      <time dateTime={new Date(entry.at).toISOString()}>
                        {formatWhen(entry.at, i18n.language)}
                      </time>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default NotificationHistory;
