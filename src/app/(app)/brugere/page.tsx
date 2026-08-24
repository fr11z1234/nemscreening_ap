import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getMember } from "@/lib/auth";
import {
  USER_ROLES,
  USER_ROLE_BESKRIVELSE,
  USER_ROLE_LABEL,
  type AppUser,
} from "@/lib/types";
import { NyBrugerForm } from "./NyBrugerForm";
import { skiftAdgang, skiftRolle } from "./actions";

export const metadata = { title: "Brugere · Nemscreening" };

/**
 * Brugeradministration.
 *
 * Kun for admin. RLS handhaever det samme — `app_users_write` kraever
 * `is_admin()` — men en side der bare er tom er vaerre end en side man ikke kan
 * finde. `notFound` og ikke en besked: hvem der er administrator er ikke noget
 * andre behover at kunne se.
 */
export default async function BrugerePage() {
  const member = await getMember();
  if (member?.profile?.role !== "admin") notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("app_users")
    .select("id, full_name, email, role, active")
    .order("full_name")
    .returns<AppUser[]>();

  const brugere = data ?? [];

  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col px-4 pb-16 pt-4">
        <Link
          href="/sager"
          className="tap -ml-2 inline-flex items-center px-2 text-sm text-muted hover:text-fg"
        >
          ← Sager
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Brugere</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Adgang kræver en aktiv bruger her. Det er ikke nok at have et login —
          kontoen kan komme fra nemscreening.dk, hvor kunderne også har en.
        </p>

        <NyBrugerForm />

        <section className="mt-8">
          <h2 className="label-xs uppercase tracking-wide">
            {brugere.length} bruger{brugere.length === 1 ? "" : "e"}
          </h2>

          <ul className="mt-3 flex flex-col gap-2">
            {brugere.map((b) => {
              const erMigSelv = b.id === member.userId;
              return (
                <li
                  key={b.id}
                  className={`rounded-xl p-3 ${
                    b.active ? "bg-surface shadow-card" : "bg-surface-2"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">
                      {b.full_name?.trim() || b.email || "Uden navn"}
                    </span>
                    {erMigSelv && (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
                        dig
                      </span>
                    )}
                    {!b.active && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                        lukket
                      </span>
                    )}
                  </div>
                  {b.email && b.full_name?.trim() && (
                    <p className="text-sm text-muted">{b.email}</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* Egen raekke kan ikke aendres. Var man den eneste admin,
                        ville appen vaere uden administrator bagefter, og der er
                        ingen vej tilbage gennem UI'et. */}
                    {erMigSelv ? (
                      <span className="text-sm text-muted">
                        {USER_ROLE_LABEL[b.role]} — din egen adgang ændres ikke
                        herfra
                      </span>
                    ) : (
                      <>
                        <form action={skiftRolle} className="flex gap-2">
                          <input type="hidden" name="id" value={b.id} />
                          <select
                            name="role"
                            defaultValue={b.role}
                            className="tap rounded-lg bg-surface-2 px-2.5 text-sm"
                          >
                            {USER_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {USER_ROLE_LABEL[r]}
                              </option>
                            ))}
                          </select>
                          <button className="tap rounded-lg border border-border-strong px-3 text-sm hover:bg-surface-2">
                            Gem rolle
                          </button>
                        </form>

                        <form action={skiftAdgang}>
                          <input type="hidden" name="id" value={b.id} />
                          <input
                            type="hidden"
                            name="active"
                            value={b.active ? "false" : "true"}
                          />
                          <button
                            className={`tap rounded-lg px-3 text-sm ${
                              b.active
                                ? "text-danger hover:underline"
                                : "border border-border-strong hover:bg-surface-2"
                            }`}
                          >
                            {b.active ? "Luk adgang" : "Åbn adgang"}
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="label-xs uppercase tracking-wide">Hvad rollerne må</h2>
          <dl className="mt-2 flex flex-col gap-2 text-sm">
            {USER_ROLES.map((r) => (
              <div key={r}>
                <dt className="font-medium">{USER_ROLE_LABEL[r]}</dt>
                <dd className="text-muted">{USER_ROLE_BESKRIVELSE[r]}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="mt-8 text-sm leading-relaxed text-muted">
          En adgang lukkes, den slettes ikke. Login&apos;et kan høre til en kunde
          på nemscreening.dk, og slettes det, mister de også adgangen dér.
        </p>
      </main>
    </>
  );
}
