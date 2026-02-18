import { ChevronIcon } from "@src/ui/icons";
import Badge from "../Badge";
import MarketImageSection from "../MarketImageSection";
import MarketItemImage from "../MarketItem/MarketItemImage";
import styles from "./styles/MarketModalTop.module.scss";
import { useAppDispatch } from "@src/store/store";
import {
  closeMarketModal,
  MarketModalState,
  setMarketModalShow,
} from "@src/store/slices/marketModal.slice";
import { rarities } from "@src/helpers/rarities";
import useMarketModal from "@src/hooks/useMarketModal";
import classNames from "classnames";
import MarketModalTree from "./MarketModalTree";
import { AnimatePresence } from "framer-motion";
import MarketModalOwnButton from "./MarketModalOwnButton";

const buttons = [
  { id: "craft", label: "Создание предмета" },
  { id: "own", label: "Свой рецепт" },
  { id: "chart", label: "Динамика цен" },
];

const MarketModalTop = () => {
  const { item, itemCost, isOwn, show } = useMarketModal();

  const dispatch = useAppDispatch();

  const buyIsBetter = itemCost > item.rawPrices.b;
  const selfProfit = Math.abs(
    Math.round((itemCost - item.rawPrices.b) * 100) / 100,
  );

  const onClose = () => {
    dispatch(closeMarketModal());
  };

  const onClickTab = (id: string) => {
    dispatch(setMarketModalShow(id as MarketModalState["show"]));
  };

  const dontHasRecipe =
    show === "own"
      ? !isOwn
      : item.recipe === "$undefined" || item.craftable === 0;

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
          {!dontHasRecipe && (
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

          {isFinite(item.roi) && item.roi > -100 && (
            <Badge
              title="Процент окупаемости вложений за сделку от перепродажи, комиссия учтена"
              text="ROI:"
              className={styles.badge}
              grey
            >
              {item.roi}%
            </Badge>
          )}
        </div>

        <div
          className={classNames(styles.tabs, styles[rarities[item.rarityId]])}
        >
          {buttons.map((btn) => (
            <button
              key={btn.id}
              className={classNames(styles.tab_button, {
                [styles.active]: btn.id === show,
              })}
              onClick={() => onClickTab(btn.id)}
              disabled={btn.id === show}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {show === "own" && <MarketModalOwnButton />}
        </AnimatePresence>

        <MarketModalTree />
      </MarketImageSection>
    </>
  );
};

export default MarketModalTop;
