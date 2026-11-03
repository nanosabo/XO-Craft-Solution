import classNames from "classnames";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import SettingsSection from "../components/SettingsSection";
import Switch from "../components/Switch";
import styles from "../styles/Settings.module.scss";

interface Props {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const InventoryStatusSection: FC<Props> = ({ enabled, onToggle }) => {
  const { t } = useTranslation("settingsPage");

  return (
    <SettingsSection
      title={t("inventory.enable")}
      subtitle={t("inventory.enableHint")}
      action={
        <div className={styles.sectionAction}>
          <span
            className={classNames(styles.badge, {
              [styles.badgeActive]: enabled,
            })}
          >
            {enabled
              ? t("inventory.enabledBadge")
              : t("inventory.disabledBadge")}
          </span>
          <Switch
            checked={enabled}
            onChange={onToggle}
            label={t("inventory.enable")}
          />
        </div>
      }
    >
      <p
        className={classNames(styles.notice, {
          [styles.noticeActive]: enabled,
          [styles.noticeMuted]: !enabled,
        })}
      >
        {enabled
          ? t("inventory.enabledNotice")
          : t("inventory.disabledNotice")}
      </p>
    </SettingsSection>
  );
};

export default InventoryStatusSection;
