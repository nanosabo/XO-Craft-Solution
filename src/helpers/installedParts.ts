import { requiredPart } from "@src/store/slices/requiredParts.slice";

interface MarkedPart {
  id: string;
  name: string;
  eng_name: string;
  count: number;
}

/** Installed parts stay in the solution. The solver may replace everything else. */
export const mergeInstalledParts = (
  required: requiredPart[],
  installed: MarkedPart[],
  forbidden: requiredPart[],
  enabled: boolean,
): { parts: requiredPart[]; lockedPartIds: string[] } => {
  if (!enabled || installed.length === 0) {
    return { parts: required, lockedPartIds: [] };
  }

  const forbiddenIds = new Set(forbidden.map((part) => part.id));
  const forbiddenNames = new Set(forbidden.map((part) => part.eng_name));
  const merged = new Map(required.map((part) => [part.id, { ...part }]));
  const lockedPartIds: string[] = [];

  for (const part of installed) {
    if (forbiddenIds.has(part.id) || forbiddenNames.has(part.eng_name)) {
      continue;
    }

    const count = Math.max(1, Math.round(part.count));
    const existing = merged.get(part.id);

    if (existing) {
      existing.count = Math.max(existing.count, count);
    } else {
      merged.set(part.id, {
        id: part.id,
        name: part.name,
        eng_name: part.eng_name,
        count,
        maxCount: count,
      });
    }

    lockedPartIds.push(part.id);
  }

  return { parts: [...merged.values()], lockedPartIds };
};

/** Required parts stay first. Installed parts follow them. */
export const placeInstalledParts = <T extends { id: string }>(
  solution: T[],
  required: { id: string }[],
  installed: { id: string }[],
): T[] => {
  const byId = new Map(solution.map((part) => [part.id, part]));
  const requiredIds = new Set(required.map((part) => part.id));
  const pinned = required.flatMap((part) => {
    const item = byId.get(part.id);
    return item ? [item] : [];
  });
  const mounted = installed.flatMap((part) => {
    if (requiredIds.has(part.id)) return [];

    const item = byId.get(part.id);
    return item ? [item] : [];
  });
  const placed = new Set([...requiredIds, ...mounted.map((part) => part.id)]);
  const rest = solution.filter((part) => !placed.has(part.id));

  return [...pinned, ...mounted, ...rest];
};
