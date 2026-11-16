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

const SUMMARY =
  /<h2[^>]*>[^<]*(?:Общее|General|Overall|Summary)[^<]*<\/h2>\s*(<table[\s\S]*?<\/table>)/i;

export interface WeaponUnitSummary {
  name: string;
  rounds: string;
  winrate: string;
}

const WEAPON_KEY = /^[A-Za-z0-9_.-]{1,160}$/;

/** Same loadout always maps to one cache id, whatever order the keys arrived in. */
export const weaponUnitsCacheKey = (request: {
  logId: string;
  type: string;
  player: string;
  weapons: string;
}): string | null => {
  const logId = request.logId.trim();
  const type = request.type.trim().toLowerCase();
  const player = request.player.trim();
  const weapons = request.weapons
    .split(",")
    .map((key) => key.trim())
    .filter((key) => WEAPON_KEY.test(key))
    .sort()
    .join(",");

  if (!logId || !type || !player || !weapons) return null;

  return JSON.stringify([logId, type, player, weapons]);
};

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

/** The "damage by weapon unit" table. The general block is parsed separately. */
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

const rowCells = (row: string): string[] =>
  [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) =>
    textOf(cell[1]),
  );

/** Nickname, rounds and winrate from the "general" block of the same response. */
export const parseWeaponUnitSummary = (html: string): WeaponUnitSummary | null => {
  const section = SUMMARY.exec(html);

  if (!section) return null;

  const rows = [...section[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];

  if (rows.length < 2) return null;

  const headers = rowCells(rows[0][1]);
  const values = rowCells(rows[1][1]);
  const pick = (pattern: RegExp) => {
    const index = headers.findIndex((header) => pattern.test(header));

    return index >= 0 ? values[index] ?? "" : "";
  };

  const summary = {
    name: pick(/^(?:игрок|player)$/i),
    rounds: pick(/раунд|round/i),
    winrate: pick(/винрейт|win\s*rate|побед|wins/i),
  };

  if (!summary.name && !summary.rounds && !summary.winrate) return null;

  return summary;
};
