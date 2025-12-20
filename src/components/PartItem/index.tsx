import { FC, useState } from "react";
import styles from "./styles/PartItem.module.scss";
import classNames from "classnames";
import { useTranslation } from "react-i18next";

type Props = {
  id: string;
  name: string;
  eng_name: string;
  count: number;
};

const PartItem: FC<Props> = ({ id, name, eng_name, count }) => {
  const [isActive, setIsActive] = useState(false);

  const { t, i18n } = useTranslation("solvePage", { keyPrefix: "totals" });

  const onClick = () => {
    setIsActive((prev) => !prev);
  };

  const partName = i18n.language === "ru" ? name : eng_name;

  return (
    <div
      className={classNames(styles.root, { [styles.active]: isActive })}
      onClick={onClick}
    >
      <p>{partName}</p>
      <img src={`parts/${id}.png`} alt={partName} draggable={false} />
      <span>
        {count} {t("partsUsed.prefix")}
      </span>
    </div>
  );
};

export default PartItem;
