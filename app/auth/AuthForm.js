"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthForm({ mode }) {
  const register = mode === "register";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const oauthError = searchParams.get("error");
  const requestedNext = searchParams.get("next");
  const safeNext = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/account";
  const oauthMessage = oauthError === "google-config" ? "Google sign-in needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local." : oauthError === "google" ? "Google sign-in could not be completed. Please try again." : "";
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/auth/" + mode, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your account.");
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : result.user?.role === "admin" ? "/admin" : "/account");
      router.refresh();
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  return <main className="container-z flex min-h-[65vh] items-center justify-center py-10 sm:py-16"><section className="w-full max-w-md rounded-3xl border border-black/10 bg-white/70 p-6 sm:p-9"><p className="text-xs uppercase tracking-[0.18em] text-black/50">Zoravelle account</p><h1 className="mt-2 font-space text-4xl">{register ? "Create account" : "Welcome back"}</h1><p className="mt-2 text-sm text-black/55">{register ? "Save your details and track your orders." : "Log in to manage your orders and account."}</p>
    <a href={"/api/auth/google?next=" + encodeURIComponent(safeNext)} className="mt-7 flex h-12 items-center justify-center gap-3 rounded-full border border-black/20 bg-white text-sm font-medium transition hover:bg-black/5"><span aria-hidden="true" className="font-bold text-[#4285F4]">G</span>Continue with Google</a><div className="my-4 flex items-center gap-3 text-xs text-black/40"><span className="h-px flex-1 bg-black/10" />OR USE EMAIL<span className="h-px flex-1 bg-black/10" /></div>
    <form onSubmit={submit} className="grid gap-4">{register && <label className="text-sm">Full name<input name="name" required minLength="2" maxLength="80" autoComplete="name" className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3" /></label>}<label className="text-sm">Email<input name="email" type="email" required autoComplete="email" className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3" /></label><label className="text-sm">Password<input name="password" type="password" required minLength="8" maxLength="128" autoComplete={register ? "new-password" : "current-password"} className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3" /></label>{register && <>
      <label className="text-sm">Phone<input name="phone" type="tel" maxLength="40" autoComplete="tel" className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3" /></label>
      <label className="text-sm">Address<input name="address" maxLength="180" autoComplete="street-address" className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3" /></label>
      <label className="text-sm">City<input name="city" maxLength="80" autoComplete="address-level2" className="mt-1 h-11 w-full rounded-xl border border-black/15 bg-transparent px-3" /></label>
    </>}{(error || oauthMessage) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error || oauthMessage}</p>}<button disabled={busy} className="mt-1 h-12 rounded-full bg-black font-medium text-white disabled:opacity-50">{busy ? "Please wait…" : register ? "Create account" : "Log in"}</button></form>
    <p className="mt-6 text-center text-sm text-black/60">{register ? "Already have an account? " : "New to Zoravelle? "}<Link href={register ? "/login" : "/register"} className="font-medium text-black underline underline-offset-4">{register ? "Log in" : "Create an account"}</Link></p>
  </section></main>;
}
