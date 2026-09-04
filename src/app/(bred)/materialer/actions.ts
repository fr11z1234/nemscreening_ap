"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMember } from "@/lib/auth";
import type { BuildingPart } from "@/lib/types";

export type PanelState = { error?: string; ok?: string };

/**
 * Kun kontor og admin.
 *
 * Samme graense som RLS: `materials_write` og `building_parts_write` kraever
 * `screening.is_office()`. Tjekket her findes for at give en forstaelig besked
 * frem for en handling der ikke gor noget — RLS afviser ved at ramme nul
 * raekker, ikke ved at fejle.
 */
async function kraevKontor() {
  const member = await getMember();
  const rolle = member?.profile?.role;
  if (!member?.profile?.active || (rolle !== "office" && rolle !== "admin")) {
    return "Kun kontoret kan rette materialelisten.";
  }
  return null;
}

const tekst = (fd: FormData, felt: string) =>
  String(fd.get(felt) ?? "").trim() || null;

// ---------------------------------------------------------------------------
// Materialer
// ---------------------------------------------------------------------------

/** Gemmer et materiale: navnet, rapportnavnet og de tre saetninger. */
export async function gemMateriale(
  _prev: PanelState,
  formData: FormData,
): Promise<PanelState> {
  const fejl = await kraevKontor();
  if (fejl) return { error: fejl };

  const id = String(formData.get("id") ?? "");
  const name = tekst(formData, "name");
  if (!id) return { error: "Materialet mangler et id." };
  if (!name) return { error: "Materialet skal have et navn." };

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("materials")
    .update({
      name,
      report_name: tekst(formData, "report_name"),
      sentence_genbrug: tekst(formData, "sentence_genbrug"),
      sentence_genanvendelse: tekst(formData, "sentence_genanvendelse"),
      // Tre bortskaffelsestekster, ikke en. Hvilken der bruges, afgores af
      // `bortskaffelsestekst` i types.ts — asbest overruler de to andre.
      sentence_bortskaffelse: tekst(formData, "sentence_bortskaffelse"),
      sentence_forurenet: tekst(formData, "sentence_forurenet"),
      sentence_asbest: tekst(formData, "sentence_asbest"),
    })
    .eq("id", id)
    .select("id");

  if (error) {
    // Navnet er unikt i databasen. Den besked er den eneste der er vaerd at
    // oversaette, fordi den sker i praksis: to materialer der skal hede det
    // samme betyder, at der er et i forvejen — maske lukket.
    if (error.code === "23505") {
      return { error: `Der findes allerede et materiale der heder «${name}».` };
    }
    return { error: `Kunne ikke gemme: ${error.message}` };
  }
  if (!data?.length) return { error: "Ingen rækker blev rettet. Har du adgang?" };

  revalidatePath("/materialer");
  return { ok: `${name} er gemt.` };
}

export async function opretMateriale(
  _prev: PanelState,
  formData: FormData,
): Promise<PanelState> {
  const fejl = await kraevKontor();
  if (fejl) return { error: fejl };

  const name = tekst(formData, "name");
  if (!name) return { error: "Skriv et navn på materialet." };

  const supabase = await createClient();

  // Bagerst i listen. Raekkefolgen kommer fra regnearket, og et nyt materiale
  // horer ikke midt i den uden at nogen har bestemt hvor.
  const { data: sidst } = await supabase
    .from("materials")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const { error } = await supabase
    .from("materials")
    .insert({ name, sort_order: (sidst?.sort_order ?? 0) + 1 })
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return { error: `«${name}» findes allerede — måske som et lukket materiale.` };
    }
    return { error: `Kunne ikke oprette: ${error.message}` };
  }

  revalidatePath("/materialer");
  return { ok: `${name} er oprettet.` };
}

/**
 * Lukker eller aabner et materiale.
 *
 * Der slettes ikke. Prover gemmer materialets NAVN som tekst, sa en sletning
 * ville ikke rore historikken — men den ville tage saetningen med, og sa bliver
 * en to ar gammel rapport stille kortere. Et lukket materiale forsvinder fra
 * vaelgeren i marken og bliver staaende i de rapporter, der allerede bruger det.
 */
export async function skiftMaterialeAdgang(formData: FormData) {
  if (await kraevKontor()) return;

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("materials").update({ active }).eq("id", id);
  revalidatePath("/materialer");
}

// ---------------------------------------------------------------------------
// Bygningsdele
// ---------------------------------------------------------------------------

export async function gemBygningsdel(
  _prev: PanelState,
  formData: FormData,
): Promise<PanelState> {
  const fejl = await kraevKontor();
  if (fejl) return { error: fejl };

  const id = String(formData.get("id") ?? "");
  const name = tekst(formData, "name");
  if (!id || !name) return { error: "Bygningsdelen skal have et navn." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("building_parts")
    .update({ name })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: `Der findes allerede en bygningsdel der heder «${name}».` };
    }
    return { error: `Kunne ikke gemme: ${error.message}` };
  }

  revalidatePath("/materialer");
  return { ok: `${name} er gemt.` };
}

export async function opretBygningsdel(
  _prev: PanelState,
  formData: FormData,
): Promise<PanelState> {
  const fejl = await kraevKontor();
  if (fejl) return { error: fejl };

  const name = tekst(formData, "name");
  if (!name) return { error: "Skriv et navn på bygningsdelen." };

  const supabase = await createClient();
  const { data: sidst } = await supabase
    .from("building_parts")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const { error } = await supabase
    .from("building_parts")
    .insert({ name, sort_order: (sidst?.sort_order ?? 0) + 1 });

  if (error) {
    if (error.code === "23505") {
      return { error: `«${name}» findes allerede.` };
    }
    return { error: `Kunne ikke oprette: ${error.message}` };
  }

  revalidatePath("/materialer");
  return { ok: `${name} er oprettet.` };
}

export async function skiftBygningsdelAdgang(formData: FormData) {
  if (await kraevKontor()) return;

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("building_parts").update({ active }).eq("id", id);
  revalidatePath("/materialer");
}

/**
 * Flytter en bygningsdel op eller ned.
 *
 * Raekkefolgen ER overskrifternes orden i rapporten, sa den skal kunne rettes.
 * De to naboers `sort_order` byttes om — det holder listen taet uden at skulle
 * skrive alle raekker om, og det virker uanset hvilke tal de har i forvejen.
 */
export async function flytBygningsdel(formData: FormData) {
  if (await kraevKontor()) return;

  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("retning") ?? "") === "op";
  if (!id) return;

  const supabase = await createClient();
  const { data: alle } = await supabase
    .from("building_parts")
    .select("id, name, sort_order, active")
    .order("sort_order")
    .returns<BuildingPart[]>();

  if (!alle) return;
  const i = alle.findIndex((b) => b.id === id);
  const j = op ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= alle.length) return;

  await Promise.all([
    supabase
      .from("building_parts")
      .update({ sort_order: alle[j].sort_order })
      .eq("id", alle[i].id),
    supabase
      .from("building_parts")
      .update({ sort_order: alle[i].sort_order })
      .eq("id", alle[j].id),
  ]);

  revalidatePath("/materialer");
}
