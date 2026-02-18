import { CartIcon, RuporIcon } from "@src/ui/icons";
import InfoItem from "./InfoItem";
import styles from "./styles/MarketModalBottom.module.scss";
import useMarketModal from "@src/hooks/useMarketModal";
import { useDispatch } from "react-redux";
import {
  MarketModalState,
  setMarketModalMode,
} from "@src/store/slices/marketModal.slice";
import classNames from "classnames";

const buttons: { name: string; mode: MarketModalState["mode"] }[] = [
  {
    name: "Оптимально",
    mode: "optimal",
  },
  {
    name: "Крафтить все",
    mode: "allcraft",
  },
  {
    name: "Купить все",
    mode: "buyIng",
  },
];

const Info = () => {
  const { item, itemCost, profit, mode, recipe, isOwn, show } =
    useMarketModal();
  const dispatch = useDispatch();

  const dontHasRecipe =
    show === "own"
      ? !isOwn
      : item.recipe === "$undefined" || item.craftable === 0;

  const onSetMode = (mode: MarketModalState["mode"]) => {
    dispatch(
      setMarketModalMode({
        mode,
        ings: recipe ? recipe.filter((r) => r.hasRecipe).map((r) => r.id) : [],
      }),
    );
  };

  return (
    <div className={styles.info}>
      <div className={styles.switches}>
        {buttons.map((btn) => (
          <button
            key={btn.name}
            className={classNames(styles.switch_button, {
              [styles.active]: mode === btn.mode,
            })}
            onClick={onSetMode.bind(this, btn.mode)}
            disabled={dontHasRecipe}
          >
            {btn.name}
          </button>
        ))}
      </div>

      <div className={styles.info_inner}>
        <InfoItem title="Продажа">
          {item.rawPrices.s} <img src="/coin.png" draggable={false} />
        </InfoItem>
        <InfoItem title="Покупка">
          {item.rawPrices.b} <img src="/coin.png" draggable={false} />
        </InfoItem>
        <InfoItem title="Предложений на рынке">
          <RuporIcon /> {item.offers.s}
        </InfoItem>
        <InfoItem title="Запросов на рынке">
          <CartIcon /> {item.offers.b}
        </InfoItem>
        <InfoItem title="Стоимость производства">
          {dontHasRecipe ? (
            "Неизвестно"
          ) : (
            <>
              {itemCost}
              <img src="/coin.png" draggable={false} />
            </>
          )}
        </InfoItem>
        <InfoItem title="Прибыль">
          {dontHasRecipe ? 0 : profit}
          <img src="/coin.png" draggable={false} />
        </InfoItem>
      </div>
    </div>
  );
};

export default Info;
