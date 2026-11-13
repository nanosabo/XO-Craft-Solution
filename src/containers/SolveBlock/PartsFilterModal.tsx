import { contentLanguage } from "@src/helpers/contentLanguage";
import { scheduleSolutionRefresh } from "@src/helpers/scheduleSolutionRefresh";
import { logWarning } from "@src/helpers/errorLog";
import { setLoaderSolvingStatus } from "@src/store/slices/loader.slice";
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
import { useNavigate } from "react-router-dom";
import { SearchedPart } from "../ColumnInputs/RequiredParts";
import styles from "./styles/PartsFilterModal.module.scss";

interface Props {
  onClose: () => void;
}

const PartsFilterModal: FC<Props> = ({ onClose }) => {
  const { t, i18n } = useTranslation("solvePage");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const titleId = useId();
  const { parts, forbidden, switched } = useAppSelector(
    selectRequiredPartsState,
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedPart[]>([]);

  const takenIds = useMemo(
    () => new Set([...parts, ...forbidden].map((part) => part.id)),
    [forbidden, parts],
  );

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

  const visibleResults = results.filter((part) => !takenIds.has(part.id));
  const current = switched === "parts" ? parts : forbidden;
  const searching = query.trim().length > 0;

  const partName = (part: { name: string; eng_name: string }) =>
    (contentLanguage(i18n.language) === "ru" ? part.name : part.eng_name).trim();

  const switchTo = (next: requiredPartsState["switched"]) => {
    if (next !== switched) dispatch(setSwitched(next));
  };

  const clearCurrent = () => {
    for (const part of current) dispatch(removePart(part.id));
    scheduleSolutionRefresh(dispatch);
  };

  const onSolve = () => {
    onClose();
    dispatch(setLoaderSolvingStatus());
    navigate("/loading");
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
            <p>{t("filter.subtitle")}</p>
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
            className={classNames(styles.tab, styles.tabForbidden, {
              [styles.tabOn]: switched === "forbidden",
            })}
            onClick={() => switchTo("forbidden")}
          >
            {t("filter.forbidden")}
            <span className={styles.tabCount}>{forbidden.length}</span>
          </button>
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
                    dispatch(
                      addPart({
                        id: part.id,
                        name: part.name,
                        eng_name: part.eng_name,
                        maxCount: part.maxCount,
                      }),
                    );
                    debouncedSearch.cancel();
                    setQuery("");
                    setResults([]);
                  }}
                >
                  {t("filter.add")}
                </button>
              </div>
              );
            })}

          {!searching && current.length === 0 && (
            <p className={styles.empty}>
              {switched === "parts"
                ? t("filter.emptyRequired")
                : t("filter.emptyForbidden")}
            </p>
          )}

          {!searching &&
            current.map((part) => (
              <div
                key={part.id}
                className={classNames(styles.row, {
                  [styles.forbidden]: switched === "forbidden",
                })}
              >
                <img src={getPartImageUrl(part.id)} alt="" draggable={false} />
                <p className={styles.name} title={partName(part)}>
                  {partName(part)}
                </p>

                {switched === "parts" && (
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.step}
                      onClick={() => {
                        const removesPart = part.count <= 1;
                        dispatch(decrementPartCount(part.id));
                        if (removesPart) scheduleSolutionRefresh(dispatch);
                      }}
                    >
                      −
                    </button>
                    <span className={styles.qty}>{part.count}</span>
                    <button
                      type="button"
                      className={styles.step}
                      disabled={part.count >= part.maxCount}
                      onClick={() => dispatch(inсrementPartCount(part.id))}
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
                    dispatch(removePart(part.id));
                    scheduleSolutionRefresh(dispatch);
                  }}
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
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
          <button type="button" className={styles.solve} onClick={onSolve}>
            {t("filter.solve")}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default PartsFilterModal;
