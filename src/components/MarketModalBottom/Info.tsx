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
import { useTranslation } from "react-i18next";

const buttons: MarketModalState["mode"][] = ["optimal", "allcraft", "buyIng"];

const Info = () => {
  const { item, itemCost, profit, mode, recipe, isOwn, show } =
    useMarketModal();
  const dispatch = useDispatch();
  const { t } = useTranslation("marketPage");

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

  const tabs = buttons.map((key) => ({
    name: t(`modal.buttons.${key}`),
    mode: key,
  }));

  return (
    <div className={styles.info}>
      <div className={styles.switches}>
        {tabs.map((btn) => (
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
        <InfoItem title={t("modal.names.sell_price")}>
          {item.rawPrices.s} <img src="./coin.png" draggable={false} />
        </InfoItem>
        <InfoItem title={t("modal.names.buy_price")}>
          {item.rawPrices.b} <img src="./coin.png" draggable={false} />
        </InfoItem>
        <InfoItem title={t("modal.names.sell_orders")}>
          <RuporIcon /> {item.offers.s}
        </InfoItem>
        <InfoItem title={t("modal.names.buy_orders")}>
          <CartIcon /> {item.offers.b}
        </InfoItem>
        <InfoItem title={t("modal.names.self_cost")}>
          {dontHasRecipe ? (
            t("titles.unknown")
          ) : (
            <>
              {itemCost}
              <img src="./coin.png" draggable={false} />
            </>
          )}
        </InfoItem>
        <InfoItem title={t("modal.names.profit")}>
          {dontHasRecipe ? 0 : profit}
          <img src="./coin.png" draggable={false} />
        </InfoItem>
      </div>
    </div>
  );
};

export default Info;
