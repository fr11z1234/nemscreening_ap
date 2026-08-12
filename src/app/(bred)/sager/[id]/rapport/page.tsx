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
  type SkemaResult,
  type SkemaSample,
} from "@/components/lab/ResultatSkema";
import { TilpasBredde } from "@/components/lab/TilpasBredde";
import { Graensevaerdier } from "@/components/lab/Graensevaerdier";
import { Logo } from "@/components/Logo";
import { getMember } from "@/lib/auth";
import { FIRMA } from "@/lib/rapport/firma";
import { RAPPORT_BUCKET } from "@/lib/rapport/filer";
import {
  GRAENSE_EFTERSKRIFT,
  GRAENSE_FARVER,
  GRAENSE_FARVER_INDLEDNING,
  GRAENSE_NOTER,
  RAPPORT_SIDER,
} from "@/lib/rapport/tekst";
import { PrintKnap } from "./PrintKnap";
import { formatDate } from "@/lib/format";
import {
  PERIOD_LABEL,
  type Case,
  type CaseBuilding,
  type CaseFile,
  type Sample,
} from "@/lib/types";

export const metadata = { title: "Rapport · Nemscreening" };

type LabResultRow = SkemaResult & {
  sample_id: string;
  received_at: string | null;
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
  // En prove kan daekke flere bygninger — samme facademaling hele vejen rundt.
  const lokalitet = (s: Sample) =>
    s.building_ids.map((b) => buildingLabel.get(b)).filter(Boolean).join(", ") ||
    null;

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
    building_label: lokalitet(s),
    estimated_tons: s.estimated_tons,
  }));
  const skemaById = new Map(skemaSamples.map((s) => [s.id, s]));

  // Bilagene: plantegningen og Eurofins' rapport, den sidste som et billede
  // pr. side. Se lib/rapport/pdfsider.ts for hvorfor det ikke er en PDF her.
  // Bilagets plads forst, sidetallet inde i bilaget derefter — en sag har
  // ofte bade en analyserapport og et asbestappendiks.
  const filerRes = await supabase
    .from("case_files")
    .select("*")
    .eq("case_id", id)
    .order("doc_order")
    .order("sort_order")
    .returns<CaseFile[]>();

  const filer = filerRes.data ?? [];
  const plantegningFil = filer.find((f) => f.kind === "plantegning") ?? null;
  const forsideFil = filer.find((f) => f.kind === "forsidebillede") ?? null;
  const bilagFiler = filer.filter((f) => f.kind === "eurofins_side");

  const bilagStier = [
    ...(plantegningFil ? [plantegningFil.storage_path] : []),
    ...(forsideFil ? [forsideFil.storage_path] : []),
    ...bilagFiler.map((f) => f.storage_path),
  ];
  const bilagUrl = new Map<string, string>();
  if (bilagStier.length) {
    const { data: signed } = await supabase.storage
      .from(RAPPORT_BUCKET)
      .createSignedUrls(bilagStier, 60 * 60 * 2);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) bilagUrl.set(s.path, s.signedUrl);
    }
  }

  const plantegningUrl = plantegningFil
    ? (bilagUrl.get(plantegningFil.storage_path) ?? null)
    : null;
  const forsideUrl = forsideFil
    ? (bilagUrl.get(forsideFil.storage_path) ?? null)
    : null;

  // Rapporten er "udarbejdet af" den der har den aabne. Firmaets egne
  // oplysninger er de samme hver gang; kun navnet skifter.
  const member = await getMember();
  const udarbejdetAf = member?.profile?.full_name ?? member?.email ?? null;

  // BBR's egen betegnelse for hvad bygningen er. Den forste bygning er
  // hovedbygningen — carporte og garager star efter den.
  const ejendomstype = buildings[0]?.usage_text ?? null;

  const udskrevet = formatDate(new Date().toISOString());
  const sidehoved = (
    <div className="sidehoved">
      <div className="text-xs leading-snug">
        <p className="font-semibold text-muted">Miljøkortlægningsrapport</p>
        <p className="text-muted">
          {udskrevet} <span className="px-1">●</span>
          {sag.address_text ?? sag.case_name}
        </p>
      </div>
      <Logo className="h-7 shrink-0" />
    </div>
  );
  // Noeglen er filens id og ikke sidetallet: to bilag har begge en side 1.
  const bilagSider = bilagFiler
    .map((f) => ({ id: f.id, url: bilagUrl.get(f.storage_path) }))
    .filter((s): s is { id: string; url: string } => !!s.url);

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
          Vælg «Gem som PDF» i printdialogen. Siden er sat til stående A4 — slå
          browserens sidehoved og -fod fra, så adressen ikke står på rapporten.
        </p>
      </div>

      {/* Side 1: forsiden. Maerkets flader, intet andet end hvad rapporten er
          og hvor den hoerer til. */}
      <section className="forside">
        {forsideUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={forsideUrl}
            alt={`Ejendommen på ${sag.address_text ?? sag.case_name}`}
            className="forside-foto"
          />
        )}

        {/* Maalene er arkets, i millimeter. Da det laa ned stod her 297 x 210,
            og med `slice` ville de to figurer nu blive skaaret bort i siderne
            — netop de hjorner de er sat til at holde. Selve formerne er de
            samme; de er flyttet med hjornet. */}
        <svg
          className="forside-figur"
          viewBox="0 0 210 297"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {/* Vinklerne er logoets: husets tag og halen under det. Figuren
              bliver et haandtryk i hjornet og ikke et taeppe — huset skal
              kunne ses. */}
          <path
            d="M-8 215 L44 215 L106 277 L84 305 L22 243 L-8 243 Z"
            fill="var(--primary-fuld)"
          />
          <path
            d="M145 -8 L210 57 L210 96 L125 11 Z"
            fill="#ffffff"
            opacity="0.14"
          />
        </svg>

        <div className="forside-slor" />

        <Logo className="absolute right-12 top-10 h-11" />

        <div className="forside-indhold">
          <h1 className="text-[2.6rem] font-light leading-tight tracking-tight drop-shadow">
            Miljøkortlægningsrapport
          </h1>
          <p className="mt-2 text-xl font-medium">
            {sag.address_text ?? sag.case_name}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {FIRMA.navn} <span className="px-1">●</span> {udskrevet}
          </p>
        </div>
      </section>

      {/* Side 2: hvad ejendommen er, og hvem der har lavet rapporten. */}
      <section className="print-side mt-10 print:mt-0">
        {sidehoved}

        <h1 className="text-[2rem] font-bold leading-tight">
          {sag.address_text ?? sag.case_name}
        </h1>

        <div className="mt-8 grid grid-cols-2 gap-8">
          <dl className="rounded-xl bg-surface-2 px-7 py-6">
            <p className="text-lg font-semibold">BBR-oplysninger</p>
            <Linje label="Adresse" value={sag.address_text ?? sag.case_name} />
            <Linje label="Ejendomstype" value={ejendomstype} />
            <Linje label="Byggeår" value={sag.built_year} />
            <Linje
              label="Bebygget areal"
              value={sag.area_m2 ? `${sag.area_m2} m²` : null}
            />
            <Linje label="Ombygningsår" value={sag.rebuilt_year} />
          </dl>

          <dl className="rounded-xl bg-surface-2 px-7 py-6">
            <p className="text-lg font-semibold">
              Denne rapport er udarbejdet af
            </p>
            <div className="mt-4">
              <p className="font-semibold">{FIRMA.navn}</p>
              {udarbejdetAf && <p>{udarbejdetAf}</p>}
            </div>
            <Linje label="Adresse" value={FIRMA.adresse} />
            <Linje label="Telefon" value={FIRMA.telefon} />
            <Linje label="E-mail" value={FIRMA.email} />
            <Linje label="CVR" value={FIRMA.cvr} />
          </dl>
        </div>
      </section>

      {/* Analyseskemaet: hele sagen pa et bord. */}
      <section className="print-side mt-10 print:mt-0">
        {sidehoved}

        <dl className="grid grid-cols-4 gap-x-8 gap-y-4 rounded-xl bg-surface-2 px-5 py-4 text-sm">
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
          <SkemaForklaring />
        </div>
      </section>

      {/* En side pr. prove */}
      {samples.map((s) => {
        const urls = photos.get(s.id) ?? [];
        const skema = skemaById.get(s.id)!;
        return (
          <section key={s.id} className="print-side mt-10 print:mt-0">
            {sidehoved}
            <header className="flex flex-wrap items-center gap-4 border-b-2 border-fg pb-2">
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

            {/* Oplysningerne er noget man slar op, ikke noget man laeser: tre
                korte vaerdier man lober oje't hen over en gang. Derfor er
                baren holdt sa lav som skriften tillader — af de knap 16 mm
                den fyldte for, var de ti luft. Hver millimeter den ikke
                tager, gar til billederne, og det er billederne siden findes
                for. */}
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 rounded-xl bg-surface-2 px-5 py-2 text-xs">
              <Inline label="Lokalitet" value={lokalitet(s)} />
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
              <Inline label="Bemærkning" value={s.comment} />
            </dl>

            {/* To lige store felter, ogsa nar der kun er et billede: de
                staaende billeder er smalle og forskellige i hojden, og uden
                en fast ramme om hver ville hver prove faa sit eget layout.
                Den gra flade koster ikke hojde — den er praecis sa hoj som
                max-h siger, uanset hvad der staar i den.

                Hojden er sat efter arket og ikke efter billedet: en prove
                skal kunne vaere pa en side, ogsa forklaringen under skemaet.

                Regnestykket bag de 13 cm: arket staar op og er 297 mm hojt,
                polstringen tager 24, sa der er 273 at dele. Alt det andet pa
                siden — sidehoved, provehoved, oplysninger, overskrift, skema
                med sit rejste hoved, og forklaringen — fylder omkring 103 mm.
                Der er altsa plads til 170 mm billede, og der staar 130.

                De fyrre er slup, og de er der af en grund: braekker et
                materialenavn om pa to linjer, eller lober oplysningerne over
                pa to, koster det seks millimeter af det samme budget. Ryger
                skemaet ned pa naeste side, er hele pointen med en prove pa en
                side vaek.

                Bredden er 89 mm mod 128 dengang arket laa ned, men billederne
                er taget staaende med en telefon, og der er det hojden der
                afgor hvor stort motivet bliver: fra 85 mm til 130. */}
            {urls.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-4">
                {urls.slice(0, 2).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt={`${s.label}, billede ${i + 1}`}
                    className="h-[13cm] w-full rounded-xl bg-surface-2 object-contain"
                  />
                ))}
              </div>
            )}

            <Overskrift>Analyseresultat</Overskrift>
            <div className="mt-2">
              <TilpasBredde bredde={SKEMA_BREDDE}>
                <ResultatSkema samples={[skema]} results={results} />
              </TilpasBredde>
              <SkemaForklaring />
            </div>
          </section>
        );
      })}

      {/* Plantegningen viser hvor provenumrene sad. Den er ikke obligatorisk —
          har kontoret ikke lagt en op, springes siden over frem for at
          efterlade et tomt ark. */}
      {plantegningUrl && (
        <section className="print-side mt-10 print:mt-0">
          {sidehoved}
          <Overskrift>Plantegning</Overskrift>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={plantegningUrl}
            alt="Plantegning med prøvernes placering"
            className="mt-2 max-h-[15cm] w-full object-contain"
          />
        </section>
      )}

      {/* Graensevaerdier */}
      <section className="print-side mt-10 print:mt-0">
        {sidehoved}
        <Overskrift>Grænseværdier</Overskrift>
        <div className="mt-2">
          <Graensevaerdier />
        </div>

        <div className="mt-4 max-w-[19cm] text-sm leading-relaxed">
          {GRAENSE_NOTER.map((note) => (
            <p key={note} className="mt-2 first:mt-0">
              {note}
            </p>
          ))}
          <p className="mt-2">{GRAENSE_FARVER_INDLEDNING}</p>
          <ul className="mt-1 list-disc pl-5">
            {GRAENSE_FARVER.map((linje) => (
              <li key={linje}>{linje}</li>
            ))}
          </ul>
          <p className="mt-2">{GRAENSE_EFTERSKRIFT}</p>
        </div>
      </section>

      {/* Metode og ansvar, en gruppe pr. side sa hver side baerer maerket. */}
      {RAPPORT_SIDER.map((gruppe, nr) => (
        <section key={nr} className="print-side mt-10 print:mt-0">
          {sidehoved}
          {nr === 0 && <Overskrift>Om undersøgelsen</Overskrift>}
          <div className="print-spalter mt-2 text-sm leading-relaxed">
            {gruppe.map((afsnit) => (
              <div key={afsnit.overskrift} className="mt-4 first:mt-0">
                <h3 className="font-semibold">{afsnit.overskrift}</h3>
                {afsnit.brodtekst.map((tekst, i) => (
                  <p key={i} className="mt-1.5">
                    {tekst}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Eurofins' egne dokumenter, en side ad gangen og i den raekkefolge
          kontoret har sat dem. */}
      {bilagSider.map((side, i) => (
        <section key={side.id} className="print-bilag mt-10 print:mt-0">
          {sidehoved}
          {i === 0 && <Overskrift>Bilag fra Eurofins</Overskrift>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={side.url}
            alt={`Bilag fra Eurofins, side ${i + 1} af ${bilagSider.length}`}
            className="mt-2 w-full object-contain"
          />
        </section>
      ))}
    </main>
  );
}

/** Afsnitsoverskrift i rapporten — daempet, sa den ikke kappes om pladsen
    med sagens navn og provenumrene. */
function Overskrift({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
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

/** Etiket over vaerdi, som oplysningsboksene pa side 2 er sat op. */
function Linje({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="mt-3">
      <dt className="font-semibold">{label}:</dt>
      <dd>
        {value === null || value === undefined || value === "" ? "—" : value}
      </dd>
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
