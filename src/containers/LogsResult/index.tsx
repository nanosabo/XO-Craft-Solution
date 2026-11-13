import classNames from "classnames";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { buildAppLogLink } from "@src/helpers/appLogLink";
import { contentLanguage } from "@src/helpers/contentLanguage";
import { logWarning } from "@src/helpers/errorLog";
import Switch from "@src/containers/Settings/components/Switch";
import {
  CROSSOUT_MAPS,
  type CrossoutErrorCode,
  type CrossoutLogCell,
  type CrossoutLogRoundPlay,
  type CrossoutLogRow,
  type CrossoutLogStatRow,
  type CrossoutLogSummary,
  type CrossoutLogTable,
  type CrossoutLogTime,
  type CrossoutNameCatalog,
} from "@src/types/crossout";
import CrossoutLogo from "@src/components/CrossoutLogo";
import Input from "@src/ui/Input";
import Select from "@src/ui/Select";
import { CameraIcon, ExternalIcon, LinkIcon, TimeIcon } from "@src/ui/icons";
import styles from "@src/containers/Logs/styles/Logs.module.scss";

const SITE_URL_RU = "https://crossout-info.com";
const SITE_URL_EN = "https://en.crossout-info.com";

const pad = (value: number) => String(value).padStart(2, "0");

const catalogName = (
  catalog: CrossoutNameCatalog,
  language: "ru" | "en",
  group: "weapons" | "maps",
  key: string,
) => {
  const primary = language === "en" ? catalog.en : catalog.ru;
  const secondary = language === "en" ? catalog.ru : catalog.en;

  return primary[group][key] || secondary[group][key] || "";
};

const namesToKeys = (
  catalog: CrossoutNameCatalog,
  group: "weapons" | "maps",
) => {
  const map = new Map<string, string>();

  for (const language of ["ru", "en"] as const) {
    for (const [key, name] of Object.entries(catalog[language][group])) {
      if (name) map.set(name, key);
    }
  }

  return map;
};

const weaponLabel = (
  catalog: CrossoutNameCatalog,
  language: "ru" | "en",
  keys: string[] | undefined,
  fallback: string,
  reverse: Map<string, string>,
) => {
  if (keys?.length) {
    return keys
      .map((key) => catalogName(catalog, language, "weapons", key) || key)
      .join(", ");
  }

  return fallback
    .split(", ")
    .map((part) => {
      const key = reverse.get(part);

      return key ? catalogName(catalog, language, "weapons", key) || part : part;
    })
    .join(", ");
};

const mapLabelFromCatalog = (
  catalog: CrossoutNameCatalog,
  language: "ru" | "en",
  key: string | undefined,
  fallback: string,
  reverse: Map<string, string>,
) => {
  const resolved = key || reverse.get(fallback);

  if (!resolved) return fallback;

  return catalogName(catalog, language, "maps", resolved) || fallback;
};

const localizeCell = (
  cell: CrossoutLogCell,
  catalog: CrossoutNameCatalog,
  language: "ru" | "en",
  reverse: Map<string, string>,
): CrossoutLogCell => {
  if (!cell.weapon && !cell.keys?.length && !cell.images.length) return cell;

  const label = weaponLabel(
    catalog,
    language,
    cell.keys,
    cell.weapon || cell.images.map((item) => item.name).filter(Boolean).join(", "),
    reverse,
  );

  return {
    ...cell,
    weapon: label,
    text: label,
    images: cell.images.map((image, index) => ({
      ...image,
      name: cell.keys?.[index]
        ? catalogName(catalog, language, "weapons", cell.keys[index]) || image.name
        : weaponLabel(catalog, language, undefined, image.name, reverse),
    })),
  };
};

const localizeLogTable = (
  table: CrossoutLogTable | null,
  catalog: CrossoutNameCatalog | null,
  language: "ru" | "en",
): CrossoutLogTable | null => {
  if (!table || !catalog) return table;

  const weaponReverse = namesToKeys(catalog, "weapons");
  const mapReverse = namesToKeys(catalog, "maps");

  return {
    ...table,
    stats: table.stats
      ? {
          ...table.stats,
          rows: table.stats.rows.map((row) => {
            if (row.kind !== "weapon") return row;

            const label = weaponLabel(
              catalog,
              language,
              row.keys,
              row.weapon || row.name,
              weaponReverse,
            );

            return {
              ...row,
              name: label,
              weapon: label,
              cells: row.cells.map((item, index) => (index === 0 ? label : item)),
            };
          }),
        }
      : table.stats,
    rows: table.rows.map((row) => {
      const map = mapLabelFromCatalog(
        catalog,
        language,
        row.mapKey || row.battle?.mapKey,
        row.battle?.map || row.map,
        mapReverse,
      );

      return {
        ...row,
        map,
        battle: row.battle ? { ...row.battle, map } : row.battle,
        cells: row.cells.map((cell) =>
          localizeCell(cell, catalog, language, weaponReverse),
        ),
      };
    }),
  };
};

const cachedTable = (
  tables: CrossoutLogTable[],
  slug: string,
): CrossoutLogTable | null =>
  tables.find((item) => item.type.toLowerCase() === slug.toLowerCase()) ??
  null;

