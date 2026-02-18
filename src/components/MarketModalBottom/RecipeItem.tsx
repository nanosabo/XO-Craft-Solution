import { FC, PropsWithChildren } from "react";
import MarketImageSection from "../MarketImageSection";
import MarketItemImage from "../MarketItem/MarketItemImage";
import styles from "./styles/MarketModalBottom.module.scss";
import classNames from "classnames";
import { rarities } from "@src/helpers/rarities";
import { useAppDispatch } from "@src/store/store";
import {
  setMarketModalOnlyCraft,
  setMarketModalOverdrive,
} from "@src/store/slices/marketModal.slice";

export interface RecipeItemProps extends PropsWithChildren {
  type: "resource" | "part";
  amount?: number;
  id: number;
  rarity?: number;
  title?: string;
  buyCost?: number;
  craftCost?: number;
  onClick?: () => void;
  typeOfCost?: "buy" | "craft";
  hasRecipe: boolean;
}

const RecipeItem: FC<RecipeItemProps> = ({
  type,
  amount,
  id,
  children,
  rarity,
  title,
  onClick,
  buyCost,
  craftCost,
  typeOfCost,
  hasRecipe,
}) => {
  const dispatch = useAppDispatch();

  const onClickCraft = (type: "buy" | "craft") => {
    if (type === "buy") {
      dispatch(setMarketModalOverdrive(id));
    } else {
      dispatch(setMarketModalOnlyCraft(id));
    }
  };

  const isRegularRecipe = craftCost !== undefined || buyCost !== undefined;

  return (
    <div
      className={styles.item_wrapper}
      onClick={isRegularRecipe ? onClick : undefined}
    >
      <MarketImageSection
        className={classNames({
          [styles.resource_item]: type === "resource",
          [styles.part_item]: type === "part",
          [styles.own]: !isRegularRecipe,
        })}
        rare={rarity ? rarities[rarity] : undefined}
        title={title}
      >
        <MarketItemImage id={id} />
        {children}
        {amount !== undefined && <b>{amount}</b>}

        {isRegularRecipe && (
          <div
            className={styles.recource_type}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <button
              className={classNames(styles.resource_type_item, {
                [styles.active]: typeOfCost === "buy",
              })}
              onClick={onClickCraft.bind(this, "buy")}
              disabled={typeOfCost === "buy"}
            >
              💰 {buyCost}
            </button>
            {hasRecipe && (
              <button
                className={classNames(styles.resource_type_item, {
                  [styles.active]: typeOfCost === "craft",
                })}
                disabled={typeOfCost === "craft"}
                onClick={onClickCraft.bind(this, "craft")}
              >
                ⚒️ {craftCost}
              </button>
            )}
          </div>
        )}
      </MarketImageSection>
    </div>
  );
};

export default RecipeItem;
