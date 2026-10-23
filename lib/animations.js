/**
 * Modern, clean Framer Motion animation configurations for Zoravelle.
 * SEO-optimized: Initial states preserve layout and content integrity.
 * Smooth luxury spring and cubic-bezier easing.
 */

export const EASING = {
  luxury: [0.22, 1, 0.36, 1], // Custom smooth ease-out curve
  spring: { type: "spring", stiffness: 260, damping: 24 },
  gentleSpring: { type: "spring", stiffness: 180, damping: 22, mass: 0.8 },
};

// Fade up entrance with subtle travel (18px) for modern, clean feel
export const fadeUpVariant = {
  hidden: { opacity: 0, y: 18 },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: EASING.luxury,
      delay: custom,
    },
  }),
};

// Fade in without movement
export const fadeInVariant = {
  hidden: { opacity: 0 },
  visible: (custom = 0) => ({
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: EASING.luxury,
      delay: custom,
    },
  }),
};

// Scale & fade in for cards / images
export const scaleUpVariant = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: (custom = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: EASING.luxury,
      delay: custom,
    },
  }),
};

// Container with staggered children
export const staggerContainer = (staggerDelay = 0.08, delayChildren = 0.05) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    },
  },
});

// Viewport configuration for scroll triggers
// once: true ensures once an item is visible, it stays in DOM without layout shifts (crucial for SEO & UX)
export const defaultViewport = {
  once: true,
  amount: 0.15,
  margin: "0px 0px -40px 0px",
};

// Micro-interaction hover variants
export const cardHoverVariant = {
  rest: { y: 0, transition: { duration: 0.3, ease: EASING.luxury } },
  hover: { y: -4, transition: { duration: 0.3, ease: EASING.luxury } },
};

