import classNames from "classnames";
import type { TFunction } from "i18next";
import Select from "@src/ui/Select";
import styles from "@src/containers/Logs/styles/Logs.module.scss";

type Option = { value: string; label: string };

type Props = {
  t: TFunction;
  options: Option[];
  timeFrom: number;
  timeTo: number;
  timeFiltered: boolean;
  disabled: boolean;
  zoneLabel: string;
  onFrom: (value: number) => void;
  onTo: (value: number) => void;
  onApply: () => void;
  onReset: () => void;
};

const LogTimeFilter = ({
  t,
  options,
  timeFrom,
  timeTo,
  timeFiltered,
  disabled,
  zoneLabel,
  onFrom,
  onTo,
  onApply,
  onReset,
}: Props) => (
  <div
    className={classNames(styles.logTimeFilter, {
      [styles.logTimeFilterActive]: timeFiltered,
    })}
  >
    <div className={styles.logTimeField}>
      <Select
        options={options}
        defaultValue={String(timeFrom)}
        disabled={disabled}
        menuFit
        onChange={(value) => onFrom(Number(value))}
      />
    </div>
    <span className={styles.logTimeDash} aria-hidden="true" />
    <div className={styles.logTimeField}>
      <Select
        options={options}
        defaultValue={String(timeTo)}
        disabled={disabled}
        menuFit
        onChange={(value) => onTo(Number(value))}
      />
    </div>
    <span className={styles.logTimeZone}>{zoneLabel}</span>
    <button
      type="button"
      className={styles.primaryButton}
      disabled={disabled}
      onClick={onApply}
    >
      {t("logView.timeApply")}
    </button>
    <button
      type="button"
      className={styles.logTimeReset}
      disabled={disabled || !timeFiltered}
      onClick={onReset}
    >
      {t("logView.timeAll")}
    </button>
  </div>
);

export default LogTimeFilter;
