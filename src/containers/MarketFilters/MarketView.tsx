import MarketFilterButton from "@src/components/MarketFilterButton";
import MarketSectionFilter from "@src/components/MarketSectionFilter";
import styles from "./styles/MarketFilters.module.scss";
import MarketIcons from "@src/ui/icons/MarketFilterIcons";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  selectMarketState,
  setMarketView,
} from "@src/store/slices/market.slice";

const items: { type: "cards" | "table"; Icon: () => JSX.Element }[] = [
  {
    type: "cards",
    Icon: MarketIcons.CardsIcon,
  },
  {
    type: "table",
    Icon: MarketIcons.TableIcon,
  },
];

const MarketView = () => {
  const { view } = useAppSelector(selectMarketState);
  const dispatch = useAppDispatch();

  const onClick = (type: "cards" | "table") => {
    dispatch(setMarketView(type));
  };

  return (
    <MarketSectionFilter title="Вид">
      <div className={styles.buttons}>
        {items.map(({ type, Icon }) => (
          <MarketFilterButton
            key={type}
            title={type}
            isActive={type === view}
            disabled={type === view}
            onClick={onClick.bind(this, type)}
          >
            <Icon />
          </MarketFilterButton>
        ))}
      </div>
    </MarketSectionFilter>
  );
};

export default MarketView;
