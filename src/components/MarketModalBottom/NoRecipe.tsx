import { FileWarningIcon } from "@src/ui/icons";
import styles from "./styles/MarketModalBottom.module.scss";
import { FC } from "react";
import classNames from "classnames";
import { useTranslation } from "react-i18next";

type Props = {
  own?: boolean;
};

const NoRecipe: FC<Props> = ({ own }) => {
  const { t } = useTranslation("marketPage");
  return (
    <div className={styles.recipe}>
      <div className={styles.title}>
        <p>{t("modal.names.components")}</p>
      </div>

      <div className={classNames(styles.no_recipe, { [styles.own]: own })}>
        <p>
          {own ? t("modal.names.add_components") : t("modal.names.no_recipe")}
        </p>
        <FileWarningIcon />
      </div>
    </div>
  );
};

export default NoRecipe;
