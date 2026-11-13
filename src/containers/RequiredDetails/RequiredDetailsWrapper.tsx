import { FC, PropsWithChildren, useRef } from "react";
import classNames from "classnames";
import styles from "./styles/RequiredDetails.module.scss";
import useScrollFade from "@src/hooks/useScrollFade";

const RequiredDetailsWrapper: FC<PropsWithChildren> = ({ children }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade(scrollRef);

  return (
    <div className={styles.required_wrapper}>
      <div
        ref={scrollRef}
        className={classNames(styles.required, {
          [styles.fadeTop]: fade.top,
          [styles.fadeBottom]: fade.bottom,
        })}
      >
        {children}
      </div>
    </div>
  );
};

export default RequiredDetailsWrapper;