/** Tables saved before weapon icons were added have to be loaded again. */
const cachedTableReady = (
  table: CrossoutLogTable | null,
): table is CrossoutLogTable => {
  if (!table?.nickname) return false;

  const sample =
    table.stats?.rows.find((row) => row.kind === "player") ??
    table.stats?.rows[0];
  const statWeapons =
    table.stats?.rows.filter((row) => row.kind === "weapon") ?? [];
  const battleWeapons = table.rows
    .flatMap((row) => row.cells)
    .filter((item) => item.weapon);
  const battleTone =
    battleWeapons.length === 0 ||
    battleWeapons.some((item) => /(green|red)/.test(item.cls));
  const battleNicks = table.rows
    .filter((row) => !row.battle && !row.cls.includes("sticDiv"))
    .flatMap((row) => row.cells)
    .filter((item) => item.text && !item.weapon && /align(left|right)/.test(item.cls));
  const nicksMarked =
    battleNicks.length === 0 ||
    battleNicks.every((item) => /(^|\s)nick(\s|$)/.test(item.cls));
  const winrate = sample?.cells[2] ?? "";
  const parts = sample?.cells[4] ?? "";
  const frags = sample?.cells[6] ?? "";
  const columnsMatch =
    !sample ||
    (winrate.includes("/") && parts.includes(".") && frags.includes("/"));
  const battleRows = table.rows.filter((row) => row.battle);
  const stamps = battleRows
    .map((row) => row.battle?.at ?? 0)
    .filter((at) => at > 0);
  const repeated = stamps.reduce((best, at) => {
    const count = stamps.filter((item) => item === at).length;

    return Math.max(best, count);
  }, 0);
  const timeReady =
    table.times.length < 2 ||
    (repeated < 3 &&
      battleRows.some(
        (row) =>
          (row.battle?.at ?? 0) > 0 && (row.battle?.plays?.length ?? 0) > 0,
      ));

  return (
    columnsMatch &&
    battleTone &&
    nicksMarked &&
    timeReady &&
    statWeapons.every((row) => "rating" in row && Boolean(row.image)) &&
    battleWeapons.every((item) => Boolean(item.image))
  );
};

const parseUploadDate = (value: string): number => {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());

  if (!match) return 0;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return 0;
  }

  return date.getTime();
};

const timeZoneLabel = (): string => {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;

  return rest
    ? `GMT${sign}${hours}:${pad(rest)}`
    : `GMT${sign}${hours}`;
};

const normalizeMap = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s-]+/g, "_");

const STAR_PATH =
  "M31.547 12a.848.848 0 00-.677-.577l-9.427-1.376-4.224-8.532a.847.847 0 00-1.516 0l-4.218 8.534-9.427 1.355a.847.847 0 00-.467 1.467l6.823 6.664-1.612 9.375a.847.847 0 001.23.893l8.428-4.434 8.432 4.432a.847.847 0 001.229-.894l-1.615-9.373 6.822-6.665a.845.845 0 00.214-.869z";

type ResultError = {
  code?: CrossoutErrorCode | null;
  message?: string | null;
  fallbackKey?: "result.error";
};

type ResultView = "stats" | "battles";

type StatGroup = {
  player: CrossoutLogStatRow | null;
  weapons: CrossoutLogStatRow[];
};

const groupStatRows = (rows: CrossoutLogStatRow[]): StatGroup[] => {
  const groups: StatGroup[] = [];
  let current: StatGroup | null = null;

  for (const row of rows) {
    if (row.kind === "player") {
      current = { player: row, weapons: [] };
      groups.push(current);
    } else if (current) {
      current.weapons.push(row);
    } else {
      groups.push({ player: null, weapons: [row] });
    }
  }

  return groups;
};

const rateLabel = (part: number, total: number): string => {
  if (total <= 0) return "0/0 0%";

  return `${part}/${total} ${Math.round((part / total) * 100)}%`;
};

const averageInt = (total: number, rounds: number): string =>
  rounds > 0 ? String(Math.round(total / rounds)) : "0";

const averageFixed = (total: number, rounds: number): string =>
  (rounds > 0 ? total / rounds : 0).toFixed(2);

interface RangeTotals {
  rounds: number;
  wins: number;
  damage: number;
  kill: number;
  death: number;
  keys: string[];
  images: string[];
}

const emptyTotals = (): RangeTotals => ({
  rounds: 0,
  wins: 0,
  damage: 0,
  kill: 0,
  death: 0,
  keys: [],
  images: [],
});

const addPlay = (totals: RangeTotals, play: CrossoutLogRoundPlay) => {
  totals.rounds += 1;
  if (play.win) totals.wins += 1;
  totals.damage += play.damage;
  totals.kill += play.kill;
  totals.death += play.death;

  if (totals.keys.length === 0 && play.keys.length > 0) {
    totals.keys = play.keys;
    totals.images = play.images.filter(Boolean);
  }
};

const rangeCells = (name: string, totals: RangeTotals): string[] => [
  name,
  "",
  rateLabel(totals.wins, totals.rounds),
  averageInt(totals.damage, totals.rounds),
  "—",
  "—",
  `${totals.kill}/${averageFixed(totals.kill, totals.rounds)}`,
  `${totals.death}/${averageFixed(totals.death, totals.rounds)}`,
  "—",
];

/**
 * Stats for the selected battle interval. Null means this table was saved
 * before battles carried their start time, so the full table stays.
 */
const statsForRange = (
  table: CrossoutLogTable,
  from: number,
  to: number,
  catalog: CrossoutNameCatalog | null,
  language: "ru" | "en",
): CrossoutLogStatRow[] | null => {
  const headers = table.rows.filter((row) => row.battle);
  const dated = headers.some((row) => (row.battle?.at ?? 0) > 0);

  if (!dated) return null;

  const chosen = headers.filter((row) => {
    const at = row.battle?.at ?? 0;

    return at >= from && at <= to;
  });
  const plays = chosen.flatMap((row) => row.battle?.plays ?? []);

  if (plays.length === 0) {
    return chosen.every((row) => !row.battle?.plays) ? null : [];
  }

  const teams = new Map<string, string>();

  for (const row of table.stats?.rows ?? []) {
    if (row.kind === "player" && row.name) {
      teams.set(row.name.trim().toLowerCase(), row.team);
    }
  }

  const reverse = catalog
    ? namesToKeys(catalog, "weapons")
    : new Map<string, string>();
  const players = new Map<
    string,
    { totals: RangeTotals; weapons: Map<string, RangeTotals> }
  >();

  for (const play of plays) {
    const name = play.nick.trim();

    if (!name) continue;

    const key = name.toLowerCase();
    let player = players.get(key);

    if (!player) {
      player = { totals: emptyTotals(), weapons: new Map() };
      players.set(key, player);
    }

    addPlay(player.totals, play);

    const weaponKey = play.weapon.trim();

    if (!weaponKey) continue;

    let weapon = player.weapons.get(weaponKey);

    if (!weapon) {
      weapon = emptyTotals();
      player.weapons.set(weaponKey, weapon);
    }

    addPlay(weapon, play);
  }

  const rows: CrossoutLogStatRow[] = [];

  for (const [key, player] of [...players.entries()].sort(
    (left, right) => right[1].totals.damage - left[1].totals.damage,
  )) {
    const name =
      plays.find((play) => play.nick.trim().toLowerCase() === key)?.nick.trim() ||
      key;
    const team = teams.get(key) ?? "";

    rows.push({
      kind: "player",
      name,
      weapon: "",
      image: "",
      images: [],
      stars: null,
      team,
      damage: averageInt(player.totals.damage, player.totals.rounds),
      delta: "",
      deltaKind: null,
      cells: rangeCells(name, player.totals),
    });

    for (const [weaponKey, totals] of [...player.weapons.entries()].sort(
      (left, right) => right[1].damage - left[1].damage,
    )) {
      const label = catalog
        ? weaponLabel(catalog, language, totals.keys, weaponKey, reverse)
        : weaponKey;

      rows.push({
        kind: "weapon",
        name: label,
        weapon: label,
        image: totals.images[0] ?? "",
        images: totals.images,
        keys: totals.keys,
        stars: null,
        team,
        damage: averageInt(totals.damage, totals.rounds),
        delta: "",
        deltaKind: null,
        cells: rangeCells(label, totals),
      });
    }
  }

  return rows;
};

