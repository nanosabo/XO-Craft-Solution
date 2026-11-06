import classNames from "classnames";
import { useTranslation } from "react-i18next";
import styles from "./styles/BattlesView.module.scss";

export type BattlesViewName = "logs" | "clan";

interface Props {
  view: BattlesViewName;
  onView: (view: BattlesViewName) => void;
}

const BattlesView = ({ view, onView }: Props) => {
  const { t } = useTranslation("logsPage");

  return (
    <div className={styles.switch} role="tablist">
      {(["logs", "clan"] as const).map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={view === key}
          className={classNames(styles.option, {
            [styles.active]: view === key,
          })}
          onClick={() => onView(key)}
        >
          {t(`view.${key}`)}
        </button>
      ))}
    </div>
  );
};

export default BattlesView;
