import { useEffect, useMemo } from "react";
import { removeInventoryItem } from "@src/store/slices/settings.slice";
import { useAppDispatch } from "@src/store/store";
import { matchesPartQuery, Part, sortPartsByName } from "../types";

interface Args {
  parts: Part[];
  inventory: Record<string, number>;
  query: string;
  onlyOwned: boolean;
  language: string;
}

const useInventoryParts = ({
  parts,
  inventory,
  query,
  onlyOwned,
  language,
}: Args) => {
  const dispatch = useAppDispatch();

  // The game maximum is the default. Drop stale entries and values that are
  // no longer below the maximum so they do not look like manual edits.
  useEffect(() => {
    if (parts.length === 0) return;

    const limits = new Map(parts.map((part) => [part.id, part.maxCount]));

    for (const [id, count] of Object.entries(inventory)) {
      const limit = limits.get(id);

      if (limit === undefined || count >= limit) {
        dispatch(removeInventoryItem(id));
      }
    }
  }, [dispatch, inventory, parts]);

  const filteredParts = useMemo(
    () =>
      parts
        .filter((part) => {
          const hasLimit = Object.prototype.hasOwnProperty.call(
            inventory,
            part.id,
          );

          return (!onlyOwned || hasLimit) && matchesPartQuery(part, query);
        })
        .sort((a, b) => sortPartsByName(a, b, language)),
    [inventory, language, onlyOwned, parts, query],
  );

  return {
    filteredParts,
    positions: Object.keys(inventory).length,
  };
};

export default useInventoryParts;