const sameName = (left: string, right: string) => {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();

  if (!a || !b) return false;

  return a === b || a.includes(b) || b.includes(a);
};

const statColumnWeight = (index: number) => {
  if (index === 0) return 2.8;
  if (index === 1) return 1.35;

  return 1;
};

const battleColumnWeight = (label: string) => {
  const value = label.trim().toLowerCase();

  if (/weapon|вооруж/.test(value)) return 2.4;
  if (/team|команд|player|игрок/.test(value)) return 1.6;
  if (/damage|урон/.test(value)) return 0.9;
  if (/frag|фраг/.test(value)) return 0.7;
  if (/round|раунд/.test(value)) return 0.75;

  return 1;
};

const mirroredBattleColumns = (labels: string[]): number[] => {
  if (labels.length < 5 || labels.length % 2 === 0) return [];

  const team = /team|команд/;
  const left = labels[0].trim().toLowerCase();
  const right = labels[labels.length - 1].trim().toLowerCase();

  if (!team.test(left) || !team.test(right)) return [];

  const weights: number[] = labels.map(battleColumnWeight);

  for (let index = 0; index < Math.floor(weights.length / 2); index += 1) {
    const shared = Math.max(weights[index], weights[weights.length - 1 - index]);

    weights[index] = shared;
    weights[weights.length - 1 - index] = shared;
  }

  const total = weights.reduce((sum, weight) => sum + weight, 0);

  return weights.map((weight) => (weight / total) * 100);
};

const collectDocumentCss = (): string => {
  const chunks: string[] = [];

  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) chunks.push(rule.cssText);
    } catch {
      // A cross-origin sheet cannot be read. The app styles are inline.
    }
  }

  return chunks.join("\n");
};

const buildAlliesShot = (
  root: HTMLElement,
  allyTeam: string,
): { html: string; width: number; height: number } | null => {
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:0;top:0;z-index:-1;pointer-events:none;width:${root.offsetWidth}px;`;

  const clone = root.cloneNode(true) as HTMLElement;
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    if (allyTeam) {
      clone.querySelectorAll("tr").forEach((row) => {
        const team = row.getAttribute("data-team") ?? "";

        if (team && team !== allyTeam) row.remove();
      });
    }

    const wrap = clone.querySelector("table")?.parentElement;

    if (wrap instanceof HTMLElement) {
      wrap.style.margin = "0";
      wrap.style.overflow = "visible";
    }

    const width = Math.ceil(clone.scrollWidth);
    const height = Math.ceil(clone.scrollHeight);

    if (width < 2 || height < 2) return null;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><base href="${document.baseURI}"><style>html,body{margin:0;background:#111316;color:#fff;} ${collectDocumentCss()}</style></head><body>${clone.outerHTML}</body></html>`;

    return { html, width, height };
  } finally {
    host.remove();
  }
};

const STAR_SIZE = 16;
const STAR_GAP = 3;
const STAR_STEP = STAR_SIZE + STAR_GAP;
const STAR_ROW = STAR_SIZE * 5 + STAR_GAP * 4;

const StarRating = ({ value }: { value: number }) => {
  const clipId = `stars-${useId().replace(/:/g, "")}`;
  const stars = Math.max(0, Math.min(5, value));
  const full = stars >= 5 ? 5 : Math.floor(stars);
  const fraction = stars >= 5 ? 0 : stars - full;
  const fill = stars >= 5 ? STAR_ROW : full * STAR_STEP + fraction * STAR_SIZE;

  return (
    <span className={styles.logStars} title={String(stars)}>
      <svg
        className={styles.logStarsSvg}
        viewBox={`0 0 ${STAR_ROW} ${STAR_SIZE}`}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            {Array.from({ length: 5 }, (_, index) => (
              <path
                key={index}
                d={STAR_PATH}
                transform={`translate(${index * STAR_STEP} 0) scale(${STAR_SIZE / 32})`}
              />
            ))}
          </clipPath>
        </defs>
        <rect
          width={STAR_ROW}
          height={STAR_SIZE}
          fill="rgba(255, 255, 255, 0.18)"
          clipPath={`url(#${clipId})`}
        />
        <rect
          width={fill}
          height={STAR_SIZE}
          fill="#0077ff"
          clipPath={`url(#${clipId})`}
        />
      </svg>
    </span>
  );
};

