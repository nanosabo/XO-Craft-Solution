import { FC } from "react";
import styles from "./styles/PageTitle.module.scss";

type Props = {
  title: string;
  subtitle: string;
};

const PageTitle: FC<Props> = ({ title, subtitle }) => {
  return (
    <div className={styles.page_title}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
};

export default PageTitle;
