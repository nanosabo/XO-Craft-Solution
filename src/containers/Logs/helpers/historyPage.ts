import type { CrossoutLogHistoryEntry } from "@src/types/crossout";

export const HISTORY_PAGE_SIZE = 25;

export const historyOnDate = (
  history: CrossoutLogHistoryEntry[],
  date: string,
): CrossoutLogHistoryEntry[] => {
  if (!date) return history;

  const [year, month, day] = date.split("-").map(Number);
  const from = new Date(year, month - 1, day).getTime();

  if (!Number.isFinite(from)) return history;

  const to = from + 24 * 60 * 60 * 1000;

  return history.filter((entry) => {
    const stamp = entry.uploadedAt > 0 ? entry.uploadedAt : entry.savedAt;

    return stamp >= from && stamp < to;
  });
};

export const pageHistory = <T,>(entries: T[], page: number) => {
  const pageCount = Math.max(1, Math.ceil(entries.length / HISTORY_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  return {
    pageCount,
    page: safePage,
    rows: entries.slice(
      (safePage - 1) * HISTORY_PAGE_SIZE,
      safePage * HISTORY_PAGE_SIZE,
    ),
  };
};
