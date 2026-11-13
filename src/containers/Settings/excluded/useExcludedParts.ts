import { useMemo } from "react";
import { matchesPartQuery, Part, sortPartsByName } from "../types";

interface Args {
  parts: Part[];
  excluded: string[];
  query: string;
  onlyExcluded: boolean;
  language: string;
}

const useExcludedParts = ({
  parts,
  excluded,
  query,
  onlyExcluded,
  language,
}: Args) => {
  const excludedIds = useMemo(() => new Set(excluded), [excluded]);

  const filteredParts = useMemo(
    () =>
      parts
        .filter(
          (part) =>
            (!onlyExcluded || excludedIds.has(part.id)) &&
            matchesPartQuery(part, query),
        )
        .sort((a, b) => {
          const aExcluded = excludedIds.has(a.id);
          const bExcluded = excludedIds.has(b.id);

          if (aExcluded !== bExcluded) return aExcluded ? -1 : 1;

          return sortPartsByName(a, b, language);
        }),
    [excludedIds, language, onlyExcluded, parts, query],
  );

  return {
    filteredParts,
    excludedIds,
    count: excluded.length,
  };
};

export default useExcludedParts;
