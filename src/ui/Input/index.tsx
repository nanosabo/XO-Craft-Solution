import { FC, InputHTMLAttributes, memo, useId } from "react";
import { SearchIcon } from "../icons";
import styles from "./styles/Input.module.scss";

interface Props extends InputHTMLAttributes<HTMLInputElement> {}

const Input: FC<Props> = memo(({ type, ...props }) => {
  const id = useId();

  return (
    <div className={styles.input}>
      {type === "search" && <SearchIcon />}
      <input {...props} type={type} id={id} />
      {type === "checkbox" && <label htmlFor={id}></label>}
    </div>
  );
});

export default Input;
