import { useTranslation } from "react-i18next";
import styles from "./styles/ColumtInputs.module.scss";
import classNames from "classnames";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import debounce from "lodash.debounce";
import SearchedDetail from "../SearchedDetail";
import RequiredDetails from "../RequiredDetails";
import RequiredDetailsWrapper from "../RequiredDetails/RequiredDetailsWrapper";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import useParts from "@src/containers/Settings/useParts";
import {
  addInstalledPart,
  changeInstalledCount,
  selectLoaderState,
} from "@src/store/slices/loader.slice";
import {
  addPart,
  selectRequiredPartsState,
} from "@src/store/slices/requiredParts.slice";
import { useFormContext } from "react-hook-form";
import { VehicleFormData } from "@src/helpers/validation";
import PartsFilterButtons from "@src/components/PartsFilterButtons";
import { logWarning } from "@src/helpers/errorLog";
import InputIcons from "@src/ui/icons/InputIcons";
import { SearchIcon } from "@src/ui/icons";
import Tooltip from "@src/components/Tooltip";
import { formatPartSize } from "@electron/partSearch";

export interface SearchedPart {
  id: string;
  name: string;
  eng_name: string;
  maxCount: number;
  size_x?: number;
  size_y?: number;
  size_z?: number;
  category?: string;
}

const STRUCTURAL_CATEGORIES = new Set([
  "Конструкции",
  "Простреливаемые",
]);

const RequiredParts = () => {
  const { t } = useTranslation("mainPage");
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const [readyQuery, setReadyQuery] = useState("");
  const [searched, setSearched] = useState<SearchedPart[]>([]);
  const { parts, forbidden, switched } = useAppSelector(
    selectRequiredPartsState,
  );
  const installed = useAppSelector(
    (state) => selectLoaderState(state).installedParts,
  );
  const { parts: catalog } = useParts();
  const maxCountOf = useMemo(() => {
    const limits = new Map(catalog.map((part) => [part.id, part.maxCount]));

    return (id: string, stored?: number) => stored || limits.get(id);
  }, [catalog]);
  const { watch } = useFormContext<VehicleFormData>();
  const currentWeight = Number(watch("weight")) || 0;
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<null | NodeJS.Timeout>(null);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        window.ipcRenderer
          .invoke("search-required-parts", value)
          .then((result: SearchedPart[]) => {
            const taken = new Set(
              switched === "installed"
                ? installed.map((item) => item.id)
                : [
                    ...parts.map((item) => item.id),
                    ...forbidden.map((item) => item.id),
                  ],
            );
            const filteredResult = result.filter((part) => {
              if (taken.has(part.id)) return false;
              if (
                switched === "installed" &&
                part.category &&
                !STRUCTURAL_CATEGORIES.has(part.category)
              ) {
                return false;
              }

              return true;
            });
            setSearched(filteredResult);
            setReadyQuery(value);
          })
          .catch((error) => logWarning("parts-search", error));
      }, 300),
    [parts, forbidden, installed, switched],
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
    if (switched === "installed") {
      dispatch(addInstalledPart(part));
    } else {
      dispatch(addPart(part));
    }
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
  const mode =
    switched === "forbidden"
      ? "forbidden"
      : switched === "installed"
        ? "mounted"
        : "required";
  const mountedStats = useMemo(() => {
    const byId = new Map(catalog.map((part) => [part.id, part]));

    return installed.reduce(
      (sum, item) => {
        const part = byId.get(item.id);

        sum.count += item.count;
        sum.weight += (part?.weight ?? 0) * item.count;
        sum.power += (part?.power ?? 0) * item.count;

        return sum;
      },
      { count: 0, weight: 0, power: 0 },
    );
  }, [catalog, installed]);
  const mountedTooHeavy =
    currentWeight > 0 && mountedStats.weight > currentWeight;

  return (
    <div
      className={classNames(styles.block, styles.filter)}
      style={{ position: "relative" }}
      ref={sectionRef}
    >
      <Tooltip
        title={t(`${mode}.tooltip`)}
        subtitle=""
        visible={isTooltipVisible}
        anchorRef={sectionRef}
      />

      <div className={styles.filterHead}>
        <InputIcons.PuzzleIcon />
        <p>{t(`${mode}.title`)}</p>
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
          [styles.filterHintInstalled]: mode === "mounted",
        })}
      >
        {t(isSearching ? `${mode}.addHint` : `${mode}.hint`)}
      </p>
      {mode === "mounted" && !isSearching && installed.length > 0 && (
        <p
          className={classNames(styles.accounted, {
            [styles.accountedOver]: mountedTooHeavy,
          })}
        >
          {t(mountedTooHeavy ? "mounted.overWeight" : "mounted.accounted", {
            count: mountedStats.count,
            weight: Math.round(mountedStats.weight),
            power: Math.round(mountedStats.power),
          })}
        </p>
      )}

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
                size={formatPartSize(item)}
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
        mode === "mounted" ? (
          <RequiredDetailsWrapper>
            {installed.length === 0 ? (
              <p className={styles.filterEmpty}>{t("mounted.empty")}</p>
            ) : (
              installed.map((item) => {
                const limit = maxCountOf(item.id, item.maxCount);

                return (
                <SearchedDetail
                  key={item.id}
                  name={item.name}
                  eng_name={item.eng_name}
                  id={item.id}
                  count={item.count}
                  max={limit}
                  onDecrement={() =>
                    dispatch(changeInstalledCount({ id: item.id, delta: -1 }))
                  }
                  onIncrement={() =>
                    dispatch(
                      changeInstalledCount({
                        id: item.id,
                        delta: 1,
                        maxCount: limit,
                      }),
                    )
                  }
                />
                );
              })
            )}
          </RequiredDetailsWrapper>
        ) : (
          <RequiredDetails />
        )
      )}
    </div>
  );
};

export default RequiredParts;
