import type { TFunction } from "i18next";
import type { i18n as I18n } from "i18next";
import type { ResultError } from "./types";

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

export const logCellLabel = (t: TFunction, text: string) => {
  const labels: Record<string, string> = {
    "команда 1": t("logTable.team1"),
    "команда 2": t("logTable.team2"),
    "team 1": t("logTable.team1"),
    "team 2": t("logTable.team2"),
    вооружение: t("logTable.weapon"),
    weapon: t("logTable.weapon"),
    урон: t("logTable.damage"),
    damage: t("logTable.damage"),
    фраг: t("logTable.frag"),
    frag: t("logTable.frag"),
    раунд: t("logTable.round"),
    round: t("logTable.round"),
  };

  return labels[text.trim().toLowerCase()] ?? text;
};

export const logStatsLabel = (t: TFunction, text: string) => {
  const labels: Record<string, string> = {
    "игрок / вооружение": t("logStats.player"),
    "player / weapon": t("logStats.player"),
    "player / armament": t("logStats.player"),
    рейтинг: t("logStats.rating"),
    rating: t("logStats.rating"),
    винрейт: t("logStats.winrate"),
    winrate: t("logStats.winrate"),
    "win rate": t("logStats.winrate"),
    урон: t("logStats.damage"),
    damage: t("logStats.damage"),
    отстрел: t("logStats.parts"),
    parts: t("logStats.parts"),
    получено: t("logStats.received"),
    received: t("logStats.received"),
    фраг: t("logStats.frags"),
    frag: t("logStats.frags"),
    frags: t("logStats.frags"),
    kills: t("logStats.frags"),
    умер: t("logStats.deaths"),
    deaths: t("logStats.deaths"),
    очки: t("logStats.score"),
    score: t("logStats.score"),
  };

  return labels[text.trim().toLowerCase()] ?? text;
};

export const errorText = (t: TFunction, i18n: I18n, value: ResultError) => {
  if (value.code && i18n.exists(`errors.${value.code}`, { ns: "logsPage" })) {
    return t(`errors.${value.code}`);
  }

  return value.fallbackKey
    ? t(value.fallbackKey)
    : value.message || t("result.error");
};
