import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  selectSettingsState,
  setAutoUpdate,
  setStartScreen,
  setSystemNotifications,
} from "@src/store/slices/settings.slice";
import { normalizeUiLanguage, type UiLanguage } from "@src/helpers/contentLanguage";
import useAppVersion from "./useAppVersion";
import AboutSection from "./general/AboutSection";
import DataSection from "./general/DataSection";
import LanguageSection from "./general/LanguageSection";
import StartScreenSection from "./general/StartScreenSection";
import NotificationsSection from "./general/NotificationsSection";
import StartupSection from "./general/StartupSection";
import UpdatesSection from "./general/UpdatesSection";
import styles from "./styles/Settings.module.scss";

const GeneralSettings = () => {
  const { t, i18n } = useTranslation("settingsPage");
  const dispatch = useAppDispatch();
  const { autoUpdate, startScreen, systemNotifications } =
    useAppSelector(selectSettingsState);
  const version = useAppVersion();

  const language = normalizeUiLanguage(i18n.language);

  const changeLanguage = (nextLanguage: UiLanguage) => {
    if (nextLanguage === language) return;
    void i18n.changeLanguage(nextLanguage);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>{t("general.title")}</h2>
        <p>{t("general.subtitle")}</p>
      </div>

      <LanguageSection language={language} onChange={changeLanguage} />

      <StartScreenSection
        startScreen={startScreen}
        onChange={(screen) => dispatch(setStartScreen(screen))}
      />

      <StartupSection />

      <NotificationsSection
        systemNotifications={systemNotifications}
        onChange={(enabled) => dispatch(setSystemNotifications(enabled))}
      />

      <UpdatesSection
        version={version}
        autoUpdate={autoUpdate}
        onAutoUpdate={(enabled) => dispatch(setAutoUpdate(enabled))}
      />

      <DataSection />

      <AboutSection version={version} />
    </div>
  );
};

export default GeneralSettings;
