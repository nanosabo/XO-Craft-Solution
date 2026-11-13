import classNames from "classnames";
import { FC } from "react";
import styles from "./styles/PageTitle.module.scss";

type Props = {
  title: string;
  subtitle: string;
  className?: string;
};

const PageTitle: FC<Props> = ({ title, subtitle, className }) => {
  return (
    <div className={classNames(styles.page_title, className)}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
};

export default PageTitle;
