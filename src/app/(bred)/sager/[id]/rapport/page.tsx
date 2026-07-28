import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/offline/sync";
import {
  LevelBadge,
  ResultatSkema,
  SkemaForklaring,
  SKEMA_BREDDE,
  levelOfSample,
  venterPaStovvurdering,
  type SkemaResult,
  type SkemaSample,
} from "@/components/lab/ResultatSkema";
import { TilpasBredde } from "@/components/lab/TilpasBredde";
import { readValue, STOV_LABEL } from "@/lib/lab/parametre";
import { PrintKnap } from "./PrintKnap";
import { formatDate } from "@/lib/format";
import { PERIOD_LABEL, type Case, type CaseBuilding, type Sample } from "@/lib/types";

export const metadata = { title: "Rapport · Nemscreening" };

type LabResultRow = SkemaResult & {
  sample_id: string;
  received_at: string | null;
  asbestos_dusty: boolean | null;
};

/**
 * Rapporten, klar til at printes til PDF.
 *
 * Forside med sagens tal og hele analyseskemaet, derefter en side pr. prove
 * med dens billeder og dens egen raekke. Det er den samme opbygning som de
 * rapporter der er sendt ud i arevis — kun udfyldningen er holdt op med at
 * vaere handarbejde.
 *
 * Sideskiftene ligger i CSS (.print-side), sa det man ser pa skaermen er det
 * der kommer ud af printeren.
 */
