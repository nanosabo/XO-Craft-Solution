import { contentLanguage } from "@src/helpers/contentLanguage";
import { logWarning } from "@src/helpers/errorLog";
import { scheduleSolutionRefresh } from "@src/helpers/scheduleSolutionRefresh";
import {
  addRequiredPart,
  selectRequiredPartsState,
} from "@src/store/slices/requiredParts.slice";
import { selectSettingsState } from "@src/store/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import { SearchIcon } from "@src/ui/icons";
import { getPartImageUrl } from "../Settings/types";
import { formatPartSize } from "@electron/partSearch";
import debounce from "lodash.debounce";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchedPart } from "../ColumnInputs/RequiredParts";
import styles from "./styles/RequiredPartSearch.module.scss";

const RequiredPartSearch = () => {
  const { t, i18n } = useTranslation("solvePage");
  const dispatch = useAppDispatch();
  const { parts } = useAppSelector(selectRequiredPartsState);
  const { excludedParts, considerExcludedParts } = useAppSelector(
    selectSettingsState,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [readyQuery, setReadyQuery] = useState("");
  const [results, setResults] = useState<SearchedPart[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);

  const takenIds = useMemo(
    () => new Set(parts.map((part) => part.id)),
    [parts],
  );

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        window.ipcRenderer
          .invoke("search-required-parts", value)
          .then((found: SearchedPart[]) => {
            setResults(found);
            setReadyQuery(value);
            setOpen(true);
          })
          .catch((error) => logWarning("parts-search", error));
      }, 300),
    [],
  );

  useEffect(
    () => () => {
      debouncedSearch.cancel();
    },
    [debouncedSearch],
  );

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const excludedIds = useMemo(
    () => (considerExcludedParts ? new Set<string>() : new Set(excludedParts)),
    [considerExcludedParts, excludedParts],
  );
  const visible = results.filter(
    (part) => !takenIds.has(part.id) && !excludedIds.has(part.id),
  );

  const onQueryChange = (value: string) => {
    setQuery(value);
    const trimmed = value.trim();

    if (!trimmed) {
      debouncedSearch.cancel();
      setResults([]);
      setReadyQuery("");
      setOpen(false);
      return;
    }

    debouncedSearch(trimmed);
  };

  const countFor = (part: SearchedPart) => {
    const limit = Math.max(1, part.maxCount || 1);
    return Math.min(limit, Math.max(1, counts[part.id] ?? 1));
  };

  const changeCount = (part: SearchedPart, delta: number) => {
    const limit = Math.max(1, part.maxCount || 1);
    setCounts((current) => {
      const next = Math.min(
        limit,
        Math.max(1, (current[part.id] ?? 1) + delta),
      );
      return { ...current, [part.id]: next };
    });
  };

  const add = (part: SearchedPart) => {
    dispatch(
      addRequiredPart({
        id: part.id,
        name: part.name,
        eng_name: part.eng_name,
        maxCount: part.maxCount,
        count: countFor(part),
      }),
    );
    debouncedSearch.cancel();
    setQuery("");
    setResults([]);
    setReadyQuery("");
    setOpen(false);
    scheduleSolutionRefresh(dispatch);
  };

  const partName = (part: SearchedPart) =>
    (contentLanguage(i18n.language) === "ru" ? part.name : part.eng_name).trim();

  return (
    <div className={styles.root} ref={rootRef}>
      <label className={styles.field}>
        <SearchIcon />
        <input
          value={query}
          placeholder={t("filter.quick")}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={() => {
            if (query.trim() && readyQuery === query.trim()) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && visible[0]) {
              event.preventDefault();
              add(visible[0]);
            }
          }}
        />
      </label>

      {open &&
        query.trim() &&
        (visible.length > 0 || readyQuery === query.trim()) && (
        <div className={styles.menu}>
          {visible.length === 0 ? (
            <p className={styles.empty}>{t("filter.noResults")}</p>
          ) : (
            visible.map((part) => {
              const count = countFor(part);
              const limit = Math.max(1, part.maxCount || 1);
              const size = formatPartSize(part);

              return (
                <div key={part.id} className={styles.hit}>
                  <img
                    src={getPartImageUrl(part.id)}
                    alt=""
                    draggable={false}
                  />
                  <span className={styles.name} title={partName(part)}>
                    {partName(part)}
                  </span>
                  {size && <span className={styles.size}>{size}</span>}
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.step}
                      disabled={count <= 1}
                      onClick={() => changeCount(part, -1)}
                    >
                      −
                    </button>
                    <span className={styles.qty}>{count}</span>
                    <button
                      type="button"
                      className={styles.step}
                      disabled={count >= limit}
                      onClick={() => changeCount(part, 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.add}
                    onClick={() => add(part)}
                  >
                    {t("filter.add")}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default RequiredPartSearch;
