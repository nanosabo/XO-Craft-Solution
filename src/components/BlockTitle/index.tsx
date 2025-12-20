import { FC } from "react";
import styles from "./styles/BlockTitle.module.scss";

type Props = {
  title: string;
  subtitle: string;
};

const BlockTitle: FC<Props> = ({ title, subtitle }) => {
  return (
    <div className={styles.block_title}>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
};

export default BlockTitle;
