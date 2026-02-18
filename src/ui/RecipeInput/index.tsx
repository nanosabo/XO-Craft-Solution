import { FC, InputHTMLAttributes, LegacyRef } from "react";
import styles from "./styles/RecipeInput.module.scss";
import classNames from "classnames";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  ref?: LegacyRef<HTMLDivElement>;
}

const RecipeInput: FC<Props> = (props) => {
  const { className, ref, ...rest } = props;

  const classes = classNames(styles.input, className);

  return (
    <div className={classes} ref={ref}>
      <input {...rest} />
      <p>шт.</p>
    </div>
  );
};

export default RecipeInput;
