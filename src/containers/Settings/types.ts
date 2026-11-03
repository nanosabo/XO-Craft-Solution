export type SettingsTab = "general" | "inventory" | "analog" | "market";

export interface Part {
  id: string;
  category: string;
  name: string;
  eng_name: string;
  power: number;
  durability: number;
  weight: number;
  maxCount: number;
  build_hp: number;
}

export const getPartName = (part: Part, language: string) => {
  const localized = language.startsWith("ru") ? part.name : part.eng_name;
  return localized || part.name || part.eng_name || part.id;
};

export const getPartDurability = (part: Part) =>
  part.build_hp !== part.durability ? part.build_hp : part.durability;

export const getPartImageUrl = (id: string) =>
  `https://nanosabo.github.io/xocs-imgs/images/parts/${id}.png`;

export const matchesPartQuery = (part: Part, query: string) => {
  const search = query.trim().toLowerCase();

  if (!search) return true;

  return (
    part.name.toLowerCase().includes(search) ||
    part.eng_name.toLowerCase().includes(search)
  );
};

export const sortPartsByName = (a: Part, b: Part, language: string) =>
  getPartName(a, language).localeCompare(getPartName(b, language));
