export const START_SCREENS = ["craft", "market", "stats"] as const;

export type StartScreen = (typeof START_SCREENS)[number];

export const isStartScreen = (value: unknown): value is StartScreen =>
  value === "craft" || value === "market" || value === "stats";

export const startScreenPath = (screen: StartScreen): string => {
  if (screen === "market") return "/market";
  if (screen === "stats") return "/logs";

  return "/";
};
