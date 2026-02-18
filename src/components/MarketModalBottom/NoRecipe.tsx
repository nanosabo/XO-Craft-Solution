import { FileWarningIcon } from "@src/ui/icons";
import styles from "./styles/MarketModalBottom.module.scss";
import { FC } from "react";
import classNames from "classnames";

type Props = {
  own?: boolean;
};

const NoRecipe: FC<Props> = ({ own }) => {
  return (
    <div className={styles.recipe}>
      <div className={styles.title}>
        <p>Компоненты</p>
      </div>

      <div className={classNames(styles.no_recipe, { [styles.own]: own })}>
        <p>{own ? "Добавьте ингредиенты" : "Рецепт отсутствует"}</p>
        <FileWarningIcon />
      </div>
    </div>
  );
};

export default NoRecipe;
