export const statColumnWeight = (index: number) => {
  if (index === 0) return 2.8;
  if (index === 1) return 1.35;

  return 1;
};

const battleColumnWeight = (label: string) => {
  const value = label.trim().toLowerCase();

  if (/weapon|вооруж/.test(value)) return 2.4;
  if (/team|команд|player|игрок/.test(value)) return 1.6;
  if (/damage|урон/.test(value)) return 0.9;
  if (/frag|фраг/.test(value)) return 0.7;
  if (/round|раунд/.test(value)) return 0.75;

  return 1;
};

export const mirroredBattleColumns = (labels: string[]): number[] => {
  if (labels.length < 5 || labels.length % 2 === 0) return [];

  const team = /team|команд/;
  const left = labels[0].trim().toLowerCase();
  const right = labels[labels.length - 1].trim().toLowerCase();

  if (!team.test(left) || !team.test(right)) return [];

  const weights: number[] = labels.map(battleColumnWeight);

  for (let index = 0; index < Math.floor(weights.length / 2); index += 1) {
    const shared = Math.max(weights[index], weights[weights.length - 1 - index]);

    weights[index] = shared;
    weights[weights.length - 1 - index] = shared;
  }

  const total = weights.reduce((sum, weight) => sum + weight, 0);

  return weights.map((weight) => (weight / total) * 100);
};
