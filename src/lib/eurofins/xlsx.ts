import { patchZip, readPart, readZip, writeZip, type ZipEntry } from "./zip";

/**
 * Udfylder Eurofins' egen ordreskabelon.
 *
 * Vi bygger ikke en ny projektmappe. Skabelonen fra Eurofins indeholder fem
 * skjulte ark, hvoraf Order_Metadata binder filen til kunde, kontrakt og
 * ordreskabelon hos dem — uden det ark ved deres import ikke hvilken ordre
 * uploadet hoerer til. Derfor skriver vi kun i cellerne i Sample_Data og
 * lader hver anden byte i arkivet vaere.
 */

const SAMPLE_DATA = "xl/worksheets/sheet1.xml";
const ORDER_METADATA = "xl/worksheets/sheet2.xml";
const SHARED_STRINGS = "xl/sharedStrings.xml";

/** Foerste og sidste raekke skabelonen har afsat til proever. */
const FIRST_ROW = 4;
const LAST_ROW = 303;

export const MAX_SAMPLES = LAST_ROW - FIRST_ROW + 1;

/** Kolonne A og B er tekst, C til S er de 17 analyser. */
const LABEL_COLUMN = "A";
const CASE_NAME_COLUMN = "B";
const FIRST_ANALYSIS_COLUMN = 2; // 0-indekseret: C

/** Naar Eurofins genererer en skabelon, ligger noeglerne i Order_Metadata!B. */
export type OrderMetadata = {
  /** Kundenummer — "Nemscreening ApS, Esbjerg V" i deres portal. */
  customerId: string;
  /** Kontrakten prislisten haenger pa. */
  contractId: string;
  /** Ordreskabelonen, dvs. hvilke analyser filen maa bestille. */
  orderTemplateId: string;
};

const METADATA_CELLS: Record<keyof OrderMetadata, string> = {
  customerId: "B1",
  contractId: "B2",
  orderTemplateId: "B4",
};

type CellValue =
  | { kind: "shared"; index: number }
  | { kind: "number"; value: number }
  | { kind: "empty" };

/** En raekke i Sample_Data, klar til at blive skrevet. */
export type SampleRow = {
  /** Kolonne A — proevemaerkning, fx "P3". */
  label: string;
  /** Kolonne B — sagsnavn. */
  caseName: string;
  /** 17 vaerdier til kolonne C til S, i skabelonens raekkefoelge. */
  analyses: boolean[];
};

export function fillOrderTemplate(
  template: Buffer,
  rows: SampleRow[],
  analysisCount: number,
): Buffer {
  if (rows.length > MAX_SAMPLES) {
    throw new Error(
      `Skabelonen har plads til ${MAX_SAMPLES} proever, og der er ${rows.length}.`,
    );
  }

  const entries = readZip(template);
  const strings = readSharedStrings(partOf(entries, SHARED_STRINGS));

  // Nye tekster laegges bagest i strengtabellen, sa skabelonens egne
  // indekser — og dermed alle celler vi ikke roerer — bliver staende.
  const added: string[] = [];
  const indexOf = new Map(strings.map((s, i) => [s, i]));
  const share = (text: string): number => {
    const known = indexOf.get(text);
    if (known !== undefined) return known;
    const index = strings.length + added.length;
    added.push(text);
    indexOf.set(text, index);
    return index;
  };

  const cells = new Map<number, Map<string, CellValue>>();
  rows.forEach((row, i) => {
    const values = new Map<string, CellValue>();
    values.set(LABEL_COLUMN, { kind: "shared", index: share(row.label) });
    values.set(CASE_NAME_COLUMN, { kind: "shared", index: share(row.caseName) });

    if (row.analyses.length !== analysisCount) {
      throw new Error(
        `${row.label} har ${row.analyses.length} analysekolonner, skabelonen har ${analysisCount}.`,
      );
    }
    row.analyses.forEach((on, col) => {
      values.set(columnName(FIRST_ANALYSIS_COLUMN + col), {
        kind: "number",
        value: on ? 1 : 0,
      });
    });

    cells.set(FIRST_ROW + i, values);
  });

  return writeZip(
    patchZip(entries, {
      [SHARED_STRINGS]: (xml) => appendSharedStrings(xml, added),
      [SAMPLE_DATA]: (xml) => fillRows(xml, cells),
    }),
  );
}

/** Laeser noeglerne ud af skabelonens skjulte Order_Metadata-ark. */
export function readOrderMetadata(template: Buffer): OrderMetadata {
  const entries = readZip(template);
  const strings = readSharedStrings(partOf(entries, SHARED_STRINGS));
  const sheet = partOf(entries, ORDER_METADATA);

  const read = (ref: string): string => {
    const cell = new RegExp(
      `<x:c r="${ref}"[^>]*t="s"[^>]*>\\s*<x:v>(\\d+)</x:v>`,
    ).exec(sheet);
    const value = cell ? strings[Number(cell[1])] : undefined;
    if (!value) {
      throw new Error(`Skabelonen mangler Order_Metadata!${ref}.`);
    }
    return value;
  };

  return {
    customerId: read(METADATA_CELLS.customerId),
    contractId: read(METADATA_CELLS.contractId),
    orderTemplateId: read(METADATA_CELLS.orderTemplateId),
  };
}

/**
 * Analysekoderne som de star i Sample_Data raekke 2, kolonne C til S.
 *
 * Bruges til at fange den dag Eurofins udleverer en skabelon med andre
 * analyser: sa passer appens kortlaegning ikke laengere, og vi vil hellere
 * afvise eksporten end sende en proeve til den forkerte analyse.
 */
