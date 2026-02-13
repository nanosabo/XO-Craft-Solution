import { FC, PropsWithChildren } from "react";
import styles from "./styles/Badge.module.scss";
import classNames from "classnames";

type Props = {
  text: string;
  title: string;
  center?: boolean;
  warning?: boolean;
  grey?: boolean;
};

const Badge: FC<PropsWithChildren<Props>> = ({
  title,
  text,
  center,
  warning,
  grey,
  children,
}) => {
  return (
    <div
      className={classNames(styles.badge, {
        [styles.warn]: warning,
        [styles.grey]: grey,
        [styles.center]: center,
      })}
      title={title}
    >
      <span>{text}</span>
      <p>{children}</p>
    </div>
  );
};

export default Badge;
