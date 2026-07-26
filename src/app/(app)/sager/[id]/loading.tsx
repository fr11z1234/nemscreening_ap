import { HeaderShell, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <HeaderShell />
      <main className="flex flex-1 flex-col pb-10">
        <div className="px-4 pt-4 pb-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="mt-3 h-7 w-64" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>

        <div className="px-4">
          <div className="rounded-xl border border-border bg-surface">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-4 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-3 h-11 w-full" />
        </div>

        <div className="mt-8 px-4">
          <Skeleton className="h-5 w-40" />
          <div className="mt-3 flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface p-3"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-9" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <Skeleton className="mt-2 h-4 w-56" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 px-4">
          <Skeleton className="h-11 w-full" />
        </div>
      </main>
    </>
  );
}
