import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { logWarning } from "@src/helpers/errorLog";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import styles from "../styles/Settings.module.scss";

const SCALES = [0.8, 0.9, 1, 1.1, 1.25];

const ScaleSection = () => {
  const { t } = useTranslation("settingsPage");
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let cancelled = false;

    window.electronAPI
      .getUiScale()
      .then((value) => {
        if (!cancelled) setScale(value);
      })
      .catch((error) => logWarning("settings-scale", error));

    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = async (next: number) => {
    if (next === scale) return;

    const previous = scale;
    setScale(next);

    try {
      setScale(await window.electronAPI.setUiScale(next));
    } catch (error) {
      setScale(previous);
      logWarning("settings-scale", error);
    }
  };

  return (
    <SettingsSection
      title={t("general.scale.title")}
      subtitle={t("general.scale.subtitle")}
    >
      <SettingRow
        title={t("general.scale.title")}
        description={t("general.scale.hint")}
      >
        <div className={styles.segmented}>
          {SCALES.map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.segment} ${
                scale === value ? styles.segmentActive : ""
              }`}
              onClick={() => void onChange(value)}
            >
              {value === 1
                ? t("general.scale.auto")
                : `${Math.round(value * 100)}%`}
            </button>
          ))}
        </div>
      </SettingRow>
    </SettingsSection>
  );
};

export default ScaleSection;
