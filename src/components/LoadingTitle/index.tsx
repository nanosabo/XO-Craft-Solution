import { FC } from "react";
import styles from "./styles/LoadingTitle.module.scss";
import classNames from "classnames";

type Props = {
  title: string;
  subtitle: string;
  logo?: boolean;
};

const LoadingTitle: FC<Props> = ({ title, subtitle, logo }) => {
  const className = classNames(styles.loading_title, { [styles.logo]: logo });

  return (
    <div className={className}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
};

export default LoadingTitle;
