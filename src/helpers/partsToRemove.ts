import type { solvedPart } from "@src/store/slices/loader.slice";

/** How many of each part left the solution. Count is the amount to take off. */
export const partsToRemove = (
  previous: solvedPart[] | null | undefined,
  next: solvedPart[],
): solvedPart[] => {
  if (!previous?.length) return [];

  const before = new Map<string, solvedPart>();

  for (const part of previous) {
    const existing = before.get(part.id);

    if (existing) {
      existing.count += part.count;
    } else {
      before.set(part.id, {
        id: part.id,
        name: part.name,
        eng_name: part.eng_name,
        count: part.count,
      });
    }
  }

  const after = new Map<string, number>();

  for (const part of next) {
    after.set(part.id, (after.get(part.id) ?? 0) + part.count);
  }

  const dropped: solvedPart[] = [];

  for (const part of before.values()) {
    const removed = part.count - (after.get(part.id) ?? 0);

    if (removed > 0) {
      dropped.push({ ...part, count: removed });
    }
  }

  return dropped;
};
