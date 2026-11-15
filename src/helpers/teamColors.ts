import type { CSSProperties } from "react";

export type Team = "ally" | "enemy";

export type TeamColors = Record<Team, string>;

/** The nickname row color: what the user picks, accent and weapon rows follow. */
export const DEFAULT_TEAM_COLORS: TeamColors = {
  ally: "#133f37",
  enemy: "#492729",
};

// Log card background the team tints are laid over.
const CARD_BG = [21.6, 24.5, 26.6] as const;
// Share of the accent color that ends up in the nickname row background.
const NICK_SHARE = 0.221;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && HEX_COLOR.test(value);

const toRgb = (hex: string) =>
  [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));

const toHex = (rgb: number[]) =>
  `#${rgb
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

/**
 * The brightest shade: the nickname color pushed away from the card background,
 * scaled evenly so a channel hitting its limit does not shift the hue.
 */
export const teamAccent = (hex: string) => {
  const rgb = toRgb(hex);
  const delta = rgb.map((channel, index) => channel - CARD_BG[index]);
  let scale = 1 / NICK_SHARE;

  delta.forEach((value, index) => {
    if (value > 0) scale = Math.min(scale, (255 - CARD_BG[index]) / value);
    if (value < 0) scale = Math.min(scale, CARD_BG[index] / -value);
  });

  return toHex(delta.map((value, index) => CARD_BG[index] + value * scale));
};

export const TEAM_COLOR_PROPERTIES = [
  "--team-ally",
  "--team-ally-accent",
  "--team-ally-soft",
  "--team-enemy",
  "--team-enemy-accent",
  "--team-enemy-soft",
] as const;

export const teamColorVars = (colors: TeamColors) =>
  ({
    "--team-ally": colors.ally,
    "--team-ally-accent": teamAccent(colors.ally),
    "--team-enemy": colors.enemy,
    "--team-enemy-accent": teamAccent(colors.enemy),
  }) as CSSProperties;
