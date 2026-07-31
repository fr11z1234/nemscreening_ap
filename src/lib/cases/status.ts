"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CaseStatus } from "@/lib/types";

/**
 * Sagens status, sat de to steder den skifter i handen.
 *
 * Statussen er ikke bare en etiket: fra sendt_til_lab flytter sagen sig fra
 * marken til kontoret, og bade sagssiden og eksportsiden viser noget andet.
 * Derfor genopfriskes alle tre sider — ellers star den gamle knap tilbage pa
 * en side brugeren lige har forladt.
 */
async function setStatus(caseId: string, status: CaseStatus) {
  const supabase = await createClient();
  await supabase.from("cases").update({ status }).eq("id", caseId);
  revalidatePath(`/sager/${caseId}`);
  revalidatePath(`/sager/${caseId}/eksport`);
  revalidatePath(`/sager/${caseId}/resultater`);
}

/**
 * Filen er sendt til Eurofins. Naeste skridt er svarfilen, sa vi lander der.
 *
 * Der er ikke noget tilbage at lave pa eksportsiden bagefter, og den der lige
 * har uploadet hos Eurofins skal ikke selv finde vej til indlaesningen.
 */
export async function markerSendtTilLab(caseId: string) {
  await setStatus(caseId, "sendt_til_lab");
  redirect(`/sager/${caseId}/resultater`);
}

/**
 * Fortryd markeringen.
 *
 * Tilbage til proever_taget: proverne er taget, men filen er ikke afsendt.
 * Vi husker ikke hvilken status sagen stod pa for — det er den her der
 * beskriver situationen efter en fortrudt afsendelse.
 */
export async function fortrydSendtTilLab(caseId: string) {
  await setStatus(caseId, "proever_taget");
  redirect(`/sager/${caseId}/eksport`);
}
