"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { CART_KEY } from "@/lib/storefront";
import { writeStoredJson } from "@/lib/useStoredJson";

export default function ProductCardActions({ product }) {
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const soldOut = product.stock === 0;

  function addToCart() {
    if (soldOut) return;

    let saved = [];
    try {
      const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      saved = Array.isArray(value) ? value : [];
    } catch {}

    const color = product.colors?.[0]?.name || "";
    const purpose = "frame";
    const coatings = [];
    const key = `${product.id}|${color}|${purpose}|`;
    const existing = saved.find((item) => item.key === key);
    const updated = existing
      ? saved.map((item) =>
          item.key === key ? { ...item, qty: (item.qty || 0) + 1 } : item,
        )
      : [...saved, { productId: product.id, color, purpose, coatings, key, qty: 1 }];

    writeStoredJson(CART_KEY, updated, "zv-cart-updated");
    router.push("/cart");
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <motion.button
        type="button"
        onClick={addToCart}
        disabled={soldOut}
        whileTap={shouldReduce || soldOut ? undefined : { scale: 0.95 }}
        whileHover={shouldReduce || soldOut ? undefined : { scale: 1.02 }}
        className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full bg-black px-2.5 py-2.5 text-xs font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-sm"
      >
        <ShoppingBag aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{soldOut ? "Sold out" : "Add to Cart"}</span>
      </motion.button>
      <motion.div
        whileTap={shouldReduce ? undefined : { scale: 0.95 }}
        whileHover={shouldReduce ? undefined : { scale: 1.02 }}
      >
        <Link
          href={`/shop/${encodeURIComponent(product.id) + "?tryOn=1"}`}
          aria-label={"Try on " + product.name}
          className="inline-flex w-full min-w-0 items-center justify-center rounded-full border border-black/20 px-2.5 py-2.5 text-xs font-medium transition hover:bg-black/5 sm:px-3 sm:text-sm"
        >
          Try Now
        </Link>
      </motion.div>
    </div>
  );
}
