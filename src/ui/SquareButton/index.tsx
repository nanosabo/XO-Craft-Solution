import classNames from "classnames";
import { FC } from "react";
import styles from "./styles/SquareButton.module.scss";

type Props = JSX.IntrinsicElements["button"];

const SquareButton: FC<Props> = ({ children, className, ...props }) => {
  const btnClassName = classNames(styles.button, className);
  return (
    <button className={btnClassName} {...props}>
      {children}
    </button>
  );
};

export default SquareButton;
