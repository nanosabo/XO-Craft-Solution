import { scheduleSolutionRefresh } from "@src/helpers/scheduleSolutionRefresh";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  selectSettingsState,
  setKeepInstalledParts,
  setSymmetryMode,
} from "@src/store/slices/settings.slice";
import { useTranslation } from "react-i18next";
import SettingRow from "./components/SettingRow";
import SettingsSection from "./components/SettingsSection";
import Switch from "./components/Switch";
import InstalledPartsSection from "./general/InstalledPartsSection";
import styles from "./styles/Settings.module.scss";

const SelectionSettings = () => {
  const { t } = useTranslation("settingsPage");
  const dispatch = useAppDispatch();
  const { keepInstalledParts, symmetryMode } = useAppSelector(
    selectSettingsState,
  );

  return (
    <div className={styles.panel}>
      <InstalledPartsSection
        enabled={keepInstalledParts}
        onChange={(enabled) => dispatch(setKeepInstalledParts(enabled))}
      />
      <SettingsSection
        title={t("general.symmetry.title")}
        subtitle={t("general.symmetry.subtitle")}
      >
        <SettingRow
          title={t("general.symmetry.enabled")}
          description={t("general.symmetry.hint")}
        >
          <Switch
            checked={symmetryMode}
            onChange={(enabled) => {
              dispatch(setSymmetryMode(enabled));
              scheduleSolutionRefresh(dispatch);
            }}
            label={t("general.symmetry.enabled")}
          />
        </SettingRow>
      </SettingsSection>
    </div>
  );
};

export default SelectionSettings;
