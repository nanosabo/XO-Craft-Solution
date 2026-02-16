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

const techStack = [
  { value: "sell_offers", label: "Запросы на продажу" },
  { value: "buy_offers", label: "Запросы на покупку" },
  { value: "sell_price", label: "Цена продажи" },
  { value: "buy_price", label: "Цена покупки" },
  { value: "spread", label: "Выгода перепродажи" },
  { value: "profit", label: "Выгода по крафту" },
];

const MarketSort = () => {
  const { sort_order, sort_by } = useAppSelector(selectMarketState);
  const dispatch = useAppDispatch();

  const handleSelectChange = useCallback(
    (value: string) => {
      dispatch(setMarketSort(value as MarketState["sort_by"]));
    },
    [dispatch],
  );

  return (
    <MarketSectionFilter title="Сортировка" className={styles.sort}>
      <Select
        defaultValue={sort_by}
        options={techStack}
        onChange={handleSelectChange}
        order={sort_order}
      />
    </MarketSectionFilter>
  );
};

export default MarketSort;
