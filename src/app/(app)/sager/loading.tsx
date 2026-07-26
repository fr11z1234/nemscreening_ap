import { HeaderShell, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <HeaderShell />
      <main className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="ml-auto h-11 w-24" />
        </div>
        <div className="px-4 pb-3">
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="flex gap-2 px-4 pb-3">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="flex flex-col gap-2 px-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="ml-auto h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-4 w-32" />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
