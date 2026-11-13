import type { AppDispatch } from "@src/store/store";
import { refreshSolution } from "@src/store/slices/loader.slice";

let timer: number | null = null;

/** Coalesce quick removals into one solution update on the current page. */
export const scheduleSolutionRefresh = (dispatch: AppDispatch) => {
  if (timer !== null) window.clearTimeout(timer);

  timer = window.setTimeout(() => {
    timer = null;
    void dispatch(refreshSolution()).catch(() => undefined);
  }, 250);
};

/** Drop a refresh that has not started, for example after an immediate undo. */
export const cancelScheduledSolutionRefresh = () => {
  if (timer === null) return;

  window.clearTimeout(timer);
  timer = null;
};
