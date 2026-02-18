import styles from "./styles/MarketModalOwn.module.scss";
import MarketSectionFilter from "../MarketSectionFilter";
import Input from "@src/ui/Input";
import { BackArrowIcon, SaveIcon, TrashIcon } from "@src/ui/icons";
import classNames from "classnames";
import MarketModalOwnSearch from "./MarketModalOwnSearch";
import useMarketModal from "@src/hooks/useMarketModal";
import { rarities } from "@src/helpers/rarities";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  selectMarketModalState,
  setModalOwnRecipe,
  setOwnRecipeRent,
  setOwnRecipeResult,
  switchMarketModalOwn,
} from "@src/store/slices/marketModal.slice";
import { ChangeEvent } from "react";
import { removeOwnRecipe, setOwnRecipe } from "@src/store/slices/market.slice";

const MarketModalOwnInputs = () => {
  const { item } = useMarketModal();
  const {
    own_recipe: { rent, resultAmount, ingredients },
  } = useAppSelector(selectMarketModalState);
  const dispatch = useAppDispatch();

  const onChange = (type: "rent" | "amount") => {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const value = +e.target.value;

      if (type === "rent") {
        dispatch(setOwnRecipeRent(value < 0 ? 0 : value));
      } else {
        dispatch(setOwnRecipeResult(value < 1 ? 1 : value));
      }
    };
  };

  const onBack = () => {
    dispatch(switchMarketModalOwn());
  };

  const onSave = () => {
    dispatch(
      setOwnRecipe({
        id: item.id,
        recipe: { rent, resultAmount, ingredients },
      }),
    );

    onBack();
  };

  const onRemove = () => {
    dispatch(removeOwnRecipe(item.id));
    dispatch(setModalOwnRecipe({ rent: 0, resultAmount: 1, ingredients: [] }));
    onBack();
  };

  const hasIngs = ingredients.length > 0;

  return (
    <div className={styles.inputs}>
      <MarketModalOwnSearch />

      <div className={styles.row}>
        <MarketSectionFilter title="Цена станка">
          <Input type="number" value={rent} onChange={onChange("rent")} />
        </MarketSectionFilter>

        <MarketSectionFilter title="Кол-во в итоге">
          <Input
            type="number"
            value={resultAmount}
            onChange={onChange("amount")}
            min={1}
          />
        </MarketSectionFilter>
      </div>

      <div className={styles.row}>
        <button
          className={classNames(
            styles.item_button,
            styles[rarities[item.rarityId]],
          )}
          onClick={hasIngs ? onSave : onBack}
        >
          {hasIngs ? (
            <>
              <SaveIcon />
              Сохранить
            </>
          ) : (
            <>
              <BackArrowIcon /> Отмена
            </>
          )}
        </button>

        <button
          className={classNames(styles.item_button, styles.red)}
          onClick={onRemove}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

export default MarketModalOwnInputs;
