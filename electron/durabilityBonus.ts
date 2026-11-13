export type TalismanSlot = 0 | 7 | 9;
export type TalismanSlots = [TalismanSlot, TalismanSlot];

type DurabilityBonusInputs = {
  durabilityCabin?: boolean;
  coDriver?: boolean;
  talismans?: unknown;
};

export const emptyTalismans = (): TalismanSlots => [0, 0];

export const normalizeTalismans = (value: unknown): TalismanSlots => {
  const slots = Array.isArray(value) ? value : [];

  return [0, 1].map((index) => {
    const slot = Number(slots[index]);
    return slot === 7 || slot === 9 ? slot : 0;
  }) as TalismanSlots;
};

/** Stock talismans add 7% each, upgraded ones 9%. The two bonuses add up. */
export const talismanMultiplier = (slots: unknown): number => {
  const [first, second] = normalizeTalismans(slots);
  return 1 + (first + second) / 100;
};

export const talismanPercent = (slots: unknown): number => {
  const [first, second] = normalizeTalismans(slots);
  return first + second;
};

/**
 * Cabin, co-driver and talisman scale the durability of the parts picked
 * by the solver. The durability the user typed in is added afterwards.
 */
export const applyDurabilityBonuses = (
  durability: number,
  inputs: DurabilityBonusInputs,
): number => {
  let total = durability;

  if (inputs.durabilityCabin) total *= 1.1;
  if (inputs.coDriver) total *= 1.05;
  total *= talismanMultiplier(inputs.talismans);

  return total;
};
