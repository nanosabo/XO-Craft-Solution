import classNames from "classnames";
import type { TFunction } from "i18next";
import type { i18n as I18n } from "i18next";
import type { CrossoutLogSummary, CrossoutLogTime } from "@src/types/crossout";
import { TimeIcon } from "@src/ui/icons";
import { logTypeLabel } from "../helpers/labels";
import styles from "@src/containers/Logs/styles/Logs.module.scss";

type Props = {
  t: TFunction;
  i18n: I18n;
  summary: CrossoutLogSummary;
  logType: string | null;
  timeOptions: CrossoutLogTime[];
  timeOpen: boolean;
  timeFiltered: boolean;
  onSelect: (key: string, count: number) => void;
  onToggleTime: () => void;
};

const LogTypeTabs = ({
  t,
  i18n,
  summary,
  logType,
  timeOptions,
  timeOpen,
  timeFiltered,
  onSelect,
  onToggleTime,
}: Props) => (
  <div className={styles.logTabs}>
    {summary.types.map((type) => (
      <button
        key={type.key}
        type="button"
        className={classNames(styles.logTab, {
          [styles.logTabActive]: logType === type.key,
        })}
        onClick={() => onSelect(type.key, type.count)}
      >
        <span>{logTypeLabel(t, i18n, type.key, type.label)}</span>
        <span className={styles.logTabCount}>{type.count}</span>
      </button>
    ))}
    {timeOptions.length > 1 && (
      <button
        type="button"
        className={classNames(styles.logTimeToggle, {
          [styles.logTimeToggleOn]: timeOpen || timeFiltered,
        })}
        aria-expanded={timeOpen}
        onClick={onToggleTime}
      >
        <TimeIcon />
        {t("logView.timeToggle")}
      </button>
    )}
  </div>
);

export default LogTypeTabs;
