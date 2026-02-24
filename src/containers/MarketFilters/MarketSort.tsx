import MarketSectionFilter from "@src/components/MarketSectionFilter";
import Select from "@src/ui/Select";
import styles from "./styles/MarketFilters.module.scss";
import {
  MarketState,
  selectMarketState,
  setMarketSort,
} from "@src/store/slices/market.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

const techStack = [
  "sell_offers",
  "buy_offers",
  "sell_price",
  "buy_price",
  "spread",
  "profit",
  "roi",
];

const MarketSort = () => {
  const { sort_order, sort_by } = useAppSelector(selectMarketState);
  const dispatch = useAppDispatch();
  const { t } = useTranslation("marketPage");

  const handleSelectChange = useCallback(
    (value: string) => {
      dispatch(setMarketSort(value as MarketState["sort_by"]));
    },
    [dispatch],
  );

  const values = techStack.map((key) => ({
    value: key,
    label: t(`sort.${key}`),
  }));

  return (
    <MarketSectionFilter title={t("filters.sort")} className={styles.sort}>
      <Select
        defaultValue={sort_by}
        options={values}
        onChange={handleSelectChange}
        order={sort_order}
      />
    </MarketSectionFilter>
  );
};

export default MarketSort;
