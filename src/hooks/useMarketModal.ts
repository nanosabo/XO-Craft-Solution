import { selectMarketState } from "@src/store/slices/market.slice";
import {
  calcMarketItem,
  selectMarketModalState,
} from "@src/store/slices/marketModal.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import { useEffect } from "react";

const useMarketModal = () => {
  const { items } = useAppSelector(selectMarketState);
  const { item, ingredients, type, mode, onlyCraft, overdrive, cost } =
    useAppSelector(selectMarketModalState);

  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      calcMarketItem({ itemId: item, type, mode, onlyCraft, overdrive }),
    );
  }, [item, type, mode, onlyCraft, overdrive, dispatch]);

  const selectedItem = items.find((i) => i.id === item);
  if (!selectedItem) throw new Error("Item for modal not found");

  const itemCost = cost !== null ? cost : selectedItem.craftCost;
  const profit =
    Math.round((selectedItem.rawPrices.s * 0.9 - itemCost) * 100) / 100;

  const ings =
    ingredients.length > 0
      ? ingredients
      : selectedItem.ingredients.length > 0
        ? selectedItem.ingredients
        : null;

  const recipe =
    ings === null
      ? null
      : ings.map((ing) => {
          const ingredient = items.find((i) => i.id === ing.id);
          if (!ingredient) throw new Error("Item for ingredient not found");
          return { ...ing, name: ingredient.name };
        });

  return { item: selectedItem, recipe, type, mode, itemCost, profit };
};

export default useMarketModal;