export default async function RapportPage({
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
      .select("*")
      .eq("case_id", id)
      .order("seq")
      .returns<Sample[]>(),
  ]);

  const sag = caseRes.data;
  if (!sag) notFound();

  const samples = samplesRes.data ?? [];
  const buildings = buildingsRes.data ?? [];
  const buildingLabel = new Map(buildings.map((b) => [b.id, b.label]));

  const [resultsRes, photoRows] = await Promise.all([
    samples.length
      ? supabase
          .from("lab_results")
          .select("*")
          .in(
            "sample_id",
            samples.map((s) => s.id),
          )
          .returns<LabResultRow[]>()
      : Promise.resolve({ data: [] as LabResultRow[] }),
    samples.length
      ? supabase
          .from("sample_photos")
          .select("id, sample_id, storage_path")
          .in(
            "sample_id",
            samples.map((s) => s.id),
          )
          .order("sort_order")
          .returns<{ id: string; sample_id: string; storage_path: string }[]>()
      : Promise.resolve({ data: [] }),
  ]);

  const results = new Map<string, SkemaResult>(
    (resultsRes.data ?? []).map((r) => [r.sample_id, r]),
  );
  const receivedAt = (resultsRes.data ?? []).find((r) => r.received_at)
    ?.received_at;

  // Bucket'en er privat. To timer, sa en lang gennemlaesning og et print ikke
  // nar at lobe fra billederne.
  const photos = new Map<string, string[]>();
  const rows = photoRows.data ?? [];
  if (rows.length) {
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(
        rows.map((r) => r.storage_path),
        60 * 60 * 2,
      );
    const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    for (const row of rows) {
      const url = urlByPath.get(row.storage_path);
      if (!url) continue;
      const list = photos.get(row.sample_id);
      if (list) list.push(url);
      else photos.set(row.sample_id, [url]);
    }
  }

  const skemaSamples: SkemaSample[] = samples.map((s) => ({
    id: s.id,
    label: s.label,
    material: s.material,
    sample_type: s.sample_type,
    building_label: s.building_id
      ? (buildingLabel.get(s.building_id) ?? null)
      : null,
    estimated_tons: s.estimated_tons,
  }));
  const skemaById = new Map(skemaSamples.map((s) => [s.id, s]));
  const manglerStov = samples.some((s) =>
    venterPaStovvurdering(results.get(s.id)),
  );

  /** Asbestens tilstand, nar der overhovedet er asbest at tage stilling til. */
  const stovtekst = (sampleId: string): string | null => {
    const result = results.get(sampleId) as LabResultRow | undefined;
    if (readValue(result?.asbestos ?? null).state !== "pavist") return null;
    if (result?.asbestos_dusty === true) return STOV_LABEL.ja;
    if (result?.asbestos_dusty === false) return STOV_LABEL.nej;
    return "Ikke vurderet";
  };

  return (
    <main className="flex flex-1 flex-col px-6 pb-16 pt-5 print:px-0 print:pt-0">
      <div className="print-skjul mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/sager/${id}/resultater`}
          className="tap -ml-2 inline-flex items-center px-2 text-sm text-muted hover:text-fg"
        >
          ← Resultater
        </Link>
        <PrintKnap />
        <p className="text-sm text-muted">
          Vælg «Gem som PDF» i printdialogen. Siden er sat til liggende A4 — slå
          browserens sidehoved og -fod fra, så adressen ikke står på rapporten.
        </p>
      </div>

      {/* Forside */}
      <section className="print-side">
        <header className="flex items-start justify-between gap-6 border-b-2 border-fg pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Nemscreening ApS
            </p>
            <h1 className="mt-2 text-[1.7rem] font-semibold leading-tight">
              Ressourcekortlægning og miljøscreening
            </h1>
            <p className="mt-1 text-lg text-fg-2">{sag.case_name}</p>
          </div>
          <p className="shrink-0 pt-1 text-right text-sm text-muted">
            Udskrevet
            <br />
            {formatDate(new Date().toISOString())}
          </p>
        </header>

        <dl className="mt-5 grid grid-cols-4 gap-x-8 gap-y-4 rounded-xl bg-surface-2 px-5 py-4 text-sm">
          <Felt label="Adresse" value={sag.address_text ?? sag.case_name} />
          <Felt label="Areal" value={sag.area_m2 ? `${sag.area_m2} m²` : null} />
          <Felt label="Byggeår" value={sag.built_year} />
          <Felt label="Ombygningsår" value={sag.rebuilt_year} />
          <Felt label="Kunde" value={sag.customer_name} />
          <Felt
            label="Bygninger"
            value={buildings.map((b) => b.label).join(", ") || null}
          />
          <Felt label="Antal prøver" value={samples.length} />
          <Felt
            label="Modtaget på laboratoriet"
            value={receivedAt ? formatDate(receivedAt) : null}
          />
        </dl>

        <Overskrift>Analyseskema</Overskrift>
        <div className="mt-2">
          <TilpasBredde bredde={SKEMA_BREDDE}>
            <ResultatSkema samples={skemaSamples} results={results} />
          </TilpasBredde>
          <SkemaForklaring visStjerne={manglerStov} />
        </div>
      </section>

      {/* En side pr. prove */}
      {samples.map((s) => {
        const urls = photos.get(s.id) ?? [];
        const skema = skemaById.get(s.id)!;
        return (
          <section key={s.id} className="print-side mt-10 print:mt-0">
            <header className="flex flex-wrap items-center gap-4 border-b-2 border-fg pb-3">
              <span className="tabular rounded-lg border border-grid-strong px-2.5 py-1 text-lg font-semibold">
                {s.label}
              </span>
              <div>
                <p className="text-lg font-medium leading-tight">
                  {s.material ?? "Uden materiale"}
                </p>
                {s.sample_type && (
                  <p className="text-sm text-muted">{s.sample_type}</p>
                )}
              </div>
              <span className="ml-auto">
                <LevelBadge
                  level={levelOfSample(results.get(s.id))}
                  erLabprove={s.is_lab_sample}
                />
              </span>
            </header>

            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 rounded-xl bg-surface-2 px-5 py-3 text-sm">
              <Inline
                label="Lokalitet"
                value={
                  s.building_id
                    ? (buildingLabel.get(s.building_id) ?? null)
                    : null
                }
              />
              <Inline
                label="Periode"
                value={s.period ? PERIOD_LABEL[s.period] : null}
              />
              <Inline
                label="Estimeret mængde"
                value={
                  s.estimated_tons != null
                    ? `${String(s.estimated_tons).replace(".", ",")} ton`
                    : null
                }
              />
              <Inline label="Asbestens tilstand" value={stovtekst(s.id)} />
              <Inline label="Bemærkning" value={s.comment} />
            </dl>

            {urls.length > 0 && (
              <div
                className={`mt-4 grid gap-4 ${
                  urls.length > 1 ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {urls.slice(0, 2).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt={`${s.label}, billede ${i + 1}`}
                    className="max-h-[9cm] w-full rounded-xl bg-surface-2 object-contain"
                  />
                ))}
              </div>
            )}

            <Overskrift>Analyseresultat</Overskrift>
            <div className="mt-2">
              <TilpasBredde bredde={SKEMA_BREDDE}>
                <ResultatSkema samples={[skema]} results={results} />
              </TilpasBredde>
              <SkemaForklaring
                visStjerne={venterPaStovvurdering(results.get(s.id))}
              />
            </div>
          </section>
        );
      })}
    </main>
  );
}

/** Afsnitsoverskrift i rapporten — daempet, sa den ikke kappes om pladsen
    med sagens navn og provenumrene. */
function Overskrift({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
      {children}
    </h2>
  );
}

function Felt({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="label-xs">{label}</dt>
      <dd className="mt-0.5">{value === null || value === undefined || value === "" ? "—" : value}</dd>
    </div>
  );
}

function Inline({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted">{label}:</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
