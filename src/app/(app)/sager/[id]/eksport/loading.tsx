import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <main className="flex flex-1 flex-col px-4 pb-12">
        <div className="pt-4 pb-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-3 h-7 w-40" />
        </div>

        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-2 h-4 w-64" />

        <div className="mt-3 flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface p-3"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-9" />
                <Skeleton className="h-5 w-36" />
              </div>
              <Skeleton className="mt-2 h-5 w-40 rounded-full" />
            </div>
          ))}
        </div>

        <Skeleton className="mt-8 h-11 w-full" />
      </main>
    </>
  );
}
