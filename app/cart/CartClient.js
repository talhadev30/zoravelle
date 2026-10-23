"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { CART_KEY, formatCurrency, itemUnitPrice } from "@/lib/storefront";
import { useHasHydrated, useStoredJson, writeStoredJson } from "@/lib/useStoredJson";
import { useProductsState } from "@/lib/useProducts";
import { CartSkeleton } from "@/components/ui/Skeleton";
import useStoreSettings from "@/lib/useStoreSettings";
export default function CartPage() {
  const storedItems = useStoredJson(CART_KEY, [], "zv-cart-updated");
  const settings = useStoreSettings();
  const shippingThreshold = Number(settings.freeShippingThreshold ?? 150);
  const { products, loading: productsLoading } = useProductsState();
  const items = useMemo(() => Array.isArray(storedItems) ? storedItems : [], [storedItems]);
  const ready = useHasHydrated();
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + itemUnitPrice(item, products) * item.qty, 0), [items, products]);
  const shipping = subtotal === 0 || subtotal >= shippingThreshold ? 0 : 10;
  const total = subtotal + shipping;
  function updateQty(key, qty) { writeStoredJson(CART_KEY, items.map((item) => item.key === key ? { ...item, qty: Math.max(1, qty) } : item), "zv-cart-updated"); }
  function remove(key) { writeStoredJson(CART_KEY, items.filter((item) => item.key !== key), "zv-cart-updated"); }
  const lensLabel = (id) => ({ frame: "Frame only", plain: "Non-prescription", rx: "Prescription · single vision", prog: "Prescription · progressive" })[id] || "Frame only";
  const coatingLabel = (id) => ({ blue: "Blue-cut", ar: "Anti-glare", photo: "Photochromic" })[id] || id;
  return <main className="container-z min-h-[55vh] py-10 sm:py-14"><p className="text-xs uppercase tracking-[0.18em] text-black/50">Zoravelle</p><h1 className="mt-2 font-space text-4xl sm:text-5xl">Your bag</h1><p className="mt-2 text-sm text-black/55">{items.reduce((sum, item) => sum + item.qty, 0)} items</p>
    {!ready || productsLoading ? <CartSkeleton /> : items.length === 0 ? <div className="mt-10 rounded-2xl bg-white/60 p-10 text-center"><h2 className="font-space text-2xl">Your cart is empty</h2><p className="mt-3 text-sm text-black/55">Find a frame you’ll love wearing.</p><Link href="/shop" className="mt-6 inline-block rounded-full bg-black px-7 py-3.5 text-sm font-medium text-white">Shop frames</Link></div> : <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]"><div className="divide-y divide-black/10">{items.map((item) => { const product = products.find((entry) => entry.id === item.productId); if (!product) return <div key={item.key} className="flex justify-between py-5 text-sm"><span>Product no longer available</span><button type="button" onClick={() => remove(item.key)} className="underline">Remove</button></div>; return <article key={item.key} className="grid grid-cols-[64px_minmax(0,1fr)_auto] gap-3 py-5 min-[400px]:grid-cols-[80px_minmax(0,1fr)_auto] sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:gap-4"><Link href={`/shop/${product.id}`} className="relative aspect-square overflow-hidden rounded-xl bg-[#f1ece4]"><Image src={product.image} alt={product.name} fill sizes="112px" className="object-contain p-3" /></Link><div className="min-w-0"><Link href={`/shop/${product.id}`} className="break-words font-space text-base sm:text-lg">{product.name}</Link><p className="text-sm text-black/55">{item.color} · {lensLabel(item.purpose)}</p>{item.coatings?.length > 0 && <p className="mt-1 text-xs text-black/55">{item.coatings.map(coatingLabel).join(", ")}</p>}{item.prescription && <p className="mt-1 text-xs text-black/55">Right {Number(item.prescription.right).toFixed(2)} · Left {Number(item.prescription.left).toFixed(2)}</p>}<div className="mt-3 inline-flex h-9 items-center rounded-full border border-black/15"><button type="button" aria-label="Decrease quantity" onClick={() => updateQty(item.key, item.qty - 1)} className="grid h-9 w-9 place-items-center"><Minus className="h-3 w-3" /></button><span className="w-6 text-center text-sm">{item.qty}</span><button type="button" aria-label="Increase quantity" onClick={() => updateQty(item.key, item.qty + 1)} className="grid h-9 w-9 place-items-center"><Plus className="h-3 w-3" /></button></div></div><div className="flex flex-col items-end justify-between"><p className="text-sm font-medium">{formatCurrency(itemUnitPrice(item, products) * item.qty)}</p><button type="button" aria-label={`Remove ${product.name}`} onClick={() => remove(item.key)} className="grid h-10 w-10 place-items-center text-xs text-black/55 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div></article>; })}</div>
      <aside className="h-fit rounded-2xl bg-white/70 p-6"><p className="text-sm">{shipping === 0 ? "You’ve unlocked free shipping" : formatCurrency(shippingThreshold - subtotal) + " away from free shipping"}</p><div className="mt-2 h-1.5 rounded-full bg-black/10"><div className="h-full rounded-full bg-black transition-all" style={{ width: `${Math.min(100, subtotal / shippingThreshold * 100)}%` }} /></div><dl className="mt-6 space-y-2 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCurrency(subtotal)}</dd></div><div className="flex justify-between"><dt>Shipping</dt><dd>{shipping ? formatCurrency(shipping) : "Free"}</dd></div><div className="flex justify-between border-t border-black/10 pt-3 text-lg font-medium"><dt>Total</dt><dd>{formatCurrency(total)}</dd></div></dl><Link href="/checkout" className="mt-6 block w-full rounded-full bg-black py-4 text-center font-medium text-white">Continue to checkout</Link><Link href="/shop" className="mt-4 block text-center text-sm underline underline-offset-4">Continue shopping</Link></aside></div>}
  </main>;
}

