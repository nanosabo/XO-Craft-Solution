import { FC, PropsWithChildren } from "react";
import styles from "./styles/MarketSectionFilter.module.scss";

type Props = {
  title: string;
  className?: string;
};

const MarketSectionFilter: FC<PropsWithChildren<Props>> = ({
  title,
  children,
  className,
}) => {
  return (
    <div className={[styles.section, className].join(" ")}>
      <b>{title}</b>
      {children}
    </div>
  );
};

export default MarketSectionFilter;
