import Link from "next/link";
export const metadata = { title: "Page not found | Zoravelle", description: "The page you requested could not be found.", robots: { index: false, follow: true } };
export default function NotFound() {
  return (
    <main className="container-z grid min-h-[55vh] place-items-center py-16 text-center">
      <section>
        <p className="text-xs uppercase tracking-[0.2em] text-black/50">404 | Page not found</p>
        <h1 className="mt-3 font-space text-4xl sm:text-5xl">This page is unavailable</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-black/55">The link may be outdated, or the page may have moved.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="rounded-full bg-black px-6 py-3 text-sm text-white">Shop frames</Link>
          <Link href="/" className="rounded-full border border-black/20 px-6 py-3 text-sm">Go home</Link>
        </div>
      </section>
    </main>
  );
}
