export interface PartSearchFields {
  name: string;
  eng_name: string;
  size_x?: number;
  size_y?: number;
  size_z?: number;
}

export interface ParsedPartSearch {
  name: string;
  sizes: number[] | null;
}

export const parsePartSearch = (query: string): ParsedPartSearch => {
  const trimmed = query.trim().toLowerCase();
  const sizeToken = /\d+(?:(?:[^\p{L}\d]|[xх×])+?\d+)*/giu;
  const loneSeparator = /(?:^|\s)[xх×]+(?=\s|$)/giu;

  if (!/\d/.test(trimmed)) return { name: trimmed, sizes: null };

  const numbers = trimmed.match(/\d+/g)?.map(Number) ?? [];

  if (numbers.length === 0 || numbers.length > 3) {
    return { name: trimmed, sizes: null };
  }

  const name = trimmed
    .replace(sizeToken, " ")
    .replace(loneSeparator, " ")
    .replace(/[^\p{L}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { name, sizes: numbers };
};

const includesSizes = (part: PartSearchFields, wanted: number[]) => {
  const { size_x: x, size_y: y, size_z: z } = part;

  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof z !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(z)
  ) {
    return false;
  }

  if (x === 0 && y === 0 && z === 0) return false;

  const counts = new Map<number, number>();

  for (const size of [x, y, z]) {
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }

  for (const size of wanted) {
    const left = counts.get(size) ?? 0;
    if (left === 0) return false;
    counts.set(size, left - 1);
  }

  return true;
};

export const matchesRequiredPartQuery = (
  part: PartSearchFields,
  query: string,
) => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const parsed = parsePartSearch(trimmed);

  if (!parsed.sizes) {
    return (
      part.name.toLowerCase().includes(trimmed) ||
      part.eng_name.toLowerCase().includes(trimmed)
    );
  }

  const nameOk =
    parsed.name.length === 0 ||
    part.name.toLowerCase().includes(parsed.name) ||
    part.eng_name.toLowerCase().includes(parsed.name);

  return nameOk && includesSizes(part, parsed.sizes);
};

export const formatPartSize = (part: PartSearchFields) => {
  const sizes = [part.size_x, part.size_y, part.size_z];

  if (sizes.some((size) => typeof size !== "number" || !Number.isFinite(size))) {
    return "";
  }

  if (sizes.every((size) => size === 0)) return "";

  return sizes.join("×");
};
