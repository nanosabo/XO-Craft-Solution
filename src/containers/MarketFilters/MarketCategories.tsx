import MarketFilterButton from "@src/components/MarketFilterButton";
import MarketSectionFilter from "@src/components/MarketSectionFilter";
import {
  selectMarketState,
  setCategoryFilter,
} from "@src/store/slices/market.slice";
import MarketIcons from "@src/ui/icons/MarketFilterIcons";
import styles from "./styles/MarketFilters.module.scss";
import { useAppDispatch, useAppSelector } from "@src/store/store";

const icons = [
  {
    id: 1,
    Icon: MarketIcons.CarIcon,
  },
  {
    id: 2,
    Icon: MarketIcons.WeaponIcon,
  },
  {
    id: 3,
    Icon: MarketIcons.ModuleIcon,
  },
  {
    id: 4,
    Icon: MarketIcons.WheelIcon,
  },
  {
    id: 6,
    Icon: MarketIcons.DecorIcon,
  },
  {
    id: 9,
    Icon: MarketIcons.CustomizationIcon,
  },
  {
    id: 8,
    Icon: MarketIcons.ResourceIcon,
  },
];

const MarketCategories = () => {
  const { categories, categoryFilter } = useAppSelector(selectMarketState);
  const dispatch = useAppDispatch();

  const getName = (id: number) => {
    return categories.find((cat) => cat.id === id)?.name || "Неизвестно";
  };

  const onClick = (id: number) => {
    dispatch(setCategoryFilter(id));
  };

  return (
    <MarketSectionFilter title="Категория">
      <div className={styles.buttons}>
        {icons.map(({ id, Icon }) => (
          <MarketFilterButton
            key={id}
            title={getName(id)}
            onClick={onClick.bind(this, id)}
            isActive={categoryFilter.includes(id)}
          >
            <Icon />
          </MarketFilterButton>
        ))}
      </div>
    </MarketSectionFilter>
  );
};

export default MarketCategories;
