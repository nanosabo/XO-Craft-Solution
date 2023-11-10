import { motion } from "framer-motion";
import { FC, PropsWithChildren } from "react";
import { pageAnimation } from "./animation";

const AnimatePageLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <motion.div
      variants={pageAnimation}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: 1072 }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatePageLayout;
