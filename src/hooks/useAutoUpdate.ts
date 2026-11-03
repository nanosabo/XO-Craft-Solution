import { useEffect, useRef } from "react";
import { selectSettingsState } from "@src/store/slices/settings.slice";
import { useAppSelector } from "@src/store/store";

/**
 * Starts the update check only when the user has enabled it in settings.
 * The main process no longer checks on its own, so the preference is respected
 * both on startup and after it is changed.
 */
const useAutoUpdate = () => {
  const { autoUpdate } = useAppSelector(selectSettingsState);
  const wasChecked = useRef(false);

  useEffect(() => {
    if (!autoUpdate || wasChecked.current) return;

    wasChecked.current = true;
    window.electronAPI.checkForUpdates().catch(() => {
      /* The updater can be unavailable in dev builds or offline. */
    });
  }, [autoUpdate]);
};

export default useAutoUpdate;
