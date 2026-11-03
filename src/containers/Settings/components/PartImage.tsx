import classNames from "classnames";
import { FC } from "react";
import { getPartImageUrl } from "../types";
import styles from "../styles/Settings.module.scss";

interface Props {
  id: string;
  className?: string;
}

const PartImage: FC<Props> = ({ id, className }) => (
  <img
    className={classNames(styles.partImage, className)}
    src={getPartImageUrl(id)}
    alt=""
    loading="lazy"
    draggable={false}
    onError={(event) => {
      event.currentTarget.style.visibility = "hidden";
    }}
  />
);

export default PartImage;
