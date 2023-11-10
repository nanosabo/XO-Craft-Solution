import { Variants } from "framer-motion";

export const pageAnimation: Variants = {
  initial: { opacity: 0, y: "-150%" },
  animate: { opacity: 1, y: 0, position: "static" },
  exit: { opacity: 0, y: "150%", position: "absolute" },
};
