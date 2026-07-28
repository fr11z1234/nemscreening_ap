import Link from "next/link";
import { getMember } from "@/lib/auth";
import { logout } from "@/app/login/actions";

/**
 * Sidehoved til de almindelige sider. Provetagningsviewet bruger den bevidst
 * ikke — der skal hele skaermen ga til kamera og formular.
 *
 * getMember() er cachet pr. request, sa opslaget her deles med layoutets
 * adgangstjek i stedet for at koste et ekstra kald til Supabase Auth.
 */
export async function AppHeader() {
  const member = await getMember();
  const name = member?.profile?.full_name?.trim() || member?.email || "";

  return (
    <header className="safe-t sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link href="/sager" className="font-semibold tracking-tight">
          Nemscreening
        </Link>
        <span className="ml-auto max-w-36 truncate text-sm text-muted">
          {name}
        </span>
        <form action={logout}>
          <button className="tap -mr-2 px-2 text-sm text-muted hover:text-fg" aria-label="Log ud">
            Log ud
          </button>
        </form>
      </div>
    </header>
  );
}
