"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { EASING, defaultViewport } from "@/lib/animations";

const categories = [
  { name: "Eyeglasses", image: "/images/p1.jpg" },
  { name: "Sunglasses", image: "/images/p2.jpg" },
  { name: "Blue-light", image: "/images/p3.jpg" },
];

export default function CategorySection() {
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

  const cardVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: EASING.luxury,
      },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: 16 },
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
    <section className="container-z bg-offwhite py-14 md:py-20" aria-labelledby="category-title">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={shouldReduce ? undefined : headerVariants}
        >
          <h2 id="category-title" className="mb-3 font-space text-3xl sm:text-4xl">
            Shop eyeglasses, sunglasses, and blue-light frames
          </h2>
          <p className="mb-7 max-w-2xl text-sm leading-relaxed text-black/60">
            Start with the kind of eyewear you need, then compare shapes, colors,
            and lens options across the collection.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={shouldReduce ? undefined : containerVariants}
          className="grid gap-4 sm:grid-cols-3 sm:gap-5"
        >
          {categories.map((category) => (
            <motion.div
              key={category.name}
              variants={shouldReduce ? undefined : cardVariants}
              whileHover={shouldReduce ? undefined : { y: -6, transition: { duration: 0.25, ease: EASING.luxury } }}
            >
              <Link
                href={"/shop?category=" + encodeURIComponent(category.name)}
                className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-[#f1ece4] shadow-sm transition-shadow hover:shadow-md"
              >
                <Image
                  src={category.image}
                  alt={category.name + " from the Zoravelle eyewear collection"}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition duration-700 ease-out group-hover:scale-108"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent p-5 pt-14 font-space text-xl text-white sm:text-2xl">
                  {category.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={shouldReduce ? undefined : headerVariants}
        >
          <Link href="/shop?category=Kids" className="mt-5 inline-flex text-sm underline underline-offset-4 hover:opacity-80">
            Browse kids&apos; eyewear
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
