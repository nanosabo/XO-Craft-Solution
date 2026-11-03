import { useTranslation } from "react-i18next";
import { selectMarketState } from "@src/store/slices/market.slice";
import {
  MarketNotificationSettings,
  selectSettingsState,
  setNotificationSettings,
} from "@src/store/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import MarketFollowedSection from "./market/MarketFollowedSection";
import MarketSoundSection from "./market/MarketSoundSection";
import styles from "./styles/Settings.module.scss";

const MarketSettings = () => {
  const { t } = useTranslation("settingsPage");
  const dispatch = useAppDispatch();
  const { notifications } = useAppSelector(selectSettingsState);
  const { followedItems } = useAppSelector(selectMarketState);

  const update = (patch: Partial<MarketNotificationSettings>) => {
    dispatch(setNotificationSettings(patch));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>{t("market.title")}</h2>
        <p>{t("market.subtitle")}</p>
      </div>

      <MarketSoundSection notifications={notifications} onUpdate={update} />

      <MarketFollowedSection count={followedItems.length} />
    </div>
  );
};

export default MarketSettings;
