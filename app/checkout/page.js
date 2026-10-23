import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import CheckoutForm from "./CheckoutForm";
export const metadata = { title: "Checkout | Zoravelle", robots: { index: false, follow: false } };
export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fcheckout");
  return <main className="container-z min-h-[55vh] py-8 sm:py-12"><p className="text-xs uppercase tracking-[0.18em] text-black/50">Secure checkout</p><h1 className="mt-2 font-space text-4xl sm:text-5xl">Delivery</h1><Suspense fallback={<p className="mt-8">Loading your bag…</p>}><CheckoutForm user={user} /></Suspense></main>;
}
