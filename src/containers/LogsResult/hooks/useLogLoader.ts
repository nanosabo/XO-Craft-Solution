import { useLogMap } from "./useLogMap";
import { useLogSession } from "./logSession";
import { useLogStats } from "./useLogStats";
import { useOpenedLog } from "./useOpenedLog";

/** Stats, battle list and the log header, loaded as three separate steps. */
export const useLogLoader = (logId: string, preferredType: string) => {
  const state = useLogSession();
  const loadMap = useLogMap(state.session);
  const loadLogType = useLogStats(state.session, loadMap);

  useOpenedLog(state.session, loadMap, loadLogType, logId, preferredType);

  return {
    summary: state.summary,
    loading: state.loading,
    error: state.error,
    logType: state.logType,
    logTable: state.logTable,
    logTableLoading: state.logTableLoading,
    mapLoading: state.mapLoading,
    logTableError: state.logTableError,
    uploadDate: state.uploadDate,
    timeOptions: state.timeOptions,
    setTimeOptions: state.setTimeOptions,
    timeFrom: state.timeFrom,
    setTimeFrom: state.setTimeFrom,
    timeTo: state.timeTo,
    setTimeTo: state.setTimeTo,
    timeFiltered: state.timeFiltered,
    setTimeFiltered: state.setTimeFiltered,
    timeOpen: state.timeOpen,
    setTimeOpen: state.setTimeOpen,
    loadMap,
    loadLogType,
    wantMapRef: state.wantMapRef,
  };
};