export function readAnalysisCodes(template: Buffer): string[] {
  const entries = readZip(template);
  const strings = readSharedStrings(partOf(entries, SHARED_STRINGS));
  const sheet = partOf(entries, SAMPLE_DATA);

  const row = /<x:row r="2"[^>]*>([\s\S]*?)<\/x:row>/.exec(sheet);
  if (!row) throw new Error("Skabelonen mangler kodelinjen i Sample_Data.");

  const codes: string[] = [];
  for (let col = FIRST_ANALYSIS_COLUMN; ; col++) {
    const cell = new RegExp(
      `<x:c r="${columnName(col)}2"[^>]*t="s"[^>]*>\\s*<x:v>(\\d+)</x:v>`,
    ).exec(row[1]);
    if (!cell) break;
    codes.push(strings[Number(cell[1])] ?? "");
  }
  return codes;
}

/**
 * Filnavnet Eurofins selv giver skabelonen: kunde, ordreskabelon, kontrakt,
 * dato. Vi genskaber det, sa filen ser ud praecis som en de har udleveret.
 */
export function orderTemplateFilename(meta: OrderMetadata, date: Date): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return `${meta.customerId}-${meta.orderTemplateId}-${meta.contractId}-${day}.xlsx`;
}

function partOf(entries: ZipEntry[], name: string): string {
  const entry = entries.find((e) => e.name === name);
  if (!entry) throw new Error(`Skabelonen mangler ${name}.`);
  return readPart(entry);
}

function readSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const items = /<x:si\s*\/>|<x:si[^>]*>([\s\S]*?)<\/x:si>/g;
  let match: RegExpExecArray | null;
  while ((match = items.exec(xml))) {
    const body = match[1] ?? "";
    const runs = [...body.matchAll(/<x:t[^>]*>([\s\S]*?)<\/x:t>/g)];
    out.push(runs.map((r) => unescapeXml(r[1])).join(""));
  }
  return out;
}

function appendSharedStrings(xml: string, added: string[]): string {
  if (added.length === 0) return xml;

  const close = xml.lastIndexOf("</x:sst>");
  if (close < 0) throw new Error("Skabelonens strengtabel har ingen slutmarkoer.");

  const block = added
    .map((text) => {
      const preserve = text !== text.trim() ? ' xml:space="preserve"' : "";
      return `<x:si><x:t${preserve}>${escapeXml(text)}</x:t></x:si>`;
    })
    .join("");

  // Skabelonen skriver ingen taellere pa <x:sst>, men holder dem opdaterede
  // hvis en fremtidig skabelon goer.
  const head = xml
    .slice(0, close)
    .replace(
      /(<x:sst\b[^>]*?)(count|uniqueCount)="(\d+)"/g,
      (_all, before, name, n) => `${before}${name}="${Number(n) + added.length}"`,
    );

  return head + block + xml.slice(close);
}

function fillRows(xml: string, rows: Map<number, Map<string, CellValue>>): string {
  const filled = new Set<number>();

  const next = xml.replace(
    /<x:row r="(\d+)"([^>]*)>([\s\S]*?)<\/x:row>/g,
    (whole, number: string, attrs: string, body: string) => {
      // En tom <x:row ... /> ville have slugt de foelgende raekker i body.
      // Lad den vaere: sa fanger kontrollen nedenfor det som en fejl.
      if (attrs.trimEnd().endsWith("/")) return whole;

      const values = rows.get(Number(number));
      if (!values) return whole;
      filled.add(Number(number));
      return `<x:row r="${number}"${attrs}>${setCells(body, values)}</x:row>`;
    },
  );

  for (const row of rows.keys()) {
    if (!filled.has(row)) {
      throw new Error(`Skabelonen mangler raekke ${row} i Sample_Data.`);
    }
  }
  return next;
}

/**
 * Skriver vaerdier ind i eksisterende celler. Alt andet end vaerdien — ikke
 * mindst typografien i s — bevares, sa arket ser ud som skabelonen gjorde.
 */
function setCells(body: string, values: Map<string, CellValue>): string {
  const seen = new Set<string>();

  const next = body.replace(
    /<x:c\s+([^>]*?)\/>|<x:c\s+([^>]*?)>([\s\S]*?)<\/x:c>/g,
    (whole, selfClosing: string | undefined, open: string | undefined) => {
      const attrs = selfClosing ?? open ?? "";
      const ref = /\br="([A-Z]+)(\d+)"/.exec(attrs);
      if (!ref) return whole;

      const value = values.get(ref[1]);
      if (!value) return whole;
      seen.add(ref[1]);

      const style = /\bs="(\d+)"/.exec(attrs);
      const head = `<x:c r="${ref[1]}${ref[2]}"${style ? ` s="${style[1]}"` : ""}`;

      if (value.kind === "empty") return `${head} />`;
      if (value.kind === "shared") {
        return `${head} t="s"><x:v>${value.index}</x:v></x:c>`;
      }
      // Heltal, aldrig 0.0: skabelonens validering pa C4:S303 er "whole".
      return `${head}><x:v>${Math.trunc(value.value)}</x:v></x:c>`;
    },
  );

  for (const column of values.keys()) {
    if (!seen.has(column)) {
      throw new Error(`Skabelonen mangler kolonne ${column} i proeveraekkerne.`);
    }
  }
  return next;
}

function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_all, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}
