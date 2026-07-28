import {
  LAB_PARAMETERS,
  readValue,
  type LabParameterKey,
  type LabValue,
} from "./parametre";

/**
 * Laeser Eurofins' AllResults-fil.
 *
 * Filen er semikolonsepareret med seks linjers hoved, derefter en
 * "Komponent"-linje med kolonnenavnene, en "Enhed"-linje, en "Prøver"-linje
 * og sa en linje pr. prove.
 *
 * Vi finder kolonnerne pa navn, ikke pa nummer. Filen har to saet
 * PCB-kolonner og to der begge hedder "Spor af Chlorparaffiner", hvor kun det
 * ene saet er udfyldt — og hvilket, afhaenger af analysen. Sa vi samler alle
 * kolonner med det rigtige navn og tager den forste der har noget i sig.
 */

export type LabRow = {
  /** Eurofins' egen provereference, fx "862-2026-03815501". */
  reference: string;
  /** Provemaerket som vi sendte det: "1" fra gamle sager, "P1" fra nye. */
  mark: string;
  values: Record<LabParameterKey, LabValue>;
  /** Alle udfyldte kolonner, sa intet fra svaret gar tabt. */
  raw: Record<string, string>;
};

export type LabFile = {
  batch: string | null;
  caseName: string | null;
  /** Datoen laboratoriet modtog proverne, som ISO-dato. */
  receivedAt: string | null;
  reportRef: string | null;
  rows: LabRow[];
};

export class LabParseError extends Error {}

/**
 * Afkoder filen.
 *
 * Eurofins leverer bade UTF-8 og Windows-1252 alt efter hvor filen har
 * vaeret forbi. Uden det her bliver "Kviksølv" til "Kviksï¿½lv" og
 * kolonnematchet fejler pa alle de danske navne.
 */
export function decodeLabFile(bytes: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  if (!utf8.includes("�")) return utf8.replace(/^﻿/, "");
  return new TextDecoder("windows-1252").decode(bytes).replace(/^﻿/, "");
}

export function parseLabFile(text: string): LabFile {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) throw new LabParseError("Filen er tom.");

  const header = (prefix: string): string | null => {
    const line = lines.find((l) => l.startsWith(`${prefix};`));
    const value = line?.split(";")[1]?.trim();
    return value ? value : null;
  };

  const componentLine = lines.find((l) => l.startsWith("Komponent;"));
  if (!componentLine) {
    throw new LabParseError(
      "Filen har ingen Komponent-linje. Er det Eurofins' AllResults-fil?",
    );
  }
  const components = componentLine.split(";").map((c) => c.trim());

  // Kolonnenumre pr. parameter. Flere er tilladt — se noten ovenfor.
  const columns = new Map<LabParameterKey, number[]>();
  for (const parameter of LAB_PARAMETERS) {
    const wanted = parameter.eurofins.map(normalise);
    const found = components.flatMap((name, i) =>
      wanted.includes(normalise(name)) ? [i] : [],
    );
    columns.set(parameter.key, found);
  }

  const missing = LAB_PARAMETERS.filter(
    (p) => (columns.get(p.key) ?? []).length === 0,
  );
  if (missing.length === LAB_PARAMETERS.length) {
    throw new LabParseError(
      "Ingen af de forventede kolonner blev fundet. Filen ser ikke ud som en AllResults-fil.",
    );
  }

  const rows: LabRow[] = [];
  for (const line of lines) {
    const cells = line.split(";");
    // Dataraekkerne er dem hvor forste felt er en provereference og andet
    // felt er provemaerket. Hovedet har tekst i forste felt og intet i andet.
    if (!/^\d[\d-]*\d$/.test(cells[0]?.trim() ?? "")) continue;
    const mark = cells[1]?.trim();
    if (!mark) continue;

    const values = {} as Record<LabParameterKey, LabValue>;
    for (const parameter of LAB_PARAMETERS) {
      const indexes = columns.get(parameter.key) ?? [];
      const cell = indexes
        .map((i) => cells[i]?.trim() ?? "")
        .find((v) => v !== "");
      values[parameter.key] = readValue(cell ?? "");
    }

    const raw: Record<string, string> = {};
    components.forEach((name, i) => {
      const cell = cells[i]?.trim();
      if (name && cell) raw[name] = cell;
    });

    rows.push({ reference: cells[0].trim(), mark, values, raw });
  }

  if (rows.length === 0) {
    throw new LabParseError("Filen indeholder ingen prøverækker.");
  }

  return {
    batch: header("Batch"),
    caseName: header("SagsNavn"),
    receivedAt: toIsoDate(header("Modtaget på laboratoriet")),
    reportRef: header("Rapport (seneste rapportrevision)"),
    rows,
  };
}

/** "09-06-2026" er dansk datoformat, ikke amerikansk. */
function toIsoDate(text: string | null): string | null {
  if (!text) return null;
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function normalise(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Kobler svarets provemaerker til sagens prover.
 *
 * Gamle sager blev sendt med maerkerne "1", "2", "3"; appen sender "P1",
 * "P3". Begge dele skal kunne kobles, sa vi sammenligner bade ordret og pa
 * tallet alene.
 */
export function matchRows<T extends { id: string; label: string; seq: number }>(
  rows: LabRow[],
  samples: T[],
): { row: LabRow; sample: T | null }[] {
  const byLabel = new Map<string, T>();
  for (const sample of samples) {
    byLabel.set(normaliseMark(sample.label), sample);
    byLabel.set(normaliseMark(String(sample.seq)), sample);
  }
  return rows.map((row) => ({
    row,
    sample: byLabel.get(normaliseMark(row.mark)) ?? null,
  }));
}

/** "P1", "p1", " 1 " og "01" er det samme prove­nummer. */
function normaliseMark(mark: string): string {
  const trimmed = mark.trim().replace(/^[Pp]/, "");
  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) && trimmed !== ""
    ? String(asNumber)
    : mark.trim().toLowerCase();
}
