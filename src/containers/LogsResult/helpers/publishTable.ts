import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type {
  CrossoutLogSummary,
  CrossoutLogTable,
  CrossoutLogTime,
} from "@src/types/crossout";
import { withParty } from "./statGroups";

type Sink = {
  logTableRef: MutableRefObject<CrossoutLogTable | null>;
  summaryRef: MutableRefObject<CrossoutLogSummary | null>;
  setLogTable: Dispatch<SetStateAction<CrossoutLogTable | null>>;
  setUploadDate: Dispatch<SetStateAction<string>>;
  setSummary: Dispatch<SetStateAction<CrossoutLogSummary | null>>;
  setTimeOptions: Dispatch<SetStateAction<CrossoutLogTime[]>>;
  setTimeFrom: Dispatch<SetStateAction<number>>;
  setTimeTo: Dispatch<SetStateAction<number>>;
  setTimeFiltered: Dispatch<SetStateAction<boolean>>;
};

/** Paint the party from rounds, then store the table and its time range. */
export const publishTable = (
  table: CrossoutLogTable,
  ranged: boolean,
  sink: Sink,
): CrossoutLogTable => {
  const next = withParty(table);

  sink.logTableRef.current = next;
  sink.setLogTable(next);

  if (table.date) sink.setUploadDate(table.date);

  const nick = table.nickname?.trim();
  const current = sink.summaryRef.current;

  if (nick && current && !current.nickname.trim()) {
    const summary = {
      ...current,
      nickname: nick,
      title: current.title || nick,
    };

    sink.summaryRef.current = summary;
    sink.setSummary(summary);
  }

  if (!ranged && next.times.length > 0) {
    sink.setTimeOptions(next.times);
    sink.setTimeFrom(next.times[0].at);
    sink.setTimeTo(next.times[next.times.length - 1].at);
    sink.setTimeFiltered(false);
  }

  return next;
};
