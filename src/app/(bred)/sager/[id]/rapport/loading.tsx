import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col px-6 pb-16 pt-5">
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>

      <Skeleton className="h-8 w-96" />
      <Skeleton className="mt-2 h-6 w-64" />

      <div className="mt-6 grid grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    </main>
  );
}
