import styles from "./styles/MarketModalBottom.module.scss";
import RecipeItem from "./RecipeItem";
import Badge from "../Badge";
import useMarketModal from "@src/hooks/useMarketModal";
import NoRecipe from "./NoRecipe";
import { useAppDispatch } from "@src/store/store";
import {
  setMarketModalFromTree,
  setMarketModalType,
  TreeItem,
} from "@src/store/slices/marketModal.slice";
import classNames from "classnames";

const Recipe = () => {
  const { item, recipe, type, show } = useMarketModal();
  const dispatch = useAppDispatch();

  if (!recipe) return <NoRecipe />;

  const resources = recipe.filter((ing) => ing.categoryId === 8);
  const parts = recipe.filter((ing) => ing.categoryId !== 8);

  const onChangeType = (type: "b" | "s") => {
    dispatch(setMarketModalType(type));
  };

  const thisTreeItem: TreeItem = {
    id: item.id,
    name: item.name,
    rarityId: item.rarityId,
    isOwn: show === "own",
  };

  const onClickRecipe = ({ id, isOwn }: { id: number; isOwn: boolean }) => {
    dispatch(
      setMarketModalFromTree({
        item: id,
        treeItem: thisTreeItem,
        show: isOwn ? "own" : "craft",
      }),
    );
  };

  return (
    <div className={styles.recipe}>
      <div className={styles.title}>
        <p>Компоненты</p>

        <div className={styles.switches}>
          <button
            className={classNames(styles.switch_button, {
              [styles.active]: type === "b",
            })}
            onClick={onChangeType.bind(this, "b")}
          >
            По нижней
          </button>
          <button
            className={classNames(styles.switch_button, {
              [styles.active]: type === "s",
            })}
            onClick={onChangeType.bind(this, "s")}
          >
            По верхней
          </button>
        </div>
      </div>

      <div className={styles.items}>
        <div className={styles.components}>
          {resources.map((ing) => (
            <RecipeItem
              key={ing.id}
              type="resource"
              amount={ing.amount}
              id={ing.id}
              title={ing.name}
              buyCost={ing.buyCost}
              typeOfCost="buy"
              hasRecipe={ing.hasRecipe}
            />
          ))}
        </div>
        <div className={styles.components}>
          {parts.map((ing) => (
            <RecipeItem
              key={ing.id}
              type="part"
              amount={ing.amount}
              id={ing.id}
              rarity={ing.rarityId}
              title={ing.name}
              onClick={onClickRecipe.bind(this, {
                id: ing.id,
                isOwn: ing.isOwn,
              })}
              buyCost={ing.buyCost}
              craftCost={ing.craftCost}
              typeOfCost={ing.type === "buy" ? "buy" : "craft"}
              hasRecipe={ing.hasRecipe}
            >
              <Badge
                text={ing.type === "buy" ? "Купить" : "Крафтить"}
                warning={ing.type === "buy"}
                className={styles.part_badge}
              />
            </RecipeItem>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Recipe;
