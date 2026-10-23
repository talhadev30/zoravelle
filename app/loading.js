import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main role="status" aria-label="Loading page" aria-busy="true" className="container-z min-h-[55vh] py-10 sm:py-12">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-10 w-2/3 sm:w-1/2" />
      <Skeleton className="mt-3 h-4 w-full max-w-lg" />
      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
      <Skeleton className="mt-8 h-12 w-36 rounded-full" />
      <span className="sr-only">Loading page</span>
    </main>
  );
}
