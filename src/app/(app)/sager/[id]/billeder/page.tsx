import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/offline/sync";
import type { Case, Sample } from "@/lib/types";

export const metadata = { title: "Billeder · Nemscreening" };

type PhotoRow = { id: string; sample_id: string; storage_path: string };

/**
 * Alle billeder pa sagen, samlet under hver prove.
 *
 * Det er den sidste kontrol for screeneren korer fra adressen: mangler der et
 * billede, skal det opdages her og ikke pa kontoret dagen efter. Derfor star
 * prover uden billeder overst i bevidstheden — de far deres egen optaelling og
 * en tydelig tom plads i stedet for bare at glide med i listen.
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
  const bySample = new Map<string, string[]>();
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
        const list = bySample.get(row.sample_id);
        if (list) list.push(url);
        else bySample.set(row.sample_id, [url]);
      }
    }
  }

  const total = [...bySample.values()].reduce((n, urls) => n + urls.length, 0);
  const missing = samples.filter((s) => !bySample.get(s.id)?.length);

  return (
    <>
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
                  {missing.length} prøve{missing.length === 1 ? "" : "r"} uden
                  billeder
                </p>
                <p className="tabular mt-1 text-sm text-warning">
                  {missing.map((s) => s.label).join(", ")}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-7">
              {samples.map((s) => {
                const urls = bySample.get(s.id) ?? [];
                return (
                  <section key={s.id}>
                    <div className="flex items-baseline gap-2.5">
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
                      <span className="tabular ml-auto shrink-0 text-xs text-muted">
                        {urls.length || "ingen"}
                      </span>
                    </div>

                    {urls.length === 0 ? (
                      <Link
                        href={`/sager/${id}/proever?seq=${s.seq}`}
                        className="tap mt-2 flex items-center justify-center rounded-xl bg-warning-soft text-sm font-medium text-warning hover:opacity-85"
                      >
                        Mangler billeder — tag dem nu
                      </Link>
                    ) : (
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {urls.map((url, i) => (
                          // Fuld storrelse abnes i en ny fane. Signeret URL,
                          // sa den virker uden endnu et login.
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block aspect-square overflow-hidden rounded-xl bg-surface-2"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`${s.label}, billede ${i + 1}`}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
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
