import { FC } from "react";
import { useTranslation } from "react-i18next";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import styles from "../styles/Settings.module.scss";

interface Props {
  language: "ru" | "en";
  onChange: (language: "ru" | "en") => void;
}

const LanguageSection: FC<Props> = ({ language, onChange }) => {
  const { t } = useTranslation("settingsPage");

  return (
    <SettingsSection
      title={t("general.language.title")}
      subtitle={t("general.language.subtitle")}
    >
      <SettingRow title={t("general.language.title")}>
        <div className={styles.segmented}>
          <button
            type="button"
            className={`${styles.segment} ${
              language === "ru" ? styles.segmentActive : ""
            }`}
            onClick={() => onChange("ru")}
          >
            {t("general.language.ru")}
          </button>
          <button
            type="button"
            className={`${styles.segment} ${
              language === "en" ? styles.segmentActive : ""
            }`}
            onClick={() => onChange("en")}
          >
            {t("general.language.en")}
          </button>
        </div>
      </SettingRow>
    </SettingsSection>
  );
};

export default LanguageSection;
