/**
 * Eurofins' analyserapport tegnet om til billeder, en pr. side.
 *
 * Rapporten printes fra browseren, og en browser printer ikke indholdet af en
 * indlejret PDF med — den kommer ud som en tom ramme. Bilaget tegnes derfor om
 * til billeder EN gang, ved upload, saa selve rapportsiden bagefter bare er
 * billeder der printer som alt andet.
 *
 * Prisen er at bilagets tekst bliver et billede: den kan ikke markeres eller
 * soeges i den faerdige PDF. Originalen gemmes ved siden af, saa den der har
 * brug for tallene som tekst kan hente den.
 */

/**
 * 150 dpi. En PDF regner i punkter, 72 pr. tomme.
 *
 * Nok til at laese en analyserapport pa papir. 300 ville fordoble filen uden
 * at give mere end en printer alligevel laegger paa arket.
 */
const SKALA = 150 / 72;

/** Under den her er en JPEG af en tekstside synligt grumset. */
const KVALITET = 0.82;

export type PdfSide = {
  /** 1-indekseret, som mennesker taeller sider. */
  side: number;
  blob: Blob;
  width: number;
  height: number;
};

export class PdfSideFejl extends Error {}

/**
 * Laeser PDF'en og giver et billede pr. side.
 *
 * pdf.js hentes foerst her — biblioteket fylder over en megabyte, og det skal
 * ikke ligge i den bundt marken henter for at tage en prove.
 */
export async function pdfTilSider(data: ArrayBuffer): Promise<PdfSide[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  // Opgaven og ikke dokumentet skal ryddes op: det er den der holder
  // arbejderen i live.
  const opgave = pdfjs.getDocument({ data });
  let doc;
  try {
    doc = await opgave.promise;
  } catch {
    await opgave.destroy();
    throw new PdfSideFejl(
      "Filen kunne ikke laeses som en PDF. Er det den rigtige fil fra Eurofins?",
    );
  }

  const sider: PdfSide[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: SKALA });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      // En PDF-side har ingen egen baggrund. Uden hvid bund bliver det
      // gennemsigtige sort, naar canvas'et gemmes som JPEG.
      await page.render({ canvas, viewport, background: "#ffffff" }).promise;
      page.cleanup();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", KVALITET),
      );
      if (!blob) {
        throw new PdfSideFejl(`Side ${n} kunne ikke gemmes som billede.`);
      }

      sider.push({ side: n, blob, width: canvas.width, height: canvas.height });
    }
  } finally {
    await opgave.destroy();
  }

  return sider;
}
