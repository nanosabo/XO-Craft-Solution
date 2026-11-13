import { AnalogTolerances } from "@src/store/slices/settings.slice";
import { getPartDurability, Part } from "../types";

export interface AnalogMatch {
  part: Part;
  powerDelta: number;
  weightDelta: number;
  durabilityDelta: number;
  score: number;
}

const toMatch = (
  part: Part,
  selectedPart: Part,
  analog: AnalogTolerances,
): AnalogMatch => {
  const powerDelta = part.power - selectedPart.power;
  const weightDelta = part.weight - selectedPart.weight;
  const durabilityDelta =
    getPartDurability(part) - getPartDurability(selectedPart);

  const score =
    Math.abs(powerDelta) / Math.max(1, analog.power) +
    Math.abs(weightDelta) / Math.max(1, analog.weight) +
    Math.abs(durabilityDelta) / Math.max(1, analog.durability);

  return { part, powerDelta, weightDelta, durabilityDelta, score };
};

const fitsTolerances = (
  match: AnalogMatch,
  analog: AnalogTolerances,
) =>
  Math.abs(match.powerDelta) <= analog.power &&
  Math.abs(match.weightDelta) <= analog.weight &&
  match.durabilityDelta >= -analog.durability;

const dimensions = (part: Part) => {
  const sizes = [part.size_x, part.size_y, part.size_z];

  if (
    sizes.some((size) => typeof size !== "number" || !Number.isFinite(size)) ||
    sizes.every((size) => size === 0)
  ) {
    return null;
  }

  return [...(sizes as number[])].sort((left, right) => left - right);
};

export const hasPartSize = (part: Part) => dimensions(part) !== null;

const sameSize = (left: Part, right: Part) => {
  const a = dimensions(left);
  const b = dimensions(right);

  return a !== null && b !== null && a.every((size, index) => size === b[index]);
};

export const getAnalogMatches = (
  parts: Part[],
  selectedPart: Part | null,
  analog: AnalogTolerances,
): AnalogMatch[] => {
  if (!selectedPart) return [];

  return parts
    .filter(
      (part) =>
        part.id !== selectedPart.id && part.category === selectedPart.category,
    )
    .map((part) => toMatch(part, selectedPart, analog))
    .filter((match) => fitsTolerances(match, analog))
    .sort((a, b) => a.score - b.score);
};

export const getSizeMatches = (
  parts: Part[],
  selectedPart: Part | null,
): AnalogMatch[] => {
  if (!selectedPart || !hasPartSize(selectedPart)) return [];

  return parts
    .filter((part) => part.id !== selectedPart.id && sameSize(part, selectedPart))
    .map((part) => {
      const powerDelta = part.power - selectedPart.power;
      const weightDelta = part.weight - selectedPart.weight;
      const durabilityDelta =
        getPartDurability(part) - getPartDurability(selectedPart);

      return {
        part,
        powerDelta,
        weightDelta,
        durabilityDelta,
        score:
          Math.abs(powerDelta) + Math.abs(weightDelta) + Math.abs(durabilityDelta),
      };
    })
    .sort((a, b) => a.score - b.score);
};

export const formatDelta = (value: number, unit: string) =>
  `${value > 0 ? "+" : ""}${Math.round(value)} ${unit}`;
