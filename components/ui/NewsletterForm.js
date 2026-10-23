"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      setMessage(response.ok ? result.message : result.error);
      if (response.ok) setEmail("");
    } catch {
      setMessage("Newsletter is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="newsletter-title" className="text-sm">
      <h2 id="newsletter-title" className="mb-3 font-medium">Newsletter</h2>
      <p className="opacity-70">Hear about new frames and store updates.</p>
      <form
        onSubmit={submit}
        aria-busy={busy}
        className="mt-4 flex overflow-hidden rounded-full border border-white/30"
      >
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email"
          className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm placeholder:text-white/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 bg-white px-4 text-sm font-medium text-black disabled:opacity-60"
        >
          {busy ? "Joining..." : "Join"}
        </button>
      </form>
      {message && <p role="status" className="mt-2 text-xs opacity-80">{message}</p>}
    </section>
  );
}
