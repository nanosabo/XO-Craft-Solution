import { logWarning } from "@src/helpers/errorLog";
import type { CrossoutLogSummary, CrossoutLogTable } from "@src/types/crossout";

export const saveStatsCache = (
  summary: CrossoutLogSummary | null,
  table: CrossoutLogTable,
  logId: string,
) => {
  if (!summary || summary.logId !== logId) return;

  void window.electronAPI
    .crossoutStatsCacheSave({ summary, table })
    .catch((cacheError) => {
      logWarning("crossout-stats-cache", cacheError);
    });
};
