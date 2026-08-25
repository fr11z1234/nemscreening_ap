import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col px-4 pb-12 pt-5 sm:px-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="ml-auto h-11 w-24" />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-11 w-full sm:max-w-sm sm:flex-1" />
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-3.5">
            <div className="flex items-start gap-3 lg:grid lg:grid-cols-[1fr_7rem_8rem_10rem_4rem] lg:items-center lg:gap-4">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="hidden h-4 w-16 lg:block" />
              <Skeleton className="hidden h-4 w-24 lg:block" />
              <Skeleton className="ml-auto h-5 w-24 rounded-full lg:ml-0" />
              <span />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
