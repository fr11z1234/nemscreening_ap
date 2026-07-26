export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} />
  );
}

/**
 * Sidehovedets tomme skal.
 *
 * <AppHeader /> henter brugerens navn og ville derfor selv suspendere — den
 * kan ikke bruges som en del af et loading-fallback. Skallen har praecis samme
 * hojde og kant, sa indholdet ikke hopper nar den rigtige header lander.
 */
export function HeaderShell() {
  return (
    <header className="safe-t sticky top-0 z-30 border-b border-border bg-surface">
      <div className="flex h-14 items-center gap-3 px-4">
        <span className="font-semibold tracking-tight">Nemscreening</span>
        <Skeleton className="ml-auto h-4 w-20" />
      </div>
    </header>
  );
}
