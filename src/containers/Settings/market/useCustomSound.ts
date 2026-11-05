import { useState } from "react";
import { useTranslation } from "react-i18next";
import { logWarning } from "@src/helpers/errorLog";
import {
  invalidateCustomSound,
  playNotificationSignal,
} from "@src/helpers/notificationSound";
import {
  MarketNotificationSettings,
} from "@src/store/slices/settings.slice";

type UpdateSettings = (patch: Partial<MarketNotificationSettings>) => void;

const useCustomSound = (
  notifications: MarketNotificationSettings,
  update: UpdateSettings,
) => {
  const { t } = useTranslation("settingsPage");
  const [isPickingSound, setIsPickingSound] = useState(false);
  const [soundError, setSoundError] = useState<string | null>(null);

  const pickSound = async () => {
    setIsPickingSound(true);
    setSoundError(null);

    try {
      const result = await window.electronAPI.pickNotificationSound();

      if (!result) return;

      if (!result.ok) {
        setSoundError(
          result.error === "too-large"
            ? t("market.customSoundTooLarge")
            : result.error === "unsupported"
              ? t("market.customSoundUnsupported")
              : t("market.customSoundError"),
        );
        return;
      }

      invalidateCustomSound();
      update({ signal: "custom", customSoundName: result.name });
      playNotificationSignal("custom", result.name);
    } catch (error) {
      logWarning("settings-sound", error);
      setSoundError(t("market.customSoundError"));
    } finally {
      setIsPickingSound(false);
    }
  };

  const removeSound = async () => {
    try {
      await window.electronAPI.removeNotificationSound();
      invalidateCustomSound();
      update({
        customSoundName: null,
        signal:
          notifications.signal === "custom" ? "coins" : notifications.signal,
      });
      setSoundError(null);
    } catch (error) {
      logWarning("settings-sound", error);
      setSoundError(t("market.customSoundError"));
    }
  };

  return {
    isPickingSound,
    soundError,
    pickSound,
    removeSound,
  };
};

export default useCustomSound;