const LogsResult = () => {
  const { logId = "" } = useParams<{ logId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preferredType = (searchParams.get("type") ?? "").trim().toLowerCase();
  const { t, i18n } = useTranslation("logsPage");
  const namesLanguage = contentLanguage(i18n.language);
  const isRu = namesLanguage === "ru";
  const [nameCatalog, setNameCatalog] = useState<CrossoutNameCatalog | null>(null);
  const [summary, setSummary] = useState<CrossoutLogSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ResultError | null>(null);
  const [logType, setLogType] = useState<string | null>(null);
  const [logTable, setLogTable] = useState<CrossoutLogTable | null>(null);
  const [logTableLoading, setLogTableLoading] = useState(false);
  const [logTableError, setLogTableError] = useState<ResultError | null>(null);
  const [linksCopied, setLinksCopied] = useState(false);
  const [view, setView] = useState<ResultView>("stats");
  const [alliesOnly, setAlliesOnly] = useState(true);
  const [shotBusy, setShotBusy] = useState(false);
  const [shotCopied, setShotCopied] = useState(false);
  const summaryRef = useRef<CrossoutLogSummary | null>(null);
  const statsShotRef = useRef<HTMLDivElement>(null);
  const shotTimerRef = useRef<number | null>(null);
  const linksTimerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const barSentinelRef = useRef<HTMLDivElement>(null);
  const [barStuck, setBarStuck] = useState(false);
  const [statsQuery, setStatsQuery] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [uploadDate, setUploadDate] = useState("");
  const [timeOptions, setTimeOptions] = useState<CrossoutLogTime[]>([]);
  const [timeFrom, setTimeFrom] = useState(0);
  const [timeTo, setTimeTo] = useState(0);
  const [timeFiltered, setTimeFiltered] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const zoneLabel = useMemo(() => timeZoneLabel(), []);
  const timeSelectOptions = useMemo(
    () =>
      timeOptions.map((option) => ({
        value: String(option.at),
        label: option.label,
      })),
    [timeOptions],
  );

  const applyLoadedTable = useCallback(
    (table: CrossoutLogTable, ranged: boolean) => {
      setLogTable(table);

      if (table.date) setUploadDate(table.date);

      const nick = table.nickname?.trim();
      const current = summaryRef.current;

      if (nick && current && !current.nickname.trim()) {
        const next = {
          ...current,
          nickname: nick,
          title: current.title || nick,
        };

        summaryRef.current = next;
        setSummary(next);
      }

      if (!ranged && table.times.length > 0) {
        setTimeOptions(table.times);
        setTimeFrom(table.times[0].at);
        setTimeTo(table.times[table.times.length - 1].at);
        setTimeFiltered(false);
      }
    },
    [],
  );

  const loadSeq = useRef(0);

  const loadLogType = useCallback(async (
    id: string,
    slug: string,
    expectedBattles = 0,
    range?: { from: number; to: number } | null,
  ) => {
    const seq = ++loadSeq.current;

    setLogType(slug);

    let staleTable: CrossoutLogTable | null = null;

    if (!range) {
      try {
        const cached = await window.electronAPI.crossoutStatsCacheGet(id);

        if (seq !== loadSeq.current) return;

        const table = cached ? cachedTable(cached.tables, slug) : null;

        if (table?.rows.some((row) => row.battle)) staleTable = table;

        if (cachedTableReady(table)) {
          setLogTableError(null);
          setLogTableLoading(false);
          applyLoadedTable(table, false);
          return;
        }
      } catch (error) {
        logWarning("crossout-stats-cache", error);
      }

      if (seq !== loadSeq.current) return;

      setLogTable(null);
    }

    setLogTableError(null);
    setLogTableLoading(true);

    try {
      const result = await window.electronAPI.crossoutLoadLogTable(
        id,
        slug,
        expectedBattles,
        range,
      );

      if (seq !== loadSeq.current) return;

      if (result.ok) {
        const battleCount = (value: CrossoutLogTable | null) =>
          value?.rows.filter((row) => row.battle).length ?? 0;
        const incomingBattles = battleCount(result.table) > 0;
        const keepRows = Boolean(
          staleTable && battleCount(result.table) < battleCount(staleTable),
        );
        const table = keepRows && staleTable
          ? {
              ...staleTable,
              stats: result.table.stats ?? staleTable.stats,
              nickname: result.table.nickname || staleTable.nickname,
              partyGrouped: true,
            }
          : result.table;

        applyLoadedTable(table, Boolean(range));

        const current = summaryRef.current;

        if (!range && current && current.logId === id && (incomingBattles || keepRows)) {
          void window.electronAPI
            .crossoutStatsCacheSave({
              summary: current,
              table,
            })
            .catch((cacheError) => {
              logWarning("crossout-stats-cache", cacheError);
            });
        }
      } else {
        setLogTableError({
          code: result.errorCode,
          message: result.error,
          fallbackKey: "result.error",
        });
      }
    } catch (error) {
      logWarning("crossout-log", error);
      setLogTableError({ fallbackKey: "result.error" });
    } finally {
      if (seq === loadSeq.current) setLogTableLoading(false);
    }
  }, [applyLoadedTable]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = barSentinelRef.current;

    if (!root || !sentinel) {
      setBarStuck(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setBarStuck(!entry.isIntersecting),
      { root, threshold: 1 },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [logTable, logTableLoading, view]);

  useEffect(() => {
    let cancelled = false;
    const logoTimer = window.setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 160);

    summaryRef.current = null;
    setSummary(null);
    setError(null);
    setLogType(null);
    setLogTable(null);
    setLogTableError(null);
    setUploadDate("");
    setTimeOptions([]);
    setTimeFrom(0);
    setTimeTo(0);
    setTimeFiltered(false);
    setTimeOpen(false);
    setLoading(false);

    const showSummary = (next: CrossoutLogSummary) => {
      summaryRef.current = next;
      setSummary(next);
      void window.electronAPI
        .crossoutHistorySave({
          logId: next.logId,
          nickname: next.nickname,
          title: next.title,
          types: next.types,
        })
        .catch((historyError) => {
          logWarning("crossout-history", historyError);
        });
    };

    const load = async () => {
      try {
        const cached = await window.electronAPI.crossoutStatsCacheGet(logId);

        if (cancelled) return;

        if (cached) {
          showSummary(cached.summary);

          const matchedType = cached.summary.types.find(
            (type) => type.key.toLowerCase() === preferredType,
          );
          const firstType = matchedType ?? cached.summary.types[0];
          const table = firstType
            ? cachedTable(cached.tables, firstType.key)
            : null;

          window.clearTimeout(logoTimer);
          setLoading(false);

          if (cachedTableReady(table) && firstType) {
            setLogType(firstType.key);
            applyLoadedTable(table, false);
            return;
          }

          if (firstType) {
            void loadLogType(logId, firstType.key, firstType.count);
          }

          return;
        }
      } catch (cacheError) {
        logWarning("crossout-stats-cache", cacheError);
      }

      if (cancelled) return;

      setLoading(true);

      try {
        const result = await window.electronAPI.crossoutLoadLog(logId);

        if (cancelled) return;

        if (result.ok) {
          showSummary(result.summary);

          const matchedType = result.summary.types.find(
            (type) => type.key.toLowerCase() === preferredType,
          );
          const firstType = matchedType ?? result.summary.types[0];

          if (firstType) {
            void loadLogType(logId, firstType.key, firstType.count);
          }
        } else {
          setError({
            code: result.errorCode,
            message: result.error,
            fallbackKey: "result.error",
          });
        }
      } catch (loadError) {
        if (cancelled) return;

        logWarning("crossout-log", loadError);
        setError({ fallbackKey: "result.error" });
      } finally {
        window.clearTimeout(logoTimer);
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      window.clearTimeout(logoTimer);
    };
  }, [applyLoadedTable, logId, loadLogType, preferredType]);

  useEffect(() => {
    let cancelled = false;

    void window.electronAPI
      .crossoutNames()
      .then((catalog) => {
        if (!cancelled) setNameCatalog(catalog);
      })
      .catch((error) => logWarning("crossout-names", error));

    return () => {
      cancelled = true;
    };
  }, []);

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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = Math.floor(seconds % 60);

    return hours > 0
      ? `${hours}:${pad(minutes)}:${pad(rest)}`
      : `${minutes}:${pad(rest)}`;
  };

  const formatBattleDuration = (value: string) => {
    const minutes = /(\d+)\s*(?:м|m|min)\.?\s*(\d+)\s*(?:с|s|sec)\.?/i.exec(value);

    if (minutes) {
      return formatDuration(Number(minutes[1]) * 60 + Number(minutes[2]));
    }

    const clock = /^(\d+):(\d{1,2})$/.exec(value.trim());

    if (clock) {
      return formatDuration(Number(clock[1]) * 60 + Number(clock[2]));
    }

    return value;
  };

  const mapLabel = (map: string) => {
    if (!map) return "";

    const normalized = normalizeMap(map);
    const option = CROSSOUT_MAPS.find(
      (item) =>
        item.value === normalized ||
        normalizeMap(item.ru) === normalized ||
        normalizeMap(item.en) === normalized,
    );

    if (!option) return map;

    return isRu ? option.ru : option.en;
  };

  const logTypeLabel = (key: string, fallback: string) => {
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

  const logCellLabel = (text: string) => {
    const normalized = text.trim().toLowerCase();
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

    return labels[normalized] ?? text;
  };

  const logStatsLabel = (text: string) => {
    const normalized = text.trim().toLowerCase();
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

    return labels[normalized] ?? text;
  };

  useEffect(
    () => () => {
      if (shotTimerRef.current) window.clearTimeout(shotTimerRef.current);
      if (linksTimerRef.current) window.clearTimeout(linksTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!logTable) return;

    const hasStats = Boolean(logTable.stats && logTable.stats.rows.length > 0);

    setView(hasStats ? "stats" : "battles");
    setAlliesOnly(true);
    setStatsQuery("");
    setMapQuery("");
  }, [logTable]);

  const shownTable = useMemo(
    () => localizeLogTable(logTable, nameCatalog, namesLanguage),
    [logTable, nameCatalog, namesLanguage],
  );

  const allyTeam = useMemo(() => {
    const rows = shownTable?.stats?.rows ?? [];
    const nick = summary?.nickname ?? "";
    const matched = rows.find(
      (row) => row.kind === "player" && sameName(row.name, nick),
    );

    if (matched?.team) return matched.team;

    return rows.find((row) => row.kind === "player" && row.team)?.team ?? "";
  }, [shownTable, summary]);

  const rangedStats = useMemo(() => {
    if (!timeFiltered || !shownTable) return null;

    return statsForRange(
      shownTable,
      Math.min(timeFrom, timeTo),
      Math.max(timeFrom, timeTo),
      nameCatalog,
      namesLanguage,
    );
  }, [nameCatalog, namesLanguage, shownTable, timeFiltered, timeFrom, timeTo]);

  const filteredStats = useMemo(() => {
    const rows = rangedStats ?? shownTable?.stats?.rows ?? [];
    const query = statsQuery.trim().toLowerCase();
    const groups = groupStatRows(rows);
    const nick = shownTable?.nickname || summary?.nickname || "";
    const ownerIndex = nick
      ? groups.findIndex(
          (group) => group.player && sameName(group.player.name, nick),
        )
      : -1;

    if (ownerIndex > 0) {
      const [owner] = groups.splice(ownerIndex, 1);
      groups.unshift(owner);
    }

    return groups.flatMap((group) => {
      const team = group.player?.team || group.weapons[0]?.team || "";

      if (alliesOnly && allyTeam && team && team !== allyTeam) return [];

      const weapons = group.weapons.filter((row) => {
        if (!query) return true;

        return (
          row.weapon.toLowerCase().includes(query) ||
          row.name.toLowerCase().includes(query)
        );
      });
      const playerMatches =
        !query ||
        Boolean(group.player && group.player.name.toLowerCase().includes(query));

      if (playerMatches) {
        return group.player ? [group.player, ...group.weapons] : group.weapons;
      }

      if (weapons.length === 0) return [];

      return group.player ? [group.player, ...weapons] : weapons;
    });
  }, [alliesOnly, allyTeam, rangedStats, shownTable, statsQuery, summary]);

  const filteredBattles = useMemo(() => {
    const rows = shownTable?.rows ?? [];
    const query = mapQuery.trim().toLowerCase();
    const preface: CrossoutLogRow[] = [];
    const groups: CrossoutLogRow[][] = [];
    let current: CrossoutLogRow[] | null = null;

    for (const row of rows) {
      if (row.battle) {
        current = [row];
        groups.push(current);
      } else if (current) {
        current.push(row);
      } else {
        preface.push(row);
      }
    }

    const from = Math.min(timeFrom, timeTo);
    const to = Math.max(timeFrom, timeTo);
    const dated = groups.some((group) => (group[0].battle?.at ?? 0) > 0);
    const ranged =
      timeFiltered && dated
        ? groups.filter((group) => {
            const at = group[0].battle?.at ?? 0;

            return at >= from && at <= to;
          })
        : groups;

    if (timeFiltered && dated && ranged.length === 0) return [];

    const matched = !query
      ? ranged
      : ranged.filter((group) =>
          group.some((row) => {
            const raw = row.battle?.map || row.map;

            if (!raw) return false;

            return (
              raw.toLowerCase().includes(query) ||
              mapLabel(raw).toLowerCase().includes(query)
            );
          }),
        );

    if (query && matched.length === 0) return [];

    return [...preface, ...matched.flat()];
  }, [shownTable, mapLabel, mapQuery, timeFiltered, timeFrom, timeTo]);

  const battleColumns = useMemo(() => {
    const header = filteredBattles.find((row) => row.cls.includes("sticDiv"));

    if (!header) return [];

    const labels = header.cells.flatMap((cell) =>
      Array.from({ length: Math.max(1, cell.colSpan) }, () => cell.text),
    );

    return mirroredBattleColumns(labels);
  }, [filteredBattles]);

  const copyScreenshot = async () => {
    const root = statsShotRef.current;

    if (!root || shotBusy) return;

    setShotBusy(true);

    try {
      const shot = buildAlliesShot(root, allyTeam);

      if (!shot) return;

      const copied = await window.electronAPI.copyTableImage(
        shot.html,
        shot.width,
        shot.height,
      );

      if (!copied) return;

      setShotCopied(true);

      if (shotTimerRef.current) window.clearTimeout(shotTimerRef.current);

      shotTimerRef.current = window.setTimeout(() => {
        setShotCopied(false);
        shotTimerRef.current = null;
      }, 2000);
    } catch (copyError) {
      logWarning("log-shot", copyError);
    } finally {
      setShotBusy(false);
    }
  };

  const copyLinks = async () => {
    if (!summary) return;

    const appLink = buildAppLogLink(summary.logId, logType);
    const siteLink = `${isRu ? SITE_URL_RU : SITE_URL_EN}/log/${summary.logId}`;

    try {
      await window.electronAPI.copyText(`${appLink}\n${siteLink}`);
      setLinksCopied(true);

      if (linksTimerRef.current) window.clearTimeout(linksTimerRef.current);

      linksTimerRef.current = window.setTimeout(() => {
        setLinksCopied(false);
        linksTimerRef.current = null;
      }, 2000);
    } catch (copyError) {
      logWarning("log-links", copyError);
    }
  };

  const errorText = (value: ResultError) => {
    if (
      value.code &&
      i18n.exists(`errors.${value.code}`, { ns: "logsPage" })
    ) {
      return t(`errors.${value.code}`);
    }

    return value.fallbackKey
      ? t(value.fallbackKey)
      : value.message || t("result.error");
  };

  const applyTimeFilter = () => {
    if (!summary || !logType || timeOptions.length === 0 || logTableLoading) {
      return;
    }

    const from = Math.min(timeFrom, timeTo);
    const to = Math.max(timeFrom, timeTo);
    const full =
      from === timeOptions[0].at &&
      to === timeOptions[timeOptions.length - 1].at;

    setTimeFrom(from);
    setTimeTo(to);
    setTimeFiltered(!full);
  };

  const resetTimeFilter = () => {
    if (!summary || !logType || logTableLoading || timeOptions.length === 0) {
      return;
    }

    setTimeFrom(timeOptions[0].at);
    setTimeTo(timeOptions[timeOptions.length - 1].at);
    setTimeFiltered(false);
  };

  return (
    <div
      ref={scrollRef}
      className={classNames(styles.root, styles.scrollPlain)}
    >
      <div className={styles.heading}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate("/logs")}
        >
          <span className={styles.backArrow} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3.5 5.5 8 10 12.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          {t("result.back")}
        </button>
        <div className={styles.headingTitle}>
          <h1>{t("result.title")}</h1>
          {summary && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() =>
                void window.electronAPI.openExternal(
                  `${isRu ? SITE_URL_RU : SITE_URL_EN}/log/${summary.logId}`,
                )
              }
            >
              <ExternalIcon />
              {t("result.openSite")}
            </button>
          )}
        </div>
        <p>
          {summary
            ? uploadDate
              ? t("result.subtitle", {
                  logId: summary.logId,
                  date: uploadDate,
                  nickname: summary.nickname || "—",
                })
              : t("result.subtitlePlain", {
                  logId: summary.logId,
                  nickname: summary.nickname || "—",
                })
            : error
              ? t("result.error")
              : t("result.loading")}
        </p>
      </div>

      <section className={styles.card}>
        {error && <p className={styles.error}>{errorText(error)}</p>}

        {loading && !error && (
          <div className={styles.processingLogo} role="status" aria-live="polite">
            <CrossoutLogo />
            <strong>{t("log.loading")}</strong>
            <p>{t("result.loading")}</p>
          </div>
        )}

        {summary && summary.types.length > 0 && (
          <div className={styles.logTabs}>
            {summary.types.map((type) => (
              <button
                key={type.key}
                type="button"
                className={classNames(styles.logTab, {
                  [styles.logTabActive]: logType === type.key,
                })}
                onClick={() => {
                  setTimeOptions([]);
                  setTimeFiltered(false);
                  setTimeOpen(false);
                  void loadLogType(summary.logId, type.key, type.count);
                }}
              >
                <span>{logTypeLabel(type.key, type.label)}</span>
                <span className={styles.logTabCount}>{type.count}</span>
              </button>
            ))}
            {timeOptions.length > 1 && (
              <button
                type="button"
                className={classNames(styles.logTimeToggle, {
                  [styles.logTimeToggleOn]: timeOpen || timeFiltered,
                })}
                aria-expanded={timeOpen}
                onClick={() => setTimeOpen((open) => !open)}
              >
                <TimeIcon />
                {t("logView.timeToggle")}
              </button>
            )}
          </div>
        )}

        {summary && summary.types.length === 0 && !loading && (
          <p className={styles.empty}>{t("log.empty")}</p>
        )}

        {timeOpen && timeOptions.length > 1 && (
          <div
            className={classNames(styles.logTimeFilter, {
              [styles.logTimeFilterActive]: timeFiltered,
            })}
          >
            <div className={styles.logTimeField}>
              <Select
                options={timeSelectOptions}
                defaultValue={String(timeFrom)}
                disabled={logTableLoading}
                menuFit
                onChange={(value) => setTimeFrom(Number(value))}
              />
            </div>
            <span className={styles.logTimeDash} aria-hidden="true" />
            <div className={styles.logTimeField}>
              <Select
                options={timeSelectOptions}
                defaultValue={String(timeTo)}
                disabled={logTableLoading}
                menuFit
                onChange={(value) => setTimeTo(Number(value))}
              />
            </div>
            <span className={styles.logTimeZone}>{zoneLabel}</span>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={logTableLoading}
              onClick={applyTimeFilter}
            >
              {t("logView.timeApply")}
            </button>
            <button
              type="button"
              className={styles.logTimeReset}
              disabled={logTableLoading || !timeFiltered}
              onClick={resetTimeFilter}
            >
              {t("logView.timeAll")}
            </button>
          </div>
        )}

        {logTableLoading && !logTable && (
          <div className={styles.processingLogo} role="status" aria-live="polite">
            <CrossoutLogo />
            <strong>{t("log.tableLoading")}</strong>
          </div>
        )}

        {logTableError && (
          <p className={styles.error}>{errorText(logTableError)}</p>
        )}

        {logTable && (
          <div
            className={classNames(styles.logView, {
              [styles.logViewStuck]: barStuck,
            })}
          >
            <div ref={barSentinelRef} className={styles.logViewSentinel} />
            <div className={styles.logViewCorners} aria-hidden="true">
              <span />
              <span />
            </div>
            <div
              className={classNames(styles.logViewBar, {
                [styles.logViewBarStuck]: barStuck,
              })}
            >
              <div className={styles.logSegment} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "stats"}
                  className={classNames(styles.logSegmentButton, {
                    [styles.logSegmentActive]: view === "stats",
                  })}
                  onClick={() => setView("stats")}
                >
                  {t("logView.stats")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "battles"}
                  className={classNames(styles.logSegmentButton, {
                    [styles.logSegmentActive]: view === "battles",
                  })}
                  onClick={() => setView("battles")}
                >
                  {t("logView.battles")}
                </button>
              </div>

              {view === "stats" ? (
                <div className={styles.logViewTools}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={shotBusy || filteredStats.length === 0}
                    onClick={() => void copyScreenshot()}
                  >
                    <CameraIcon />
                    {shotCopied ? t("logView.shotCopied") : t("logView.copyShot")}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={!summary}
                    onClick={() => void copyLinks()}
                  >
                    <LinkIcon />
                    {linksCopied ? t("logView.linksCopied") : t("logView.copyLinks")}
                  </button>
                  <div className={styles.logSearch}>
                    <Input
                      type="search"
                      value={statsQuery}
                      placeholder={t("logView.searchPlayer")}
                      onChange={(event) => setStatsQuery(event.target.value)}
                    />
                  </div>
                  <div className={styles.logEnemyToggle}>
                    <span>{t("logView.alliesOnly")}</span>
                    <Switch
                      checked={alliesOnly}
                      onChange={setAlliesOnly}
                      label={t("logView.alliesOnly")}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.logViewTools}>
                  <div className={styles.logSearch}>
                    <Input
                      type="search"
                      value={mapQuery}
                      placeholder={t("logView.searchMap")}
                      onChange={(event) => setMapQuery(event.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {view === "stats" && !logTable.stats?.rows.length && (
              <p className={styles.empty}>{t("log.tableEmpty")}</p>
            )}

            {view === "stats" &&
              Boolean(logTable.stats?.rows.length) &&
              filteredStats.length === 0 && (
                <p className={styles.empty}>{t("logView.nothing")}</p>
              )}

            {view === "battles" && logTable.rows.length === 0 && (
              <p className={styles.empty}>{t("log.tableEmpty")}</p>
            )}

            {view === "battles" &&
              logTable.rows.length > 0 &&
              filteredBattles.length === 0 && (
                <p className={styles.empty}>{t("logView.nothing")}</p>
              )}

            {view === "stats" && filteredStats.length > 0 && logTable.stats && (
              <div className={styles.logStats} ref={statsShotRef}>

                <div className={classNames(styles.logTableWrap, styles.logStatsWrap)}>
                  <table className={styles.logStatsTable}>
                    {logTable.stats.headers.length > 0 && (
                      <colgroup>
                        {logTable.stats.headers.map((_, index, headers) => {
                          const total = headers.reduce(
                            (sum, _header, headerIndex) =>
                              sum + statColumnWeight(headerIndex),
                            0,
                          );

                          return (
                            <col
                              key={`stat-col-${index}`}
                              style={{
                                width: `${(statColumnWeight(index) / total) * 100}%`,
                              }}
                            />
                          );
                        })}
                      </colgroup>
                    )}
                    {logTable.stats.headers.length > 0 && (
                      <thead>
                        <tr>
                          {logTable.stats.headers.map((header, index) => (
                            <th
                              key={`stat-head-${index}`}
                              className={
                                index === 0
                                  ? styles.logStatsName
                                  : styles.logStatsCenter
                              }
                            >
                              {logStatsLabel(header)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    )}

                    <tbody>
                      {filteredStats.map((row, rowIndex) => {
                        const teamClass =
                          row.team === "red"
                            ? styles.teamRed
                            : row.team === "green"
                              ? styles.teamGreen
                              : undefined;

                        return (
                          <tr
                            key={`stat-row-${rowIndex}`}
                            data-team={row.team || undefined}
                            className={classNames(teamClass, {
                              [styles.logStatsPlayer]: row.kind === "player",
                              [styles.logStatsWeaponRow]: row.kind === "weapon",
                            })}
                          >
                            {row.cells.map((cell, cellIndex) => {
                              const isWeapon = row.kind === "weapon";
                              const isName = cellIndex === 0;
                              const isRating = isWeapon && cellIndex === 1;
                              const isDamage = isWeapon && cellIndex === 3;
                              const deltaLabel = row.delta
                                ? /^-|^\+/.test(row.delta)
                                  ? row.delta
                                  : `${row.deltaKind === "down" ? "-" : "+"}${row.delta}`
                                : "";

                              return (
                                <td
                                  key={`stat-cell-${rowIndex}-${cellIndex}`}
                                  className={classNames({
                                    [styles.logStatsName]: isName,
                                    [styles.logStatsCenter]: !isName,
                                  })}
                                  title={
                                    isName ? row.weapon || row.name || cell : undefined
                                  }
                                >
                                  {isName && isWeapon ? (
                                    <span className={styles.logStatsWeapon}>
                                      <span className={styles.logStatsWeaponIcons}>
                                        {(row.images?.length
                                          ? row.images
                                          : row.image
                                            ? [row.image]
                                            : []
                                        ).map((src, imageIndex) => (
                                          <span
                                            key={`${src}-${imageIndex}`}
                                            className={styles.logStatsWeaponIcon}
                                          >
                                            <img
                                              className={styles.logStatsWeaponImage}
                                              src={src}
                                              alt=""
                                              loading="lazy"
                                            />
                                          </span>
                                        ))}
                                      </span>
                                      <span className={styles.logStatsWeaponName}>
                                        {row.weapon || cell}
                                      </span>
                                    </span>
                                  ) : isRating && row.stars !== null ? (
                                    <span className={styles.logStatsFigure}>
                                      <StarRating value={row.stars} />
                                      {cell && (
                                        <sup className={styles.logStatsSup}>
                                          {cell}
                                        </sup>
                                      )}
                                    </span>
                                  ) : isDamage ? (
                                    <span className={styles.logStatsFigure}>
                                      <span>{row.damage || cell}</span>
                                      {deltaLabel && (
                                        <sup
                                          className={classNames(
                                            styles.logStatsSup,
                                            row.deltaKind === "up"
                                              ? styles.logStatsDeltaUp
                                              : styles.logStatsDeltaDown,
                                          )}
                                        >
                                          {deltaLabel}
                                        </sup>
                                      )}
                                    </span>
                                  ) : (
                                    cell
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === "battles" && filteredBattles.length > 0 && (
              <div className={styles.logTableWrap}>
                <table
                  className={classNames(styles.logTable, {
                    [styles.logTableFixed]: battleColumns.length > 0,
                  })}
                >
                  {battleColumns.length > 0 && (
                    <colgroup>
                      {battleColumns.map((width, index) => (
                        <col
                          key={`battle-col-${index}`}
                          style={{ width: `${width}%` }}
                        />
                      ))}
                    </colgroup>
                  )}
                  <tbody>
                    {filteredBattles.map((row, rowIndex) => {
                      if (row.battle) {
                        return (
                          <tr
                            key={`battle-${rowIndex}`}
                            className={styles.logBattleRow}
                          >
                            <td
                              className={styles.logBattleCell}
                              colSpan={row.cells[0]?.colSpan || 1}
                            >
                              <div className={styles.logBattleMeta}>
                                <span>
                                  {t("logTable.battle")} #{row.battle.index}
                                </span>
                                <span>
                                  {t("logTable.map")}: {mapLabel(row.battle.map)}
                                </span>
                                <span>
                                  {t("logTable.time")}:{" "}
                                  {formatBattleDuration(row.battle.duration)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const isHeader =
                        row.cls.includes("sticDiv") ||
                        (rowIndex === 0 &&
                          row.cells.every((cell) => !cell.image && !cell.weapon));

                      return (
                        <tr
                          key={`row-${rowIndex}`}
                          className={classNames({
                            [styles.logHeadRow]: isHeader,
                          })}
                        >
                          {row.cells.map((cell, cellIndex) => {
                            const teamClass = cell.cls.includes("red")
                              ? styles.teamRed
                              : cell.cls.includes("green")
                                ? styles.teamGreen
                                : undefined;

                            const pictures =
                              cell.images?.length
                                ? cell.images
                                : cell.image
                                  ? [
                                      {
                                        src: cell.image,
                                        name: cell.weapon,
                                        destroyed: cell.destroyed,
                                      },
                                    ]
                                  : [];
                            const pictureNames = pictures
                              .map((item) => item.name)
                              .filter(Boolean)
                              .join(", ");

                            const alignLeft = cell.cls.includes("alignleft");
                            const alignRight = cell.cls.includes("alignright");

                            return (
                              <td
                                key={`cell-${rowIndex}-${cellIndex}`}
                                colSpan={cell.colSpan}
                                rowSpan={cell.rowSpan}
                                title={pictureNames || cell.weapon || undefined}
                                className={classNames(styles.logCell, teamClass, {
                                  [styles.destroyed]:
                                    cell.destroyed && pictures.length === 0,
                                  [styles.logWeaponCell]:
                                    !isHeader && pictures.length > 0,
                                  [styles.logAlignLeft]: alignLeft,
                                  [styles.logAlignRight]: alignRight,
                                  [styles.logBorderLeft]: cell.cls.includes("brl"),
                                  [styles.logBorderRight]: cell.cls.includes("brr"),
                                })}
                              >
                                {!isHeader && pictures.length > 0 ? (
                                  <span
                                    className={classNames(styles.logWeaponStrip, {
                                      [styles.logWeaponStripStart]: alignLeft,
                                      [styles.logWeaponStripEnd]: alignRight,
                                    })}
                                  >
                                    {pictures.map((item, imageIndex) => (
                                      <span
                                        key={`${item.src}-${imageIndex}`}
                                        className={styles.logWeaponFrame}
                                        title={item.name || undefined}
                                      >
                                        <img
                                          className={classNames(
                                            styles.logWeaponImage,
                                            {
                                              [styles.logWeaponDestroyed]:
                                                item.destroyed,
                                            },
                                          )}
                                          src={item.src}
                                          alt={item.name}
                                          loading="lazy"
                                        />
                                      </span>
                                    ))}
                                  </span>
                                ) : isHeader ? (
                                  logCellLabel(cell.text)
                                ) : (
                                  cell.text || cell.weapon
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default LogsResult;
