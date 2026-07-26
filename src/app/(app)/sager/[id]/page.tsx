import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDecimal } from "@/lib/format";
import {
  ANALYSIS_FIELDS,
  PERIOD_LABEL,
  type Case,
  type CaseBuilding,
  type Sample,
} from "@/lib/types";

export const metadata = { title: "Sag · Nemscreening" };

type SampleRow = Sample & { sample_photos: { count: number }[] };

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [caseRes, buildingsRes, samplesRes] = await Promise.all([
    supabase.from("cases").select("*").eq("id", id).maybeSingle<Case>(),
    supabase
      .from("case_buildings")
      .select("*")
      .eq("case_id", id)
      .order("sort_order")
      .returns<CaseBuilding[]>(),
    supabase
      .from("samples")
      .select("*, sample_photos(count)")
      .eq("case_id", id)
      .order("seq")
      .returns<SampleRow[]>(),
  ]);

  const sag = caseRes.data;
  if (!sag) notFound();

  const buildings = buildingsRes.data ?? [];
  const samples = samplesRes.data ?? [];
  const labCount = samples.filter((s) => s.is_lab_sample).length;
  const buildingLabel = new Map(buildings.map((b) => [b.id, b.label]));

  return (
    <>
      <AppHeader />
      <main className="flex-1 flex flex-col pb-10">
      <div className="px-4 pt-4 pb-4">
        <Link href="/sager" className="tap -ml-2 px-2 text-muted inline-block">
          ← Sager
        </Link>
        <div className="mt-2 flex items-start gap-3">
          <h1 className="text-xl font-semibold leading-snug">{sag.case_name}</h1>
          <span className="ml-auto mt-1">
            <StatusBadge status={sag.status} />
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          Oprettet {formatDate(sag.created_at)}
        </p>
      </div>

      <section className="px-4">
        <div className="rounded-xl border border-border bg-surface divide-y divide-border">
          <Row label="Areal" value={sag.area_m2 ? `${formatDecimal(sag.area_m2)} m²` : null} />
          <Row label="Byggeår" value={sag.built_year} />
          <Row label="Ombygningsår" value={sag.rebuilt_year} />
          <Row
            label="Bygninger"
            value={buildings.length ? buildings.map((b) => b.label).join(", ") : null}
          />
        </div>

        <Link
          href={`/sager/${id}/bbr`}
          className="tap mt-3 flex items-center justify-center rounded-lg border border-border px-4"
        >
          {buildings.length ? "Ret bygningsdata" : "Hent data fra BBR"}
        </Link>
      </section>

      <section className="px-4 mt-8">
        <div className="flex items-baseline gap-3">
          <h2 className="font-semibold">Prøver</h2>
          <span className="text-sm text-muted tabular">
            {samples.length} registreret{samples.length === 1 ? "" : "e"}
            {labCount > 0 && ` · ${labCount} til laboratoriet`}
          </span>
        </div>

        {samples.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Der er ikke registreret nogen prøver endnu.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {samples.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sager/${id}/proever?seq=${s.seq}`}
                  className="block rounded-xl border border-border bg-surface p-3 active:bg-surface-2"
                >
                <div className="flex items-center gap-2">
                  <span
                    className={`tabular rounded-md px-2 py-0.5 text-sm font-semibold ${
                      s.is_lab_sample
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-2 text-muted"
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="font-medium truncate">
                    {s.material ?? "—"}
                  </span>
                  {s.sample_photos?.[0]?.count > 0 && (
                    <span className="ml-auto text-xs text-muted shrink-0">
                      {s.sample_photos[0].count} foto
                    </span>
                  )}
                </div>

                <div className="mt-1 text-sm text-muted">
                  {[
                    s.sample_type,
                    s.building_id ? buildingLabel.get(s.building_id) : null,
                    s.period ? PERIOD_LABEL[s.period] : null,
                    s.estimated_tons != null
                      ? `${formatDecimal(s.estimated_tons)} ton`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Ingen oplysninger"}
                </div>

                {s.is_lab_sample && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ANALYSIS_FIELDS.filter((a) => s[a.key]).map((a) => (
                      <span
                        key={a.key}
                        className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary"
                      >
                        {a.label}
                      </span>
                    ))}
                  </div>
                )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="px-4 mt-8 flex flex-col gap-3">
        <Link
          href={`/sager/${id}/proever`}
          className="tap flex items-center justify-center rounded-lg bg-primary px-4 font-medium text-primary-fg active:bg-primary-hover"
        >
          {samples.length ? "Fortsæt prøvetagning" : "Begynd prøvetagning"}
        </Link>

        {labCount > 0 && (
          <Link
            href={`/sager/${id}/eksport`}
            className="tap flex items-center justify-center rounded-lg border border-border px-4"
          >
            Generér Eurofins-fil
          </Link>
        )}
      </div>
      </main>
    </>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-sm text-muted">{label}</span>
      <span className="ml-auto text-sm tabular">
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted">—</span>
        ) : (
          value
        )}
      </span>
    </div>
  );
}
