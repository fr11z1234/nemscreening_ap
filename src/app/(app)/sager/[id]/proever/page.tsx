import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/offline/sync";
import { SamplingView, type InitialPhoto } from "./SamplingView";
import type { Case, CaseBuilding, LookupItem, Sample } from "@/lib/types";

export const metadata = { title: "Prøvetagning · Nemscreening" };

export default async function SamplingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [caseRes, buildingsRes, samplesRes, materialsRes, typesRes] =
    await Promise.all([
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
      supabase
        .from("materials")
        .select("id, name, sort_order, active")
        .eq("active", true)
        .order("name")
        .returns<LookupItem[]>(),
      supabase
        .from("sample_types")
        .select("id, name, sort_order, active")
        .eq("active", true)
        .order("name")
        .returns<LookupItem[]>(),
    ]);

  const sag = caseRes.data;
  if (!sag) notFound();

  const samples = samplesRes.data ?? [];

  // Billeder fra tidligere besog skal kunne ses nar man blader tilbage til en
  // raekke. Bucket'en er privat, sa der signeres midlertidige URL'er.
  let initialPhotos: InitialPhoto[] = [];
  if (samples.length > 0) {
    const { data: rows } = await supabase
      .from("sample_photos")
      .select("id, sample_id, storage_path")
      .in(
        "sample_id",
        samples.map((s) => s.id),
      )
      .order("sort_order")
      .returns<{ id: string; sample_id: string; storage_path: string }[]>();

    if (rows?.length) {
      const { data: signed } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          60 * 60,
        );

      const urlByPath = new Map(
        (signed ?? []).map((s) => [s.path, s.signedUrl]),
      );
      initialPhotos = rows
        .map((r) => ({
          id: r.id,
          sample_id: r.sample_id,
          url: urlByPath.get(r.storage_path) ?? "",
        }))
        .filter((p) => p.url);
    }
  }

  // Forste prove pa sagen betyder at screeningen er i gang.
  if (sag.status === "oprettet") {
    await supabase
      .from("cases")
      .update({ status: "under_screening" })
      .eq("id", id);
  }

  return (
    <SamplingView
      caseId={sag.id}
      userId={user.id}
      buildings={buildingsRes.data ?? []}
      materials={(materialsRes.data ?? []).map((m) => m.name)}
      sampleTypes={(typesRes.data ?? []).map((t) => t.name)}
      initialSamples={samples}
      initialPhotos={initialPhotos}
    />
  );
}
