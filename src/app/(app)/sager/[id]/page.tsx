import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { SletSagKnap } from "@/components/SletSagKnap";
import { getMember } from "@/lib/auth";
import { formatDate, formatDecimal } from "@/lib/format";
import {
  ANALYSIS_FIELDS,
  PERIOD_LABEL,
  REPORT_TYPE_LABEL,
  type Case,
  type CaseBuilding,
  type Sample,
} from "@/lib/types";

export const metadata = { title: "Sag · Nemscreening" };

type SampleRow = Sample & {
  sample_photos: { count: number }[];
  lab_results: { count: number }[];
};

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
      .select("*, sample_photos(count), lab_results(count)")
      .eq("case_id", id)
      .order("seq")
      .returns<SampleRow[]>(),
  ]);

  const sag = caseRes.data;
  if (!sag) notFound();

  const buildings = buildingsRes.data ?? [];
  const samples = samplesRes.data ?? [];
  const labCount = samples.filter((s) => s.is_lab_sample).length;

  // Samme graense som RLS handhaever pa cases: kun kontoret sletter en sag.
  const member = await getMember();
  const maaSlette =
    member?.profile?.role === "office" || member?.profile?.role === "admin";

  const buildingLabel = new Map(buildings.map((b) => [b.id, b.label]));
  // En prove kan daekke flere bygninger. Bygninger der ikke findes laengere
  // falder fra — kontoret kan have hentet BBR igen siden proven blev taget.
  const lokalitet = (s: SampleRow) =>
    s.building_ids.map((b) => buildingLabel.get(b)).filter(Boolean).join(", ") ||
    null;
  const photosOf = (s: SampleRow) => s.sample_photos?.[0]?.count ?? 0;
  const withoutPhotos = samples.filter((s) => photosOf(s) === 0).length;

  // Efter afsendelse handler sagen om svar, ikke om prover.
  const afventerSvar =
    sag.status === "sendt_til_lab" || sag.status === "afsluttet";
  const harSvar = samples.some((s) => (s.lab_results?.[0]?.count ?? 0) > 0);

  return (
    <>
      <main className="flex flex-1 flex-col pb-32">
        <div className="px-4 pt-4">
          <Link href="/sager" className="tap -ml-2 inline-flex items-center px-2 text-sm text-muted hover:text-fg">
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
          {/* Rapporttypen staar kun, nar den ikke er den almindelige. Skrevet
              pa hver sag ville den vaere stoj pa de ni ud af ti, hvor der ikke
              er noget at bemaerke — og dermed ikke laest pa den tiende. */}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span>Oprettet {formatDate(sag.created_at)}</span>
            {sag.report_type === "selektiv" && (
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                {REPORT_TYPE_LABEL.selektiv}
              </span>
            )}
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
            className="tap mt-1 inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            {buildings.length ? "Ret bygningsdata" : "Hent data fra BBR"} →
          </Link>
        </section>

        <section className="mt-8 px-4">
          <h2 className="label-xs uppercase tracking-wide">Prøver</h2>

          {/*
            Et tal pr. analysepakke frem for et samlet antal.
 
            Her stod «antal prover», «til lab» og «antal analyser». De to forste
            kan laeses af listen nedenfor, og det samlede antal analyser siger
            ikke noget nyttigt: laboratoriet regner ikke i analyser, det regner i
            PAKKER. Fire asbestprover og fire PAH-prover koster ikke det samme,
            og det er de fire tal her, man skal kunne se for man sender.
          */}
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ANALYSIS_FIELDS.map((a) => (
              <Tal
                key={a.key}
                label={a.label}
                value={samples.filter((s) => s[a.key]).length}
              />
            ))}
          </div>

          {samples.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Der er ikke registreret nogen prøver endnu.
            </p>
          ) : (
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {samples.map((s) => {
                const photos = photosOf(s);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/sager/${id}/proever?seq=${s.seq}`}
                      className="card block p-3 transition-shadow hover:shadow-raised active:shadow-raised"
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
                          lokalitet(s),
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

          {/* Den sidste kontrol for screeneren korer: er der billeder pa alle
              prover? Knappen sidder under listen, hvor spørgsmalet opstar. */}
          {samples.length > 0 && (
            <Link
              href={`/sager/${id}/billeder`}
              className={`tap mt-3 flex items-center justify-center gap-2 rounded-xl px-4 font-medium ${
                withoutPhotos > 0
                  ? "bg-warning-soft text-warning hover:opacity-85"
                  : "border border-border-strong hover:bg-surface-2"
              }`}
            >
              Gennemgå billeder
              {withoutPhotos > 0 && (
                <span className="tabular text-sm font-normal">
                  · {withoutPhotos} uden
                </span>
              )}
            </Link>
          )}
        </section>

        {/* Sletning ligger nederst og uden flade, som i provetagningen: den
            skal kunne findes, men aldrig rammes pa vej ned gennem siden. */}
        <section className="mt-10 px-4">
          {maaSlette ? (
            <SletSagKnap
              caseId={id}
              gaaTilListen
              className="tap -mx-1 px-1 text-left text-sm font-medium text-danger hover:underline disabled:opacity-50"
            >
              Slet sagen
            </SletSagKnap>
          ) : (
            <p className="text-sm text-muted">Kun kontoret kan slette en sag.</p>
          )}
        </section>
      </main>

      {/* Primaerhandlingen bliver i tommelfingerens raekkevidde, ogsa nar
          provelisten er lang.

          Nar sagen er sendt til laboratoriet, skifter arbejdet karakter: det
          foregar pa kontoret, og det handler om svar frem for om prover. Sa
          bytter knapperne plads. */}
      <div className="safe-b sticky bottom-0 z-20 mt-auto border-t border-border bg-surface/95 px-4 pt-3 backdrop-blur">
        <div className="flex gap-2.5">
          {afventerSvar ? (
            <>
              <Link
                href={`/sager/${id}/resultater`}
                className="tap flex flex-1 items-center justify-center rounded-xl bg-primary px-4 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover"
              >
                {harSvar ? "Resultater" : "Indlæs svar fra Eurofins"}
              </Link>
              <Link
                href={`/sager/${id}/proever`}
                className="tap flex items-center justify-center rounded-xl border border-border-strong hover:bg-surface-2 px-4 font-medium"
              >
                Prøver
              </Link>
            </>
          ) : (
            <>
              <Link
                href={`/sager/${id}/proever`}
                className="tap flex flex-1 items-center justify-center rounded-xl bg-primary px-4 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover"
              >
                {samples.length ? "Fortsæt prøvetagning" : "Begynd prøvetagning"}
              </Link>
              {labCount > 0 && (
                <Link
                  href={`/sager/${id}/eksport`}
                  className="tap flex items-center justify-center rounded-xl border border-border-strong hover:bg-surface-2 px-4 font-medium"
                >
                  Eurofins
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Et talt antal pa sit eget kort. Nul er et svar og skrives som et tal. */
function Tal({ label, value }: { label: string; value: number }) {
  return (
    <div className="card px-3 py-2.5">
      <div className="label-xs">{label}</div>
      <div
        className={`tabular mt-0.5 text-xl font-semibold ${
          value === 0 ? "text-muted" : ""
        }`}
      >
        {value}
      </div>
    </div>
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
