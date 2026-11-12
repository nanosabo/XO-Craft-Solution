import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { logWarning } from "@src/helpers/errorLog";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import Switch from "../components/Switch";

const StartupSection = () => {
  const { t } = useTranslation("settingsPage");
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    window.electronAPI
      .getLaunchAtLogin()
      .then((state) => {
        if (cancelled) return;

        setEnabled(state.enabled);
        setAvailable(state.available);
      })
      .catch((error) => {
        if (!cancelled) setAvailable(false);
        logWarning("settings-startup", error);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = async (next: boolean) => {
    const previous = enabled;

    setEnabled(next);
    setBusy(true);

    try {
      const state = await window.electronAPI.setLaunchAtLogin(next);

      setEnabled(state.enabled);
      setAvailable(state.available);
    } catch (error) {
      setEnabled(previous);
      logWarning("settings-startup", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsSection
      title={t("general.startup.title")}
      subtitle={t("general.startup.subtitle")}
    >
      <SettingRow
        title={t("general.startup.openAtLogin")}
        description={
          available
            ? t("general.startup.openAtLoginHint")
            : t("general.startup.unavailable")
        }
      >
        <Switch
          checked={enabled}
          onChange={(value) => void onChange(value)}
          label={t("general.startup.openAtLogin")}
          disabled={!available || !ready || busy}
        />
      </SettingRow>
    </SettingsSection>
  );
};

export default StartupSection;
