import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  selectSettingsState,
  setAutoUpdate,
} from "@src/store/slices/settings.slice";
import useAppVersion from "./useAppVersion";
import AboutSection from "./general/AboutSection";
import DataSection from "./general/DataSection";
import LanguageSection from "./general/LanguageSection";
import UpdatesSection from "./general/UpdatesSection";
import styles from "./styles/Settings.module.scss";

const GeneralSettings = () => {
  const { t, i18n } = useTranslation("settingsPage");
  const dispatch = useAppDispatch();
  const { autoUpdate } = useAppSelector(selectSettingsState);
  const version = useAppVersion();

  const language = i18n.language.startsWith("ru") ? "ru" : "en";

  const changeLanguage = (nextLanguage: "ru" | "en") => {
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
