import {
  DEFAULT_ANALYSES_DETAILS,
  EUROFINS_ANALYSES,
  EUROFINS_COLUMN_COUNT,
} from "./template";
import type { AnalysisKey } from "@/lib/types";

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

/** RFC 4180: kun felter med komma, citationstegn eller linjeskift quotes. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvRow(fields: string[]): string {
  return fields.map(csvField).join(",");
}

/** En raekke med det rigtige antal tomme felter. */
function paddedRow(leading: string[]): string {
  const fields = [...leading];
  while (fields.length < EUROFINS_COLUMN_COUNT) fields.push("");
  return csvRow(fields);
}

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
 * Bygger Eurofins-import-CSV'en.
 *
 * Filen genskaber skabelonens header- og footer-blokke ordret og indsaetter en
 * datarraekke pr. prove der skal analyseres. Prover uden analyse er kortlagte
 * materialer og horer ikke hjemme i laboratoriets system.
 *
 * Returnerer uden BOM — kaldere der skriver en fil tilfojer den selv.
 */
export function generateEurofinsCsv(opts: {
  caseName: string;
  samples: ExportSample[];
  analysesDetails?: string;
  eol?: string;
}): { csv: string; rowCount: number } {
  const { caseName, samples } = opts;
  const analysesDetails = opts.analysesDetails ?? DEFAULT_ANALYSES_DETAILS;
  const eol = opts.eol ?? "\r\n";

  const labSamples = samples.filter((s) => s.is_lab_sample);

  const lines: string[] = [
    paddedRow(["Prøvedetaljer", "", `Analyses Details (${analysesDetails})`]),
    csvRow([
      "Tekst",
      "Tekst",
      ...EUROFINS_ANALYSES.map((a) => `[AAA].[${a.code}]`),
    ]),
    csvRow([
      "Prøvemærkning*",
      "Sagsnavn",
      ...EUROFINS_ANALYSES.map((a) => a.name),
    ]),
  ];

  for (const sample of labSamples) {
    lines.push(
      csvRow([
        sample.label,
        caseName,
        ...EUROFINS_ANALYSES.map((a) =>
          a.mappedFrom && sample[a.mappedFrom as AnalysisKey] ? "1" : "0",
        ),
      ]),
    );
  }

  lines.push(
    paddedRow([]),
    csvRow([
      "SampleCustomerReference",
      "SampleDescription",
      ...EUROFINS_ANALYSES.map(() => "Standard"),
    ]),
    paddedRow([]),
    paddedRow(["*"]),
    csvRow(["FreeText", "FreeText", ...EUROFINS_ANALYSES.map(() => "")]),
  );

  return { csv: lines.join(eol) + eol, rowCount: labSamples.length };
}

/** Filnavn der kan overleve en Windows-download. */
export function eurofinsFilename(caseName: string): string {
  const safe =
    caseName
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "sag";
  return `${safe} - Eurofins.csv`;
}
