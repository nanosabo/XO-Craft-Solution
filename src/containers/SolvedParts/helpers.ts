import {
  solvedPart,
  solvedPartOrigin,
  solvedResult,
} from "@src/store/slices/loader.slice";
import { solveInputsState } from "@src/store/slices/solveInputs.slice";
import { applyDurabilityBonuses } from "@src/helpers/durabilityBonus";
import { getPartDurability, Part } from "../Settings/types";

interface TotalsParams {
  solution: solvedPart[];
  parts: Part[];
  inputs: solveInputsState;
}

interface ReplaceParams {
  result: solvedResult;
  sourceId: string;
  analog: Part;
  parts: Part[];
  inputs: solveInputsState;
}

interface RestoreParams {
  result: solvedResult;
  targetId: string;
  parts: Part[];
  inputs: solveInputsState;
}

const buildSolutionTotals = ({
  solution,
  parts,
  inputs,
}: TotalsParams): Omit<solvedResult, "solution"> => {
  const partsById = new Map(parts.map((part) => [part.id, part]));

  const stats = solution.reduce(
    (acc, item) => {
      acc.parts += item.count;

      const part = partsById.get(item.id);
      if (!part) return acc;

      acc.power += part.power * item.count;
      acc.weight += part.weight * item.count;
      acc.durability += getPartDurability(part) * item.count;

      return acc;
    },
    { parts: 0, power: 0, weight: 0, durability: 0 },
  );

  let totalDurability = applyDurabilityBonuses(stats.durability, inputs);
  totalDurability += inputs.durability;

  return {
    totalWeight: stats.weight + inputs.weight,
    totalPower: stats.power + inputs.powerScores,
    totalParts: stats.parts + inputs.parts,
    totalDurability: Math.round(totalDurability),
  };
};

const mergeOrigins = (
  origins: solvedPartOrigin[] | undefined,
  additions: solvedPartOrigin[] | undefined,
): solvedPartOrigin[] => {
  const merged = (origins ?? []).map((origin) => ({ ...origin }));

  for (const addition of additions ?? []) {
    const existing = merged.find((origin) => origin.id === addition.id);

    if (existing) {
      existing.count += addition.count;
    } else {
      merged.push({ ...addition });
    }
  }

  return merged;
};

const countOrigins = (origins: solvedPartOrigin[] | undefined) =>
  (origins ?? []).reduce((sum, origin) => sum + origin.count, 0);

export const replaceSolutionPart = ({
  result,
  sourceId,
  analog,
  parts,
  inputs,
}: ReplaceParams): solvedResult => {
  const source = result.solution.find((part) => part.id === sourceId);

  if (!source || sourceId === analog.id) return result;

  // The source may itself be an analog. Carry its origins forward and keep
  // only the part of its count that was not produced by an earlier replacement.
  const sourceOrigins = source.origins ?? [];
  const sourceBase = Math.max(0, source.count - countOrigins(sourceOrigins));

  // If the chosen analog is one of the parts that was replaced earlier, picking
  // it means returning that original part, so it must not stay in the history.
  const carriedOrigins = sourceOrigins
    .filter((origin) => origin.id !== analog.id)
    .map((origin) => ({ ...origin }));

  if (sourceBase > 0) {
    carriedOrigins.push({
      id: source.id,
      name: source.name,
      eng_name: source.eng_name,
      count: sourceBase,
    });
  }

  const merged = new Map<string, solvedPart>();

  const addPart = (
    part: solvedPart,
    extraOrigins?: solvedPartOrigin[],
  ): void => {
    const existing = merged.get(part.id);

    if (existing) {
      existing.count += part.count;

      const origins = mergeOrigins(
        existing.origins,
        mergeOrigins(part.origins, extraOrigins),
      );

      if (origins.length > 0) existing.origins = origins;
      return;
    }

    const origins = mergeOrigins(part.origins, extraOrigins);

    merged.set(part.id, {
      id: part.id,
      name: part.name,
      eng_name: part.eng_name,
      count: part.count,
      ...(origins.length > 0 ? { origins } : null),
    });
  };

  for (const item of result.solution) {
    if (item.id !== sourceId) {
      addPart(item);
      continue;
    }

    addPart(
      {
        id: analog.id,
        name: analog.name,
        eng_name: analog.eng_name,
        count: item.count,
      },
      carriedOrigins,
    );
  }

  const solution = Array.from(merged.values());

  return {
    solution,
    ...buildSolutionTotals({ solution, parts, inputs }),
  };
};

export const restoreOriginalParts = ({
  result,
  targetId,
  parts,
  inputs,
}: RestoreParams): solvedResult => {
  const target = result.solution.find((part) => part.id === targetId);

  if (!target || !target.origins?.length) return result;

  const origins = target.origins;
  const remaining = Math.max(0, target.count - countOrigins(origins));

  const merged = new Map<string, solvedPart>();

  const addPart = (part: solvedPart): void => {
    const existing = merged.get(part.id);

    if (existing) {
      existing.count += part.count;

      const origins = mergeOrigins(existing.origins, part.origins);

      if (origins.length > 0) existing.origins = origins;
      return;
    }

    merged.set(part.id, {
      id: part.id,
      name: part.name,
      eng_name: part.eng_name,
      count: part.count,
      ...(part.origins?.length ? { origins: part.origins } : null),
    });
  };

  for (const item of result.solution) {
    if (item.id !== targetId) {
      addPart(item);
      continue;
    }

    if (remaining > 0) {
      addPart({
        id: item.id,
        name: item.name,
        eng_name: item.eng_name,
        count: remaining,
      });
    }

    for (const origin of origins) addPart(origin);
  }

  const solution = Array.from(merged.values());

  return {
    solution,
    ...buildSolutionTotals({ solution, parts, inputs }),
  };
};
