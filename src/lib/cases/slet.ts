"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/offline/sync";
import { RAPPORT_BUCKET } from "@/lib/rapport/filer";

/**
 * Sletning af en hel sag.
 *
 * Databasen rydder selv op: fremmednoglerne fra cases til case_buildings,
 * samples, case_files og exports star pa CASCADE, og samples tager
 * sample_photos og lab_results med. Det gor det til EN sletning i stedet for
 * syv, der hver kunne fejle halvvejs.
 *
 * Filerne kender databasen derimod ikke. Bade billederne fra marken og
 * rapportens bilag ligger i storage, og deres stier skal laeses ud FOR
 * raekkerne forsvinder — bagefter er der ikke noget tilbage at spore dem med.
 */

type Klient = Awaited<ReturnType<typeof createClient>>;

/** Hvad der ligger under en sag, talt op sa hvert lag kan navngives. */
export type SletOverblik = {
  navn: string;
  bygninger: number;
  proever: number;
  billeder: number;
  svar: number;
  forsidebillede: boolean;
  plantegning: boolean;
  eurofinsBilag: number;
  eksporter: number;
};

export type SletSvar = { ok: true } | { ok: false; fejl: string };

/**
 * PostgREST sender hojst 1000 raekker ad gangen.
 *
 * En sag kan have tusind prover og dermed to tusind billeder. De raekker der
 * ikke kom med, ville efterlade lige sa mange forladte filer i bucket'en, sa
 * der hentes videre indtil en side ikke er fuld.
 */
const SIDE = 1000;

/** Storage tager en liste ad gangen; en pa to tusind stier er for lang. */
const AD_GANGEN = 100;

export async function hentSletOverblik(
  caseId: string,
): Promise<SletOverblik | null> {
  const supabase = await createClient();

  const [
    sagRes,
    bygningerRes,
    proeverRes,
    billederRes,
    svarRes,
    filerRes,
    eksportRes,
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("case_name")
      .eq("id", caseId)
      .maybeSingle<{ case_name: string }>(),
    supabase
      .from("case_buildings")
      .select("*", { count: "exact", head: true })
      .eq("case_id", caseId),
    supabase
      .from("samples")
      .select("*", { count: "exact", head: true })
      .eq("case_id", caseId),
    // Billeder og svar haenger pa proven og kender ikke sagen. Et inner join
    // pa samples tager dem uden at skulle sende tusind prove-id'er med i
    // adressen.
    supabase
      .from("sample_photos")
      .select("*, samples!inner(case_id)", { count: "exact", head: true })
      .eq("samples.case_id", caseId),
    supabase
      .from("lab_results")
      .select("*, samples!inner(case_id)", { count: "exact", head: true })
      .eq("samples.case_id", caseId),
    supabase
      .from("case_files")
      .select("kind, doc_id")
      .eq("case_id", caseId)
      .returns<{ kind: string; doc_id: string | null }[]>(),
    supabase
      .from("exports")
      .select("*", { count: "exact", head: true })
      .eq("case_id", caseId),
  ]);

  if (!sagRes.data) return null;

  const filer = filerRes.data ?? [];

  return {
    navn: sagRes.data.case_name,
    bygninger: bygningerRes.count ?? 0,
    proever: proeverRes.count ?? 0,
    billeder: billederRes.count ?? 0,
    svar: svarRes.count ?? 0,
    forsidebillede: filer.some((f) => f.kind === "forsidebillede"),
    plantegning: filer.some((f) => f.kind === "plantegning"),
    // Et bilag er dokumentet, ikke dets sider: en PDF pa tolv sider fylder
    // tretten raekker i case_files, og "13 bilag" ville vaere en logn.
    eurofinsBilag: filer.filter((f) => f.kind === "eurofins_pdf").length,
    eksporter: eksportRes.count ?? 0,
  };
}

export async function sletSag(caseId: string): Promise<SletSvar> {
  const supabase = await createClient();

  const [fotoStier, bilagStier] = await Promise.all([
    alleStier((fra, til) =>
      supabase
        .from("sample_photos")
        .select("storage_path, samples!inner(case_id)")
        .eq("samples.case_id", caseId)
        .range(fra, til)
        .returns<{ storage_path: string }[]>(),
    ),
    alleStier((fra, til) =>
      supabase
        .from("case_files")
        .select("storage_path")
        .eq("case_id", caseId)
        .range(fra, til)
        .returns<{ storage_path: string }[]>(),
    ),
  ]);

  // .select() er ikke pynt: RLS afviser ved at slette nul raekker, ikke ved at
  // svare med en fejl. Uden den ville en screener fa at vide at sagen var
  // slettet, og se den ligge der igen ved naeste opdatering.
  const { data: slettet, error } = await supabase
    .from("cases")
    .delete()
    .eq("id", caseId)
    .select("id")
    .returns<{ id: string }[]>();

  if (error) {
    return { ok: false, fejl: `Sagen kunne ikke slettes: ${error.message}` };
  }
  if (!slettet?.length) {
    return {
      ok: false,
      fejl: "Sagen blev ikke slettet. Kun kontoret kan slette en sag.",
    };
  }

  // Forst nu filerne. Gar et af kaldene i vandet, ligger der hojst en forladt
  // fil tilbage i bucket'en — modsat den anden raekkefolge, hvor en rapport
  // kunne komme til at pege pa et billede der ikke fandtes mere.
  await fjernFiler(supabase, PHOTO_BUCKET, fotoStier);
  await fjernFiler(supabase, RAPPORT_BUCKET, bilagStier);

  revalidatePath("/sager");
  return { ok: true };
}

async function alleStier(
  hent: (
    fra: number,
    til: number,
  ) => PromiseLike<{ data: { storage_path: string }[] | null }>,
): Promise<string[]> {
  const stier: string[] = [];
  for (let fra = 0; ; fra += SIDE) {
    const { data } = await hent(fra, fra + SIDE - 1);
    const side = data ?? [];
    stier.push(...side.map((r) => r.storage_path));
    if (side.length < SIDE) return stier;
  }
}

async function fjernFiler(supabase: Klient, bucket: string, stier: string[]) {
  for (let i = 0; i < stier.length; i += AD_GANGEN) {
    await supabase.storage.from(bucket).remove(stier.slice(i, i + AD_GANGEN));
  }
}
