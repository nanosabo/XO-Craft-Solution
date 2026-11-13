import { FC } from "react";
import { useTranslation } from "react-i18next";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import Switch from "../components/Switch";

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

const InstalledPartsSection: FC<Props> = ({ enabled, onChange }) => {
  const { t } = useTranslation("settingsPage");

  return (
    <SettingsSection
      title={t("general.installed.title")}
      subtitle={t("general.installed.subtitle")}
    >
      <SettingRow
        title={t("general.installed.keep")}
        description={t("general.installed.keepHint")}
      >
        <Switch
          checked={enabled}
          onChange={onChange}
          label={t("general.installed.keep")}
        />
      </SettingRow>
    </SettingsSection>
  );
};

export default InstalledPartsSection;
