import type { TFunction } from "i18next";
import type { i18n as I18n } from "i18next";
import type { CrossoutErrorCode } from "@src/types/crossout";

export type LogsError = {
  code?: CrossoutErrorCode | null;
  message?: string | null;
  fallbackKey?: "upload.error" | "upload.wrongFile";
};

export const logTypeLabel = (
  t: TFunction,
  i18n: I18n,
  key: string,
  fallback: string,
) => {
  const slug = key.toLowerCase().trim().replace(/[\s-]+/g, "_");

  if (i18n.exists(`logTypes.${slug}`, { ns: "logsPage" })) {
    return t(`logTypes.${slug}`);
  }

  const upper = slug.toUpperCase();

  if (i18n.exists(`types.${upper}`, { ns: "logsPage" })) {
    return t(`types.${upper}`);
  }

  return fallback || upper;
};

export const errorText = (t: TFunction, i18n: I18n, error: LogsError) => {
  if (error.code && i18n.exists(`errors.${error.code}`, { ns: "logsPage" })) {
    return t(`errors.${error.code}`);
  }

  return error.fallbackKey
    ? t(error.fallbackKey)
    : error.message || t("upload.error");
};

export const numberLocale = (language: string): string =>
  language === "uk" ? "uk-UA" : language === "en" ? "en-US" : "ru-RU";

export const formatLogTime = (unixSeconds: number, locale: string): string =>
  new Date(unixSeconds * 1000).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
