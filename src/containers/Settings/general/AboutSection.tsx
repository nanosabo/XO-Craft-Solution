import { FC } from "react";
import { useTranslation } from "react-i18next";
import { ExternalIcon } from "@src/ui/icons";
import SettingsSection from "../components/SettingsSection";
import styles from "../styles/Settings.module.scss";

const links = [
  {
    key: "github",
    url: "https://github.com/nanosabo/XO-Craft-Solution",
  },
  {
    key: "discord",
    url: "https://discord.gg/cwtHShAfZx",
  },
  {
    key: "site",
    url: "https://nanosabo.github.io/xocs-imgs/",
  },
];

interface Props {
  version: string;
}

const AboutSection: FC<Props> = ({ version }) => {
  const { t } = useTranslation("settingsPage");

  return (
    <SettingsSection
      title={t("general.about.title")}
      subtitle={t("general.about.subtitle")}
    >
      <div className={styles.about}>
        <p>{t("general.about.version", { version })}</p>
        <span>{t("general.about.author")}</span>
      </div>

      <div className={styles.linkRow}>
        {links.map(({ key, url }) => (
          <button
            key={key}
            type="button"
            className={styles.linkButton}
            onClick={() => void window.electronAPI.openExternal(url)}
          >
            {t(`general.about.${key}`)}
            <ExternalIcon />
          </button>
        ))}
      </div>
    </SettingsSection>
  );
};

export default AboutSection;
