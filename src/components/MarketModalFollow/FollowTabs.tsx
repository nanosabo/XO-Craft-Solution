import classNames from "classnames";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { followGroups, FollowGroup } from "./constants";
import styles from "./styles/MarketModalFollow.module.scss";

interface Props {
  activeGroup: FollowGroup;
  onChange: (group: FollowGroup) => void;
}

const FollowTabs: FC<Props> = ({ activeGroup, onChange }) => {
  const { t } = useTranslation("marketPage");

  return (
    <div
      className={styles.tabs}
      role="tablist"
      aria-label={t("modal.follow.title")}
    >
      {followGroups.map((group) => (
        <button
          key={group}
          type="button"
          role="tab"
          aria-selected={activeGroup === group}
          className={classNames(styles.tab, {
            [styles.tabActive]: activeGroup === group,
          })}
          onClick={() => onChange(group)}
        >
          {t(`modal.follow.groups.${group}`)}
        </button>
      ))}
    </div>
  );
};

export default FollowTabs;
