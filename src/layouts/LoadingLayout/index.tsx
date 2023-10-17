import { FC, PropsWithChildren } from "react";
import styles from "./styles/LoadingSection.module.scss";
import { motion } from "framer-motion";
import { loadingPageLayoutAnimation } from "./animation";

const LoadingLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <motion.div
      className={styles.loading_layout}
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
