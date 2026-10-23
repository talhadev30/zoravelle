import { Skeleton } from "@/components/ui/Skeleton";

export default function ShopLoading() {
  return (
    <main
      role="status"
      aria-label="Loading eyewear collection"
      aria-busy="true"
      className="container-z min-h-[120svh] py-10 sm:py-12"
    >
      <Skeleton className="h-4 w-32" />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-10 w-72 max-w-full" />
          <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      <div className="mt-9 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-6" aria-hidden="true">
          <div>
            <Skeleton className="mb-3 h-4 w-20" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-8 w-20 rounded-full" />
              ))}
            </div>
          </div>
          {[0, 1, 2].map((group) => (
            <div key={group}>
              <Skeleton className="mb-3 h-4 w-20" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full rounded-full" />
        </aside>

        <section aria-label="Loading products">
          <div className="mb-5 flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="min-w-0">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="mt-3 h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/2" />
                <Skeleton className="mt-3 h-4 w-1/3" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
