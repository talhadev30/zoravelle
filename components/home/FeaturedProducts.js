"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import ProductCardActions from "@/components/ui/ProductCardActions";
import { formatCurrency, productPrice } from "@/lib/storefront";
import { EASING, defaultViewport } from "@/lib/animations";

export default function FeaturedProducts({ products = [] }) {
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
    hidden: { opacity: 0, y: 22 },
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
    <section className="container-z bg-offwhite min-h-[48rem] sm:min-h-[56rem] lg:min-h-[30rem] py-10 md:py-14" aria-labelledby="featured-frames-title">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={shouldReduce ? undefined : itemVariants}
          className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-black/50">The collection</p>
            <h2 id="featured-frames-title" className="mt-2 font-space text-3xl sm:text-4xl">
              Featured eyewear
            </h2>
          </div>
          <Link href="/shop" className="text-sm underline underline-offset-4 hover:opacity-80">
            View all frames
          </Link>
        </motion.div>
        {products.length ? (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            variants={shouldReduce ? undefined : containerVariants}
            className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4"
          >
            {products.map((product) => (
              <motion.article
                key={product.id}
                variants={shouldReduce ? undefined : itemVariants}
                whileHover={shouldReduce ? undefined : { y: -4, transition: { duration: 0.25, ease: EASING.luxury } }}
                className="group min-w-0"
              >
                <Link href={"/shop/" + encodeURIComponent(product.id)} className="block">
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#f1ece4] transition-shadow duration-300 group-hover:shadow-md">
                    <Image
                      src={product.image}
                      alt={product.name + " " + product.shape + " eyewear"}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="product-card-image object-contain transition duration-500 ease-out group-hover:scale-108"
                    />
                    {product.saleLabel && (
                      <motion.span
                        initial={shouldReduce ? false : { scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute left-3 top-3 rounded-full bg-red-700 px-3 py-1 text-xs text-white shadow-sm"
                      >
                        Sale
                      </motion.span>
                    )}
                  </div>
                  <h3 className="mt-3 font-space text-lg transition-colors group-hover:text-black/80">{product.name}</h3>
                  <p className="text-sm text-black/55">{product.shape} | {product.category}</p>
                  <p className="mt-1 text-sm font-medium">
                    {formatCurrency(productPrice(product))}
                    {product.salePrice && (
                      <span className="ml-2 text-black/40 line-through font-normal">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                  </p>
                </Link>
                <ProductCardActions product={product} />
              </motion.article>
            ))}
          </motion.div>
        ) : (
          <p className="rounded-2xl border border-dashed border-black/20 p-8 text-center text-sm text-black/55">
            New frames will appear here as soon as they are added to the collection.
          </p>
        )}
      </div>
    </section>
  );
}
