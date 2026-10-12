import type { ScreeningClient } from "@/lib/supabase/client";
import { compressImageFile, type Captured } from "@/lib/camera/compress";
import { enqueuePhoto, takePhotoFromQueue } from "./store";
import { PHOTO_BUCKET } from "./sync";

/**
 * Billeder pr. prove.
 *
 * To raekker: et oversigtsbillede af hvor proven er taget, og et naerbillede
 * af materialet. Flere goer hverken dokumentationen staerkere eller
 * gennemgangen inden afgang hurtigere — den bliver bare laengere at scrolle.
 */
export const MAX_PHOTOS = 2;

export type NytBillede = Captured & { takenAt: string };

/**
 * Laeser valgte filer om til billeder, der kan laegges i koen.
 *
 * Der er ingen soger at rette sig efter, sa filen kommer med i sin helhed;
 * rapporten viser den med object-contain og beskaerer intet. Filens egen dato
 * er det bedste bud paa, hvornaar billedet blev taget — et billede fra kunden
 * blev ikke taget i dag, fordi det blev lagt op i dag.
 *
 * Kun sa mange som der er plads til. Resten, og det der ikke kan laeses, siges
 * i beskeden frem for at forsvinde uden et ord.
 */
export async function laesFiler(
  filer: File[],
  ledige: number,
): Promise<{ nye: NytBillede[]; besked: string | null }> {
  const nye: NytBillede[] = [];
  let ulaeselige = 0;
  let tilOvers = 0;

  for (const fil of filer) {
    if (nye.length >= ledige) {
      tilOvers++;
      continue;
    }
    // En HEIC-fil fra en iPhone kan ikke tegnes af Chrome pa Windows. Den
    // springes over med en besked i stedet for at tage resten med i faldet.
    try {
      nye.push({
        ...(await compressImageFile(fil)),
        takenAt: new Date(fil.lastModified || Date.now()).toISOString(),
      });
    } catch {
      ulaeselige++;
    }
  }

  const beskeder: string[] = [];
  if (ulaeselige > 0) {
    beskeder.push(
      filer.length === 1
        ? "Billedet kunne ikke læses. Gem det som JPG eller PNG, og prøv igen."
        : `${ulaeselige} af billederne kunne ikke læses. Gem dem som JPG eller PNG, og prøv igen.`,
    );
  }
  if (tilOvers > 0) {
    beskeder.push(
      `Der er plads til ${MAX_PHOTOS} billeder pr. prøve, så ${
        tilOvers === 1 ? "ét blev" : `${tilOvers} blev`
      } ikke lagt op.`,
    );
  }

  return { nye, besked: beskeder.length ? beskeder.join(" ") : null };
}

/**
 * Laegger billederne i koen og svarer med deres id'er, i samme raekkefolge.
 *
 * Den samme ko som kameraets: et billede kunden har sendt, skal ikke kunne
 * opfore sig anderledes end et screeneren selv har taget.
 */
export async function koeBilleder(
  caseId: string,
  sampleId: string,
  nye: NytBillede[],
  foersteSortering: number,
): Promise<string[]> {
  const ids: string[] = [];
  for (const [i, billede] of nye.entries()) {
    const id = crypto.randomUUID();
    await enqueuePhoto({
      id,
      sample_id: sampleId,
      case_id: caseId,
      blob: billede.blob,
      width: billede.width,
      height: billede.height,
      taken_at: billede.takenAt,
      sort_order: foersteSortering + i,
    });
    ids.push(id);
  }
  return ids;
}

/**
 * Sletter et billede. Fejlbeskeden, eller null nar det lykkedes.
 *
 * Laa det stadig i koen, er det aldrig naaet op, og sa er sletningen faerdig
 * her — ogsa uden daekning. Er det oppe, skal raekken vaek i Supabase, for det
 * forsvinder fra skaermen: ellers kom det igen ved naeste aabning og kunne
 * skubbe et nyt billede ud af rapporten, som kun viser de forste to. Billedet
 * bliver derfor staaende, hvis det ikke kunne slettes, og dialogen siger
 * hvorfor.
 */
export async function sletBillede(
  supabase: ScreeningClient,
  caseId: string,
  sampleId: string,
  photoId: string,
): Promise<string | null> {
  const kunLokalt = await takePhotoFromQueue(photoId);

  const { data, error } = await supabase
    .from("sample_photos")
    .delete()
    .eq("id", photoId)
    .select("id");

  // RLS afviser ved at slette nul raekker, ikke med en fejl. Nul er kun
  // rigtigt, naar billedet aldrig kom op.
  if (!kunLokalt && (error || !data?.length)) {
    return "Billedet kunne ikke slettes. Er der ingen forbindelse, så prøv igen, når der er dækning.";
  }

  // Filen fjernes efter raekken og aldrig omvendt. Ogsa naar billedet laa i
  // koen: synken kan have naaet at laegge filen op, men ikke raekken.
  await supabase.storage
    .from(PHOTO_BUCKET)
    .remove([`${caseId}/${sampleId}/${photoId}.jpg`]);

  return null;
}
