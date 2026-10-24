"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useProductsState } from "@/lib/useProducts";
import {
  useHasHydrated,
  useStoredJson,
  writeStoredJson,
} from "@/lib/useStoredJson";
import { CheckoutSkeleton } from "@/components/ui/Skeleton";
import { CART_KEY, formatCurrency, itemUnitPrice } from "@/lib/storefront";
import useStoreSettings from "@/lib/useStoreSettings";

export default function CheckoutForm({ user }) {
  const { products, loading: productsLoading } = useProductsState();
  const settings = useStoreSettings();
  const shippingThreshold = Number(settings.freeShippingThreshold ?? 150);
  const cart = useStoredJson(CART_KEY, [], "zv-cart-updated");
  const hydrated = useHasHydrated();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState("");
  const orderDialog = useRef(null);
  useEffect(() => {
    const dialog = orderDialog.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, [orderPlaced]);
  const subtotal = cart.reduce(
    (sum, item) => sum + itemUnitPrice(item, products) * item.qty,
    0,
  );
  const shipping = subtotal >= shippingThreshold ? 0 : 10;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, items: cart }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not place your order.");
      writeStoredJson(CART_KEY, [], "zv-cart-updated");
      setOrderPlaced(result.orderNo);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  if (!hydrated || productsLoading) return <CheckoutSkeleton />;
  if (!cart.length && !orderPlaced)
    return (
      <div className="mt-8 rounded-2xl bg-white/70 p-8 text-center">
        <p>Your bag is empty.</p>
        <Link href="/shop" className="mt-3 inline-block underline">
          Shop frames
        </Link>
      </div>
    );
  return (
    <form
      onSubmit={submit}
      className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]"
    >
      <div className="grid content-start gap-4 rounded-2xl border border-black/10 bg-white/60 p-5 sm:p-7">
        <h2 className="font-space text-2xl">Delivery details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            Full name
            <input
              name="customerName"
              required
              defaultValue={user.name}
              autoComplete="name"
              className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3"
            />
          </label>
          <label className="text-sm">
            Email
            <input
              name="email"
              type="email"
              required
              defaultValue={user.email}
              autoComplete="email"
              className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3"
            />
          </label>
          <label className="text-sm">
            Phone
            <input
              name="phone"
              required
              defaultValue={user.phone || ""}
              autoComplete="tel"
              className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Address
            <textarea
              name="address"
              required
              defaultValue={user.address || ""}
              autoComplete="street-address"
              className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2"
            ></textarea>
          </label>
          <label className="text-sm">
            City
            <input
              name="city"
              required
              defaultValue={user.city || ""}
              autoComplete="address-level2"
              className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3"
            />
          </label>
          <label className="text-sm">
            Postal code
            <input
              name="postalCode"
              defaultValue={user.postalCode || ""}
              autoComplete="postal-code"
              className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3"
            />
          </label>
        </div>
        <div className="rounded-xl bg-black/[.03] p-4 text-sm">
          <p className="font-medium">Cash on delivery</p>
          <p className="mt-1 text-black/55">
            Pay your order total when it arrives.
          </p>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="h-12 rounded-full bg-black font-medium text-white disabled:opacity-50"
        >
          {busy ? "Placing order…" : "Place order"}
        </button>
      </div>
      <aside className="h-fit rounded-2xl bg-white/70 p-5 sm:p-6">
        <h2 className="font-space text-2xl">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {cart.map((item) => {
            const product = products.find(
              (entry) => entry.id === item.productId,
            );
            return (
              <li key={item.key} className="flex justify-between gap-3">
                <span className="min-w-0">
                  {item.qty} × {product?.name || "Frame"}
                  {item.prescription && (
                    <small className="block text-xs text-black/55">
                      Right {Number(item.prescription.right).toFixed(2)} · Left{" "}
                      {Number(item.prescription.left).toFixed(2)}
                    </small>
                  )}
                </span>
                <span>
                  {formatCurrency(itemUnitPrice(item, products) * item.qty)}
                </span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-5 space-y-2 border-t border-black/10 pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatCurrency(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{shipping ? formatCurrency(shipping) : "Free"}</dd>
          </div>
          <div className="flex justify-between border-t border-black/10 pt-3 text-lg font-medium">
            <dt>Total</dt>
            <dd>{formatCurrency(subtotal + shipping)}</dd>
          </div>
        </dl>
      </aside>
      {orderPlaced && (
        <dialog
          ref={orderDialog}
          onCancel={(event) => {
            event.preventDefault();
            setOrderPlaced("");
          }}
          className="fixed inset-0 m-0 flex h-dvh w-full max-w-none items-center justify-center border-0 bg-transparent p-4 backdrop:bg-black/65"
        >
          <section
            aria-labelledby="order-confirmation-title"
            className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 text-center shadow-2xl sm:p-8"
          >
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-800">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="size-7"
              >
                <path
                  d="m5 12 4 4L19 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2
              id="order-confirmation-title"
              className="mt-4 font-space text-2xl"
            >
              Order placed successfully!
            </h2>
            <p className="mt-2 text-sm text-black/60">
              Thank you for your order. We’ll prepare it for delivery.
            </p>
            <p className="mt-5 rounded-xl bg-black/[.04] px-4 py-3 text-sm">
              <span className="block text-black/55">Order number</span>
              <strong className="mt-1 block break-all">{orderPlaced}</strong>
            </p>
            <div className="mt-6 grid gap-3">
              <Link
                href={`/account?placed=${encodeURIComponent(orderPlaced)}`}
                className="grid h-11 place-items-center rounded-full bg-black font-medium text-white"
              >
                View order
              </Link>
              <Link
                href="/shop"
                className="grid h-11 place-items-center rounded-full border border-black/15 font-medium"
              >
                Continue shopping
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setOrderPlaced("")}
              className="mt-4 text-sm text-black/55 underline underline-offset-4"
            >
              Close
            </button>
          </section>
        </dialog>
      )}
    </form>
  );
}
