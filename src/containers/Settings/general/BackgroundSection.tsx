import { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  selectSettingsState,
  setRunInBackground,
} from "@src/store/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import Switch from "../components/Switch";

const BackgroundSection: FC = () => {
  const { t } = useTranslation("settingsPage");
  const dispatch = useAppDispatch();
  const { runInBackground } = useAppSelector(selectSettingsState);

  return (
    <SettingsSection
      title={t("general.background.title")}
      subtitle={t("general.background.subtitle")}
    >
      <SettingRow
        title={t("general.background.runInTray")}
        description={t("general.background.runInTrayHint")}
      >
        <Switch
          checked={runInBackground}
          onChange={(checked) => dispatch(setRunInBackground(checked))}
          label={t("general.background.runInTray")}
        />
      </SettingRow>
    </SettingsSection>
  );
};

export default BackgroundSection;
