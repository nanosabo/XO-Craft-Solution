import type {
  CrossoutLogRoundPlay,
  CrossoutLogStatRow,
  CrossoutLogTable,
  CrossoutNameCatalog,
} from "@src/types/crossout";
import { namesToKeys, weaponLabel } from "./localizeTable";

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
export const statsForRange = (
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
