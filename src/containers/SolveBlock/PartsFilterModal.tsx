import { contentLanguage } from "@src/helpers/contentLanguage";
import { buildMirrorMap, expandIds } from "@src/helpers/partMirrors";
import { scheduleSolutionRefresh } from "@src/helpers/scheduleSolutionRefresh";
import { logWarning } from "@src/helpers/errorLog";
import {
  addInstalledPart,
  changeInstalledCount,
  clearInstalledParts,
  removeInstalledPart,
  selectLoaderState,
} from "@src/store/slices/loader.slice";
import useParts from "@src/containers/Settings/useParts";
import {
  setConsiderExcludedParts,
  setInventoryEnabled,
  setSymmetryMode,
  selectSettingsState,
} from "@src/store/slices/settings.slice";
import Switch from "@src/containers/Settings/components/Switch";
import {
  addPart,
  decrementPartCount,
  inсrementPartCount,
  removePart,
  requiredPartsState,
  selectRequiredPartsState,
  setSwitched,
} from "@src/store/slices/requiredParts.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import { CloseIcon, SearchIcon, TrashIcon } from "@src/ui/icons";
import { getPartImageUrl } from "@src/containers/Settings/types";
import { formatPartSize } from "@electron/partSearch";
import classNames from "classnames";
import { motion } from "framer-motion";
import debounce from "lodash.debounce";
import { FC, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { SearchedPart } from "../ColumnInputs/RequiredParts";

const STRUCTURAL_CATEGORIES = new Set(["Конструкции", "Простреливаемые"]);
import styles from "./styles/PartsFilterModal.module.scss";

interface Props {
  onClose: () => void;
}

const PartsFilterModal: FC<Props> = ({ onClose }) => {
  const { t, i18n } = useTranslation("solvePage");
  const dispatch = useAppDispatch();
  const titleId = useId();
  const { refreshing, installedParts } = useAppSelector(selectLoaderState);
  const { parts: catalog } = useParts();
  const { inventoryEnabled, considerExcludedParts, excludedParts, symmetryMode } =
    useAppSelector(selectSettingsState);
  const { parts, forbidden, switched } = useAppSelector(
    selectRequiredPartsState,
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedPart[]>([]);

  const installed = switched === "installed";
  const takenIds = useMemo(() => {
    const source = installed ? installedParts : [...parts, ...forbidden];

    return new Set(source.map((part) => part.id));
  }, [forbidden, installed, installedParts, parts]);
  const maxCountOf = useMemo(() => {
    const limits = new Map(catalog.map((part) => [part.id, part.maxCount]));

    return (id: string, stored?: number) => stored || limits.get(id);
  }, [catalog]);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string, taken: Set<string>) => {
        window.ipcRenderer
          .invoke("search-required-parts", value)
          .then((found: SearchedPart[]) => {
            setResults(found.filter((part) => !taken.has(part.id)));
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const onQueryChange = (value: string) => {
    setQuery(value);
    const trimmed = value.trim();

    if (!trimmed) {
      debouncedSearch.cancel();
      setResults([]);
      return;
    }

    debouncedSearch(trimmed, takenIds);
  };

  const excludedIds = useMemo(() => {
    if (considerExcludedParts) return new Set<string>();

    return expandIds(excludedParts, buildMirrorMap(catalog));
  }, [catalog, considerExcludedParts, excludedParts]);
  const visibleResults = results.filter((part) => {
    if (takenIds.has(part.id) || excludedIds.has(part.id)) return false;
    if (
      installed &&
      part.category &&
      !STRUCTURAL_CATEGORIES.has(part.category)
    ) {
      return false;
    }

    return true;
  });
  const current = installed
    ? installedParts
    : switched === "parts"
      ? parts
      : forbidden;
  const searching = query.trim().length > 0;

  const partName = (part: { name: string; eng_name: string }) =>
    (contentLanguage(i18n.language) === "ru" ? part.name : part.eng_name).trim();

  const switchTo = (next: requiredPartsState["switched"]) => {
    if (next !== switched) dispatch(setSwitched(next));
  };

  const clearCurrent = () => {
    if (installed) dispatch(clearInstalledParts());
    else for (const part of current) dispatch(removePart(part.id));

    scheduleSolutionRefresh(dispatch);
  };

  return createPortal(
    <motion.div
      className={styles.root}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        className={styles.container}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18 }}
      >
        <div className={styles.header}>
          <div>
            <h3 id={titleId}>{t("filter.title")}</h3>
            <p>
              {t(
                installed
                  ? "filter.subtitleMounted"
                  : switched === "forbidden"
                    ? "filter.subtitleForbidden"
                    : "filter.subtitle",
              )}
            </p>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label={t("filter.close")}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        <label className={styles.search}>
          <SearchIcon />
          <input
            value={query}
            placeholder={t("filter.search")}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>

        <div className={styles.tabs}>
          <button
            type="button"
            className={classNames(styles.tab, {
              [styles.tabOn]: switched === "parts",
            })}
            onClick={() => switchTo("parts")}
          >
            {t("filter.required")}
            <span className={styles.tabCount}>{parts.length}</span>
          </button>
          <button
            type="button"
            className={classNames(styles.tab, styles.tabMounted, {
              [styles.tabOn]: installed,
            })}
            onClick={() => switchTo("installed")}
          >
            {t("filter.mounted")}
            <span className={styles.tabCount}>{installedParts.length}</span>
          </button>
          <button
            type="button"
            className={classNames(styles.tab, styles.tabForbidden, {
              [styles.tabOn]: switched === "forbidden",
            })}
            onClick={() => switchTo("forbidden")}
          >
            {t("filter.forbidden")}
            <span className={styles.tabCount}>{forbidden.length}</span>
          </button>
        </div>

        <div className={styles.toggles}>
          <div className={styles.toggle} title={t("filter.inventoryHint")}>
            <span>{t("filter.inventory")}</span>
            <Switch
              checked={inventoryEnabled}
              label={t("filter.inventoryHint")}
              onChange={(enabled) => {
                dispatch(setInventoryEnabled(enabled));
                scheduleSolutionRefresh(dispatch);
              }}
            />
          </div>
          <div className={styles.toggle} title={t("filter.bannedHint")}>
            <span>{t("filter.banned")}</span>
            <Switch
              checked={considerExcludedParts}
              label={t("filter.bannedHint")}
              onChange={(shown) => {
                dispatch(setConsiderExcludedParts(shown));
                scheduleSolutionRefresh(dispatch);
              }}
            />
          </div>
          <div className={styles.toggle} title={t("filter.symmetryHint")}>
            <span>{t("filter.symmetry")}</span>
            <Switch
              checked={symmetryMode}
              label={t("filter.symmetryHint")}
              onChange={(enabled) => {
                dispatch(setSymmetryMode(enabled));
                scheduleSolutionRefresh(dispatch);
              }}
            />
          </div>
        </div>

        <div className={styles.list}>
          {searching && visibleResults.length === 0 && (
            <p className={styles.empty}>{t("filter.noResults")}</p>
          )}

          {searching &&
            visibleResults.map((part) => {
              const size = formatPartSize(part);

              return (
              <div key={part.id} className={styles.row}>
                <img src={getPartImageUrl(part.id)} alt="" draggable={false} />
                <p className={styles.name} title={partName(part)}>
                  {partName(part)}
                </p>
                {size && <span className={styles.size}>{size}</span>}
                <button
                  type="button"
                  className={styles.add}
                  onClick={() => {
                    if (installed) {
                      dispatch(
                        addInstalledPart({
                          id: part.id,
                          name: part.name,
                          eng_name: part.eng_name,
                          maxCount: part.maxCount,
                        }),
                      );
                    } else {
                      dispatch(
                        addPart({
                          id: part.id,
                          name: part.name,
                          eng_name: part.eng_name,
                          maxCount: part.maxCount,
                        }),
                      );
                    }
                    debouncedSearch.cancel();
                    setQuery("");
                    setResults([]);
                    scheduleSolutionRefresh(dispatch);
                  }}
                >
                  {t("filter.add")}
                </button>
              </div>
              );
            })}

          {!searching && current.length === 0 && (
            <p className={styles.empty}>
              {installed
                ? t("filter.emptyMounted")
                : switched === "parts"
                  ? t("filter.emptyRequired")
                  : t("filter.emptyForbidden")}
            </p>
          )}

          {!searching &&
            current.map((part) => {
              const limit = maxCountOf(part.id, part.maxCount);

              return (
              <div
                key={part.id}
                className={classNames(styles.row, {
                  [styles.forbidden]: switched === "forbidden",
                  [styles.mounted]: installed,
                })}
              >
                <img src={getPartImageUrl(part.id)} alt="" draggable={false} />
                <p className={styles.name} title={partName(part)}>
                  {partName(part)}
                </p>

                {(switched === "parts" || installed) && (
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.step}
                      onClick={() => {
                        if (installed) {
                          dispatch(
                            changeInstalledCount({ id: part.id, delta: -1 }),
                          );
                        } else {
                          dispatch(decrementPartCount(part.id));
                        }
                        scheduleSolutionRefresh(dispatch);
                      }}
                    >
                      −
                    </button>
                    <span className={styles.qty}>{part.count}</span>
                    <button
                      type="button"
                      className={styles.step}
                      disabled={limit != null && part.count >= limit}
                      onClick={() => {
                        if (installed) {
                          dispatch(
                            changeInstalledCount({
                              id: part.id,
                              delta: 1,
                              maxCount: limit,
                            }),
                          );
                        } else {
                          dispatch(inсrementPartCount(part.id));
                        }
                        scheduleSolutionRefresh(dispatch);
                      }}
                    >
                      +
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className={styles.remove}
                  title={t("filter.remove")}
                  onClick={() => {
                    if (installed) dispatch(removeInstalledPart(part.id));
                    else dispatch(removePart(part.id));
                    scheduleSolutionRefresh(dispatch);
                  }}
                >
                  <TrashIcon />
                </button>
              </div>
              );
            })}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.clear}
            disabled={current.length === 0 || searching}
            onClick={clearCurrent}
          >
            {t("filter.clear")}
          </button>
          <p
            className={classNames(styles.status, {
              [styles.statusOn]: refreshing,
            })}
          >
            {refreshing ? t("refreshing") : t("filter.live")}
          </p>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default PartsFilterModal;
