import { FC } from "react";
import styles from "./styles/DetailSearchPicture.module.scss";

type Props = {
  src: string;
  alt: string;
};

const DetailSearchPicture: FC<Props> = ({ src, alt }) => {
  return (
    <div className={styles.picture}>
      <img src={src} alt={alt} draggable="false" />
    </div>
  );
};

export default DetailSearchPicture;
