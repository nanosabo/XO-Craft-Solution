import classNames from "classnames";
import styles from "./styles/MarketItems.module.scss";
import Badge from "@src/components/Badge";
import { IItemAnalytics } from "@src/store/slices/market.slice";
import { FC, memo } from "react";
import { rarities } from "@src/helpers/rarities";
import { useAppDispatch } from "@src/store/store";
import {
  setMarketModalItem,
  setMarketModalShow,
} from "@src/store/slices/marketModal.slice";
import { useTranslation } from "react-i18next";
import MarketItemImage from "@src/components/MarketItem/MarketItemImage";

type Props = {
  item: IItemAnalytics;
};

const TableItem: FC<Props> = memo(({ item }) => {
  const dispatch = useAppDispatch();

  const onClick = () => {
    dispatch(setMarketModalItem(item.id));
    if (item.recipe === "$undefined" && item.isOwn) {
      dispatch(setMarketModalShow("own"));
    }
  };

  const { t } = useTranslation("marketPage");

  const dontHasRecipe = item.recipe === "$undefined" || item.craftable === 0;

  return (
    <div className={styles.market__row} onClick={onClick}>
      <div className={styles.market__name}>
        <div
          className={classNames(
            styles.market__item,
            styles[rarities[item.rarityId]],
          )}
        >
          <MarketItemImage id={item.id} title={item.name} />
        </div>

        <span>{item.name}</span>
      </div>

      <div>
        {item.rawPrices.s} <img src="coin.png" />
      </div>
      <div>
        {item.rawPrices.b} <img src="coin.png" />
      </div>
      <div>{item.offers.s}</div>
      <div>{item.offers.b}</div>
      <div>
        <Badge
          text=""
          className={styles.market__badge}
          warning={item.spread <= 0}
        >
          {item.spread} <img src="coin.png" />
        </Badge>
      </div>
      <div>
        <Badge text="" className={styles.market__badge} grey>
          {item.roi}%
        </Badge>
      </div>
      <div>
        {!dontHasRecipe || item.isOwn ? (
          <>
            {item.craftCost}
            <img src="coin.png" />
          </>
        ) : (
          "-"
        )}
      </div>
      <div>
        {!dontHasRecipe || item.isOwn ? (
          <Badge
            title={t("titles.craft")}
            text=""
            warning={item.profit <= 0}
            className={styles.market__badge}
          >
            {item.profit} <img src="./coin.png" draggable={false} />
          </Badge>
        ) : (
          <Badge
            text={t("names.no_recipe")}
            className={styles.market__badge}
            grey
            center
          />
        )}
      </div>
    </div>
  );
});

export default TableItem;
