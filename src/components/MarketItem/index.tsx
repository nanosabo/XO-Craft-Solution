import { CartIcon, RuporIcon } from "@src/ui/icons";
import styles from "./styles/MarketItem.module.scss";
import { IItemAnalytics } from "@src/store/slices/market.slice";
import MarketItemImage from "./MarketItemImage";
import { FC, memo } from "react";
import Badge from "../Badge";
import { rarities } from "../../helpers/rarities";
import { useAppDispatch } from "@src/store/store";
import { setMarketModalItem } from "@src/store/slices/marketModal.slice";

type Props = {
  item: IItemAnalytics;
};

const MarketItem: FC<Props> = memo(({ item }) => {
  const dispatch = useAppDispatch();

  const onClick = () => {
    dispatch(setMarketModalItem(item.id));
  };

  const dontHasRecipe = item.recipe === "$undefined" || item.craftable === 0;

  return (
    <div className={styles.item} onClick={onClick}>
      <div className={styles.header}>
        <div
          className={[styles.image, styles[rarities[item.rarityId]]].join(" ")}
          title={item.name}
        >
          <MarketItemImage id={item.id} />
        </div>
        <h3 title={item.name}>{item.name}</h3>
      </div>

      <div className={styles.body}>
        <div className={styles.prices}>
          <div className={styles.price}>
            <span>Продажа:</span>
            <p>
              {item.rawPrices.s} <img src="/coin.png" draggable={false} />
            </p>
          </div>
          <div className={styles.price}>
            <span>Покупка:</span>
            <p>
              {item.rawPrices.b} <img src="/coin.png" draggable={false} />
            </p>
          </div>
        </div>

        <div className={styles.offers}>
          <div className={styles.offer} title="Запросы на продажу">
            <RuporIcon />
            {item.offers.s}
          </div>

          <div className={styles.offer} title="Запросы на покупку">
            {item.offers.b}
            <CartIcon />
          </div>
        </div>

        <Badge
          title="Прибыль при перепродаже, с учетом комиссии рынка"
          text="Спред:"
          warning={item.spread <= 0}
        >
          {item.spread} <img src="/coin.png" draggable={false} />
        </Badge>

        {!dontHasRecipe ? (
          <Badge
            title="Прибыль в случае крафта в оптимальном режиме с учетом комиссии"
            text="Крафт:"
            warning={item.profit <= 0}
          >
            {item.profit} <img src="/coin.png" draggable={false} />
          </Badge>
        ) : (
          <Badge
            title="Прибыль при перепродаже, с учетом комиссии рынка"
            text="Нет рецепта"
            grey
            center
          />
        )}
      </div>
    </div>
  );
});

export default MarketItem;
