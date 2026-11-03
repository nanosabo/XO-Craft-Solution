import { ChangeEvent, FC } from "react";
import styles from "../styles/Settings.module.scss";

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  hint?: string;
}

const NumberField: FC<Props> = ({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
  hint,
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);

    if (!Number.isFinite(nextValue)) {
      onChange(min);
      return;
    }

    onChange(Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, nextValue)));
  };

  return (
    <label className={styles.field}>
      {label && <span className={styles.fieldLabel}>{label}</span>}
      <span className={styles.numberControl}>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </span>
      {hint && <span className={styles.fieldHint}>{hint}</span>}
    </label>
  );
};

export default NumberField;
