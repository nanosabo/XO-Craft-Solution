import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeUiLanguage } from "@src/helpers/contentLanguage";
import { loadDonations, type DonationFeed } from "@src/helpers/donations";
import { logWarning } from "@src/helpers/errorLog";
import styles from "./styles/About.module.scss";

const localeOf = (language: string) => {
  const ui = normalizeUiLanguage(language);

  if (ui === "uk") return "uk-UA";
  if (ui === "en") return "en-US";

  return "ru-RU";
};

const formatMoney = (amount: number, locale: string) => {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} ₴`;
};

const Donations = () => {
  const { t, i18n } = useTranslation("aboutPage");
  const [feed, setFeed] = useState<DonationFeed | null>(null);
  const locale = localeOf(i18n.language);

  useEffect(() => {
    let cancelled = false;

    loadDonations()
      .then((next) => {
        if (!cancelled) setFeed(next);
      })
      .catch((error) => logWarning("donations", error));

    return () => {
      cancelled = true;
    };
  }, []);

  if (!feed) return null;

  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={styles.donations}>
      <h3 className={styles.donationsTitle}>{t("support.donations.title")}</h3>

      {feed.donations.length === 0 ? (
        <p className={styles.donationsEmpty}>{t("support.donations.empty")}</p>
      ) : (
        <ul className={styles.donationsList}>
          {feed.donations.map((donation) => (
            <li key={donation.id} className={styles.donation}>
              <div className={styles.donationTop}>
                {donation.time > 0 ? (
                  <time
                    className={styles.donationTime}
                    dateTime={new Date(donation.time).toISOString()}
                  >
                    {dateFormat.format(donation.time)}
                  </time>
                ) : (
                  <span />
                )}
                <strong className={styles.donationAmount}>
                  {formatMoney(donation.amount, locale)}
                </strong>
              </div>
              <p
                className={
                  donation.comment
                    ? styles.donationComment
                    : styles.donationQuiet
                }
              >
                {donation.comment || t("support.donations.noComment")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Donations;
