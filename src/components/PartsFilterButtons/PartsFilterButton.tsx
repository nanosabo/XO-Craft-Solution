import { ButtonHTMLAttributes, FC, PropsWithChildren } from "react";
import styles from "./styles/PartsFilter.module.scss";
import classNames from "classnames";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {}

const PartsFilterButton: FC<PropsWithChildren<Props>> = (props) => {
  const { children, className, ...attrs } = props;

  const classes = classNames(styles.button, className);

  return (
    <button className={classes} {...attrs}>
      {children}
    </button>
  );
};

export default PartsFilterButton;
