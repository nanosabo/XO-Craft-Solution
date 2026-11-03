import classNames from "classnames";
import { FC, PropsWithChildren, ReactNode } from "react";
import styles from "../styles/Settings.module.scss";

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

const SettingsSection: FC<PropsWithChildren<Props>> = ({
  title,
  subtitle,
  action,
  className,
  children,
}) => {
  return (
    <section className={classNames(styles.card, className)}>
      <header className={styles.cardHeader}>
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && <div className={styles.cardAction}>{action}</div>}
      </header>
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
};

export default SettingsSection;
