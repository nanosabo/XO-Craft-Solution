import MarketFilterButton from "@src/components/MarketFilterButton";
import MarketSectionFilter from "@src/components/MarketSectionFilter";
import {
  selectMarketState,
  setRarityFilter,
} from "@src/store/slices/market.slice";
import { useSelector } from "react-redux";
import styles from "./styles/MarketFilters.module.scss";
import { useAppDispatch } from "@src/store/store";

const items = [
  {
    id: 1,
    name: "common",
  },
  {
    id: 2,
    name: "rare",
  },
  {
    id: 6,
    name: "special",
  },
  {
    id: 3,
    name: "epic",
  },
  {
    id: 4,
    name: "legendary",
  },
  {
    id: 5,
    name: "relic",
  },
];

const MarketRarities = () => {
  const { rarities, rarityFilter } = useSelector(selectMarketState);

  const getName = (id: number) => {
    return rarities.find((rar) => rar.id === id)?.name || "Неизвестно";
  };

  const dispatch = useAppDispatch();

  const onClick = (id: number) => {
    dispatch(setRarityFilter(id));
  };

  return (
    <MarketSectionFilter title="Редкость">
      <div className={styles.buttons}>
        {items.map(({ id, name }) => (
          <MarketFilterButton
            key={id}
            title={getName(id)}
            onClick={onClick.bind(this, id)}
            isActive={rarityFilter.includes(id)}
          >
            <div className={[styles.rarity_item, styles[name]].join(" ")}></div>
          </MarketFilterButton>
        ))}
      </div>
    </MarketSectionFilter>
  );
};

export default MarketRarities;
