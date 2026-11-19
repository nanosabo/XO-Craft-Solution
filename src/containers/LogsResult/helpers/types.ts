import type { CrossoutErrorCode } from "@src/types/crossout";

export type ResultError = {
  code?: CrossoutErrorCode | null;
  message?: string | null;
  fallbackKey?: "result.error";
};

export type ResultView = "stats" | "battles";
