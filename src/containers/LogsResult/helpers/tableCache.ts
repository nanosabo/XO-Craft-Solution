import type { CrossoutLogTable } from "@src/types/crossout";

export const cachedTable = (
  tables: CrossoutLogTable[],
  slug: string,
): CrossoutLogTable | null =>
  tables.find((item) => item.type.toLowerCase() === slug.toLowerCase()) ??
  null;

/** Tables saved before weapon icons were added have to be loaded again. */
export const cachedTableReady = (
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
  // Several battles in a large log share a start time. That is not an old cache.
  const timeReady =
    table.times.length < 2 ||
    battleRows.some(
      (row) =>
        (row.battle?.at ?? 0) > 0 && (row.battle?.plays?.length ?? 0) > 0,
    );
  const statsReady =
    statWeapons.length === 0 ||
    statWeapons.some((row) => "rating" in row && Boolean(row.image));
  const battleImages =
    battleWeapons.length === 0 ||
    battleWeapons.some((item) => Boolean(item.image));

  return columnsMatch && battleTone && nicksMarked && timeReady && statsReady && battleImages;
};
