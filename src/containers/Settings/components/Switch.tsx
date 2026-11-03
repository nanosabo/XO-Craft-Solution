import classNames from "classnames";
import { FC } from "react";
import styles from "../styles/Settings.module.scss";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

const Switch: FC<Props> = ({ checked, onChange, label, disabled }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={classNames(styles.switch, {
        [styles.switchOn]: checked,
      })}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.switchThumb} />
    </button>
  );
};

export default Switch;
