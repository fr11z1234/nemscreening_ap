import { redirect } from "next/navigation";
import { getMember } from "@/lib/auth";
import { logout } from "@/app/login/actions";

/**
 * Adgangskontrol for hele appen.
 *
 * auth.users deles med websitets kundeportal, sa "logget ind" er ikke nok.
 * Adgang kraever en aktiv raekke i screening.app_users. RLS handhaever det
 * samme i databasen — tjekket her findes for at give en forstaelig besked
 * i stedet for sider der bare er tomme.
 *
 * Ligger for sig selv, fordi appen har to bredder: telefonens smalle kolonne
 * til provetagning, og et bredt bord til resultater der laeses pa en pc.
 * Begge layouts skal have det samme tjek, og kun et sted.
 */
export async function MemberGate({ children }: { children: React.ReactNode }) {
  const member = await getMember();
  if (!member) redirect("/login");

  if (!member.profile || !member.profile.active) {
    return (
      <main className="flex flex-1 flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm text-center">
          <h1 className="text-xl font-semibold">Ingen adgang</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Kontoen <span className="font-medium">{member.email}</span> er ikke
            oprettet som bruger i screening-appen. Kontakt kontoret, hvis du skal
            have adgang.
          </p>
          <form action={logout} className="mt-6">
            <button className="tap rounded-xl border border-border-strong hover:bg-surface-2 px-4 py-2.5">
              Log ud
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
