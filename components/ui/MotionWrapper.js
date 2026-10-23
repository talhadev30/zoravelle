"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  fadeUpVariant,
  fadeInVariant,
  scaleUpVariant,
  staggerContainer,
  defaultViewport,
} from "@/lib/animations";

/**
 * Animated Section or Container
 * Wraps content with scroll-triggered animations.
 * Completely SEO-safe: SSR HTML contains full children; animations run progressively on hydration.
 */
export function MotionSection({
  children,
  className = "",
  variant = "fadeUp",
  delay = 0,
  stagger = false,
  staggerDelay = 0.08,
  delayChildren = 0.05,
  as = "div",
  viewport = defaultViewport,
  ...props
}) {
  const shouldReduce = useReducedMotion();
  const Component = motion[as] || motion.div;

  if (shouldReduce) {
    const Tag = as;
    return <Tag className={className} {...props}>{children}</Tag>;
  }

  let selectedVariant = fadeUpVariant;
  if (variant === "fadeIn") selectedVariant = fadeInVariant;
  if (variant === "scaleUp") selectedVariant = scaleUpVariant;

  const variants = stagger ? staggerContainer(staggerDelay, delayChildren) : selectedVariant;

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={variants}
      custom={delay}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Animated Child Item
 * Designed to be placed inside a staggered MotionSection or as an individual animated block.
 */
export function MotionItem({
  children,
  className = "",
  variant = "fadeUp",
  delay = 0,
  as = "div",
  hoverLift = false,
  ...props
}) {
  const shouldReduce = useReducedMotion();
  const Component = motion[as] || motion.div;

  if (shouldReduce) {
    const Tag = as;
    return <Tag className={className} {...props}>{children}</Tag>;
  }

  let selectedVariant = fadeUpVariant;
  if (variant === "fadeIn") selectedVariant = fadeInVariant;
  if (variant === "scaleUp") selectedVariant = scaleUpVariant;

  return (
    <Component
      variants={selectedVariant}
      custom={delay}
      whileHover={hoverLift ? { y: -4, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } } : undefined}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Animated Interactive Card with gentle hover and tap response.
 */
export function MotionCard({
  children,
  className = "",
  as = "div",
  hoverY = -4,
  tapScale = 0.985,
  ...props
}) {
  const shouldReduce = useReducedMotion();
  const Component = motion[as] || motion.div;

  if (shouldReduce) {
    const Tag = as;
    return <Tag className={className} {...props}>{children}</Tag>;
  }

  return (
    <Component
      variants={scaleUpVariant}
      whileHover={{ y: hoverY, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
      whileTap={{ scale: tapScale }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}

