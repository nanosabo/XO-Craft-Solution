import { useTranslation } from "react-i18next";
import {
  PriceScalePeriod,
  selectSettingsState,
  setPriceScalePeriod,
} from "@src/store/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import PriceScaleSection from "./prices/PriceScaleSection";
import styles from "./styles/Settings.module.scss";

const PriceSettings = () => {
  const { t } = useTranslation("settingsPage");
  const dispatch = useAppDispatch();
  const { priceScalePeriod } = useAppSelector(selectSettingsState);

  const updatePriceScalePeriod = (period: PriceScalePeriod) => {
    dispatch(setPriceScalePeriod(period));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>{t("prices.title")}</h2>
        <p>{t("prices.subtitle")}</p>
      </div>

      <PriceScaleSection
        period={priceScalePeriod}
        onChange={updatePriceScalePeriod}
      />
    </div>
  );
};

export default PriceSettings;
