export const fileName = (filePath: string): string =>
  filePath.split(/[\\/]/).pop() || filePath;

export const isCombatLogName = (filePath: string): boolean =>
  fileName(filePath).toLowerCase() === "combat.log";

export const parentDir = (filePath: string): string => {
  const parts = filePath.split(/[\\/]/);

  parts.pop();

  return parts.join(filePath.includes("\\") ? "\\" : "/") || filePath;
};

export const shortenPath = (value: string): string => {
  if (value.length <= 72) return value;

  return `${value.slice(0, 32)}…${value.slice(-32)}`;
};
