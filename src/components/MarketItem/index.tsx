import { CartIcon, RuporIcon } from "@src/ui/icons";
import styles from "./styles/MarketItem.module.scss";
import { IItemAnalytics } from "@src/store/slices/market.slice";
import MarketItemImage from "./MarketItemImage";
import { FC, memo } from "react";
import Badge from "../Badge";
import { rarities } from "../../helpers/rarities";
import { useAppDispatch } from "@src/store/store";
import {
  setMarketModalItem,
  setMarketModalShow,
} from "@src/store/slices/marketModal.slice";
import { useTranslation } from "react-i18next";

type Props = {
  item: IItemAnalytics;
};

const MarketItem: FC<Props> = memo(({ item }) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation("marketPage");

  const onClick = () => {
    dispatch(setMarketModalItem(item.id));
    if (item.recipe === "$undefined" && item.isOwn) {
      dispatch(setMarketModalShow("own"));
    }
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
          <Badge
            className={styles.badge}
            title={t("titles.roi")}
            text="ROI:"
            grey
          >
            {item.roi}%
          </Badge>
        </div>
        <h3 title={item.name}>{item.name}</h3>
      </div>

      <div className={styles.body}>
        <div className={styles.prices}>
          <div className={styles.price}>
            <span>{t("names.sell_price")}:</span>
            <p>
              {item.rawPrices.s} <img src="./coin.png" draggable={false} />
            </p>
          </div>
          <div className={styles.price}>
            <span>{t("names.buy_price")}:</span>
            <p>
              {item.rawPrices.b} <img src="./coin.png" draggable={false} />
            </p>
          </div>
        </div>

        <div className={styles.offers}>
          <div className={styles.offer} title={t("titles.sell_offers")}>
            <RuporIcon />
            {item.offers.s}
          </div>

          <div className={styles.offer} title={t("titles.buy_offers")}>
            {item.offers.b}
            <CartIcon />
          </div>
        </div>

        <Badge
          title={t("titles.spread")}
          text={`${t("names.spread")}:`}
          warning={item.spread <= 0}
        >
          {item.spread} <img src="./coin.png" draggable={false} />
        </Badge>

        {!dontHasRecipe || item.isOwn ? (
          <Badge
            title={t("titles.craft")}
            text={`${t("names.craft")}:`}
            warning={item.profit <= 0}
          >
            {item.profit} <img src="./coin.png" draggable={false} />
          </Badge>
        ) : (
          <Badge text={t("names.no_recipe")} grey center />
        )}
      </div>
    </div>
  );
});

export default MarketItem;
