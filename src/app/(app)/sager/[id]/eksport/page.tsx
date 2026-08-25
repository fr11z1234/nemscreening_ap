import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import {
  validateForExport,
  type ExportSample,
} from "@/lib/eurofins/generate";
import { EUROFINS_ANALYSES } from "@/lib/eurofins/template";
import { ANALYSIS_FIELDS, type Case, type Sample } from "@/lib/types";
import { fortrydSendtTilLab, markerSendtTilLab } from "@/lib/cases/status";

export const metadata = { title: "Eurofins-fil · Nemscreening" };

type ExportRow = {
  id: string;
  filename: string | null;
  row_count: number | null;
  generated_at: string;
};

export default async function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [caseRes, samplesRes, exportsRes] = await Promise.all([
    supabase.from("cases").select("*").eq("id", id).maybeSingle<Case>(),
    supabase
      .from("samples")
      .select("*")
      .eq("case_id", id)
      .order("seq")
      .returns<Sample[]>(),
    supabase
      .from("exports")
      .select("id, filename, row_count, generated_at")
      .eq("case_id", id)
      .order("generated_at", { ascending: false })
      .limit(5)
      .returns<ExportRow[]>(),
  ]);

  const sag = caseRes.data;
  if (!sag) notFound();

  const all = samplesRes.data ?? [];
  const forExport: ExportSample[] = all.map((s) => ({
    label: s.label,
    material: s.material,
    sample_type: s.sample_type,
    period: s.period,
    is_lab_sample: s.is_lab_sample,
    analysis_pcb: s.analysis_pcb,
    analysis_asbestos: s.analysis_asbestos,
    analysis_metals: s.analysis_metals,
    analysis_pah: s.analysis_pah,
  }));

  const issues = validateForExport(sag.case_name, forExport);
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const labSamples = all.filter((s) => s.is_lab_sample);
  const mapped = all.length - labSamples.length;

  return (
    <>
      <main className="flex flex-1 flex-col px-4 pb-12">
        <div className="pt-4 pb-4">
          <Link href={`/sager/${id}`} className="tap -ml-2 inline-block px-2 text-muted hover:text-fg">
            ← {sag.case_name}
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Eurofins-fil</h1>
        </div>

        {errors.length > 0 && (
          <div className="rounded-xl bg-danger-soft p-4">
            <p className="text-sm font-medium text-danger">
              Filen kan ikke laves endnu
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-danger">
              {errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-3 rounded-xl bg-warning-soft p-4">
            <p className="text-sm font-medium text-warning">
              Filen kan laves, men tjek lige dette
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-warning">
              {warnings.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="mt-6">
          <h2 className="font-semibold">Kommer med i filen</h2>
          <p className="mt-1 text-sm text-muted">
            {labSamples.length} prøve{labSamples.length === 1 ? "" : "r"} til
            laboratoriet
            {mapped > 0 &&
              ` · ${mapped} kortlagt${mapped === 1 ? "" : "e"} materiale${
                mapped === 1 ? "" : "r"
              } uden analyse sendes ikke med`}
          </p>

          {labSamples.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {labSamples.map((s) => (
                <li
                  key={s.id}
                  className="card p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="tabular rounded-md bg-primary-soft px-2 py-0.5 text-sm font-semibold text-primary">
                      {s.label}
                    </span>
                    <span className="truncate font-medium">
                      {s.material ?? "—"}
                    </span>
                    <span className="ml-auto truncate text-sm text-muted">
                      {s.sample_type ?? ""}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ANALYSIS_FIELDS.filter((a) => s[a.key]).map((a) => {
                      const col = EUROFINS_ANALYSES.find(
                        (e) => e.mappedFrom === a.key,
                      );
                      return (
                        <span
                          key={a.key}
                          title={col?.name}
                          className="rounded bg-primary-soft px-2 py-0.5 text-xs text-primary"
                        >
                          {a.label}
                        </span>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8 flex flex-col gap-3">
          {errors.length === 0 && (
            <a
              href={`/api/sager/${id}/eksport/eurofins`}
              download
              className="tap flex items-center justify-center rounded-lg bg-primary px-4 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover"
            >
              Hent Eurofins-fil
            </a>
          )}

          {/* Markeringen er ikke et punktum, men et skift af arbejdssted, og
              den kan vaere trykket i utide. Sa laenge sagen ikke er afsluttet
              kan den rulles tilbage. */}
          {sag.status === "sendt_til_lab" ? (
            <div className="card p-4">
              <p className="font-medium">Markeret som sendt til lab</p>
              <p className="mt-0.5 text-sm text-muted">
                Næste skridt er svarfilen fra Eurofins.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href={`/sager/${id}/resultater`}
                  className="tap flex flex-1 items-center justify-center rounded-xl bg-primary px-4 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover"
                >
                  Indlæs svar
                </Link>
                <form action={fortrydSendtTilLab.bind(null, id)}>
                  <button className="tap px-3 text-sm text-muted hover:text-fg">
                    Fortryd markering
                  </button>
                </form>
              </div>
            </div>
          ) : (
            sag.status !== "afsluttet" && (
              <form action={markerSendtTilLab.bind(null, id)}>
                <button className="tap w-full rounded-xl border border-border-strong hover:bg-surface-2 px-4">
                  Markér som sendt til lab
                </button>
              </form>
            )
          )}
        </div>

        {(exportsRes.data ?? []).length > 0 && (
          <section className="mt-10">
            <h2 className="font-semibold">Tidligere filer</h2>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
              {(exportsRes.data ?? []).map((e) => (
                <li key={e.id} className="tabular">
                  {formatDate(e.generated_at)} · {e.row_count} prøver
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 text-xs leading-relaxed text-muted">
          Filen er Eurofins&nbsp;egen Excel-skabelon med prøverne skrevet ind.
          Upload den som den er — lad være med at åbne og gemme den først. Den
          har skjulte ark, og det er dem, Eurofins bruger til at genkende
          kunde, kontrakt og ordreskabelon. Lad også filnavnet stå: Eurofins
          har afvist en fil på navnet alene, og det her er sat sammen så den
          går igennem.
        </p>
      </main>
    </>
  );
}
