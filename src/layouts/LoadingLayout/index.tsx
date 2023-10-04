import { FC, PropsWithChildren } from "react";
import styles from "./styles/LoadingSection.module.scss";

const LoadingLayout: FC<PropsWithChildren> = ({ children }) => {
  return <div className={styles.loading_layout}>{children}</div>;
};

export default LoadingLayout;
