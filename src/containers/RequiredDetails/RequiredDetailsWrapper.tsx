import { FC, PropsWithChildren, useRef, useState } from "react";
import classNames from "classnames";
import throttle from "lodash.throttle";
import styles from "./styles/RequiredDetails.module.scss";

const RequiredDetailsWrapper: FC<PropsWithChildren> = ({ children }) => {
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
      className={classNames(styles.required_wrapper, {
        [styles.scrolled]: isScrolled,
      })}
    >
      <div ref={scrollRef} onScroll={handleScroll} className={styles.required}>
        {children}
      </div>
    </div>
  );
};

export default RequiredDetailsWrapper;
