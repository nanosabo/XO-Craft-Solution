import type { CrossoutLogRow, CrossoutLogStatRow, CrossoutLogTable } from "@src/types/crossout";
import { mirroredBattleColumns } from "./columns";
import { groupStatRows, sameName } from "./statGroups";

export const allyTeamOf = (
  table: CrossoutLogTable | null,
  nickname: string,
): string => {
  const rows = table?.stats?.rows ?? [];
  const matched = rows.find(
    (row) => row.kind === "player" && sameName(row.name, nickname),
  );

  if (matched?.team) return matched.team;

  return rows.find((row) => row.kind === "player" && row.team)?.team ?? "";
};

export const filterStatRows = (
  rows: CrossoutLogStatRow[],
  options: {
    query: string;
    alliesOnly: boolean;
    allyTeam: string;
    nickname: string;
  },
): CrossoutLogStatRow[] => {
  const query = options.query.trim().toLowerCase();
  const groups = groupStatRows(rows);
  const ownerIndex = options.nickname
    ? groups.findIndex(
        (group) => group.player && sameName(group.player.name, options.nickname),
      )
    : -1;

  if (ownerIndex > 0) {
    const [owner] = groups.splice(ownerIndex, 1);

    groups.unshift(owner);
  }

  return groups.flatMap((group) => {
    const team = group.player?.team || group.weapons[0]?.team || "";

    if (options.alliesOnly && options.allyTeam && team && team !== options.allyTeam) {
      return [];
    }

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
};

export const filterBattleRows = (
  rows: CrossoutLogRow[],
  options: {
    query: string;
    timeFiltered: boolean;
    from: number;
    to: number;
    mapLabel: (map: string) => string;
  },
): CrossoutLogRow[] => {
  const query = options.query.trim().toLowerCase();
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

  const dated = groups.some((group) => (group[0].battle?.at ?? 0) > 0);
  const ranged =
    options.timeFiltered && dated
      ? groups.filter((group) => {
          const at = group[0].battle?.at ?? 0;

          return at >= options.from && at <= options.to;
        })
      : groups;

  if (options.timeFiltered && dated && ranged.length === 0) return [];

  const matched = !query
    ? ranged
    : ranged.filter((group) =>
        group.some((row) => {
          const raw = row.battle?.map || row.map;

          if (!raw) return false;

          return (
            raw.toLowerCase().includes(query) ||
            options.mapLabel(raw).toLowerCase().includes(query)
          );
        }),
      );

  if (query && matched.length === 0) return [];

  return [...preface, ...matched.flat()];
};

export const battleColumnWidths = (rows: CrossoutLogRow[]): number[] => {
  const header = rows.find((row) => row.cls.includes("sticDiv"));

  if (!header) return [];

  const labels = header.cells.flatMap((cell) =>
    Array.from({ length: Math.max(1, cell.colSpan) }, () => cell.text),
  );

  return mirroredBattleColumns(labels);
};

/** Cut on battle boundaries so rowSpan cells of a battle stay together. */
export const pageBattles = (rows: CrossoutLogRow[], limit: number): CrossoutLogRow[] => {
  let seen = 0;
  const end = rows.findIndex((row) => Boolean(row.battle) && ++seen > limit);

  return end === -1 ? rows : rows.slice(0, end);
};
