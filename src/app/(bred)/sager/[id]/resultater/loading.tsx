import { HeaderShell, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <HeaderShell />
      <main className="flex flex-1 flex-col gap-6 px-6 pb-16 pt-5">
        <div>
          <Skeleton className="h-4 w-56" />
          <Skeleton className="mt-3 h-8 w-40" />
        </div>

        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-44 rounded-xl" />
          ))}
        </div>

        <Skeleton className="h-28 w-full rounded-xl" />

        <div className="rounded-xl bg-surface p-5 shadow-card">
          <Skeleton className="h-5 w-36" />
          <div className="mt-4 flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
