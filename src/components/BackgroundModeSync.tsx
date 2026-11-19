import { useEffect } from "react";
import { useAppSelector } from "@src/store/store";

/** Tells the main process whether the app may keep running in the tray. */
const BackgroundModeSync = () => {
  const runInBackground = useAppSelector(
    (state) => state.settings.runInBackground,
  );

  useEffect(() => {
    window.electronAPI.setRunInBackground(runInBackground);
  }, [runInBackground]);

  return null;
};

export default BackgroundModeSync;
