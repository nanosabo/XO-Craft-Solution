import { Variants, Variant } from "framer-motion";

const visible: Variant = {
  opacity: 1,
  y: 0,
  x: 0,
  transition: {
    type: "spring",
    duration: 0.5,
  },
};

const lineVisibleLeft: Variant = {
  opacity: [0, 1, 1, 1, 1, 1, 1, 0],
  y: [-200, 0, 0],
  x: [-200, 0, 0],
  transition: {
    delay: 0.4,
    opacity: {
      repeat: Infinity,
      repeatDelay: 0.4,
      duration: 1,
    },
    x: {
      type: "spring",
      repeat: Infinity,
    },
    y: {
      type: "spring",
      repeat: Infinity,
    },
  },
};

const lineVisibleRight: Variant = {
  ...lineVisibleLeft,
  y: [-200, 0, 0],
  x: [220, 0, 0],
  transition: {
    ...lineVisibleLeft.transition,
    delay: 0.6,
  },
};

export const circleAnimationTop: Variants = {
  hidden: {
    opacity: 0,
    y: -200,
    x: 100,
  },
  visible,
};

export const circleAnimationRight: Variants = {
  hidden: {
    opacity: 0,
    y: 100,
    x: 200,
  },
  visible,
};

export const circleAnimationBottom: Variants = {
  hidden: {
    opacity: 0,
    y: 200,
    x: -100,
  },
  visible,
};

export const circleAnimationLeft: Variants = {
  hidden: {
    opacity: 0,
    y: -100,
    x: -200,
  },
  visible,
};

export const lineAnimationLeft: Variants = {
  visible: lineVisibleLeft,
};

export const lineAnimationRight: Variants = {
  visible: lineVisibleRight,
};
