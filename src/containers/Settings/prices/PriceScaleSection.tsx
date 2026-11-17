import { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  PRICE_SCALE_PERIODS,
  PriceScalePeriod,
} from "@src/store/slices/settings.slice";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import styles from "../styles/Settings.module.scss";

interface Props {
  period: PriceScalePeriod;
  onChange: (period: PriceScalePeriod) => void;
}

const PriceScaleSection: FC<Props> = ({ period, onChange }) => {
  const { t } = useTranslation("settingsPage");

  return (
    <SettingsSection
      title={t("prices.scale.title")}
      subtitle={t("prices.scale.subtitle")}
    >
      <SettingRow
        title={t("prices.scale.period")}
        description={t("prices.scale.periodHint")}
      >
        <div className={styles.segmented}>
          {PRICE_SCALE_PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.segment} ${
                period === value ? styles.segmentActive : ""
              }`}
              onClick={() => onChange(value)}
            >
              {t(`prices.scale.months.${value}`)}
            </button>
          ))}
        </div>
      </SettingRow>
    </SettingsSection>
  );
};

export default PriceScaleSection;
