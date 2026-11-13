import { useEffect } from "react";
import { useAppSelector } from "@src/store/store";

/** Tells the main process whether toasts or the system should show alerts. */
const NotificationModeSync = () => {
  const systemNotifications = useAppSelector(
    (state) => state.settings.systemNotifications,
  );

  useEffect(() => {
    window.electronAPI.setSystemNotifications(systemNotifications);
  }, [systemNotifications]);

  return null;
};

export default NotificationModeSync;
