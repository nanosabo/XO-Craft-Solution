import { ChangeEvent, FC, useEffect, useState } from "react";
import { MinusIcon, PlusIcon } from "@src/ui/icons";
import styles from "../styles/Settings.module.scss";

interface Props {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

const Stepper: FC<Props> = ({ value, max, onChange, label }) => {
  const [draft, setDraft] = useState<string | null>(null);

  // When the value changes from outside (a reset, for example), show it again.
  useEffect(() => {
    setDraft(null);
  }, [value]);

  const commit = (next: number) => {
    setDraft(null);
    onChange(Math.min(max, Math.max(0, Math.floor(next))));
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;

    if (raw.trim() === "") {
      setDraft("");
      return;
    }

    const nextValue = Number(raw);

    if (!Number.isFinite(nextValue)) return;

    const clamped = Math.min(max, Math.max(0, Math.floor(nextValue)));
    setDraft(String(clamped));
    onChange(clamped);
  };

  return (
    <div className={styles.stepper} aria-label={label}>
      <button
        type="button"
        className={styles.stepButton}
        title="−"
        aria-label="−"
        onClick={() => commit(value - 1)}
        disabled={value <= 0}
      >
        <MinusIcon />
      </button>
      <input
        className={styles.countInput}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={draft ?? String(value)}
        aria-label={label}
        onChange={handleInput}
        onBlur={() => setDraft(null)}
      />
      <button
        type="button"
        className={styles.stepButton}
        title="+"
        aria-label="+"
        onClick={() => commit(value + 1)}
        disabled={value >= max}
      >
        <PlusIcon />
      </button>
    </div>
  );
};

export default Stepper;
