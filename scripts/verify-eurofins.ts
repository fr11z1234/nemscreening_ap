/**
 * Kontrollerer at den genererede Eurofins-CSV har praecis den struktur
 * skabelonen kraever. Koeres med: npx tsx scripts/verify-eurofins.ts
 *
 * Provedataen herunder svarer til de forste raekker i det nuvaerende ark (2.csv),
 * sa outputtet kan sammenlignes direkte med det I sender i dag.
 */
import {
  generateEurofinsCsv,
  validateForExport,
  type ExportSample,
} from "../src/lib/eurofins/generate";
import { EUROFINS_COLUMN_COUNT } from "../src/lib/eurofins/template";

function countFields(line: string): number {
  let fields = 1;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') i++;
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields++;
    }
  }
  return fields;
}

const sample = (
  seq: number,
  material: string,
  type: string,
  a: Partial<ExportSample>,
): ExportSample => {
  const flags = {
    analysis_pcb: false,
    analysis_asbestos: false,
    analysis_metals: false,
    analysis_pah: false,
    ...a,
  };
  const isLab =
    flags.analysis_pcb ||
    flags.analysis_asbestos ||
    flags.analysis_metals ||
    flags.analysis_pah;
  return {
    label: isLab ? `P${seq}` : String(seq),
    material,
    sample_type: type,
    is_lab_sample: isLab,
    ...flags,
  };
};

const samples: ExportSample[] = [
  sample(1, "Træ", "Hvid maling", {
    analysis_pcb: true,
    analysis_metals: true,
  }),
  sample(2, "Træ", "Sort maling", { analysis_pcb: true, analysis_metals: true }),
  sample(3, "Træ", "Hvid maling", { analysis_pcb: true, analysis_metals: true }),
  sample(4, "Tapet", "Hvid maling", { analysis_metals: true }),
  sample(5, "Tapet", "Grå maling", { analysis_metals: true }),
  sample(6, "Vinduer", "Hvid maling", { analysis_metals: true }),
  // Kortlagte materialer uden analyse — skal IKKE med i filen.
  sample(7, "Jern og metal", "Ubehandlet", {}),
  sample(8, "Beton (undtagen, gasbeton, letbeton)", "Ubehandlet", {}),
];

const caseName = "Nørrebrogade 12, 2200 København N";
const { csv, rowCount } = generateEurofinsCsv({ caseName, samples });

const lines = csv.split("\r\n").filter((l, i, arr) => i < arr.length - 1);

let failures = 0;
const fail = (msg: string) => {
  console.error(`  FEJL: ${msg}`);
  failures++;
};

console.log(csv.replace(/\r\n/g, "\n"));
console.log("---");

// 1. Alle raekker skal have samme antal kolonner som skabelonen.
lines.forEach((line, i) => {
  const n = countFields(line);
  if (n !== EUROFINS_COLUMN_COUNT) {
    fail(`raekke ${i + 1} har ${n} kolonner, forventede ${EUROFINS_COLUMN_COUNT}`);
  }
});

// 2. Kun prover med analyse kommer med.
if (rowCount !== 6) fail(`forventede 6 dataraekker, fik ${rowCount}`);
if (csv.includes("Jern og metal")) fail("kortlagt materiale endte i filen");

// 3. Header- og footerblokke ordret.
if (!lines[0].startsWith("Prøvedetaljer,,Analyses Details (YVD5SC230009)"))
  fail("forste raekke matcher ikke skabelonen");
if (!lines[1].startsWith("Tekst,Tekst,[AAA].[PVL7X]"))
  fail("kodelinjen matcher ikke skabelonen");
if (!lines[2].startsWith("Prøvemærkning*,Sagsnavn,"))
  fail("kolonneoverskrifterne matcher ikke skabelonen");
if (!lines.some((l) => l.startsWith("SampleCustomerReference,SampleDescription,Standard")))
  fail("footerblokken mangler");
if (!lines.some((l) => l.startsWith("FreeText,FreeText,")))
  fail("FreeText-raekken mangler");

// 4. Mapping: P1 har PCB (kol. 3) og metaller+Hg (kol. 10), intet andet.
const p1 = lines.find((l) => l.startsWith("P1,"))!;
const p1Flags = p1.slice(p1.lastIndexOf('",') + 2).split(",");
const expected = ["1", "0", "0", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
if (p1Flags.join(",") !== expected.join(",")) {
  fail(`P1 analyseflag var [${p1Flags}], forventede [${expected}]`);
}

// 5. Sagsnavn med komma skal vaere quotet.
if (!p1.includes(`"${caseName}"`)) fail("sagsnavn med komma blev ikke quotet");

// 6. Valideringen fanger en sag uden analyser.
const noAnalyses = validateForExport("Testvej 1", [samples[6]]);
if (!noAnalyses.some((i) => i.level === "error"))
  fail("valideringen fangede ikke en sag uden analyser");

console.log(
  failures === 0
    ? `OK — ${lines.length} raekker, ${EUROFINS_COLUMN_COUNT} kolonner, ${rowCount} prover til laboratoriet.`
    : `${failures} fejl.`,
);
process.exit(failures === 0 ? 0 : 1);
