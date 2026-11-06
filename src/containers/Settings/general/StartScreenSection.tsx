import { FC } from "react";
import { useTranslation } from "react-i18next";
import { START_SCREENS, type StartScreen } from "@src/helpers/startScreen";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import styles from "../styles/Settings.module.scss";

interface Props {
  startScreen: StartScreen;
  onChange: (screen: StartScreen) => void;
}

const StartScreenSection: FC<Props> = ({ startScreen, onChange }) => {
  const { t } = useTranslation("settingsPage");

  return (
    <SettingsSection
      title={t("general.startScreen.title")}
      subtitle={t("general.startScreen.subtitle")}
    >
      <SettingRow title={t("general.startScreen.title")}>
        <div className={styles.segmented}>
          {START_SCREENS.map((screen) => (
            <button
              key={screen}
              type="button"
              className={`${styles.segment} ${
                startScreen === screen ? styles.segmentActive : ""
              }`}
              onClick={() => onChange(screen)}
            >
              {t(`general.startScreen.${screen}`)}
            </button>
          ))}
        </div>
      </SettingRow>
    </SettingsSection>
  );
};

export default StartScreenSection;
