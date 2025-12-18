import { useTranslation } from "react-i18next";
import styles from "./styles/ColumtInputs.module.scss";
import InputSection from "@src/components/InputSection";
import RequiredDetails from "../RequiredDetails";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import debounce from "lodash.debounce";
import SearchedParts from "./SearchedParts";
import { AnimatePresence } from "framer-motion";
import { useAppSelector } from "@src/store/store";
import { selectRequiredPartsState } from "@src/store/slices/requiredParts.slice";

export interface SearchedPart {
  id: string;
  name: string;
  eng_name: string;
  maxCount: number;
}

const RequiredParts = () => {
  const { t } = useTranslation("mainPage", { keyPrefix: "inputs" });
  const [searched, setSearched] = useState<SearchedPart[]>([]);
  const { parts } = useAppSelector(selectRequiredPartsState);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        value.length === 0
          ? setSearched([])
          : window.ipcRenderer
              .invoke("search-required-parts", value)
              .then((result: SearchedPart[]) => {
                const filteredResult = result.filter(
                  (part) => !parts.find((p) => p.id === part.id)
                );
                setSearched(filteredResult);
              });
      }, 500),
    [parts]
  );

  const onSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const onClose = () => {
    setSearched([]);
  };

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return (
    <div className={styles.block} style={{ position: "relative" }}>
      <InputSection
        icon="PuzzleIcon"
        type="search"
        title={t("requriedParts.title")}
        placeholder={t("searchPlaceholder")}
        tooltipTitle={t(`requriedParts.tooltip.title`)}
        toolTipSubtitle={t(`requriedParts.tooltip.subtitle`)}
        onChange={onSearchChange}
      />

      <AnimatePresence>
        {searched.length > 0 && (
          <SearchedParts parts={searched} onClose={onClose} />
        )}
      </AnimatePresence>

      <RequiredDetails />
    </div>
  );
};

export default RequiredParts;
