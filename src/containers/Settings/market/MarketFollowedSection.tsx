import { FC } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import SettingsSection from "../components/SettingsSection";
import styles from "../styles/Settings.module.scss";

interface Props {
  count: number;
}

const MarketFollowedSection: FC<Props> = ({ count }) => {
  const { t } = useTranslation("settingsPage");
  const navigate = useNavigate();

  return (
    <SettingsSection
      title={t("market.followed", { count })}
      subtitle={t("market.followedHint")}
      action={
        <button
          type="button"
          className={styles.button}
          onClick={() => navigate("/market")}
        >
          {t("market.goToMarket")}
        </button>
      }
    >
      <div className={styles.followedSummary}>
        <span className={styles.followedCount}>{count}</span>
        <p>{t("market.followedHint")}</p>
      </div>
    </SettingsSection>
  );
};

export default MarketFollowedSection;
