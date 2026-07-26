import { Skeleton } from "@/components/Skeleton";

/**
 * Provetagningsviewet har ikke app-headeren — det bruger hele skaermen.
 * Skelettet skal derfor ogsa starte med kamerafeltet.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="safe-t sticky top-0 z-20 border-b border-border bg-surface">
        <div className="flex h-12 items-center gap-2 px-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      </header>

      <div className="aspect-4/3 w-full bg-black" />

      <div className="px-4 py-3">
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="flex flex-col gap-5 px-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-11 w-full" />
          </div>
        ))}
        <div>
          <Skeleton className="h-4 w-16" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        </div>
      </div>
    </div>
  );
}
