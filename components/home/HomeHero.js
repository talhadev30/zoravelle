"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASING } from "@/lib/animations";

export default function HomeHero() {
  const shouldReduce = useReducedMotion();

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

  const itemVariants = {
    hidden: { opacity: 0, y: 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: EASING.luxury,
      },
    },
  };

  return (
    <section
      aria-labelledby="home-title"
      className="relative isolate min-h-[38rem] overflow-hidden sm:min-h-[42rem]"
    >
      <motion.div
        initial={shouldReduce ? { scale: 1 } : { scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, ease: EASING.luxury }}
        className="absolute inset-0 -z-10 h-full w-full"
      >
        <Image
          src="/images/hero.jpg"
          alt="A model wearing everyday eyeglasses"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-[70%_center] md:object-right"
        />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#f6f3ed]/80 via-[#f6f3ed]/25 to-transparent" />
      <div className="container-z flex min-h-[38rem] items-end pb-12 sm:min-h-[42rem] md:items-center md:pb-0">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={shouldReduce ? undefined : containerVariants}
          className="max-w-2xl text-black"
        >
          <motion.p
            variants={shouldReduce ? undefined : itemVariants}
            className="text-xs uppercase tracking-[0.2em] sm:text-sm text-black/80"
          >
            Considered eyewear from Zoravelle
          </motion.p>
          <motion.h1
            id="home-title"
            variants={shouldReduce ? undefined : itemVariants}
            className="mt-4 max-w-xl font-space text-5xl font-medium leading-[0.98] sm:text-6xl md:text-7xl"
          >
            Effortless Style for Everyday Vision
          </motion.h1>
          <motion.p
            variants={shouldReduce ? undefined : itemVariants}
            className="mt-5 max-w-xl text-base text-black/75 sm:text-lg"
          >
            Discover thoughtfully designed optical frames and sunglasses crafted
            for comfort, clarity, and confidence.
          </motion.p>
          <motion.div
            variants={shouldReduce ? undefined : itemVariants}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <motion.div
              whileHover={shouldReduce ? undefined : { scale: 1.03 }}
              whileTap={shouldReduce ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href="/shop"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-black px-7 py-3.5 text-sm font-medium text-white transition hover:bg-black/85"
              >
                Shop all frames{" "}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={shouldReduce ? undefined : { scale: 1.03 }}
              whileTap={shouldReduce ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href="/shop?category=Sunglasses"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-black/35 px-7 py-3.5 text-sm font-medium transition hover:bg-white/40"
              >
                Shop sunglasses
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
