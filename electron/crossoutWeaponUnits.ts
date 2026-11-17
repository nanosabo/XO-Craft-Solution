import type { ContentLanguage } from "./language";
import { getBaseUrls, requestTarget } from "./crossoutInfo";
import { evaluateCrossout, loadCrossoutPage } from "./crossoutBrowser";
import { writeLog } from "./logger";
import { getCrossoutNameCatalog } from "./crossoutLogApi";
import { weaponImageSrc } from "./weaponImages";
import { parseWeaponUnitSummary, parseWeaponUnitTable } from "./weaponUnitTable";
import type { CrossoutWeaponUnitsResult } from "@src/types/crossout";

const LOG_ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;
const TYPE_PATTERN = /^[a-z0-9_]{1,32}$/;
const KEY_PATTERN = /^[A-Za-z0-9_.-]{1,160}$/;

export interface WeaponUnitsRequest {
  logId: string;
  type: string;
  player: string;
  weapons: string;
}

const challengePage = (html: string): boolean =>
  /Проверка браузера|Выполняется вычисление|Browser check|Checking your browser/i.test(
    html,
  );

const weaponList = (value: string): string =>
  value
    .split(",")
    .map((key) => key.trim())
    .filter((key) => KEY_PATTERN.test(key))
    .join(",");

const requestScript = (player: string, weapons: string, type: string, url: string) =>
  `(async () => {
    const body = new URLSearchParams();
    body.set("query", "getWeaponData");
    body.set("id", ${JSON.stringify(player)});
    body.set("weapon", ${JSON.stringify(weapons)});
    body.set("type", ${JSON.stringify(type)});
    const response = await fetch(${JSON.stringify(url)}, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = await response.text();
    return { status: response.status, text };
  })()`;

const catalogName = (
  catalog: Awaited<ReturnType<typeof getCrossoutNameCatalog>>,
  language: ContentLanguage,
  key: string,
  fallback: string,
) => {
  const primary = language === "en" ? catalog.en.weapons : catalog.ru.weapons;
  const secondary = language === "en" ? catalog.ru.weapons : catalog.en.weapons;

  return primary[key] || secondary[key] || fallback || key;
};

export const loadWeaponUnits = async (
  request: WeaponUnitsRequest,
  language: ContentLanguage,
): Promise<CrossoutWeaponUnitsResult> => {
  const logId = request.logId.trim();
  const type = request.type.trim().toLowerCase();
  const player = request.player.trim();
  const weapons = weaponList(request.weapons);

  if (!LOG_ID_PATTERN.test(logId) || !TYPE_PATTERN.test(type) || !player || !weapons) {
    return {
      ok: false,
      errorCode: "unexpected-response",
      error: "Не хватает данных, чтобы запросить урон по орудиям.",
    };
  }

  const bases = await getBaseUrls();
  let sawChallenge = false;

  for (const base of bases) {
    const url = `${base}/log/${encodeURIComponent(logId)}/${encodeURIComponent(type)}`;
    const script = requestScript(player, weapons, type.toUpperCase(), url);
    const target = requestTarget(base);
    const started = Date.now();

    writeLog("info", "stats", "Loading weapon damage", {
      target,
      logId,
      battleType: type,
    });

    try {
      let fetched = await evaluateCrossout<{ status: number; text: string }>(
        url,
        script,
      );

      if (fetched.status === 503 || challengePage(fetched.text)) {
        sawChallenge = true;
        writeLog("warn", "stats", "Weapon damage challenged", {
          target,
          logId,
          battleType: type,
          status: fetched.status,
          ms: Date.now() - started,
        });
        await loadCrossoutPage(url);
        fetched = await evaluateCrossout<{ status: number; text: string }>(
          url,
          script,
        );
      }

      if (fetched.status === 503 || challengePage(fetched.text)) {
        sawChallenge = true;
        writeLog("warn", "stats", "Weapon damage failed", {
          target,
          logId,
          battleType: type,
          status: fetched.status,
          ms: Date.now() - started,
        });
        continue;
      }

      const rows = parseWeaponUnitTable(fetched.text);

      if (rows.length === 0) {
        writeLog("warn", "stats", "Weapon damage answered", {
          target,
          logId,
          battleType: type,
          status: fetched.status,
          ms: Date.now() - started,
          rows: 0,
        });
        continue;
      }

      writeLog("info", "stats", "Weapon damage answered", {
        target,
        logId,
        battleType: type,
        status: fetched.status,
        ms: Date.now() - started,
        rows: rows.length,
      });

      const catalog = await getCrossoutNameCatalog();
      const summary = parseWeaponUnitSummary(fetched.text);

      return {
        ok: true,
        summary,
        units: rows.map((row) => ({
          key: row.key,
          name: catalogName(catalog, language, row.key, row.fallback),
          image: weaponImageSrc(row.key),
          importantPercent: row.importantPercent,
          important: row.important,
          average: row.average,
          total: row.total,
        })),
      };
    } catch (error) {
      writeLog("warn", "stats", "Weapon damage failed", {
        target,
        logId,
        battleType: type,
        ms: Date.now() - started,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return sawChallenge
    ? {
        ok: false,
        errorCode: "forbidden",
        error: "Сайт не пропустил запрос урона по орудиям.",
      }
    : {
        ok: false,
        errorCode: "unexpected-response",
        error: "Не удалось получить урон по орудиям.",
      };
};
