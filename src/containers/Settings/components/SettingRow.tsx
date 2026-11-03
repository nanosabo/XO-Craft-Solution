import classNames from "classnames";
import { FC, ReactNode } from "react";
import styles from "../styles/Settings.module.scss";

interface Props {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

const SettingRow: FC<Props> = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <div className={classNames(styles.row, className)}>
      <div className={styles.rowText}>
        <p>{title}</p>
        {description && <span>{description}</span>}
      </div>
      {children && <div className={styles.rowControl}>{children}</div>}
    </div>
  );
};

export default SettingRow;
