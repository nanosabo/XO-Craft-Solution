import classNames from "classnames";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { BellIcon } from "@src/ui/icons";
import styles from "./styles/MarketModalFollow.module.scss";

interface Props {
  isFollowed: boolean;
  onToggle: () => void;
}

const FollowHeader: FC<Props> = ({ isFollowed, onToggle }) => {
  const { t } = useTranslation("marketPage");

  return (
    <div className={styles.header}>
      <div className={styles.title}>
        <span className={styles.icon}>
          <BellIcon />
        </span>
        <div>
          <h4>{t("modal.follow.title")}</h4>
          <p>{t("modal.follow.subtitle")}</p>
        </div>
      </div>

      <button
        type="button"
        className={classNames(styles.toggle, {
          [styles.toggleActive]: isFollowed,
        })}
        onClick={onToggle}
      >
        {isFollowed ? t("modal.follow.remove") : t("modal.follow.add")}
      </button>
    </div>
  );
};

export default FollowHeader;
