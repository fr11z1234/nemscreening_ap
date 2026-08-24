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

        {/* Brugeradministration vises kun for den, der kan bruge den. Samme
            graense som RLS: `app_users_write` kraever is_admin(). */}
        {member?.profile?.role === "admin" && (
          <Link
            href="/brugere"
            className="tap ml-auto px-2 text-sm text-muted hover:text-fg"
          >
            Brugere
          </Link>
        )}

        {/* Navnet forer til kodeordsskiftet. En ny bruger har faaet sit kodeord
            laest hojt, og det skal kunne skiftes uden at nogen forklarer hvor. */}
        <Link
          href="/kodeord"
          title="Skift kodeord"
          className={`max-w-36 truncate text-sm text-muted hover:text-fg ${
            member?.profile?.role === "admin" ? "" : "ml-auto"
          }`}
        >
          {name}
        </Link>
        <form action={logout}>
          <button className="tap -mr-2 px-2 text-sm text-muted hover:text-fg" aria-label="Log ud">
            Log ud
          </button>
        </form>
      </div>
    </header>
  );
}
