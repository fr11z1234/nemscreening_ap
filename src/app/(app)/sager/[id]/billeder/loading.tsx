import { HeaderShell, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <HeaderShell />
      <main className="flex flex-1 flex-col px-4 pb-12">
        <div className="pt-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>

        <div className="mt-6 flex flex-col gap-7">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-6 w-9" />
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 2 }).map((_, j) => (
                  <Skeleton key={j} className="aspect-square w-full rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
