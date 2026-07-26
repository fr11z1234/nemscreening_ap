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
      <main className="flex flex-1 flex-col pb-32">
        <div className="px-4 pt-4">
          <Link href="/sager" className="tap -ml-2 inline-flex items-center px-2 text-sm text-muted">
            ← Sager
          </Link>

          <div className="mt-1 flex items-start gap-3">
            <h1 className="text-[22px] font-semibold leading-tight">
              {sag.case_name}
            </h1>
            <span className="mt-1">
              <StatusBadge status={sag.status} />
            </span>
          </div>
          <p className="mt-1.5 text-sm text-muted">
            Oprettet {formatDate(sag.created_at)}
          </p>
        </div>

        <section className="mt-5 px-4">
          <div className="card grid grid-cols-2 gap-y-4 p-4">
            <Stat label="Areal" value={sag.area_m2} unit="m²" />
            <Stat label="Byggeår" value={sag.built_year} />
            <Stat label="Ombygningsår" value={sag.rebuilt_year} />
            <Stat label="Bygninger" value={buildings.length || null} />
          </div>

          {buildings.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {buildings.map((b) => (
                <span
                  key={b.id}
                  className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-2"
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}

          <Link
            href={`/sager/${id}/bbr`}
            className="tap mt-1 inline-flex items-center text-sm font-medium text-primary"
          >
            {buildings.length ? "Ret bygningsdata" : "Hent data fra BBR"} →
          </Link>
        </section>

        <section className="mt-8 px-4">
          <div className="flex items-baseline justify-between">
            <h2 className="label-xs uppercase tracking-wide">Prøver</h2>
            <span className="tabular text-xs text-muted">
              {samples.length} registreret
              {labCount > 0 && ` · ${labCount} til lab`}
            </span>
          </div>

          {samples.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Der er ikke registreret nogen prøver endnu.
            </p>
          ) : (
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {samples.map((s) => {
                const photos = s.sample_photos?.[0]?.count ?? 0;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/sager/${id}/proever?seq=${s.seq}`}
                      className="card block p-3 transition-shadow active:shadow-raised"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`tabular shrink-0 rounded-md px-1.5 py-0.5 text-[13px] font-semibold ${
                            s.is_lab_sample
                              ? "bg-primary-soft text-primary"
                              : "bg-surface-2 text-muted"
                          }`}
                        >
                          {s.label}
                        </span>
                        <span className="truncate font-medium">
                          {s.material ?? "Uden materiale"}
                        </span>
                        {photos > 0 && (
                          <span className="tabular ml-auto shrink-0 text-xs text-muted">
                            {photos} foto
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-[13px] text-muted">
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
                      </p>

                      {s.is_lab_sample && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {ANALYSIS_FIELDS.filter((a) => s[a.key]).map((a) => (
                            <span
                              key={a.key}
                              className="rounded bg-primary-soft px-1.5 py-0.5 text-[11px] font-medium text-primary"
                            >
                              {a.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {/* Primaerhandlingen bliver i tommelfingerens raekkevidde, ogsa nar
          provelisten er lang. */}
      <div className="safe-b sticky bottom-0 z-20 mt-auto border-t border-border bg-surface/95 px-4 pt-3 backdrop-blur">
        <div className="flex gap-2.5">
          <Link
            href={`/sager/${id}/proever`}
            className="tap flex flex-1 items-center justify-center rounded-xl bg-primary px-4 font-medium text-primary-fg active:bg-primary-hover"
          >
            {samples.length ? "Fortsæt prøvetagning" : "Begynd prøvetagning"}
          </Link>
          {labCount > 0 && (
            <Link
              href={`/sager/${id}/eksport`}
              className="tap flex items-center justify-center rounded-xl border border-border-strong px-4 font-medium"
            >
              Eurofins
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div>
      <div className="label-xs">{label}</div>
      <div
        className={`tabular mt-0.5 text-lg font-semibold ${
          empty ? "text-muted" : ""
        }`}
      >
        {empty ? "—" : typeof value === "number" ? formatDecimal(value) : value}
        {!empty && unit && (
          <span className="ml-1 text-sm font-normal text-muted">{unit}</span>
        )}
      </div>
    </div>
  );
}
