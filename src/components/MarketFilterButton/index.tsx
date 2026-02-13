import { ButtonHTMLAttributes, FC, memo, PropsWithChildren } from "react";
import styles from "./styles/MarketFilterButton.module.scss";
import classNames from "classnames";

interface Props extends PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement>
> {
  isActive?: boolean;
}

const MarketFilterButton: FC<Props> = memo(
  ({ isActive, className, children, ...rest }) => {
    const classes = classNames(styles.button, className, {
      [styles.active]: isActive,
    });

    return (
      <button className={classes} {...rest}>
        {children}
      </button>
    );
  },
);

export default MarketFilterButton;
