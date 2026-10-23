"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, RotateCcw, ShoppingBag, Truck } from "lucide-react";
import {
  CART_KEY,
  COATING_OPTIONS,
  formatCurrency,
  itemUnitPrice,
  LENS_OPTIONS,
  WISHLIST_KEY,
} from "@/lib/storefront";
import useStoreSettings from "@/lib/useStoreSettings";
import { useStoredJson, writeStoredJson } from "@/lib/useStoredJson";

const VirtualTryOnModal = dynamic(
  () => import("@/components/ui/VirtualTryOnModal"),
  { ssr: false },
);

function validSphere(value) {
  if (value === "") return false;
  const number = Number(value);
  return (
    Number.isFinite(number) &&
    number >= -20 &&
    number <= 20 &&
    Math.abs(number * 4 - Math.round(number * 4)) < 0.0001
  );
}

export default function ProductPurchasePanel({ product, openTryOn = false }) {
  const router = useRouter();
  const settings = useStoreSettings();
  const storedWishlist = useStoredJson(WISHLIST_KEY, [], "zv-wishlist-updated");
  const storedCart = useStoredJson(CART_KEY, [], "zv-cart-updated");
  const wishlist = Array.isArray(storedWishlist) ? storedWishlist : [];
  const cart = Array.isArray(storedCart) ? storedCart : [];
  const [color, setColor] = useState(product.colors[0]?.name || "");
  const [purpose, setPurpose] = useState("frame");
  const [coatings, setCoatings] = useState([]);
  const [prescription, setPrescription] = useState({ right: "", left: "" });
  const [prescriptionError, setPrescriptionError] = useState("");
  const [tryOnOpen, setTryOnOpen] = useState(openTryOn);

  const selectedColor = product.colors.some((entry) => entry.name === color)
    ? color
    : product.colors[0]?.name || "";
  const cartCount = cart.reduce((sum, entry) => sum + (entry.qty || 0), 0);
  const wished = wishlist.includes(product.id);
  const prescriptionRequired =
    product.category === "Eyeglasses" && ["rx", "prog"].includes(purpose);
  const total = itemUnitPrice(
    { productId: product.id, color: selectedColor, purpose, coatings },
    [product],
  );
  const soldOut = product.stock === 0;

  function addToCart() {
    if (soldOut) return;
    if (
      prescriptionRequired &&
      (!validSphere(prescription.right) || !validSphere(prescription.left))
    ) {
      setPrescriptionError(
        "Enter a valid number for each eye, from -20.00 to +20.00 in 0.25 steps.",
      );
      return;
    }

    const selectedPrescription = prescriptionRequired
      ? { right: Number(prescription.right), left: Number(prescription.left) }
      : undefined;
    const item = {
      productId: product.id,
      color: selectedColor,
      purpose,
      coatings,
      prescription: selectedPrescription,
    };
    const key = [
      product.id,
      selectedColor,
      purpose,
      [...coatings].sort().join(","),
      selectedPrescription?.right ?? "",
      selectedPrescription?.left ?? "",
    ].join("|");
    const existing = cart.find((entry) => entry.key === key);
    const next = existing
      ? cart.map((entry) =>
          entry.key === key ? { ...entry, qty: (entry.qty || 0) + 1 } : entry,
        )
      : [...cart, { ...item, key, qty: 1 }];

    writeStoredJson(CART_KEY, next, "zv-cart-updated");
    router.push("/cart");
  }

  function toggleWishlist() {
    const next = wished
      ? wishlist.filter((id) => id !== product.id)
      : [...wishlist, product.id];
    writeStoredJson(WISHLIST_KEY, next, "zv-wishlist-updated");
  }

  function toggleCoating(id) {
    setCoatings((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  return (
    <div>
      <div className="mt-7">
        <p className="text-sm font-medium">Choose a color: {selectedColor}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {product.colors.map((entry) => (
            <button
              key={entry.name}
              type="button"
              aria-label={"Choose " + entry.name}
              aria-pressed={selectedColor === entry.name}
              onClick={() => setColor(entry.name)}
              className={
                "grid h-10 w-10 place-items-center rounded-full border-2 " +
                (selectedColor === entry.name ? "border-black" : "border-transparent")
              }
            >
              <span
                className="grid h-full w-full place-items-center rounded-full border border-black/15"
                style={{ background: entry.swatch }}
              >
                {selectedColor === entry.name && (
                  <Check
                    aria-hidden="true"
                    className={entry.name === "Crystal" ? "h-4 w-4 text-black" : "h-4 w-4 text-white"}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <label className="mt-7 block text-sm font-medium" htmlFor="lens-type">
        Lens type
        <select
          id="lens-type"
          value={purpose}
          onChange={(event) => {
            setPurpose(event.target.value);
            setPrescriptionError("");
            if (event.target.value === "frame") setCoatings([]);
          }}
          className="mt-2 h-12 w-full rounded-xl border border-black/15 bg-white px-3 text-sm font-normal"
        >
          {LENS_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}{option.price ? " / +" + formatCurrency(option.price) : " / Included"}
            </option>
          ))}
        </select>
      </label>

      {prescriptionRequired && (
        <fieldset className="mt-4 rounded-2xl border border-black/10 bg-white/55 p-4">
          <legend className="px-1 text-sm font-medium">Prescription numbers (SPH)</legend>
          <p className="mt-1 text-xs text-black/55">
            Enter the number shown for each eye on your prescription.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              ["right", "Right eye", "-2.00"],
              ["left", "Left eye", "-1.50"],
            ].map(([eye, label, placeholder]) => (
              <label key={eye} className="text-sm">
                {label}
                <input
                  type="number"
                  min="-20"
                  max="20"
                  step="0.25"
                  required
                  value={prescription[eye]}
                  onChange={(event) => {
                    setPrescription((current) => ({
                      ...current,
                      [eye]: event.target.value,
                    }));
                    setPrescriptionError("");
                  }}
                  placeholder={"e.g. " + placeholder}
                  className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-white px-3"
                />
              </label>
            ))}
          </div>
          {prescriptionError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {prescriptionError}
            </p>
          )}
        </fieldset>
      )}

      {purpose !== "frame" && (
        <details className="mt-4 rounded-xl border border-black/10 bg-white/45 p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Optional lens coatings
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {COATING_OPTIONS.map((entry) => {
              const active = coatings.includes(entry.id);
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCoating(entry.id)}
                  className={
                    "rounded-full border px-3 py-2 text-sm " +
                    (active ? "border-black bg-black text-white" : "border-black/20")
                  }
                >
                  {entry.label} +{formatCurrency(entry.price)}
                </button>
              );
            })}
          </div>
        </details>
      )}

      <p
        className={
          "mt-5 text-sm " +
          (soldOut
            ? "text-red-700"
            : product.stock < 10
              ? "text-amber-700"
              : "text-emerald-700")
        }
      >
        {soldOut ? "Out of stock" : product.stock < 10 ? "Only " + product.stock + " left" : "In stock"}
      </p>

      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
        <button
          type="button"
          disabled={soldOut}
          onClick={addToCart}
          className="rounded-full bg-black px-3 py-4 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
        >
          <ShoppingBag aria-hidden="true" className="mr-2 inline h-4 w-4" />
          {soldOut ? "Sold out" : "Add to bag / " + formatCurrency(total)}
        </button>
        <button
          type="button"
          onClick={() => setTryOnOpen(true)}
          aria-label={"Try on " + product.name}
          className="rounded-full border border-black/20 px-3 py-4 text-sm font-medium transition hover:bg-black/5 sm:px-5"
        >
          Try Now
        </button>
        <button
          type="button"
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          onClick={toggleWishlist}
          className="grid h-12 w-12 place-items-center self-center rounded-full border border-black/20"
        >
          <Heart aria-hidden="true" className={"h-5 w-5 " + (wished ? "fill-red-700 text-red-700" : "")} />
        </button>
      </div>
      <Link href="/cart" className="mt-3 inline-block text-xs text-black/55 underline underline-offset-4">
        View bag ({cartCount})
      </Link>

      <div className="mt-5 space-y-2 text-sm text-black/55">
        <p className="flex items-center gap-2">
          <Truck aria-hidden="true" className="h-4 w-4" />
          {total >= Number(settings.freeShippingThreshold)
            ? "This order qualifies for free shipping."
            : "Free shipping over " + formatCurrency(settings.freeShippingThreshold)}
        </p>
        <p className="flex items-center gap-2">
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          <Link href="/returns" className="underline underline-offset-4">
            See returns and exchange information
          </Link>
        </p>
      </div>

      {tryOnOpen && (
        <VirtualTryOnModal product={product} onClose={() => setTryOnOpen(false)} />
      )}
    </div>
  );
}
