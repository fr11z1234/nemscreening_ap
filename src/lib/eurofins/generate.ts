import { EUROFINS_ANALYSES } from "./template";
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
 * Filnavn der kan overleve en Windows-download.
 *
 * Eurofins doeber selv skabelonen efter kunde, ordreskabelon, kontrakt og
 * dato — men de noegler star ogsa i det skjulte Order_Metadata, og det er
 * dem importen bruger. Navnet er testet: filen gar igennem uanset hvad den
 * hedder. Sa den far sagsnavnet, sa to sager hentet samme dag ikke lander
 * som "(1)" og "(2)" i screenerens downloadmappe.
 */
export function eurofinsFilename(caseName: string): string {
  const safe =
    caseName
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "sag";
  return `${safe} - Eurofins.xlsx`;
}
