import styles from "./styles/MarketModalOwn.module.scss";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  selectMarketModalState,
  setModalOwnRecipe,
} from "@src/store/slices/marketModal.slice";
import MarketModalBottom from "../MarketModalBottom";

import MarketModalOwnItems from "./MarketModalOwnItems";
import MarketModalOwnInputs from "./MarketModalOwnInputs";
import { selectMarketState } from "@src/store/slices/market.slice";
import { useEffect } from "react";

const MarketModalOwn = () => {
  const { own_recipes } = useAppSelector(selectMarketState);
  const { own_set, item } = useAppSelector(selectMarketModalState);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (own_recipes[item] !== undefined) {
      dispatch(setModalOwnRecipe(own_recipes[item]));
    }
  }, [own_recipes, item, dispatch]);

  if (own_set === "craft") return <MarketModalBottom />;

  return (
    <div className={styles.root}>
      <MarketModalOwnItems />
      <MarketModalOwnInputs />
    </div>
  );
};

export default MarketModalOwn;
