"use client";

export default function ErrorPage({ reset }) {
  return (
    <main className="container-z grid min-h-[55vh] place-items-center py-16">
      <section className="max-w-lg text-center">
        <h1 className="font-space text-3xl">Something went wrong</h1>
        <p className="mt-3 text-sm text-black/60">We could not load this page. Please try again.</p>
        <button type="button" onClick={() => reset()} className="mt-6 rounded-full bg-black px-6 py-3 text-sm text-white">
          Try again
        </button>
      </section>
    </main>
  );
}