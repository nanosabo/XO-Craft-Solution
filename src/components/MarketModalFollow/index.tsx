import { FC } from "react";
import FollowHeader from "./FollowHeader";
import FollowRuleCard from "./FollowRuleCard";
import FollowTabs from "./FollowTabs";
import { groupMetrics } from "./constants";
import useFollowRules from "./useFollowRules";
import styles from "./styles/MarketModalFollow.module.scss";

const MarketModalFollow: FC = () => {
  const {
    isFollowed,
    values,
    rules,
    activeGroup,
    setActiveGroup,
    drafts,
    formatValue,
    conditionOptions,
    metricLabel,
    onToggleFollow,
    onToggleRule,
    onConditionChange,
    onValueChange,
    onValueBlur,
  } = useFollowRules();

  return (
    <div className={styles.root}>
      <div className={styles.panel}>
        <FollowHeader isFollowed={isFollowed} onToggle={onToggleFollow} />
        <FollowTabs activeGroup={activeGroup} onChange={setActiveGroup} />

        <div className={styles.rules}>
          {groupMetrics[activeGroup].map((metric) => (
            <FollowRuleCard
              key={metric}
              metric={metric}
              rule={rules[metric]}
              currentValue={values[metric]}
              isFollowed={isFollowed}
              draft={drafts[metric]}
              conditionOptions={conditionOptions}
              metricLabel={metricLabel}
              formatValue={formatValue}
              onToggle={onToggleRule}
              onConditionChange={onConditionChange}
              onValueChange={onValueChange}
              onValueBlur={onValueBlur}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketModalFollow;
