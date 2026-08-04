import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  LevelBadge,
  ResultatSkema,
  SkemaForklaring,
  SKEMA_BREDDE,
  levelOfSample,
  type SkemaResult,
  type SkemaSample,
} from "@/components/lab/ResultatSkema";
import { TilpasBredde } from "@/components/lab/TilpasBredde";
import { fortrydSendtTilLab } from "@/lib/cases/status";
import { RAPPORT_BUCKET } from "@/lib/rapport/filer";
import { getMember } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { LEVEL_LABEL, type LabLevel } from "@/lib/lab/parametre";
import type { Case, CaseBuilding, CaseFile, Sample } from "@/lib/types";
import { ResultatUpload } from "./ResultatUpload";
import { RapportFiler, type RapportFilerState } from "./RapportFiler";

export const metadata = { title: "Resultater · Nemscreening" };

type LabResultRow = SkemaResult & {
  sample_id: string;
  received_at: string | null;
};

export default async function ResultaterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Samme regel som RLS handhaever pa lab_results: kun kontoret skriver svar.
  // Tjekket her findes for at vise en forklaring frem for en fejl.
  const member = await getMember();
  const canUpload =
    member?.profile?.role === "office" || member?.profile?.role === "admin";

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
  const buildingLabel = new Map(
    (buildingsRes.data ?? []).map((b: CaseBuilding) => [b.id, b.label]),
  );
  // En prove kan daekke flere bygninger — samme facademaling hele vejen rundt.
  const lokalitet = (s: Sample) =>
    s.building_ids.map((b) => buildingLabel.get(b)).filter(Boolean).join(", ") ||
    null;

  const resultsRes = samples.length
    ? await supabase
        .from("lab_results")
        .select("*")
        .in(
          "sample_id",
          samples.map((s) => s.id),
        )
        .returns<LabResultRow[]>()
    : { data: [] as LabResultRow[] };

  const results = new Map<string, SkemaResult>(
    (resultsRes.data ?? []).map((r) => [r.sample_id, r]),
  );
  const receivedAt = (resultsRes.data ?? []).find((r) => r.received_at)
    ?.received_at;

  const skemaSamples: SkemaSample[] = samples.map((s) => ({
    id: s.id,
    label: s.label,
    material: s.material,
    sample_type: s.sample_type,
    building_label: lokalitet(s),
    estimated_tons: s.estimated_tons,
  }));

  const filerRes = await supabase
    .from("case_files")
    .select("*")
    .eq("case_id", id)
    .order("doc_order")
    .order("sort_order")
    .returns<CaseFile[]>();

  const filer = filerRes.data ?? [];
  const plantegning = filer.find((f) => f.kind === "plantegning") ?? null;
  const forsidebillede = filer.find((f) => f.kind === "forsidebillede") ?? null;

  // Et lille eksempel er nok her — rapporten viser dem i fuld stoerrelse.
  const billedStier = [plantegning, forsidebillede]
    .filter((f) => f !== null)
    .map((f) => f.storage_path);
  const billedUrl = new Map<string, string>();
  if (billedStier.length) {
    const { data: signed } = await supabase.storage
      .from(RAPPORT_BUCKET)
      .createSignedUrls(billedStier, 60 * 60);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) billedUrl.set(s.path, s.signedUrl);
    }
  }

  const rapportFiler: RapportFilerState = {
    forsidebillede: forsidebillede
      ? {
          filnavn: forsidebillede.filename,
          url: billedUrl.get(forsidebillede.storage_path) ?? null,
        }
      : null,
    plantegning: plantegning
      ? {
          filnavn: plantegning.filename,
          url: billedUrl.get(plantegning.storage_path) ?? null,
        }
      : null,
    bilag: filer
      .filter((f) => f.kind === "eurofins_pdf")
      .map((pdf) => ({
        docId: pdf.doc_id!,
        filnavn: pdf.filename,
        plads: pdf.doc_order,
        sider: filer.filter(
          (f) => f.kind === "eurofins_side" && f.doc_id === pdf.doc_id,
        ).length,
      })),
  };

  const levels = samples.map((s) => levelOfSample(results.get(s.id)));
  const tally = (level: LabLevel) => levels.filter((l) => l === level).length;
  const answered = levels.filter((l) => l !== null).length;
  const labSamples = samples.filter((s) => s.is_lab_sample);

  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col gap-6 px-6 pb-16 pt-5">
        <div>
          <Link
            href={`/sager/${id}`}
            className="tap -ml-2 inline-flex items-center px-2 text-sm text-muted hover:text-fg"
          >
            ← {sag.case_name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Resultater</h1>
            <StatusBadge status={sag.status} />
            {answered > 0 && (
              <Link
                href={`/sager/${id}/rapport`}
                className="tap ml-auto flex items-center rounded-xl bg-primary px-5 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover"
              >
                Åbn rapport
              </Link>
            )}
          </div>
        </div>

        {/* Man kommer hertil direkte fra markeringen "sendt til lab", og en
            markering sat ved en fejl skal kunne rulles tilbage det sted den
            forte hen. */}
        {sag.status === "sendt_til_lab" && (
          <div className="-mt-3 flex flex-wrap items-center gap-1 text-sm text-muted">
            <span>Sagen er markeret som sendt til laboratoriet.</span>
            <form action={fortrydSendtTilLab.bind(null, id)}>
              <button className="tap px-2 font-medium text-primary hover:underline">
                Fortryd markeringen
              </button>
            </form>
          </div>
        )}

        {/* Tallene forst: hvor mange svar er der, og hvor slemt star det.
            Det er dem kontoret skal bruge for at vide om sagen kan lukkes. */}
        <div className="flex flex-wrap gap-3">
          <Kort
            label="Svar modtaget"
            value={`${answered} af ${labSamples.length}`}
            note={
              receivedAt
                ? `Modtaget på lab ${formatDate(receivedAt)}`
                : "Ingen svar indlæst endnu"
            }
          />
          <Kort label={LEVEL_LABEL.farligt} value={tally("farligt")} tone="farligt" />
          <Kort
            label={LEVEL_LABEL.forurenet}
            value={tally("forurenet")}
            tone="forurenet"
          />
          <Kort label={LEVEL_LABEL.rent} value={tally("rent")} tone="rent" />
        </div>

        <ResultatUpload
          canUpload={canUpload}
          samples={samples.map((s) => ({
            id: s.id,
            label: s.label,
            seq: s.seq,
            is_lab_sample: s.is_lab_sample,
          }))}
        />

        <RapportFiler
          caseId={id}
          canUploadLab={canUpload}
          state={rapportFiler}
        />

        {samples.length === 0 ? (
          <p className="text-sm text-muted">
            Der er ikke registreret nogen prøver på sagen endnu.
          </p>
        ) : (
          <section className="card p-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="font-semibold">Analyseskema</h2>
              <p className="text-sm text-muted">
                Samme skema som rapporten. Farven følger grænseværdierne
                nederst. Zoom ind i browseren, hvis tallene bliver små.
              </p>
            </div>

            <div className="mt-4">
              <TilpasBredde bredde={SKEMA_BREDDE}>
                <ResultatSkema samples={skemaSamples} results={results} />
              </TilpasBredde>
              <SkemaForklaring />
            </div>
          </section>
        )}

        {answered > 0 && (
          <section>
            <h2 className="font-semibold">Prøve for prøve</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {samples.map((s, i) => (
                <li
                  key={s.id}
                  className="card flex items-center gap-2.5 px-3 py-2"
                >
                  <span className="tabular font-semibold">{s.label}</span>
                  <span className="max-w-52 truncate text-sm text-muted">
                    {s.material ?? "Uden materiale"}
                  </span>
                  <LevelBadge level={levels[i]} erLabprove={s.is_lab_sample} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

function Kort({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: LabLevel;
}) {
  const fill =
    tone === "farligt"
      ? "level-farligt"
      : tone === "forurenet"
        ? "level-forurenet"
        : tone === "rent"
          ? "level-rent"
          : "card";
  return (
    <div className={`min-w-44 rounded-xl px-4 py-3 ${fill}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="tabular mt-0.5 text-2xl font-semibold">{value}</div>
      {note && <div className="mt-0.5 text-xs opacity-80">{note}</div>}
    </div>
  );
}
