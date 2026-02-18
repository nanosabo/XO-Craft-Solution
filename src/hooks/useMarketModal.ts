import { selectMarketState } from "@src/store/slices/market.slice";
import { selectMarketModalState } from "@src/store/slices/marketModal.slice";
import { useAppSelector } from "@src/store/store";

const useMarketModal = () => {
  const { items } = useAppSelector(selectMarketState);
  const { item, ingredients, type, mode, cost, show, isOwn } = useAppSelector(
    selectMarketModalState,
  );

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

  return {
    item: selectedItem,
    recipe,
    type,
    mode,
    itemCost,
    profit,
    show,
    isOwn,
  };
};

export default useMarketModal;
