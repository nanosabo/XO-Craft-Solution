import { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  MarketNotificationSettings,
  NotificationSignal,
} from "@src/store/slices/settings.slice";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import Switch from "../components/Switch";
import Select from "@src/ui/Select";
import { playNotificationSignal } from "@src/helpers/notificationSound";
import CustomSoundRow from "./CustomSoundRow";
import styles from "../styles/Settings.module.scss";

interface Props {
  notifications: MarketNotificationSettings;
  onUpdate: (patch: Partial<MarketNotificationSettings>) => void;
}

const MarketSoundSection: FC<Props> = ({ notifications, onUpdate }) => {
  const { t } = useTranslation("settingsPage");

  const signalOptions = [
    { value: "coins", label: t("market.signals.coins") },
    { value: "radar", label: t("market.signals.radar") },
    { value: "soft", label: t("market.signals.soft") },
    ...(notifications.customSoundName
      ? [{ value: "custom", label: t("market.signals.custom") }]
      : []),
  ];

  return (
    <SettingsSection title={t("market.title")}>
      <SettingRow
        title={t("market.sound")}
        description={t("market.soundHint")}
      >
        <Switch
          checked={notifications.soundEnabled}
          onChange={(checked) => onUpdate({ soundEnabled: checked })}
          label={t("market.sound")}
        />
      </SettingRow>

      <SettingRow
        title={t("market.priceDrop")}
        description={t("market.priceDropHint")}
      >
        <Switch
          checked={notifications.priceDropEnabled}
          onChange={(checked) => onUpdate({ priceDropEnabled: checked })}
          label={t("market.priceDrop")}
        />
      </SettingRow>

      <SettingRow
        title={t("market.background")}
        description={t("market.backgroundHint")}
      >
        <Switch
          checked={notifications.backgroundEnabled}
          onChange={(checked) => onUpdate({ backgroundEnabled: checked })}
          label={t("market.background")}
        />
      </SettingRow>

      <SettingRow
        title={t("market.signal")}
        description={t("market.signalHint")}
      >
        <div className={styles.signalControl}>
          <div className={styles.signalSelect}>
            <Select
              options={signalOptions}
              defaultValue={notifications.signal}
              onChange={(value) =>
                onUpdate({ signal: value as NotificationSignal })
              }
            />
          </div>
          <button
            type="button"
            className={styles.button}
            onClick={() =>
              playNotificationSignal(
                notifications.signal,
                notifications.customSoundName,
              )
            }
          >
            {t("market.test")}
          </button>
        </div>
      </SettingRow>

      <CustomSoundRow notifications={notifications} onUpdate={onUpdate} />
    </SettingsSection>
  );
};

export default MarketSoundSection;
