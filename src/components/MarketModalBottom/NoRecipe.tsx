import { FileWarningIcon } from "@src/ui/icons";
import styles from "./styles/MarketModalBottom.module.scss";

const NoRecipe = () => {
  return (
    <div className={styles.recipe}>
      <div className={styles.title}>
        <p>Компоненты</p>
      </div>

      <div className={styles.no_recipe}>
        <p>Рецепт отсутствует</p>
        <FileWarningIcon />
      </div>
    </div>
  );
};

export default NoRecipe;
