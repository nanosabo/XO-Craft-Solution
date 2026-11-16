export interface MirrorPart {
  id: string;
  name: string;
  eng_name: string;
  category: string;
  power: number;
  durability: number;
  weight: number;
  build_hp: number;
  maxCount: number;
  size_x?: number;
  size_y?: number;
  size_z?: number;
}

type Side = "left" | "right";

const RU_SIDE =
  /(^|\s)(левые|левый|левая|левое|правые|правый|правая|правое|слева|справа)(?=\s|$)/i;
const EN_SIDE = /(^|\s)(left|right)(?=\s|$)/i;

const isLeft = (word: string) =>
  word.startsWith("лев") || word === "слева" || word === "left";

const likeSample = (word: string, sample: string) => {
  const first = sample.trim()[0] ?? "";
  const capital = first !== first.toLowerCase() && first === first.toUpperCase();
  const lower = word.toLowerCase();

  return capital ? lower[0].toUpperCase() + lower.slice(1) : lower;
};

/**
 * "Левое крыло Кутха" and its pair become "Правое и Левое крыло Кутха".
 * The side words stay where they were in the name.
 */
export const mirrorPartLabel = (name: string, otherName: string): string | null => {
  const pattern = RU_SIDE.test(name) ? RU_SIDE : EN_SIDE.test(name) ? EN_SIDE : null;

  RU_SIDE.lastIndex = 0;
  EN_SIDE.lastIndex = 0;

  if (!pattern) return null;

  const found = pattern.exec(name);
  const other = pattern.exec(otherName);

  pattern.lastIndex = 0;

  if (!found || !other) return null;

  const word = found[2];
  const otherWord = other[2];
  const wordIsLeft = isLeft(word.toLowerCase());

  if (wordIsLeft === isLeft(otherWord.toLowerCase())) return null;

  const right = wordIsLeft ? otherWord : word;
  const left = wordIsLeft ? word : otherWord;
  const joiner = pattern === RU_SIDE ? "и" : "and";
  const replacement = `${likeSample(right, word)} ${joiner} ${likeSample(left, word)}`;
  const start = (found.index ?? 0) + found[1].length;

  return `${name.slice(0, start)}${replacement}${name.slice(start + word.length)}`;
};

/** One side word, and the name that remains after it is removed. */
const sidedStem = (
  name: string,
  pattern: RegExp,
): { side: Side; stem: string } | null => {
  const matches = name.match(new RegExp(pattern.source, "gi"));

  if (!matches || matches.length !== 1) return null;

  const found = pattern.exec(name);
  pattern.lastIndex = 0;

  if (!found) return null;

  const word = found[2].toLowerCase();
  const stem = name.replace(pattern, " ").replace(/\s+/g, " ").trim().toLowerCase();

  return { side: isLeft(word) ? "left" : "right", stem };
};

const statsKey = (part: MirrorPart, ruStem: string, enStem: string) =>
  [
    ruStem,
    enStem,
    part.category,
    part.power,
    part.durability,
    part.weight,
    part.build_hp,
    part.maxCount,
    part.size_x ?? "",
    part.size_y ?? "",
    part.size_z ?? "",
  ].join("\0");

/**
 * Left and right copies of one structural part. The map points each id at
 * the other side. A pair needs the same stats and names that differ only by
 * the side word, in both languages.
 */
export const buildMirrorMap = (parts: MirrorPart[]): Map<string, string> => {
  const groups = new Map<string, { id: string; side: Side }[]>();

  for (const part of parts) {
    const ru = sidedStem(part.name, RU_SIDE);
    const en = sidedStem(part.eng_name, EN_SIDE);

    if (!ru || !en) continue;

    const key = statsKey(part, ru.stem, en.stem);
    const group = groups.get(key) ?? [];

    group.push({ id: part.id, side: ru.side });
    groups.set(key, group);
  }

  const mirrors = new Map<string, string>();

  for (const group of groups.values()) {
    const left = group.filter((item) => item.side === "left");
    const right = group.filter((item) => item.side === "right");

    if (left.length !== 1 || right.length !== 1) continue;

    mirrors.set(left[0].id, right[0].id);
    mirrors.set(right[0].id, left[0].id);
  }

  return mirrors;
};

export const expandIds = (
  ids: Iterable<string>,
  mirrors: Map<string, string>,
): Set<string> => {
  const next = new Set(ids);

  for (const id of ids) {
    const mirror = mirrors.get(id);

    if (mirror) next.add(mirror);
  }

  return next;
};

/** Forbidden parts are matched by the English name, so the mirror name joins them. */
export const expandEngNames = (
  names: Iterable<string>,
  parts: MirrorPart[],
  mirrors: Map<string, string>,
): Set<string> => {
  const byId = new Map(parts.map((part) => [part.id, part]));
  const next = new Set(names);

  for (const part of parts) {
    if (!next.has(part.eng_name)) continue;

    const mirror = byId.get(mirrors.get(part.id) ?? "");

    if (mirror) next.add(mirror.eng_name);
  }

  return next;
};
