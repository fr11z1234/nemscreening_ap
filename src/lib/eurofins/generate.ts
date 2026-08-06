import { EUROFINS_ANALYSES } from "./template";
import {
  ANALYSIS_FIELDS,
  analysisApplies,
  type BuildingPeriod,
} from "@/lib/types";
import {
  MAX_SAMPLES,
  fillOrderTemplate,
  readAnalysisCodes,
  type SampleRow,
} from "./xlsx";

export type ExportSample = {
  label: string;
  material: string | null;
  sample_type: string | null;
  period: BuildingPeriod | null;
  is_lab_sample: boolean;
  analysis_pcb: boolean;
  analysis_asbestos: boolean;
  analysis_metals: boolean;
  analysis_pah: boolean;
};

export type ValidationIssue = { level: "error" | "warning"; message: string };

/**
 * Kontrollerer en sag for de fejl der ville faa Eurofins til at afvise filen
 * eller gore den ubrugelig, inden nogen henter den ned.
 */
export function validateForExport(
  caseName: string,
  samples: ExportSample[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const labSamples = samples.filter((s) => s.is_lab_sample);

  if (!caseName.trim()) {
    issues.push({
      level: "error",
      message: "Sagen mangler et sagsnavn. Det udfylder kolonnen Sagsnavn.",
    });
  }

  if (labSamples.length === 0) {
    issues.push({
      level: "error",
      message:
        "Ingen prøver har en analyse valgt, så der er intet at sende til laboratoriet.",
    });
  }

  if (labSamples.length > MAX_SAMPLES) {
    issues.push({
      level: "error",
      message: `Eurofins' skabelon har plads til ${MAX_SAMPLES} prøver, og sagen har ${labSamples.length}. Del sagen op.`,
    });
  }

  const seen = new Set<string>();
  for (const s of labSamples) {
    if (seen.has(s.label)) {
      issues.push({
        level: "error",
        message: `Prøvemærkningen ${s.label} optræder mere end én gang.`,
      });
    }
    seen.add(s.label);

    if (!s.material) {
      issues.push({
        level: "warning",
        message: `${s.label} mangler materiale.`,
      });
    }
    if (!s.sample_type) {
      issues.push({
        level: "warning",
        message: `${s.label} mangler prøveart.`,
      });
    }

    // Perioden slar analyserne fra i provetagningen, men en raekke gemt for
    // reglen kom til kan stadig baere dem. Sa hellere sige det her end
    // bestille en analyse kunden betaler for uden at kunne finde noget.
    const wrongPeriod = ANALYSIS_FIELDS.filter(
      (a) => s[a.key] && !analysisApplies(a.key, s.period),
    );
    for (const a of wrongPeriod) {
      issues.push({
        level: "warning",
        message: `${s.label} har ${a.label} valgt, men bygningen er fra efter 1990. Åbn prøven og gem den igen for at fjerne analysen.`,
      });
    }
  }

  return issues;
}

/**
 * Bygger Eurofins-import-filen ved at udfylde deres egen ordreskabelon.
 *
 * Der skrives kun i A4:B303 og C4:S303 i arket Sample_Data. Header, footer,
 * de fem skjulte ark og ordrenoglerne kommer uroert fra skabelonen — det er
 * dem Eurofins' import bruger til at genkende ordren.
 *
 * Proever uden analyse er kortlagte materialer og horer ikke hjemme i
 * laboratoriets system.
 */
export function generateEurofinsXlsx(opts: {
  template: Buffer;
  caseName: string;
  samples: ExportSample[];
}): { file: Buffer; filename: string; rowCount: number } {
  const { template, caseName, samples } = opts;

  const codes = readAnalysisCodes(template);
  const expected = EUROFINS_ANALYSES.map((a) => `[AAA].[${a.code}]`);
  if (codes.join("|") !== expected.join("|")) {
    throw new Error(
      "Skabelonens analysekolonner matcher ikke appens kortlægning. " +
        `Skabelonen har ${codes.length} kolonner: ${codes.join(", ")}.`,
    );
  }

  const rows: SampleRow[] = samples
    .filter((s) => s.is_lab_sample)
    .map((sample) => ({
      label: sample.label,
      caseName,
      analyses: EUROFINS_ANALYSES.map((a) =>
        a.mappedFrom ? sample[a.mappedFrom] : false,
      ),
    }));

  const file = fillOrderTemplate(template, rows, EUROFINS_ANALYSES.length);

  return { file, filename: eurofinsFilename(caseName), rowCount: rows.length };
}

/**
 * Filnavn der kan overleve bade en Windows-download og Eurofins' import.
 *
 * Ordrenoglerne star i det skjulte Order_Metadata, ikke i navnet, sa filen
 * far sagsnavnet: to sager hentet samme dag skal ikke lande som "(1)" og
 * "(2)" i screenerens downloadmappe.
 *
 * Men navnet er ikke ligegyldigt. Eurofins afviste
 * "Stationsvænget 11, 6840 Oksbøl - Eurofins (3).xlsx" med "Storage Status
 * of the required document is invalid" og tog den samme fil — byte for byte
 * den samme — under et rent ASCII-navn. Derfor omskrives ae, oe og aa, og
 * alt uden for ASCII falder fra.
 *
 * Komma og parenteser ryger med. De stod i det navn der blev afvist, og vi
 * kunne ikke skille dem fra bogstaverne uden endnu en runde uploads —
 * og et navn uden komma koster ingenting. Mellemrum bliver til _ af samme
 * grund: det er det tegn der oftest bliver kodet om undervejs.
 *
 * Til sidst et tidsstempel, sa to hentninger af samme sag aldrig far samme
 * navn. Ellers doeber browseren nummer to "... (1).xlsx" — og parentesen er
 * praecis det der stod i navnet Eurofins afviste. Millisekunder og ikke
 * sekunder: to klik i traek ligger inden for det samme sekund.
 */
export function eurofinsFilename(
  caseName: string,
  tidspunkt = Date.now(),
): string {
  const ascii = caseName
    .normalize("NFC")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "Ae")
    .replace(/ø/g, "oe")
    .replace(/Ø/g, "Oe")
    .replace(/å/g, "aa")
    .replace(/Å/g, "Aa")
    // Resten af accenterne: e-accent bliver til e frem for at falde helt bort.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  const safe =
    ascii
      .replace(/[^A-Za-z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 80)
      .replace(/_$/, "") || "sag";

  return `${safe}_Eurofins_t${tidspunkt}.xlsx`;
}
