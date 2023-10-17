import { Variants } from "framer-motion";

export const loadingPageLayoutAnimation: Variants = {
  initial: { opacity: 0, position: "absolute", top: 0, left: 0 },
  animate: { opacity: 1 },
  exit: {
    opacity: 0,
    position: "absolute",
    left: 0,
    top: 400,
    scale: 20,
    transition: { type: "spring", duration: 0.5 },
  },
};
