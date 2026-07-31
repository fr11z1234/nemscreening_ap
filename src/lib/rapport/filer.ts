/**
 * Hvor rapportens bilag ligger.
 *
 * Egen bucket og ikke screening-photos: den tillader kun billeder, og en
 * Eurofins-rapport er en PDF. Stierne ligger under sagens id, saa alt der
 * hoerer til en sag kan findes — og ryddes — et sted.
 */

export const RAPPORT_BUCKET = "screening-rapport";

/** Storste fil vi tager imod. Samme graense som bucket'ens egen. */
export const MAKS_BYTES = 25 * 1024 * 1024;

export const PLANTEGNING_TYPER = ["image/png", "image/jpeg", "image/webp"];

export function rapportSti(caseId: string, navn: string): string {
  return `${caseId}/rapport/${navn}`;
}

/** Filnavnet beholder sin endelse, saa browseren viser billedet og ikke gaetter. */
export function billedNavn(stamme: string, mime: string): string {
  const endelse =
    mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return `${stamme}.${endelse}`;
}

/**
 * Hvert Eurofins-bilag faar sin egen mappe.
 *
 * En sag har ofte flere dokumenter fra laboratoriet — analyserapporten og et
 * asbestappendiks kommer hver for sig — og mappen gor at et af dem kan
 * fjernes uden at ramme de andre.
 */
export function eurofinsPdfNavn(docId: string): string {
  return `eurofins/${docId}/dokument.pdf`;
}

/**
 * Nul foran sidetallet.
 *
 * Storage sorterer alfabetisk, og uden nullet ville side 10 lande mellem 1
 * og 2 for den der leder i bucket'en i handen.
 */
export function eurofinsSideNavn(docId: string, side: number): string {
  return `eurofins/${docId}/side-${String(side).padStart(2, "0")}.jpg`;
}
