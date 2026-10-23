export function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={"skeleton-loading animate-pulse rounded bg-[#e8e4dc] " + className}
    />
  );
}

export function CartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading your bag"
      aria-busy="true"
      className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]"
    >
      <section className="divide-y divide-black/10">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="grid grid-cols-[80px_minmax(0,1fr)_auto] gap-4 py-5 sm:grid-cols-[112px_minmax(0,1fr)_auto]"
          >
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </section>
      <aside className="space-y-4 rounded-2xl bg-white/70 p-6">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="mt-8 h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-12 w-full rounded-full" />
      </aside>
      <span className="sr-only">Loading your bag</span>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading checkout"
      aria-busy="true"
      className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]"
    >
      <section className="space-y-5 rounded-2xl border border-black/10 bg-white/60 p-5 sm:p-7">
        <Skeleton className="h-7 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((field) => (
            <Skeleton
              key={field}
              className={
                "h-16 rounded-xl " +
                (field === 0 || field === 3 ? "sm:col-span-2" : "")
              }
            />
          ))}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-12 w-40 rounded-full" />
      </section>
      <aside className="space-y-4 rounded-2xl bg-white/70 p-5 sm:p-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-5 h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-8 h-5 w-full" />
        <Skeleton className="h-12 w-full rounded-full" />
      </aside>
      <span className="sr-only">Loading checkout</span>
    </div>
  );
}

export function AdminRowsSkeleton({ count = 3 }) {
  return (
    <div
      role="status"
      aria-label="Loading store data"
      aria-busy="true"
      className="grid gap-3"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white/60 p-4"
        >
          <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Loading store data</span>
    </div>
  );
}
