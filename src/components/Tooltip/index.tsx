import { FC } from "react";
import styles from "./styles/Tooltip.module.scss";
import classNames from "classnames";

type Props = {
  title: string;
  subtitle: string;
  image?: string;
  visible: boolean;
};

const Tooltip: FC<Props> = ({ title, subtitle, image, visible }) => {
  return (
    <div className={classNames(styles.tooltip, { [styles.visible]: visible })}>
      <p>{title}</p>
      {subtitle && <span>{subtitle}</span>}
      {image && <img src={image} alt="" draggable="false" />}
    </div>
  );
};

export default Tooltip;
