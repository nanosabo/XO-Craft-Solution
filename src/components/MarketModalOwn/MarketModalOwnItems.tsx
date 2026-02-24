import styles from "./styles/MarketModalOwn.module.scss";
import OwnRecipeItem from "./OwnRecipeItem";
import { useAppSelector } from "@src/store/store";
import { selectMarketModalState } from "@src/store/slices/marketModal.slice";
import NoRecipe from "../MarketModalBottom/NoRecipe";
import { useTranslation } from "react-i18next";

const MarketModalOwnItems = () => {
  const {
    own_recipe: { ingredients },
  } = useAppSelector(selectMarketModalState);
  const { t } = useTranslation("marketPage");

  if (ingredients.length === 0) return <NoRecipe own />;

  const resources = ingredients.filter((ing) => ing.categoryId === 8);
  const parts = ingredients.filter((ing) => ing.categoryId !== 8);

  return (
    <div className={styles.recipe}>
      <div className={styles.title}>
        <p>{t("modal.names.components")}</p>
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
