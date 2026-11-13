import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { playNotificationSignal } from "@src/helpers/notificationSound";
import { useAppSelector } from "@src/store/store";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import Switch from "../components/Switch";
import styles from "../styles/Settings.module.scss";

interface Props {
  systemNotifications: boolean;
  onChange: (enabled: boolean) => void;
}

const NotificationsSection: FC<Props> = ({
  systemNotifications,
  onChange,
}) => {
  const { t } = useTranslation("settingsPage");
  const { signal, customSoundName } = useAppSelector(
    (state) => state.settings.notifications,
  );
  const [developer, setDeveloper] = useState(false);
  const sent = useRef(0);

  useEffect(() => {
    let cancelled = false;

    window.electronAPI
      .getIsDev()
      .then((value) => {
        if (!cancelled) setDeveloper(value === true);
      })
      .catch(() => {
        if (!cancelled) setDeveloper(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sendTest = () => {
    sent.current += 1;
    const n = sent.current;

    playNotificationSignal(signal, customSoundName);
    void window.electronAPI.showNotification({
      title: t("general.notifications.testTitle", { n }),
      body: t("general.notifications.testBody", { n }),
    });
  };

  return (
    <SettingsSection
      title={t("general.notifications.title")}
      subtitle={t("general.notifications.subtitle")}
    >
      <SettingRow
        title={t("general.notifications.system")}
        description={t("general.notifications.systemHint")}
      >
        <Switch
          checked={systemNotifications}
          onChange={onChange}
          label={t("general.notifications.system")}
        />
      </SettingRow>

      {developer && (
        <SettingRow
          title={t("general.notifications.test")}
          description={t("general.notifications.testHint")}
        >
          <button type="button" className={styles.button} onClick={sendTest}>
            {t("general.notifications.test")}
          </button>
        </SettingRow>
      )}
    </SettingsSection>
  );
};

export default NotificationsSection;
