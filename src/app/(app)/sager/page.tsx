import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import type { Case, CaseStatus } from "@/lib/types";

export const metadata = { title: "Sager · Nemscreening" };

type CaseRow = Case & { samples: { count: number }[] };

const FILTERS: { key: string; label: string; statuses?: CaseStatus[] }[] = [
  { key: "aktive", label: "Aktive", statuses: ["oprettet", "under_screening", "proever_taget", "sendt_til_lab"] },
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
      <main className="flex-1 flex flex-col">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Sager</h1>
        <Link
          href="/sager/ny"
          className="tap ml-auto inline-flex items-center rounded-lg bg-primary px-4 font-medium text-primary-fg active:bg-primary-hover"
        >
          Ny sag
        </Link>
      </div>

      <form className="px-4 pb-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Søg på adresse"
          className="tap w-full rounded-lg border border-border bg-surface px-3 py-2.5"
        />
        <input type="hidden" name="filter" value={active.key} />
      </form>

      <nav className="px-4 pb-3 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (f.key !== "aktive") params.set("filter", f.key);
          const href = params.toString() ? `/sager?${params}` : "/sager";
          return (
            <Link
              key={f.key}
              href={href}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                f.key === active.key
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {error ? (
        <p className="mx-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Kunne ikke hente sager: {error.message}
        </p>
      ) : cases.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-muted">
            {q ? `Ingen sager matcher "${q}".` : "Der er ingen sager her endnu."}
          </p>
          {!q && (
            <Link
              href="/sager/ny"
              className="tap mt-4 inline-flex items-center rounded-lg border border-border px-4"
            >
              Opret den første sag
            </Link>
          )}
        </div>
      ) : (
        <ul className="px-4 pb-8 flex flex-col gap-2">
          {cases.map((c) => {
            const count = c.samples?.[0]?.count ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/sager/${c.id}`}
                  className="block rounded-xl border border-border bg-surface p-4 active:bg-surface-2"
                >
                  <div className="flex items-start gap-3">
                    <span className="font-medium leading-snug">{c.case_name}</span>
                    <span className="ml-auto">
                      <StatusBadge status={c.status} />
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm text-muted tabular">
                    {count === 0
                      ? "Ingen prøver"
                      : count === 1
                        ? "1 prøve"
                        : `${count} prøver`}
                    {" · "}
                    {formatDate(c.created_at)}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      </main>
    </>
  );
}
