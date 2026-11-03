import classNames from "classnames";
import { FC, ReactNode } from "react";
import { Part } from "../types";
import PartStats from "./PartStats";
import styles from "../styles/Settings.module.scss";

interface Props {
  part: Part;
  name: string;
  label?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

const PartSummary: FC<Props> = ({ part, name, label, badge, className }) => (
  <div className={classNames(styles.partInfo, className)}>
    {label}
    <div className={styles.partNameRow}>
      <p title={name}>{name}</p>
      {badge}
    </div>
    <PartStats part={part} />
  </div>
);

export default PartSummary;
