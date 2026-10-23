"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { CART_KEY, WISHLIST_KEY } from "@/lib/storefront";
import ThemeToggle from "@/components/ui/ThemeToggle";

const iconClass =
  "relative flex h-10 w-10 items-center justify-center rounded-full transition-[transform,background-color] duration-150 hover:scale-105 hover:bg-black/5 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none";
const badgeClass =
  "absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] text-white transition-[transform,opacity] duration-150 motion-reduce:transition-none";

export default function HeaderActions() {
  const [count, setCount] = useState(0);
  const [wishes, setWishes] = useState(0);

  useEffect(() => {
    const sync = () => {
      try {
        setCount(
          JSON.parse(localStorage.getItem(CART_KEY) || "[]").reduce(
            (sum, item) => sum + item.qty,
            0,
          ),
        );
        setWishes(
          JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]").length,
        );
      } catch {
        setCount(0);
        setWishes(0);
      }
    };
    sync();
    ["storage", "zv-cart-updated", "zv-wishlist-updated"].forEach((event) =>
      window.addEventListener(event, sync),
    );
    return () =>
      ["storage", "zv-cart-updated", "zv-wishlist-updated"].forEach((event) =>
        window.removeEventListener(event, sync),
      );
  }, []);

  return (
    <>
      <ThemeToggle />
      <Link
        href="/shop?wishlist=true"
        aria-label={`Wishlist, ${wishes} saved`}
        className={`${iconClass} hidden sm:flex`}
      >
        <Heart size={20} strokeWidth={1.8} />
        {wishes > 0 ? (
          <span className={`${badgeClass} bg-red-700`}>{wishes}</span>
        ) : null}
      </Link>
      <Link
        href="/cart"
        aria-label={`Shopping bag, ${count} items`}
        className={iconClass}
      >
        <ShoppingBag size={20} strokeWidth={1.8} />
        {count > 0 ? (
          <span className={`${badgeClass} bg-black`}>{count}</span>
        ) : null}
      </Link>
    </>
  );
}