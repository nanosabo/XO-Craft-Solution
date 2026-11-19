import { useEffect, useMemo, useState } from "react";
import { logWarning } from "@src/helpers/errorLog";
import type { CrossoutLogHistoryEntry } from "@src/types/crossout";
import { historyOnDate, pageHistory } from "../helpers/historyPage";

export type HistoryConfirm =
  | { kind: "clear" }
  | { kind: "remove"; id: string; name: string };

export const useLogHistory = () => {
  const [history, setHistory] = useState<CrossoutLogHistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [historyDate, setHistoryDate] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [confirm, setConfirm] = useState<HistoryConfirm | null>(null);
  const visibleHistory = useMemo(
    () => (history ? historyOnDate(history, historyDate) : null),
    [history, historyDate],
  );
  const paged = pageHistory(visibleHistory ?? [], historyPage);

  useEffect(() => {
    let cancelled = false;

    window.electronAPI
      .crossoutHistoryList()
      .then((entries) => {
        if (!cancelled) setHistory(entries);
      })
      .catch((error) => {
        if (cancelled) return;

        logWarning("crossout-history", error);
        setHistoryError(true);
        setHistory([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!confirm) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirm(null);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [confirm]);

  const removeHistory = async (id: string) => {
    try {
      setHistory(await window.electronAPI.crossoutHistoryRemove(id));
    } catch (error) {
      logWarning("crossout-history", error);
      setHistoryError(true);
    }
  };

  const clearHistory = async () => {
    try {
      setHistory(await window.electronAPI.crossoutHistoryClear());
      setHistoryDate("");
      setHistoryPage(1);
    } catch (error) {
      logWarning("crossout-history", error);
      setHistoryError(true);
    }
  };

  const confirmHistory = () => {
    if (!confirm) return;

    const pending = confirm;

    setConfirm(null);

    if (pending.kind === "clear") {
      void clearHistory();
      return;
    }

    void removeHistory(pending.id);
  };

  return {
    history,
    historyError,
    historyDate,
    setHistoryDate,
    setHistoryPage,
    confirm,
    setConfirm,
    visibleHistory,
    pageCount: paged.pageCount,
    page: paged.page,
    rows: visibleHistory ? paged.rows : null,
    confirmHistory,
  };
};
