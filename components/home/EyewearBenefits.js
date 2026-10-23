"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { EASING, defaultViewport } from "@/lib/animations";

const options = [
  ["Anti-glare", "Compare anti-glare lens options on eligible frames."],
  ["Blue-cut", "Explore blue-cut lenses for your everyday routine."],
  ["Photochromic", "See which frames offer photochromic lens options."],
];

export default function EyewearBenefits() {
  const shouldReduce = useReducedMotion();

  const leftVariants = {
    hidden: { opacity: 0, x: -24 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.65,
        ease: EASING.luxury,
      },
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: EASING.luxury,
      },
    },
  };

  return (
    <section className="bg-black text-white" aria-labelledby="try-on-title">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-2 md:items-center md:py-20 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={shouldReduce ? undefined : leftVariants}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-white/60">A more considered choice</p>
          <h2 id="try-on-title" className="mt-3 font-space text-3xl sm:text-4xl md:text-5xl">
            Preview frames with virtual try-on
          </h2>
          <p className="mt-4 max-w-md text-white/70">
            Upload a photo or use your camera to preview selected frames. Then
            compare available colors and lens choices on the product page.
          </p>
          <motion.div
            whileHover={shouldReduce ? undefined : { scale: 1.04 }}
            whileTap={shouldReduce ? undefined : { scale: 0.96 }}
            className="mt-7 inline-block"
          >
            <Link
              href="/shop"
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Choose a frame to try
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={shouldReduce ? undefined : containerVariants}
          className="grid gap-3 sm:grid-cols-3 sm:gap-4"
        >
          {options.map(([title, description]) => (
            <motion.article
              key={title}
              variants={shouldReduce ? undefined : cardVariants}
              whileHover={shouldReduce ? undefined : { y: -4, borderColor: "rgba(255, 255, 255, 0.4)", transition: { duration: 0.25 } }}
              className="rounded-2xl border border-white/20 p-5 transition-colors"
            >
              <h3 className="font-medium text-white">{title}</h3>
              <p className="mt-2 text-sm text-white/60">{description}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
