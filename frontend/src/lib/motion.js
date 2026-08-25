export const LUXURY_EASE = [0.22, 1, 0.36, 1];

export const editorialGroup = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.04,
    },
  },
};

export const editorialItem = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: LUXURY_EASE },
  },
};

export const editorialItemSoft = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.82, ease: LUXURY_EASE },
  },
};

export const imageReveal = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.95, ease: LUXURY_EASE },
  },
};
