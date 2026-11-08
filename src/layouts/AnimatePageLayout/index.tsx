import { motion } from "framer-motion";
import { FC, PropsWithChildren } from "react";
import { pageAnimation } from "./animation";

interface Props {
  /** Stretch the page to the free height of `main` (used by full-height pages). */
  fill?: boolean;
}

const AnimatePageLayout: FC<PropsWithChildren<Props>> = ({ children, fill }) => {
  return (
    <motion.div
      variants={pageAnimation}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        width: 1072,
        ...(fill
            ? {
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }
          : null),
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatePageLayout;
