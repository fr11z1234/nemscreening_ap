import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
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
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <h1 className="text-[26px] font-semibold leading-none">Sager</h1>
          <Link
            href="/sager/ny"
            className="tap ml-auto inline-flex items-center rounded-xl bg-primary px-4 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover"
          >
            Ny sag
          </Link>
        </div>

        <form className="px-4">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Søg på adresse"
            className="tap w-full rounded-xl bg-surface px-3.5 py-2.5 shadow-card outline-none placeholder:text-muted"
          />
          <input type="hidden" name="filter" value={active.key} />
        </form>

        <nav className="flex gap-1.5 overflow-x-auto px-4 py-3">
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

        {error ? (
          <p className="mx-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
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
          <ul className="flex flex-col gap-1.5 px-4 pb-10">
            {cases.map((c) => {
              const count = c.samples?.[0]?.count ?? 0;
              return (
                // Sletteknappen ligger ved siden af linket og ikke inde i det:
                // en knap inden i et link er hverken gyldigt markup eller til
                // at ramme uden ogsa at abne sagen. Til gengaeld skal linket
                // holde sig fra hojrekanten — ellers ville et tryk pa
                // statusmaerket lande pa en knap der sletter sagen.
                <li key={c.id} className="relative">
                  <Link
                    href={`/sager/${c.id}`}
                    className="card block p-3.5 pr-16 transition-shadow hover:shadow-raised active:shadow-raised"
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-medium leading-snug">
                        {c.case_name}
                      </span>
                      <span className="ml-auto">
                        <StatusBadge status={c.status} />
                      </span>
                    </div>
                    <div className="tabular mt-1 text-[13px] text-muted">
                      {count === 0
                        ? "Ingen prøver"
                        : count === 1
                          ? "1 prøve"
                          : `${count} prøver`}
                      {" · "}
                      {formatDate(c.created_at)}
                    </div>
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
        )}
      </main>
    </>
  );
}
