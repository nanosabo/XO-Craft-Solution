import { useEffect, useState } from "react";
import { logWarning } from "@src/helpers/errorLog";
import type { CrossoutDetectedLog } from "@src/types/crossout";

/** Watches the combat.log the game just wrote, including after the window returns. */
export const useLatestLog = (logsPath: string | null) => {
  const [latestLog, setLatestLog] = useState<CrossoutDetectedLog | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    let requestId = 0;
    let focusTimer = 0;

    const refresh = (replaceOnError: boolean) => {
      const id = ++requestId;

      window.electronAPI
        .crossoutFindLatestLog(logsPath)
        .then((found) => {
          if (cancelled || id !== requestId) return;

          setLatestLog(found);
        })
        .catch((error) => {
          if (cancelled || id !== requestId) return;

          logWarning("crossout-log-find", error);
          setLatestLog((current) =>
            current === undefined || replaceOnError ? null : current,
          );
        });
    };

    refresh(true);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "hidden") return;

      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => refresh(false), 200);
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(focusTimer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [logsPath]);

  return latestLog;
};
