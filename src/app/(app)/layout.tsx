import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import type { AppUser } from "@/lib/types";

/**
 * Adgangskontrol for hele appen.
 *
 * auth.users deles med websitets kundeportal, sa "logget ind" er ikke nok.
 * Adgang kraever en aktiv raekke i screening.app_users. RLS handhaever det
 * samme i databasen — tjekket her findes for at give en forstaelig besked
 * i stedet for sider der bare er tomme.
 *
 * Sidehovedet ligger ikke her, men i <AppHeader />, sa provetagningsviewet
 * kan bruge hele skaermen.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("app_users")
    .select("id, full_name, email, role, active")
    .eq("id", user.id)
    .maybeSingle<AppUser>();

  if (!member || !member.active) {
    return (
      <main className="flex flex-1 flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm text-center">
          <h1 className="text-xl font-semibold">Ingen adgang</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Kontoen <span className="font-medium">{user.email}</span> er ikke
            oprettet som bruger i screening-appen. Kontakt kontoret, hvis du skal
            have adgang.
          </p>
          <form action={logout} className="mt-6">
            <button className="tap rounded-lg border border-border px-4 py-2.5">
              Log ud
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <div className="flex flex-1 flex-col">{children}</div>;
}
