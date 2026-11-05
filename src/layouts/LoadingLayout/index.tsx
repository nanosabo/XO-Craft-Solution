import classNames from "classnames";
import { FC, PropsWithChildren } from "react";
import styles from "./styles/LoadingSection.module.scss";
import { motion } from "framer-motion";
import { loadingPageLayoutAnimation } from "./animation";

interface Props {
  /** Allows the content to scroll when it is taller than the window. */
  scrollable?: boolean;
  /**
   * Renders a plain container without the loading-page enter/exit animation.
   * Used by the error screen so it disappears instantly when the user leaves.
   */
  noAnimation?: boolean;
}

const LoadingLayout: FC<PropsWithChildren<Props>> = ({
  children,
  scrollable,
  noAnimation,
}) => {
  const className = classNames(styles.loading_layout, {
    [styles.scrollable]: scrollable,
  });

  if (noAnimation) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={loadingPageLayoutAnimation}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
};

export default LoadingLayout;
