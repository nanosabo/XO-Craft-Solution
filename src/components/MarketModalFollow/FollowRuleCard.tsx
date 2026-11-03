import classNames from "classnames";
import { ChangeEvent, FC } from "react";
import { useTranslation } from "react-i18next";
import { FollowMetric, FollowRule, isLotsMetric } from "@src/store/follow";
import Select from "@src/ui/Select";
import styles from "./styles/MarketModalFollow.module.scss";

interface Props {
  metric: FollowMetric;
  rule: FollowRule;
  currentValue: number;
  isFollowed: boolean;
  draft?: string;
  conditionOptions: Array<{ value: string; label: string }>;
  metricLabel: (metric: FollowMetric) => string;
  formatValue: (metric: FollowMetric, value: number) => string;
  onToggle: (metric: FollowMetric, enabled: boolean) => void;
  onConditionChange: (metric: FollowMetric, condition: string) => void;
  onValueChange: (
    metric: FollowMetric,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onValueBlur: (metric: FollowMetric) => void;
}

const FollowRuleCard: FC<Props> = ({
  metric,
  rule,
  currentValue,
  isFollowed,
  draft,
  conditionOptions,
  metricLabel,
  formatValue,
  onToggle,
  onConditionChange,
  onValueChange,
  onValueBlur,
}) => {
  const { t } = useTranslation("marketPage");

  const isAny = rule.condition === "any";
  const isLots = isLotsMetric(metric);
  const disabled = !isFollowed;
  const hasCurrentValue = isLots || currentValue > 0;
  const hint = isFollowed
    ? t(`modal.follow.hints.${rule.condition}`, {
        type: metricLabel(metric).toLowerCase(),
        value: formatValue(metric, rule.value),
      })
    : t("modal.follow.disabledHint");

  return (
    <div
      className={classNames(styles.rule, {
        [styles.ruleDisabled]: disabled,
        [styles.ruleOff]: !rule.enabled,
      })}
    >
      <div className={styles.ruleHeader}>
        <div className={styles.ruleTitle}>
          <h5>{metricLabel(metric)}</h5>
          <span>
            {t("modal.follow.currentPrice")}:{" "}
            <b>
              {hasCurrentValue
                ? formatValue(metric, currentValue)
                : t("modal.follow.noPrice")}
            </b>
          </span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={rule.enabled}
          aria-label={t("modal.follow.ruleEnabled")}
          title={t("modal.follow.ruleEnabled")}
          disabled={disabled}
          className={classNames(styles.switch, {
            [styles.switchOn]: rule.enabled,
          })}
          onClick={() => onToggle(metric, !rule.enabled)}
        >
          <span className={styles.switchThumb} />
        </button>
      </div>

      <div className={styles.ruleControls}>
        <div
          className={classNames(styles.select, {
            [styles.selectDisabled]: disabled,
          })}
        >
          <Select
            options={conditionOptions}
            defaultValue={rule.condition}
            menuPlacement="auto"
            onChange={(value) => onConditionChange(metric, value)}
          />
        </div>

        <label
          className={classNames(styles.field, {
            [styles.fieldDisabled]: isAny || disabled,
          })}
        >
          <input
            type="number"
            inputMode={isLots ? "numeric" : "decimal"}
            min={0}
            step={isLots ? 1 : 0.01}
            value={draft ?? String(rule.value)}
            disabled={disabled || isAny}
            onChange={(event) => onValueChange(metric, event)}
            onBlur={() => onValueBlur(metric)}
            aria-label={t("modal.follow.targetPrice")}
          />
          <span>
            {t(
              isLots
                ? "modal.follow.units.lots"
                : "modal.follow.units.currency",
            )}
          </span>
        </label>

        <p className={styles.ruleHint}>{hint}</p>
      </div>
    </div>
  );
};

export default FollowRuleCard;
