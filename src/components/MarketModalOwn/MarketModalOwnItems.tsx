import styles from "./styles/MarketModalOwn.module.scss";
import OwnRecipeItem from "./OwnRecipeItem";
import { useAppSelector } from "@src/store/store";
import { selectMarketModalState } from "@src/store/slices/marketModal.slice";
import NoRecipe from "../MarketModalBottom/NoRecipe";

const MarketModalOwnItems = () => {
  const {
    own_recipe: { ingredients },
  } = useAppSelector(selectMarketModalState);

  if (ingredients.length === 0) return <NoRecipe own />;

  const resources = ingredients.filter((ing) => ing.categoryId === 8);
  const parts = ingredients.filter((ing) => ing.categoryId !== 8);

  return (
    <div className={styles.recipe}>
      <div className={styles.title}>
        <p>Компоненты</p>
      </div>
      <div className={styles.items}>
        <div className={styles.components}>
          {resources.map((item) => (
            <OwnRecipeItem
              key={item.id}
              type="resource"
              id={item.id}
              title={item.name}
              hasRecipe={false}
              amount={item.amount}
            />
          ))}
        </div>
        <div className={styles.components}>
          {parts.map((item) => (
            <OwnRecipeItem
              key={item.id}
              type="part"
              id={item.id}
              title={item.name}
              rarity={item.rarityId}
              hasRecipe={false}
              amount={item.amount}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketModalOwnItems;
