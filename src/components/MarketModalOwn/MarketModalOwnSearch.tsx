import styles from "./styles/MarketModalOwn.module.scss";
import MarketSectionFilter from "../MarketSectionFilter";
import Input from "@src/ui/Input";
import { useAppSelector } from "@src/store/store";
import {
  IItemAnalytics,
  selectMarketState,
} from "@src/store/slices/market.slice";
import { ChangeEvent, useMemo, useState } from "react";
import debounce from "lodash.debounce";
import { AnimatePresence } from "framer-motion";
import MarketModalSearched from "./MarketModalSearched";
import { selectMarketModalState } from "@src/store/slices/marketModal.slice";
import { useTranslation } from "react-i18next";

const MarketModalOwnSearch = () => {
  const { items } = useAppSelector(selectMarketState);
  const {
    item,
    own_recipe: { ingredients },
  } = useAppSelector(selectMarketModalState);
  const [searched, setSearched] = useState<IItemAnalytics[]>([]);
  const { t } = useTranslation("marketPage");

  const includes = ingredients.map((ing) => ing.id);
  includes.push(item);
  const avaibleItems = items.filter((item) => !includes.includes(item.id));

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        value.length === 0
          ? setSearched([])
          : setSearched(
              avaibleItems.filter((item) =>
                item.name
                  .toLowerCase()
                  .includes(value.trim().toLocaleLowerCase()),
              ),
            );
      }, 500),
    [avaibleItems],
  );

  const onSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const onClose = () => {
    setSearched([]);
  };

  return (
    <MarketSectionFilter
      className={styles.search}
      title={t("modal.names.search")}
    >
      <Input
        type="search"
        placeholder={t("modal.names.search_placeholder")}
        onChange={onSearchChange}
      />

      <AnimatePresence>
        {searched.length > 0 && (
          <MarketModalSearched items={searched} onClose={onClose} />
        )}
      </AnimatePresence>
    </MarketSectionFilter>
  );
};

export default MarketModalOwnSearch;
