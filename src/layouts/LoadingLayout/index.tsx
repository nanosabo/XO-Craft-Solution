import classNames from "classnames";
import { FC, PropsWithChildren } from "react";
import styles from "./styles/LoadingSection.module.scss";
import { motion } from "framer-motion";
import { loadingPageLayoutAnimation } from "./animation";

interface Props {
  /** Allows the content to scroll when it is taller than the window. */
  scrollable?: boolean;
}

const LoadingLayout: FC<PropsWithChildren<Props>> = ({
  children,
  scrollable,
}) => {
  return (
    <motion.div
      className={classNames(styles.loading_layout, {
        [styles.scrollable]: scrollable,
      })}
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
