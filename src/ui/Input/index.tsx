import { FC, InputHTMLAttributes, memo, useId } from "react";
import { SearchIcon } from "../icons";
import styles from "./styles/Input.module.scss";
import classNames from "classnames";
import { UseFormRegisterReturn } from "react-hook-form";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  register?: UseFormRegisterReturn;
  error?: string;
}

const Input: FC<Props> = memo(({ type, error, register, ...props }) => {
  const id = useId();

  return (
    <div
      className={classNames(styles.input, {
        [styles.error]: !!error,
      })}
    >
      {type === "search" && <SearchIcon />}
      <input {...props} {...register} type={type} id={id} />
      {type === "checkbox" && <label htmlFor={id}></label>}
      {!!error && <div className={styles.error_message}>{error}</div>}
    </div>
  );
});

export default Input;
