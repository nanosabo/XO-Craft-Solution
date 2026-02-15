import { FC, PropsWithChildren } from "react";
import styles from "./styles/MarketImageSection.module.scss";
import classNames from "classnames";

interface Props extends PropsWithChildren {
  className?: string;
  rare?: string;
  title?: string;
}

const MarketImageSection: FC<Props> = ({
  children,
  className,
  rare,
  title,
}) => {
  const classes = classNames(styles.root, className, {
    [styles[rare || "common"]]: rare !== undefined,
  });
  return (
    <div className={classes} title={title}>
      {children}
    </div>
  );
};

export default MarketImageSection;
