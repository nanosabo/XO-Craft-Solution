import { CROSSOUT_MAPS } from "@src/types/crossout";
import { normalizeMap } from "./logTime";

export const mapTitle = (map: string, isRu: boolean): string => {
  if (!map) return "";

  const normalized = normalizeMap(map);
  const option = CROSSOUT_MAPS.find(
    (item) =>
      item.value === normalized ||
      normalizeMap(item.ru) === normalized ||
      normalizeMap(item.en) === normalized,
  );

  if (!option) return map;

  return isRu ? option.ru : option.en;
};
