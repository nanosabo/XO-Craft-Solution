import { Variants } from "framer-motion";

const transition = {
  type: "spring",
  damping: 10,
  duration: 0.2,
};

export const SwitchLangAnimation: Variants = {
  initial: {
    scale: 0,
    position: "absolute",
    opacity: 0,
    transition,
  },

  animate: {
    display: "flex",
    scale: 1,
    opacity: 1,
    transition,
  },
};
