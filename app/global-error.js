"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Application error", { digest: error?.digest });
  }, [error]);

  return (
    <html lang="en-PK">
      <body className="bg-white text-black">
        <main className="grid min-h-screen place-items-center p-6">
          <section className="max-w-lg text-center">
            <h1 className="text-3xl font-semibold">We hit a problem</h1>
            <p className="mt-3 text-sm text-black/60">Please retry the page. If the problem continues, contact the store.</p>
            <button type="button" onClick={() => reset()} className="mt-6 rounded-full bg-black px-6 py-3 text-sm text-white">
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}