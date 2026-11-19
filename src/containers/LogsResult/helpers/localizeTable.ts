import type {
  CrossoutLogCell,
  CrossoutLogTable,
  CrossoutNameCatalog,
} from "@src/types/crossout";

export const catalogName = (
  catalog: CrossoutNameCatalog,
  language: "ru" | "en",
  group: "weapons" | "maps",
  key: string,
) => {
  const primary = language === "en" ? catalog.en : catalog.ru;
  const secondary = language === "en" ? catalog.ru : catalog.en;

  return primary[group][key] || secondary[group][key] || "";
};

export const namesToKeys = (
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

export const localizeLogTable = (
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

export { weaponLabel };
