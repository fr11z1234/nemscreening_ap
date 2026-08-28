"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMember } from "@/lib/auth";

export type ForureningState = { error?: string; ok?: boolean };

/**
 * Gemmer svaret pa «Hvordan skal disse materialer handteres?».
 *
 * Kun kontor og admin. Det er samme graense som labsvar og Eurofins-bilag: den
 * her tekst er en faglig vurdering, der gar til en kommune, og den hoerer pa
 * kontoret og ikke i marken.
 *
 * RLS pa `cases` tillader ethvert medlem at rette en sag, sa graensen er ikke
 * handhaevet i databasen som den er for `lab_results`. Tjekket her er derfor det
 * eneste, og det skal blive staaende.
 */
export async function gemForureningsnote(
  _prev: ForureningState,
  formData: FormData,
): Promise<ForureningState> {
  const member = await getMember();
  const rolle = member?.profile?.role;
  if (!member?.profile?.active || (rolle !== "office" && rolle !== "admin")) {
    return { error: "Kun kontoret kan skrive i rapportens tekst." };
  }

  const caseId = String(formData.get("case_id") ?? "");
  if (!caseId) return { error: "Sagen mangler et id." };

  // Tom tekst gemmes som null og ikke som en tom streng: rapporten springer
  // afsnittet over pa null, og en streng med et mellemrum i ville give en
  // overskrift med ingenting under.
  const tekst = String(formData.get("tekst") ?? "").trim() || null;

  const { error, data } = await supabaseOpdater(caseId, tekst);
  if (error) return { error: `Kunne ikke gemme: ${error}` };
  if (!data) return { error: "Ingen rækker blev rettet. Har du adgang?" };

  revalidatePath(`/sager/${caseId}/resultater`);
  revalidatePath(`/sager/${caseId}/rapport`);
  return { ok: true };
}

/**
 * RLS afviser ved at ramme nul raekker, ikke ved at give en fejl. Derfor
 * `.select("id")` og et tjek pa at der kom noget tilbage — ellers ville
 * brugeren fa at vide at teksten var gemt, og se den vaek ved naeste
 * opdatering.
 */
async function supabaseOpdater(caseId: string, tekst: string | null) {
  const supabase = await createClient();
  const res = await supabase
    .from("cases")
    .update({ contamination_handling_note: tekst })
    .eq("id", caseId)
    .select("id");

  return { error: res.error?.message ?? null, data: (res.data?.length ?? 0) > 0 };
}
