"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const field = "mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3";
export default function ProfileForm({ user, completing = false }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");

  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, completeProfile: completing }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update your profile.");
      if (completing) {
        const requestedNext = new URLSearchParams(window.location.search).get("next");
        const next = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\") ? requestedNext : "/account";
        router.push(next);
      } else {
        setMessage("Profile updated."); router.refresh();
      }
    } catch (cause) { setError(cause.message || "Could not update your profile."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="mt-7 grid max-w-2xl gap-4 rounded-2xl border border-black/10 bg-white/60 p-5 sm:grid-cols-2 sm:p-7">
    {completing && <p className="rounded-xl bg-black/[.04] p-4 text-sm text-black/65 sm:col-span-2">Google sign-in does not provide your phone or delivery address. Please add your phone, street address, and city to continue.</p>}
    <label className="text-sm sm:col-span-2">Full name<input name="name" required minLength="2" maxLength="80" autoComplete="name" defaultValue={user.name} className={field} /></label>
    <label className="text-sm sm:col-span-2">Email<input name="email" type="email" required maxLength="254" autoComplete="email" defaultValue={user.email} className={field} /></label>
    <label className="text-sm">Phone<input name="phone" maxLength="40" autoComplete="tel" required={completing} defaultValue={user.phone || ""} className={field} /></label>
    <label className="text-sm">City<input name="city" maxLength="80" autoComplete="address-level2" required={completing} defaultValue={user.city || ""} className={field} /></label>
    <label className="text-sm sm:col-span-2">Street address<input name="address" maxLength="180" autoComplete="street-address" required={completing} defaultValue={user.address || ""} className={field} /></label>
    <label className="text-sm">Postal code<input name="postalCode" maxLength="20" autoComplete="postal-code" defaultValue={user.postalCode || ""} className={field} /></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 sm:col-span-2">{message}</p>}
    <button disabled={busy} className="h-12 rounded-full bg-black px-6 font-medium text-white disabled:opacity-50 sm:col-span-2 sm:w-fit">{busy ? "Saving…" : "Save profile"}</button>
  </form>;
}
