import { AnalogTolerances } from "@src/store/slices/settings.slice";
import { getPartDurability, Part } from "../types";

export interface AnalogMatch {
  part: Part;
  powerDelta: number;
  weightDelta: number;
  durabilityDelta: number;
  score: number;
}

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
    .map((part) => {
      const powerDelta = part.power - selectedPart.power;
      const weightDelta = part.weight - selectedPart.weight;
      const durabilityDelta =
        getPartDurability(part) - getPartDurability(selectedPart);

      const score =
        Math.abs(powerDelta) / Math.max(1, analog.power) +
        Math.abs(weightDelta) / Math.max(1, analog.weight) +
        Math.abs(durabilityDelta) / Math.max(1, analog.durability);

      return { part, powerDelta, weightDelta, durabilityDelta, score };
    })
    .filter(
      ({ powerDelta, weightDelta, durabilityDelta }) =>
        Math.abs(powerDelta) <= analog.power &&
        Math.abs(weightDelta) <= analog.weight &&
        durabilityDelta >= -analog.durability,
    )
    .sort((a, b) => a.score - b.score);
};

export const formatDelta = (value: number, unit: string) =>
  `${value > 0 ? "+" : ""}${Math.round(value)} ${unit}`;
