import { ButtonHTMLAttributes, FC } from "react";
import styles from "./styles/BigButton.module.scss";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {}

const BigButton: FC<Props> = ({ children, ...props }) => {
  return (
    <div className={styles.wrapper}>
      <button className={styles.button} {...props}>
        {children}
      </button>
    </div>
  );
};

export default BigButton;
