import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { SletSagKnap } from "@/components/SletSagKnap";
import { getMember } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { Case, CaseStatus } from "@/lib/types";

export const metadata = { title: "Sager · Nemscreening" };

type CaseRow = Case & { samples: { count: number }[] };

const FILTERS: { key: string; label: string; statuses?: CaseStatus[] }[] = [
  {
    key: "aktive",
    label: "Aktive",
    statuses: ["oprettet", "under_screening", "proever_taget", "sendt_til_lab"],
  },
  { key: "alle", label: "Alle" },
  { key: "afsluttet", label: "Afsluttet", statuses: ["afsluttet"] },
];

/**
 * Sagslisten.
 *
 * Ligger i (bred) og ikke i (app), selvom resten af sagsforlobet er bygget til
 * en telefon. Listen bliver moedt pa en pc lige sa ofte som i marken, og
 * hundrede sager i en kolonne pa 36 rem er spild af et bord: pa en skaerm
 * staar provetal, dato og status i deres egne spalter, sa oje't kan lobe lodret
 * ned gennem dem. Pa en telefon falder de sammen til det kort, de altid har
 * vaeret.
 */
export default async function SagerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { q = "", filter = "aktive" } = await searchParams;
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];

  const supabase = await createClient();

  // Samme graense som RLS handhaever pa cases: kun kontoret sletter en sag.
  // Uden tjekket ville screeneren fa en knap der altid svarede nej.
  const member = await getMember();
  const maaSlette =
    member?.profile?.role === "office" || member?.profile?.role === "admin";

  let query = supabase
    .from("cases")
    .select("*, samples(count)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (active.statuses) query = query.in("status", active.statuses);
  if (q.trim()) query = query.ilike("case_name", `%${q.trim()}%`);

  const { data, error } = await query.returns<CaseRow[]>();
  const cases = data ?? [];

  return (
    <main className="flex flex-1 flex-col px-4 pb-12 pt-5 sm:px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-[26px] font-semibold leading-none">Sager</h1>
        <Link
          href="/sager/ny"
          className="tap ml-auto inline-flex items-center rounded-xl bg-primary px-4 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover"
        >
          Ny sag
        </Link>
      </div>

      {/* Sog og filtre pa samme linje, nar der er plads. Pa en telefon under
          hinanden, som de altid har staet. */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="sm:max-w-sm sm:flex-1">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Søg på adresse"
            className="tap w-full rounded-xl bg-surface px-3.5 py-2.5 shadow-card outline-none placeholder:text-muted"
          />
          <input type="hidden" name="filter" value={active.key} />
        </form>

        <nav className="flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (f.key !== "aktive") params.set("filter", f.key);
            const href = params.toString() ? `/sager?${params}` : "/sager";
            return (
              <Link
                key={f.key}
                href={href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  f.key === active.key
                    ? "bg-fg font-medium text-bg"
                    : "bg-surface-2 text-muted"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>

        <span className="text-sm text-muted sm:ml-auto">
          {cases.length} {cases.length === 1 ? "sag" : "sager"}
        </span>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          Kunne ikke hente sager: {error.message}
        </p>
      ) : cases.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
          <p className="text-muted">
            {q ? `Ingen sager matcher "${q}".` : "Der er ingen sager her endnu."}
          </p>
          {!q && (
            <Link
              href="/sager/ny"
              className="tap mt-3 inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              Opret den første sag →
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Spaltehovedet findes kun, hvor spalterne gor. */}
          <div className="label-xs mt-6 hidden gap-4 px-3.5 pb-1 lg:grid lg:grid-cols-[1fr_7rem_8rem_10rem_4rem]">
            <span>Adresse</span>
            <span>Prøver</span>
            <span>Oprettet</span>
            <span>Status</span>
            <span />
          </div>

          <ul className="mt-1.5 flex flex-col gap-1.5">
            {cases.map((c) => {
              const count = c.samples?.[0]?.count ?? 0;
              const proever =
                count === 0
                  ? "Ingen prøver"
                  : count === 1
                    ? "1 prøve"
                    : `${count} prøver`;

              return (
                // Sletteknappen ligger ved siden af linket og ikke inde i det:
                // en knap inden i et link er hverken gyldigt markup eller til
                // at ramme uden ogsa at abne sagen. Til gengaeld skal linket
                // holde sig fra hojrekanten — ellers ville et tryk pa
                // statusmaerket lande pa en knap der sletter sagen.
                <li key={c.id} className="relative">
                  <Link
                    href={`/sager/${c.id}`}
                    className="card block p-3.5 pr-16 transition-shadow hover:shadow-raised active:shadow-raised lg:grid lg:grid-cols-[1fr_7rem_8rem_10rem_4rem] lg:items-center lg:gap-4 lg:pr-3.5"
                  >
                    <span className="flex items-start gap-3 lg:block">
                      <span className="font-medium leading-snug">
                        {c.case_name}
                      </span>
                      {/* Pa en telefon staar maerket ved navnet, fordi der
                          ikke er en spalte at laegge det i. */}
                      <span className="ml-auto lg:hidden">
                        <StatusBadge status={c.status} />
                      </span>
                    </span>

                    <span className="tabular mt-1 text-[13px] text-muted lg:mt-0 lg:text-sm">
                      {proever}
                      <span className="lg:hidden">
                        {" · "}
                        {formatDate(c.created_at)}
                      </span>
                    </span>

                    <span className="tabular hidden text-sm text-muted lg:block">
                      {formatDate(c.created_at)}
                    </span>

                    <span className="hidden lg:block">
                      <StatusBadge status={c.status} />
                    </span>

                    <span />
                  </Link>

                  {maaSlette && (
                    <SletSagKnap
                      caseId={c.id}
                      gaaTilListen={false}
                      className="tap absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-xl px-2 text-[13px] text-muted hover:bg-danger-soft hover:text-danger active:bg-danger-soft active:text-danger disabled:opacity-50"
                    >
                      Slet
                    </SletSagKnap>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
