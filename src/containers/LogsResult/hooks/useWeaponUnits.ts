import { useCallback, useEffect, useRef, useState } from "react";
import { logWarning } from "@src/helpers/errorLog";
import type {
  CrossoutLogStatRow,
  CrossoutLogSummary,
  CrossoutNameCatalog,
  CrossoutWeaponUnit,
  CrossoutWeaponUnitSummary,
} from "@src/types/crossout";
import { weaponUnitsCacheKey } from "@electron/weaponUnitTable";
import { catalogName } from "../helpers/localizeTable";

type UnitsState = {
  status: "loading" | "ready" | "error";
  units: CrossoutWeaponUnit[];
  summary: CrossoutWeaponUnitSummary | null;
};

export const useWeaponUnits = (
  summary: CrossoutLogSummary | null,
  logType: string | null,
  logId: string,
  nameCatalog: CrossoutNameCatalog | null,
  namesLanguage: "ru" | "en",
) => {
  const [weaponUnits, setWeaponUnits] = useState<UnitsState | null>(null);
  const seq = useRef(0);
  const memory = useRef(new Map<string, Omit<UnitsState, "status">>());
  const closeWeaponUnits = useCallback(() => {
    seq.current += 1;
    setWeaponUnits(null);
  }, []);

  useEffect(() => {
    closeWeaponUnits();
  }, [closeWeaponUnits, logId, logType]);

  const openWeaponUnits = (player: string, row: CrossoutLogStatRow) => {
    const weapons = (row.keys ?? []).filter(Boolean).join(",");

    if (!summary || !logType || !player || !weapons) return;

    const request = {
      logId: summary.logId,
      type: logType,
      player,
      weapons,
    };
    const key = weaponUnitsCacheKey(request);

    if (!key) return;

    const ticket = ++seq.current;
    const remembered = memory.current.get(key);

    if (remembered) {
      setWeaponUnits({ status: "ready", ...remembered });
      return;
    }

    const show = (
      units: CrossoutWeaponUnit[],
      weaponSummary: CrossoutWeaponUnitSummary | null,
    ) => {
      const saved = { units, summary: weaponSummary };

      memory.current.set(key, saved);
      setWeaponUnits({ status: "ready", ...saved });
    };

    void window.electronAPI
      .crossoutWeaponUnitsCacheGet(request)
      .then((cached) => {
        if (ticket !== seq.current) return;

        if (cached) {
          show(cached.units, cached.summary);
          return;
        }

        setWeaponUnits({ status: "loading", units: [], summary: null });

        return window.electronAPI.crossoutWeaponUnits(request).then((result) => {
          if (ticket !== seq.current) return;

          if (!result.ok) {
            setWeaponUnits((current) =>
              current ? { ...current, status: "error", units: [] } : current,
            );
            return;
          }

          show(result.units, result.summary);
          void window.electronAPI.crossoutWeaponUnitsCacheSave({
            ...request,
            units: result.units,
            summary: result.summary,
          });
        });
      })
      .catch((unitsError) => {
        logWarning("weapon-units", unitsError);

        if (ticket !== seq.current) return;

        setWeaponUnits((current) =>
          current
            ? { ...current, status: "error", units: [] }
            : { status: "error", units: [], summary: null },
        );
      });
  };

  const weaponUnitName = (unit: CrossoutWeaponUnit) =>
    (nameCatalog && catalogName(nameCatalog, namesLanguage, "weapons", unit.key)) ||
    unit.name;

  return { weaponUnits, openWeaponUnits, closeWeaponUnits, weaponUnitName };
};
