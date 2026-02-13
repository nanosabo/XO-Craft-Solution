import MarketSectionFilter from "@src/components/MarketSectionFilter";
import Input from "@src/ui/Input";
import styles from "./styles/MarketFilters.module.scss";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import debounce from "lodash.debounce";
import { selectMarketState, setSearch } from "@src/store/slices/market.slice";

const MarketSearch = () => {
  const [isLoaded, setIsloaded] = useState(false);
  const [value, setValue] = useState("");
  const { search } = useAppSelector(selectMarketState);
  const dispatch = useAppDispatch();

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        dispatch(setSearch(value));
      }, 500),
    [dispatch],
  );

  useEffect(() => {
    if (!isLoaded) {
      setValue(search);
      setIsloaded(true);
    }

    if (search === "") {
      setValue("");
    }
  }, [search, isLoaded]);

  const onSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    debouncedSearch(e.target.value);
  };

  return (
    <MarketSectionFilter title="Поиск" className={styles.search}>
      <Input type="search" onChange={onSearchChange} value={value} />
    </MarketSectionFilter>
  );
};

export default MarketSearch;
