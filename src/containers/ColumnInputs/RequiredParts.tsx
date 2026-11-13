import { useTranslation } from "react-i18next";
import styles from "./styles/ColumtInputs.module.scss";
import classNames from "classnames";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import debounce from "lodash.debounce";
import SearchedDetail from "../SearchedDetail";
import RequiredDetails from "../RequiredDetails";
import RequiredDetailsWrapper from "../RequiredDetails/RequiredDetailsWrapper";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  addPart,
  selectRequiredPartsState,
} from "@src/store/slices/requiredParts.slice";
import PartsFilterButtons from "@src/components/PartsFilterButtons";
import { logWarning } from "@src/helpers/errorLog";
import InputIcons from "@src/ui/icons/InputIcons";
import { SearchIcon } from "@src/ui/icons";
import Tooltip from "@src/components/Tooltip";

export interface SearchedPart {
  id: string;
  name: string;
  eng_name: string;
  maxCount: number;
}

const RequiredParts = () => {
  const { t } = useTranslation("mainPage");
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const [readyQuery, setReadyQuery] = useState("");
  const [searched, setSearched] = useState<SearchedPart[]>([]);
  const { parts, forbidden, switched } = useAppSelector(
    selectRequiredPartsState,
  );
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<null | NodeJS.Timeout>(null);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        window.ipcRenderer
          .invoke("search-required-parts", value)
          .then((result: SearchedPart[]) => {
            const filteredResult = result.filter(
              (part) =>
                !parts.find((item) => item.id === part.id) &&
                !forbidden.find((item) => item.id === part.id),
            );
            setSearched(filteredResult);
            setReadyQuery(value);
          })
          .catch((error) => logWarning("parts-search", error));
      }, 300),
    [parts, forbidden],
  );

  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);

    if (value.trim().length === 0) {
      debouncedSearch.cancel();
      setSearched([]);
      setReadyQuery("");
      return;
    }

    debouncedSearch(value);
  };

  const onAdd = (part: SearchedPart) => {
    dispatch(addPart(part));
    debouncedSearch.cancel();
    setQuery("");
    setSearched([]);
    setReadyQuery("");
  };

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, [debouncedSearch]);

  const showTooltip = () => {
    tooltipTimerRef.current = setTimeout(() => setIsTooltipVisible(true), 500);
  };

  const hideTooltip = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setIsTooltipVisible(false);
  };

  const isSearching = query.trim().length > 0;
  const showEmptyResults = isSearching && readyQuery === query && searched.length === 0;
  const mode = switched === "forbidden" ? "forbidden" : "required";

  return (
    <div
      className={classNames(styles.block, styles.filter)}
      style={{ position: "relative" }}
      ref={sectionRef}
    >
      <Tooltip
        title={t("inputs.requriedParts.tooltip.title")}
        subtitle={t("inputs.requriedParts.tooltip.subtitle")}
        visible={isTooltipVisible}
        anchorRef={sectionRef}
      />

      <div className={styles.filterHead}>
        <InputIcons.PuzzleIcon />
        <p>{t("inputs.requriedParts.title")}</p>
        <span onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
          <InputIcons.QuestionIcon />
        </span>
      </div>

      <label className={styles.filterSearch}>
        <SearchIcon />
        <input
          type="search"
          value={query}
          placeholder={t("inputs.searchPlaceholder")}
          onChange={onSearchChange}
        />
      </label>

      <PartsFilterButtons />

      <p
        className={classNames(styles.filterHint, {
          [styles.filterHintForbidden]: mode === "forbidden",
        })}
      >
        {t(isSearching ? `${mode}.addHint` : `${mode}.hint`)}
      </p>

      {isSearching ? (
        <RequiredDetailsWrapper>
          {showEmptyResults ? (
            <p className={styles.filterEmpty}>{t("filterSearch.noResults")}</p>
          ) : (
            searched.map((item) => (
              <SearchedDetail
                key={item.id}
                name={item.name}
                eng_name={item.eng_name}
                id={item.id}
                withControls={false}
                onClickAdd={() => onAdd(item)}
              />
            ))
          )}
          {!showEmptyResults && searched.length === 0 && (
            <p className={styles.filterEmpty}>{t("filterSearch.searching")}</p>
          )}
        </RequiredDetailsWrapper>
      ) : (
        <RequiredDetails />
      )}
    </div>
  );
};

export default RequiredParts;
