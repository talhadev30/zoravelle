"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { EASING, defaultViewport } from "@/lib/animations";

const faceShapes = [
  ["Oval", "Explore round, square, or aviator frames."],
  ["Round", "Try angular shapes such as square frames."],
  ["Square", "Look at round or softer curved frames."],
  ["Heart", "Compare aviator and balanced frame shapes."],
];

export default function FaceShapeSection() {
  const shouldReduce = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
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
    <section className="container-z bg-offwhite py-14 md:py-20" aria-labelledby="face-shape-title">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={shouldReduce ? undefined : itemVariants}
        >
          <h2 id="face-shape-title" className="mb-3 font-space text-3xl sm:text-4xl">
            Find a frame shape to try
          </h2>
          <p className="mb-7 max-w-2xl text-sm leading-relaxed text-black/60">
            Face-shape tips are a starting point. Try the styles you like and use
            each frame&apos;s measurements to compare fit.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={shouldReduce ? undefined : containerVariants}
          className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
        >
          {faceShapes.map(([shape, tip]) => (
            <motion.article
              key={shape}
              variants={shouldReduce ? undefined : itemVariants}
              whileHover={shouldReduce ? undefined : { y: -5, transition: { duration: 0.25, ease: EASING.luxury } }}
              className="rounded-2xl border border-black/10 bg-white/60 p-5 sm:p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div aria-hidden="true" className="mb-6 h-14 w-11 rounded-[45%] border-2 border-black" />
              <h3 className="font-space text-lg sm:text-xl">{shape} face</h3>
              <p className="mt-1 text-sm text-black/55">{tip}</p>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={shouldReduce ? undefined : itemVariants}
        >
          <Link href="/shop" className="mt-6 inline-block text-sm underline underline-offset-4 hover:opacity-80">
            Explore frame shapes
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
