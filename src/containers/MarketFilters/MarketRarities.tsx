import MarketFilterButton from "@src/components/MarketFilterButton";
import MarketSectionFilter from "@src/components/MarketSectionFilter";
import {
  selectMarketState,
  setRarityFilter,
} from "@src/store/slices/market.slice";
import { useSelector } from "react-redux";
import styles from "./styles/MarketFilters.module.scss";
import { useAppDispatch } from "@src/store/store";
import { useTranslation } from "react-i18next";

const items = [
  {
    id: 2,
    name: "common",
  },
  {
    id: 3,
    name: "rare",
  },
  {
    id: 4,
    name: "special",
  },
  {
    id: 5,
    name: "epic",
  },
  {
    id: 6,
    name: "legendary",
  },
  {
    id: 7,
    name: "relic",
  },
];

const MarketRarities = () => {
  const { rarities, rarityFilter } = useSelector(selectMarketState);
  const { t } = useTranslation("marketPage");

  const getName = (id: number) => {
    return rarities.find((rar) => rar.id === id)?.name || t("titles.unknown");
  };

  const dispatch = useAppDispatch();

  const onClick = (id: number) => {
    dispatch(setRarityFilter(id));
  };

  return (
    <MarketSectionFilter title={t("filters.rarity")}>
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
