"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import ProductCardActions from "@/components/ui/ProductCardActions";
import { writeStoredJson } from "@/lib/useStoredJson";
import { CATEGORIES, formatCurrency, productPrice, WISHLIST_KEY } from "@/lib/storefront";
import { EASING } from "@/lib/animations";

const shapes = ["Round", "Square", "Aviator", "Cat-eye"];
const materials = ["Acetate", "Metal"];
const genders = ["Women", "Men", "All"];

export default function ShopClient({
  category = "",
  onlyWishlist = false,
  products = [],
  shopMaxPrice = 200,
}) {
  const [wishlist, setWishlist] = useState([]);
  const [wishlistReady, setWishlistReady] = useState(false);
  const [shape, setShape] = useState([]);
  const [material, setMaterial] = useState([]);
  const [gender, setGender] = useState([]);
  const [maxPrice, setMaxPrice] = useState(null);
  const [sort, setSort] = useState("featured");
  const shouldReduce = useReducedMotion();
  const configuredMaxPrice = Math.max(40, Number(shopMaxPrice) || 200);

  useEffect(() => {
    const readWishlist = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
        setWishlist(Array.isArray(saved) ? saved : []);
      } catch {
        setWishlist([]);
      } finally {
        setWishlistReady(true);
      }
    };
    readWishlist();
    window.addEventListener("storage", readWishlist);
    window.addEventListener("zv-wishlist-updated", readWishlist);
    return () => {
      window.removeEventListener("storage", readWishlist);
      window.removeEventListener("zv-wishlist-updated", readWishlist);
    };
  }, []);

  const effectiveMaxPrice = Math.min(maxPrice ?? configuredMaxPrice, configuredMaxPrice);
  const list = useMemo(() => {
    let result = products.filter((product) => {
      const matchesGender =
        !gender.length ||
        gender.includes(product.gender) ||
        (product.gender === "All" &&
          gender.some((value) => ["Women", "Men"].includes(value)));
      return (
        (!category || product.category === category) &&
        (!onlyWishlist || wishlist.includes(product.id)) &&
        (!shape.length || shape.includes(product.shape)) &&
        (!material.length || material.includes(product.material)) &&
        matchesGender &&
        productPrice(product) <= effectiveMaxPrice
      );
    });

    if (sort === "low") result = [...result].sort((a, b) => productPrice(a) - productPrice(b));
    if (sort === "high") result = [...result].sort((a, b) => productPrice(b) - productPrice(a));
    if (sort === "rating") result = [...result].sort((a, b) => b.rating - a.rating);
    return result;
  }, [products, category, onlyWishlist, wishlist, shape, material, gender, effectiveMaxPrice, sort]);

  function toggleWishlist(id) {
    const next = wishlist.includes(id)
      ? wishlist.filter((value) => value !== id)
      : [...wishlist, id];
    setWishlist(next);
    writeStoredJson(WISHLIST_KEY, next, "zv-wishlist-updated");
  }

  function toggle(values, setter, value) {
    setter(values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value]);
  }

  const chip = (active) =>
    "rounded-full border px-3 py-1.5 transition " +
    (active ? "bg-black text-white" : "hover:bg-black/5");

  return (
    <main className="container-z min-h-[120svh] py-10 sm:py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-black/50">
        <Link href="/">Home</Link> / Shop{category ? " / " + category : ""}
      </nav>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-black/50">The collection</p>
          <h1 className="mt-2 font-space text-4xl sm:text-5xl">
            {onlyWishlist ? "Your wishlist" : category || "Eyeglasses and sunglasses"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-black/60">
            {onlyWishlist
              ? "Your saved Zoravelle frames."
              : "Browse eyewear by shape, material, audience, or price. Product pages include color, size, and lens details."}
          </p>
        </div>
        <Link
          href={onlyWishlist ? "/shop" : "/shop?wishlist=true"}
          className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-sm"
        >
          <Heart aria-hidden="true" className="h-4 w-4" />
          {onlyWishlist ? "Shop all" : "Wishlist (" + wishlist.length + ")"}
        </Link>
      </div>

      <div className="mt-9 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside aria-label="Shop filters" className="space-y-6 text-sm">
          <div>
            <p className="mb-3 font-medium">Category</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/shop" className={chip(!category)}>All</Link>
              {CATEGORIES.map((name) => (
                <Link
                  key={name}
                  href={"/shop?category=" + encodeURIComponent(name)}
                  className={chip(category === name)}
                >
                  {name}
                </Link>
              ))}
            </div>
          </div>

          {[
            ["Shape", shapes, shape, setShape],
            ["Material", materials, material, setMaterial],
            ["Gender", genders, gender, setGender],
          ].map(([title, values, selected, setter]) => (
            <fieldset key={title}>
              <legend className="mb-2 font-medium">{title}</legend>
              <div className="grid grid-cols-2 gap-2">
                {values.map((value) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(value)}
                      onChange={() => toggle(selected, setter, value)}
                      className="accent-black"
                    />
                    {value}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <div>
            <label htmlFor="price-filter" className="mb-2 flex justify-between font-medium">
              <span>Max price</span>
              <span>{formatCurrency(effectiveMaxPrice)}</span>
            </label>
            <input
              id="price-filter"
              type="range"
              min="40"
              max={configuredMaxPrice}
              step="1"
              value={effectiveMaxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
              className="w-full accent-black"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setShape([]);
              setMaterial([]);
              setGender([]);
              setMaxPrice(null);
            }}
            className="text-xs underline underline-offset-4"
          >
            Clear filters
          </button>
        </aside>

        <section aria-labelledby="shop-results-title">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 id="shop-results-title" className="text-sm text-black/55">
              <SlidersHorizontal aria-hidden="true" className="mr-2 inline h-4 w-4" />
              {onlyWishlist && !wishlistReady ? "Loading saved frames" : list.length + " frames"}
            </h2>
            <label className="text-sm">
              <span className="sr-only">Sort products</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="rounded-full border border-black/15 bg-transparent px-4 py-2"
              >
                <option value="featured">Featured</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </label>
          </div>

          {onlyWishlist && !wishlistReady ? (
            <p className="rounded-2xl border border-black/10 p-8 text-sm text-black/55" role="status">
              Loading your saved frames...
            </p>
          ) : list.length ? (
            <motion.div
              layout={!shouldReduce}
              className="grid grid-cols-2 gap-x-4 gap-y-9 xl:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {list.map((product) => {
                  const wished = wishlist.includes(product.id);
                  const displayPrice = productPrice(product);
                  return (
                    <motion.article
                      layout={!shouldReduce}
                      initial={shouldReduce ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={shouldReduce ? undefined : { opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.35, ease: EASING.luxury }}
                      key={product.id}
                      className="group relative min-w-0"
                    >
                      <Link href={"/shop/" + encodeURIComponent(product.id)} className="block">
                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#f1ece4] transition-shadow duration-300 group-hover:shadow-md">
                          <Image
                            src={product.image}
                            alt={product.name + " " + product.shape + " frames"}
                            fill
                            sizes="(min-width: 1280px) 27vw, (min-width: 640px) 50vw, 50vw"
                            className="product-card-image object-contain transition duration-500 ease-out group-hover:scale-108"
                          />
                          {product.saleLabel && (
                            <span className="absolute left-3 top-3 rounded-full bg-red-700 px-3 py-1 text-xs text-white shadow-sm">
                              Sale
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex justify-between gap-2">
                          <div>
                            <h3 className="font-space text-lg transition-colors group-hover:text-black/80">{product.name}</h3>
                            <p className="text-xs text-black/55 sm:text-sm">
                              {product.shape} | {product.category}
                            </p>
                          </div>
                          <div className="flex gap-2 text-sm font-medium">
                            <span>{formatCurrency(displayPrice)}</span>
                            {product.salePrice && (
                              <span className="text-black/40 line-through font-normal">
                                {formatCurrency(product.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                      <motion.button
                        type="button"
                        whileHover={shouldReduce ? undefined : { scale: 1.12 }}
                        whileTap={shouldReduce ? undefined : { scale: 0.88 }}
                        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                        aria-pressed={wished}
                        onClick={() => toggleWishlist(product.id)}
                        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/80 shadow-sm transition hover:bg-white"
                      >
                        <Heart aria-hidden="true" className={"h-4 w-4 " + (wished ? "fill-red-700 text-red-700" : "")} />
                      </motion.button>
                      <div className="mt-2 flex gap-1.5">
                        {product.colors.map((color) => (
                          <span
                            key={color.name}
                            title={color.name}
                            className="h-3.5 w-3.5 rounded-full border border-black/15"
                            style={{ backgroundColor: color.swatch }}
                          />
                        ))}
                      </div>
                      <ProductCardActions product={product} />
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-dashed border-black/20 p-10 text-center sm:p-14">
              <p className="font-space text-2xl">
                {products.length ? "No frames match" : "No products are available yet"}
              </p>
              <p className="mt-2 text-sm text-black/55">
                {products.length
                  ? "Try clearing a filter or raising the price limit."
                  : "Please check back soon."}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
