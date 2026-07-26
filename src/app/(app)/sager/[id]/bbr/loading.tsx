import { HeaderShell, Skeleton } from "@/components/Skeleton";

/**
 * BBR-siden er den langsomste i appen: den venter pa Datafordeleren for den
 * kan rendere. Skelettet gor ventetiden synlig frem for at siden bare star
 * stille.
 */
export default function Loading() {
  return (
    <>
      <HeaderShell />
      <main className="flex flex-1 flex-col">
        <div className="px-4 pt-4 pb-5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-3 h-7 w-40" />
        </div>

        <div className="flex flex-col gap-6 px-4">
          <div>
            <Skeleton className="h-5 w-64" />
            <p className="mt-2 text-sm text-muted">Henter bygninger fra BBR…</p>
            <div className="mt-3 flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-border bg-surface p-3"
                >
                  <Skeleton className="mt-1 size-5 shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="mt-2 h-4 w-52" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Skeleton className="h-11 w-full" />
        </div>
      </main>
    </>
  );
}
