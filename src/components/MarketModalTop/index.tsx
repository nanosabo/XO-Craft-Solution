import { ChevronIcon } from "@src/ui/icons";
import Badge from "../Badge";
import MarketImageSection from "../MarketImageSection";
import MarketItemImage from "../MarketItem/MarketItemImage";
import styles from "./styles/MarketModalTop.module.scss";
import { useAppDispatch } from "@src/store/store";
import { closeMarketModal } from "@src/store/slices/marketModal.slice";
import { rarities } from "@src/helpers/rarities";
import useMarketModal from "@src/hooks/useMarketModal";
import classNames from "classnames";
import MarketModalTree from "./MarketModalTree";

const MarketModalTop = () => {
  const { item, itemCost } = useMarketModal();

  const dispatch = useAppDispatch();

  const buyIsBetter = itemCost > item.rawPrices.b;
  const selfProfit = Math.abs(
    Math.round((itemCost - item.rawPrices.b) * 100) / 100,
  );

  const onClose = () => {
    dispatch(closeMarketModal());
  };

  return (
    <>
      <button className={styles.close} onClick={onClose}>
        <ChevronIcon />
      </button>

      <h3 className={styles.name}>{item.name}</h3>

      <MarketImageSection
        rare={rarities[item.rarityId]}
        className={styles.craft_tree}
      >
        <MarketItemImage id={item.id} title={item.name} />

        <div className={styles.craft_decision}>
          {item.recipe !== "$undefined" && (
            <>
              <Badge
                title="Лучший вариант для вас"
                text="Крафтить или купить?"
                warning={buyIsBetter}
                className={styles.badge}
              >
                {buyIsBetter ? "Купить" : "Крафтить"}
              </Badge>

              <Badge text="Экономия:" className={styles.badge}>
                {selfProfit} <img src="/coin.png" draggable={false} />
              </Badge>
            </>
          )}

          <Badge
            title="Процент окупаемости вложений за сделку от перепродажи, комиссия учтена"
            text="ROI:"
            className={styles.badge}
            grey
          >
            {item.roi}%
          </Badge>
        </div>

        <div
          className={classNames(styles.tabs, styles[rarities[item.rarityId]])}
        >
          <button className={classNames(styles.tab_button, styles.active)}>
            Создание предмета
          </button>
          <button className={styles.tab_button}>Свой рецепт</button>
          <button className={styles.tab_button}>Динамика цен</button>
        </div>

        <MarketModalTree />
      </MarketImageSection>
    </>
  );
};

export default MarketModalTop;
