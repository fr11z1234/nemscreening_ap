import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/offline/sync";
import type { Case, Sample } from "@/lib/types";
import { Koesynk } from "./Koesynk";
import { ProeveBilleder, type GennemgaaetBillede } from "./ProeveBilleder";

export const metadata = { title: "Billeder · Nemscreening" };

type PhotoRow = { id: string; sample_id: string; storage_path: string };

/**
 * Alle billeder pa sagen, samlet under hver prove.
 *
 * Det er den sidste kontrol for screeneren korer fra adressen: mangler der et
 * billede, skal det opdages her og ikke pa kontoret dagen efter. Derfor star
 * prover uden billeder overst i bevidstheden — de far deres egen optaelling og
 * en tydelig tom plads i stedet for bare at glide med i listen.
 *
 * Men kun prover til laboratoriet kan mangle et. Billedet kraeves kun, nar der
 * er valgt en analyse; en registrering uden er ofte netop noget, der ikke kan
 * ses — isoleringen i hulmuren, betonen under gulvet. Den far en stille plads,
 * hvor et billede kan laegges til, og ikke en advarsel.
 *
 * Og det der findes her, skal ogsa kunne rettes her. Et forkert billede kan
 * slettes, og et nyt laegges op i dets sted, uden at aabne proven.
 */
export default async function PhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [caseRes, samplesRes] = await Promise.all([
    supabase.from("cases").select("*").eq("id", id).maybeSingle<Case>(),
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

  // Bucket'en er privat, sa der signeres midlertidige URL'er. En time er
  // rigeligt til en gennemgang og kort nok til at et delt skaermbillede af
  // adresselinjen ikke bliver en permanent adgang.
  const bySample = new Map<string, GennemgaaetBillede[]>();
  if (samples.length > 0) {
    const { data: rows } = await supabase
      .from("sample_photos")
      .select("id, sample_id, storage_path")
      .in(
        "sample_id",
        samples.map((s) => s.id),
      )
      .order("sort_order")
      .returns<PhotoRow[]>();

    if (rows?.length) {
      const { data: signed } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          60 * 60,
        );

      const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      for (const row of rows) {
        const url = urlByPath.get(row.storage_path);
        if (!url) continue;
        const billede = { id: row.id, url };
        const list = bySample.get(row.sample_id);
        if (list) list.push(billede);
        else bySample.set(row.sample_id, [billede]);
      }
    }
  }

  const total = [...bySample.values()].reduce((n, b) => n + b.length, 0);
  const missing = samples.filter(
    (s) => s.is_lab_sample && !bySample.get(s.id)?.length,
  );

  return (
    <>
      <Koesynk />
      <main className="flex flex-1 flex-col px-4 pb-12">
        <div className="pt-4">
          <Link
            href={`/sager/${id}`}
            className="tap -ml-2 inline-flex items-center px-2 text-sm text-muted hover:text-fg"
          >
            ← {sag.case_name}
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Billeder</h1>
          <p className="tabular mt-1 text-sm text-muted">
            {samples.length} prøve{samples.length === 1 ? "" : "r"} ·{" "}
            {total} billede{total === 1 ? "" : "r"}
          </p>
        </div>

        {samples.length === 0 ? (
          <p className="mt-6 text-sm text-muted">
            Der er ikke registreret nogen prøver endnu.
          </p>
        ) : (
          <>
            {missing.length > 0 && (
              <div className="mt-4 rounded-xl bg-warning-soft p-3">
                <p className="text-sm font-medium text-warning">
                  {missing.length} prøve{missing.length === 1 ? "" : "r"} til
                  laboratoriet uden billeder
                </p>
                <p className="tabular mt-1 text-sm text-warning">
                  {missing.map((s) => s.label).join(", ")}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-7">
              {samples.map((s) => {
                const billeder = bySample.get(s.id) ?? [];
                return (
                  <section key={s.id}>
                    {/* Hovedet aabner proven. Plusset nedenfor tager kun en fil
                        eller systemets kamera; vil man have sogeren, der
                        skaerer til rapportens ramme, er den her. */}
                    <Link
                      href={`/sager/${id}/proever?seq=${s.seq}`}
                      className="group -mx-1 flex items-baseline gap-2.5 rounded-lg px-1 py-0.5"
                    >
                      <span
                        className={`tabular shrink-0 rounded-md px-1.5 py-0.5 text-[13px] font-semibold ${
                          s.is_lab_sample
                            ? "bg-primary-soft text-primary"
                            : "bg-surface-2 text-muted"
                        }`}
                      >
                        {s.label}
                      </span>
                      <span className="truncate font-medium group-hover:underline">
                        {s.material ?? "Uden materiale"}
                      </span>
                      <span
                        className={`tabular ml-auto shrink-0 text-xs ${
                          s.is_lab_sample && billeder.length === 0
                            ? "font-medium text-warning"
                            : "text-muted"
                        }`}
                      >
                        {billeder.length ||
                          (s.is_lab_sample ? "mangler" : "ingen")}
                      </span>
                    </Link>

                    {/* Noeglen skifter med billederne fra serveren, sa en
                        genopfriskning efter en aendring andetsteds ikke
                        efterlader en gammel liste. */}
                    <ProeveBilleder
                      key={billeder.map((b) => b.id).join()}
                      caseId={id}
                      sampleId={s.id}
                      label={s.label}
                      kraevet={s.is_lab_sample}
                      billeder={billeder}
                    />
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}
