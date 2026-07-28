import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Eurofins' ordreskabelon, som den blev hentet fra deres portal.
 *
 * Filen ligger med som binaert aktiv i stedet for at blive genskabt i kode:
 * den indeholder skjulte ark, navngivne omrader og en ordrenoegle vi hverken
 * kan eller skal gengive. Skal den skiftes ud, laes skabelon/LAESMIG.md.
 *
 * next.config.ts sorger for at filen kommer med i serverbundtet — se
 * outputFileTracingIncludes.
 */
const TEMPLATE_PATH = join(
  process.cwd(),
  "src",
  "lib",
  "eurofins",
  "skabelon",
  "ordreskabelon.xlsx",
);

let cached: Buffer | null = null;

export function loadOrderTemplate(): Buffer {
  if (!cached) {
    try {
      cached = readFileSync(TEMPLATE_PATH);
    } catch (cause) {
      throw new Error(
        `Kunne ikke laese Eurofins-skabelonen pa ${TEMPLATE_PATH}.`,
        { cause },
      );
    }
  }
  return cached;
}
