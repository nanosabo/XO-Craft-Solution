import classNames from "classnames";
import throttle from "lodash.throttle";
import { FC, PropsWithChildren, useRef, useState } from "react";
import styles from "./styles/SolvedParts.module.scss";

const SolvedPartsWrapper: FC<PropsWithChildren> = ({ children }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<null | HTMLDivElement>(null);

  const handleScroll = throttle(() => {
    if (scrollRef.current) {
      const haveScroll = scrollRef.current.scrollTop > 0;
      if (haveScroll) setIsScrolled(true);
      else setIsScrolled(false);
    }
  }, 50);

  return (
    <div
      className={classNames(styles.wrapper, {
        [styles.scrolled]: isScrolled,
      })}
    >
      <div ref={scrollRef} onScroll={handleScroll} className={styles.overlay}>
        {children}
      </div>
    </div>
  );
};

export default SolvedPartsWrapper;
