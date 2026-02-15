import { FC, PropsWithChildren } from "react";
import styles from "./styles/MarketModalBottom.module.scss";

interface Props extends PropsWithChildren {
  title: string;
}

const InfoItem: FC<Props> = ({ title, children }) => {
  return (
    <div className={styles.info_item}>
      <span>{title}</span>
      <p>{children}</p>
    </div>
  );
};

export default InfoItem;
