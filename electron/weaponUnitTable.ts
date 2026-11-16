export interface WeaponUnitRow {
  key: string;
  /** Name from the site HTML, used when the catalogue has no translation. */
  fallback: string;
  importantPercent: string;
  important: string;
  average: string;
  total: string;
}

const SECTION =
  /<h2[^>]*>[^<]*(?:Урон по единицам вооружения|Damage by weapon units|Damage per weapon)[^<]*<\/h2>\s*(<table[\s\S]*?<\/table>)/i;

const decode = (value: string): string =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .replace(/\s+/g, " ")
    .trim();

const textOf = (html: string): string => decode(html.replace(/<[^>]+>/g, " "));

/** The "damage by weapon unit" table. Other blocks in the same response are ignored. */
export const parseWeaponUnitTable = (html: string): WeaponUnitRow[] => {
  const section = SECTION.exec(html);

  if (!section) return [];

  const rows: WeaponUnitRow[] = [];

  for (const match of section[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = match[1];
    const image = /\/weapons\/([^"'?\s/]+)\.png/i.exec(row);
    const key = image?.[1] ?? "";

    if (!key) continue;

    const title = /\btitle=(["'])([\s\S]*?)\1/i.exec(row);
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (cell) => textOf(cell[1]),
    );

    if (cells.length < 5) continue;

    rows.push({
      key,
      fallback: decode(title?.[2] ?? "") || key,
      importantPercent: cells[1],
      important: cells[2],
      average: cells[3],
      total: cells[4],
    });
  }

  return rows;
};
