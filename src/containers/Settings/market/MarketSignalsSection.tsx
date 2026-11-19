import { FC } from "react";
import { useTranslation } from "react-i18next";
import { MarketNotificationSettings } from "@src/store/slices/settings.slice";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import Switch from "../components/Switch";

interface Props {
  notifications: MarketNotificationSettings;
  onUpdate: (patch: Partial<MarketNotificationSettings>) => void;
}

const MarketSignalsSection: FC<Props> = ({ notifications, onUpdate }) => {
  const { t } = useTranslation("settingsPage");

  return (
    <SettingsSection
      title={t("market.signalSection")}
      subtitle={t("market.signalSectionHint")}
    >
      <SettingRow
        title={t("market.signalPrice")}
        description={t("market.signalPriceHint")}
      >
        <Switch
          checked={notifications.signalPriceEnabled}
          onChange={(checked) => onUpdate({ signalPriceEnabled: checked })}
          label={t("market.signalPrice")}
        />
      </SettingRow>

      <SettingRow
        title={t("market.signalCraft")}
        description={t("market.signalCraftHint")}
      >
        <Switch
          checked={notifications.signalCraftEnabled}
          onChange={(checked) => onUpdate({ signalCraftEnabled: checked })}
          label={t("market.signalCraft")}
        />
      </SettingRow>
    </SettingsSection>
  );
};

export default MarketSignalsSection;
