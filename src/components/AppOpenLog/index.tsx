import { buildAppLogLink, parseAppLogLink } from "@src/helpers/appLogLink";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const openLog = (
  navigate: ReturnType<typeof useNavigate>,
  logId: string,
  type: string | null,
) => {
  const parsed = parseAppLogLink(buildAppLogLink(logId, type));

  if (!parsed) return;

  const query = parsed.type
    ? `?type=${encodeURIComponent(parsed.type)}`
    : "";

  navigate(`/logs/${encodeURIComponent(parsed.logId)}${query}`);
};

const AppOpenLog = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = window.electronAPI.onAppOpenLog((link) => {
      openLog(navigate, link.logId, link.type);
    });

    window.electronAPI.notifyAppLogListening();

    return unsubscribe;
  }, [navigate]);

  return null;
};

export default AppOpenLog;
