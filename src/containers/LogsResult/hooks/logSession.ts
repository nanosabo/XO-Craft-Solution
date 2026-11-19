import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { logWarning } from "@src/helpers/errorLog";
import type {
  CrossoutLogSummary,
  CrossoutLogTable,
  CrossoutLogTime,
} from "@src/types/crossout";
import { parseUploadDate } from "../helpers/logTime";
import { publishTable } from "../helpers/publishTable";
import type { ResultError } from "../helpers/types";

export type LogSession = {
  summaryRef: MutableRefObject<CrossoutLogSummary | null>;
  logTableRef: MutableRefObject<CrossoutLogTable | null>;
  wantMapRef: MutableRefObject<boolean>;
  loadSeq: MutableRefObject<number>;
  mapSeq: MutableRefObject<number>;
  mapFlight: MutableRefObject<string>;
  mapAnnounceRef: MutableRefObject<boolean>;
  setSummary: Dispatch<SetStateAction<CrossoutLogSummary | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<ResultError | null>>;
  setLogType: Dispatch<SetStateAction<string | null>>;
  setLogTable: Dispatch<SetStateAction<CrossoutLogTable | null>>;
  setLogTableLoading: Dispatch<SetStateAction<boolean>>;
  setMapLoading: Dispatch<SetStateAction<boolean>>;
  setLogTableError: Dispatch<SetStateAction<ResultError | null>>;
  setUploadDate: Dispatch<SetStateAction<string>>;
  setTimeOptions: Dispatch<SetStateAction<CrossoutLogTime[]>>;
  setTimeFrom: Dispatch<SetStateAction<number>>;
  setTimeTo: Dispatch<SetStateAction<number>>;
  setTimeFiltered: Dispatch<SetStateAction<boolean>>;
  setTimeOpen: Dispatch<SetStateAction<boolean>>;
  applyLoadedTable: (table: CrossoutLogTable, ranged: boolean) => CrossoutLogTable;
};

export const useLogSession = () => {
  const [summary, setSummary] = useState<CrossoutLogSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ResultError | null>(null);
  const [logType, setLogType] = useState<string | null>(null);
  const [logTable, setLogTable] = useState<CrossoutLogTable | null>(null);
  const [logTableLoading, setLogTableLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [logTableError, setLogTableError] = useState<ResultError | null>(null);
  const [uploadDate, setUploadDate] = useState("");
  const [timeOptions, setTimeOptions] = useState<CrossoutLogTime[]>([]);
  const [timeFrom, setTimeFrom] = useState(0);
  const [timeTo, setTimeTo] = useState(0);
  const [timeFiltered, setTimeFiltered] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const summaryRef = useRef<CrossoutLogSummary | null>(null);
  const logTableRef = useRef<CrossoutLogTable | null>(null);
  const wantMapRef = useRef(false);
  const loadSeq = useRef(0);
  const mapSeq = useRef(0);
  const mapFlight = useRef("");
  const mapAnnounceRef = useRef(false);

  const applyLoadedTable = useCallback(
    (table: CrossoutLogTable, ranged: boolean) =>
      publishTable(table, ranged, {
        logTableRef,
        summaryRef,
        setLogTable,
        setUploadDate,
        setSummary,
        setTimeOptions,
        setTimeFrom,
        setTimeTo,
        setTimeFiltered,
      }),
    [],
  );

  useEffect(() => {
    if (!summary) return;

    const uploadedAt = parseUploadDate(uploadDate);

    if (!uploadedAt) return;

    void window.electronAPI
      .crossoutHistorySave({
        logId: summary.logId,
        nickname: summary.nickname,
        title: summary.title,
        types: summary.types,
        uploadedAt,
      })
      .catch((historyError) => {
        logWarning("crossout-history", historyError);
      });
  }, [summary, uploadDate]);

  const session = useMemo<LogSession>(() => ({
    summaryRef,
    logTableRef,
    wantMapRef,
    loadSeq,
    mapSeq,
    mapFlight,
    mapAnnounceRef,
    setSummary,
    setLoading,
    setError,
    setLogType,
    setLogTable,
    setLogTableLoading,
    setMapLoading,
    setLogTableError,
    setUploadDate,
    setTimeOptions,
    setTimeFrom,
    setTimeTo,
    setTimeFiltered,
    setTimeOpen,
    applyLoadedTable,
  }), [applyLoadedTable]);

  return {
    summary,
    loading,
    error,
    logType,
    logTable,
    logTableLoading,
    mapLoading,
    logTableError,
    uploadDate,
    timeOptions,
    setTimeOptions,
    timeFrom,
    setTimeFrom,
    timeTo,
    setTimeTo,
    timeFiltered,
    setTimeFiltered,
    timeOpen,
    setTimeOpen,
    wantMapRef,
    session,
  };
};
