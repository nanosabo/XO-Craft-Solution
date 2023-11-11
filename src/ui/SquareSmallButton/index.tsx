import { ButtonHTMLAttributes, FC } from "react";
import styles from "./styles/SquareSmallButton.module.scss";
import classNames from "classnames";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: "white" | "primary";
}

const SquareSmallButton: FC<Props> = ({
  children,
  className,
  variant,
  ...props
}) => {
  const buttonClassName = classNames(styles.button, className, {
    [styles[variant]]: true,
  });

  return (
    <button className={buttonClassName} {...props}>
      {children}
    </button>
  );
};

export default SquareSmallButton;
