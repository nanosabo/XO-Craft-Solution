import useScrollFade from "@src/hooks/useScrollFade";
import classNames from "classnames";
import { FC, PropsWithChildren, useRef } from "react";
import styles from "./styles/SolvedParts.module.scss";

const SolvedPartsWrapper: FC<PropsWithChildren> = ({ children }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade(listRef);

  return (
    <div
      ref={listRef}
      className={classNames(styles.list, {
        [styles.fadeTop]: fade.top,
        [styles.fadeBottom]: fade.bottom,
      })}
    >
      {children}
    </div>
  );
};

export default SolvedPartsWrapper;
