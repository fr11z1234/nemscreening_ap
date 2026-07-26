import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import type { AppUser } from "@/lib/types";

/**
 * Sidehoved til de almindelige sider. Provetagningsviewet bruger den bevidst
 * ikke — der skal hele skaermen ga til kamera og formular.
 */
export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("app_users")
    .select("full_name, email")
    .eq("id", user?.id ?? "")
    .maybeSingle<Pick<AppUser, "full_name" | "email">>();

  const name = member?.full_name?.trim() || member?.email || "";

  return (
    <header className="safe-t sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link href="/sager" className="font-semibold tracking-tight">
          Nemscreening
        </Link>
        <span className="ml-auto max-w-[9rem] truncate text-sm text-muted">
          {name}
        </span>
        <form action={logout}>
          <button className="tap -mr-2 px-2 text-sm text-muted" aria-label="Log ud">
            Log ud
          </button>
        </form>
      </div>
    </header>
  );
}
