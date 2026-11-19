import type { CrossoutLogStatRow, CrossoutLogTable } from "@src/types/crossout";

export type StatGroup = {
  player: CrossoutLogStatRow | null;
  weapons: CrossoutLogStatRow[];
};

export const sameName = (left: string, right: string) => {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();

  if (!a || !b) return false;

  return a === b || a.includes(b) || b.includes(a);
};

export const groupStatRows = (rows: CrossoutLogStatRow[]): StatGroup[] => {
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

/** Round party ids are shared; the player total often has a unique id. */
export const withParty = (table: CrossoutLogTable): CrossoutLogTable => {
  const stats = table.stats;

  if (!stats?.rows.length) return table;
  if (!table.rows.some((row) => (row.battle?.plays?.length ?? 0) > 0)) return table;

  const owner = table.nickname?.trim().toLowerCase() ?? "";
  const allies = new Set<string>();

  if (owner) allies.add(owner);

  for (const row of stats.rows) {
    if (row.kind === "player" && row.team === "green" && row.name.trim()) {
      allies.add(row.name.trim().toLowerCase());
    }
  }

  const groups = new Map<number, string[]>();

  for (const row of table.rows) {
    for (const play of row.battle?.plays ?? []) {
      const nick = play.nick.trim();

      if (!nick || play.party === 0) continue;

      const list = groups.get(play.party) ?? [];

      list.push(nick);
      groups.set(play.party, list);
    }
  }

  for (const list of groups.values()) {
    const withOwner = list.some((nick) => nick.trim().toLowerCase() === owner);

    if (!withOwner) continue;

    for (const nick of list) allies.add(nick.trim().toLowerCase());
  }

  const ordered = groupStatRows(stats.rows).map((group) => {
    const name = group.player?.name.trim().toLowerCase() ?? "";
    const team = name && allies.has(name) ? "green" : "red";

    return {
      player: group.player ? { ...group.player, team } : null,
      weapons: group.weapons.map((weapon) => ({ ...weapon, team })),
    };
  });

  ordered.sort((left, right) => {
    const leftName = left.player?.name.trim().toLowerCase() ?? "";
    const rightName = right.player?.name.trim().toLowerCase() ?? "";

    if (leftName === owner) return -1;
    if (rightName === owner) return 1;

    const leftAlly = left.player?.team === "green";
    const rightAlly = right.player?.team === "green";

    if (leftAlly !== rightAlly) return leftAlly ? -1 : 1;

    return Number(right.player?.damage ?? 0) - Number(left.player?.damage ?? 0);
  });

  return {
    ...table,
    stats: {
      ...stats,
      rows: ordered.flatMap((group) =>
        group.player ? [group.player, ...group.weapons] : group.weapons,
      ),
    },
  };
};
