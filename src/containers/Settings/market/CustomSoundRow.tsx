import { FC } from "react";
import { useTranslation } from "react-i18next";
import { MarketNotificationSettings } from "@src/store/slices/settings.slice";
import SettingRow from "../components/SettingRow";
import useCustomSound from "./useCustomSound";
import styles from "../styles/Settings.module.scss";

interface Props {
  notifications: MarketNotificationSettings;
  onUpdate: (patch: Partial<MarketNotificationSettings>) => void;
}

const CustomSoundRow: FC<Props> = ({ notifications, onUpdate }) => {
  const { t } = useTranslation("settingsPage");
  const { isPickingSound, soundError, pickSound, removeSound } = useCustomSound(
    notifications,
    onUpdate,
  );

  return (
    <>
      <SettingRow
        title={t("market.customSound")}
        description={t("market.customSoundHint")}
      >
        <div className={styles.customSoundControl}>
          {notifications.customSoundName ? (
            <>
              <span
                className={styles.soundName}
                title={notifications.customSoundName}
              >
                {notifications.customSoundName}
              </span>
              <button
                type="button"
                className={styles.button}
                onClick={pickSound}
                disabled={isPickingSound}
              >
                {t("market.replaceSound")}
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.dangerButton}`}
                onClick={removeSound}
              >
                {t("market.removeSound")}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.button}
              onClick={pickSound}
              disabled={isPickingSound}
            >
              {isPickingSound
                ? t("market.pickingSound")
                : t("market.uploadSound")}
            </button>
          )}
        </div>
      </SettingRow>

      {soundError && <p className={styles.statusError}>{soundError}</p>}
    </>
  );
};

export default CustomSoundRow;
