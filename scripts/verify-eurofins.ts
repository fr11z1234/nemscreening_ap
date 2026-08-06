/**
 * Kontrollerer at den genererede .xlsx er Eurofins' egen skabelon med proever
 * skrevet ind — og ikke en ny projektmappe der ligner. Koeres med:
 *   npm run verify:eurofins
 *
 * Provedataen herunder svarer til de forste raekker i det nuvaerende ark, sa
 * outputtet kan sammenlignes direkte med det I sender i dag.
 */
import { writeFileSync } from "node:fs";
import {
  eurofinsFilename,
  generateEurofinsXlsx,
  validateForExport,
  type ExportSample,
} from "../src/lib/eurofins/generate";
import { loadOrderTemplate } from "../src/lib/eurofins/skabelon";
import { EUROFINS_ANALYSES } from "../src/lib/eurofins/template";
import { readPart, readZip } from "../src/lib/eurofins/zip";
import { MAX_SAMPLES, readOrderMetadata } from "../src/lib/eurofins/xlsx";

let failures = 0;
const fail = (msg: string) => {
  console.error(`  FEJL: ${msg}`);
  failures++;
};
const check = (ok: boolean, msg: string) => {
  if (!ok) fail(msg);
};

const sample = (
  seq: number,
  material: string,
  type: string,
  a: Partial<ExportSample>,
): ExportSample => {
  const period = a.period ?? "foer_1990";
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
    period,
    is_lab_sample: isLab,
    ...flags,
  };
};

const samples: ExportSample[] = [
  sample(1, "Træ", "Hvid maling", { analysis_pcb: true, analysis_metals: true }),
  sample(2, "Træ", "Sort maling", { analysis_pcb: true, analysis_metals: true }),
  sample(3, "Træ", "Hvid maling", { analysis_pcb: true, analysis_metals: true }),
  sample(4, "Tapet", "Hvid maling", { analysis_metals: true }),
  sample(5, "Tapet", "Grå maling", { analysis_metals: true }),
  sample(6, "Vinduer", "Hvid maling", { analysis_asbestos: true, analysis_pah: true }),
  // Kortlagte materialer uden analyse — skal IKKE med i filen.
  sample(7, "Jern og metal", "Ubehandlet", {}),
  sample(8, "Beton (undtagen, gasbeton, letbeton)", "Ubehandlet", {}),
];

const caseName = "Nørrebrogade 12, 2200 København N";
const template = loadOrderTemplate();
const { file, filename, rowCount } = generateEurofinsXlsx({
  template,
  caseName,
  samples,
});

const before = new Map(readZip(template).map((e) => [e.name, e]));
const after = new Map(readZip(file).map((e) => [e.name, e]));

// 1. Alle dele skal vaere der, i samme raekkefolge.
const namesBefore = [...before.keys()].join("|");
const namesAfter = [...after.keys()].join("|");
check(namesBefore === namesAfter, `delene aendrede sig:\n  ${namesBefore}\n  ${namesAfter}`);

// 2. Alt andet end de to dele vi skriver i skal vaere byte for byte det samme.
const rewritten = new Set(["xl/worksheets/sheet1.xml", "xl/sharedStrings.xml"]);
for (const [name, original] of before) {
  const copy = after.get(name);
  if (!copy) continue;
  if (rewritten.has(name)) continue;
  check(
    original.crc32 === copy.crc32 && original.data.equals(copy.data),
    `${name} blev aendret — den skulle kopieres uroert`,
  );
}

// 3. De skjulte ark og ordrenoglerne overlever.
const meta = readOrderMetadata(file);
check(meta.customerId === "A01466717NKH", `kunde-id blev ${meta.customerId}`);
check(meta.contractId === "VL0001974001", `kontrakt-id blev ${meta.contractId}`);
check(
  meta.orderTemplateId === "YVD5SC230009",
  `ordreskabelon-id blev ${meta.orderTemplateId}`,
);

const workbook = readPart(after.get("xl/workbook.xml")!);
for (const sheet of [
  "Sample_Data",
  "Order_Metadata",
  "OSIS_Products",
  "OSIS_AF",
  "OSIS_ListOfChoices",
  "sandbox",
]) {
  check(workbook.includes(`name="${sheet}"`), `arket ${sheet} mangler`);
}
for (const range of ["SampleDetailsRange", "ProductList", "Matrix", "BooleanList"]) {
  check(workbook.includes(`name="${range}"`), `det navngivne omrade ${range} mangler`);
}
check(
  workbook.includes('workbookAlgorithmName="SHA-512"'),
  "projektmappens beskyttelse blev fjernet",
);

// 4. Sample_Data: header, footer og laas skal staa uroert.
const sheet1 = readPart(after.get("xl/worksheets/sheet1.xml")!);
const sheet1Before = readPart(before.get("xl/worksheets/sheet1.xml")!);

for (const marker of [
  '<x:sheetProtection password="E7F0"',
  '<x:mergeCell ref="A1:B1" />',
  '<x:mergeCell ref="C1:S1" />',
  '<x:dataValidations count="3">',
  'sqref="C4:S303"',
  '<x:dimension ref="A1:S308" />',
]) {
  check(sheet1.includes(marker), `Sample_Data mangler ${marker}`);
}

const strings = [
  ...readPart(after.get("xl/sharedStrings.xml")!).matchAll(
    /<x:t[^>]*>([\s\S]*?)<\/x:t>/g,
  ),
].map((m) => m[1]);
const cellText = (ref: string, xml = sheet1): string | null => {
  const m = new RegExp(`<x:c r="${ref}"[^>]*t="s"[^>]*><x:v>(\\d+)</x:v>`).exec(xml);
  return m ? strings[Number(m[1])] : null;
};
const cellNumber = (ref: string, xml = sheet1): string | null => {
  const m = new RegExp(`<x:c r="${ref}"(?![^>]*t=")[^>]*><x:v>([^<]*)</x:v>`).exec(xml);
  return m ? m[1] : null;
};

check(cellText("A1") === "Prøvedetaljer", "raekke 1 blev aendret");
check(
  cellText("C1") === "Analyses Details (YVD5SC230009)",
  "aftalekoden i C1 blev aendret",
);
check(cellText("A2") === "Tekst", "kodelinjens A2 blev aendret");
check(cellText("C2") === "[AAA].[PVL7X]", "foerste analysekode blev aendret");
check(cellText("A3") === "Prøvemærkning*", "kolonneoverskriften i A3 blev aendret");
check(cellText("B3") === "Sagsnavn", "kolonneoverskriften i B3 blev aendret");
check(
  cellText("A305") === "SampleCustomerReference",
  "footerraekken 305 flyttede sig",
);
check(cellText("B305") === "SampleDescription", "footerraekken 305 flyttede sig");
check(cellText("C305") === "Standard", "footerraekken 305 flyttede sig");
check(cellText("A307") === "*", "stjernen i raekke 307 flyttede sig");
check(cellText("A308") === "FreeText", "FreeText-raekken flyttede sig");

// 5. Proeverne staar fra raekke 4 og frem, med sagsnavnet i kolonne B.
check(rowCount === 6, `forventede 6 dataraekker, fik ${rowCount}`);
for (let i = 0; i < 6; i++) {
  const row = 4 + i;
  check(cellText(`A${row}`) === `P${i + 1}`, `A${row} blev ${cellText(`A${row}`)}`);
  check(cellText(`B${row}`) === caseName, `B${row} blev ${cellText(`B${row}`)}`);
}
check(!sheet1.includes("Jern og metal"), "kortlagt materiale endte i filen");

// 6. Kortlaegningen: P1 har PCB (C) og 6 metaller+Hg (J), intet andet.
//    P6 har asbest (F) og PAH (Q).
const flagsOf = (row: number) =>
  EUROFINS_ANALYSES.map((_, i) =>
    cellNumber(String.fromCharCode(67 + i) + row),
  ).join("");
const pcb = EUROFINS_ANALYSES.findIndex((a) => a.mappedFrom === "analysis_pcb");
const hg = EUROFINS_ANALYSES.findIndex((a) => a.mappedFrom === "analysis_metals");
const asbest = EUROFINS_ANALYSES.findIndex((a) => a.mappedFrom === "analysis_asbestos");
const pah = EUROFINS_ANALYSES.findIndex((a) => a.mappedFrom === "analysis_pah");
const expect = (...on: number[]) =>
  EUROFINS_ANALYSES.map((_, i) => (on.includes(i) ? "1" : "0")).join("");

check(flagsOf(4) === expect(pcb, hg), `P1 blev ${flagsOf(4)}`);
check(flagsOf(9) === expect(asbest, pah), `P6 blev ${flagsOf(9)}`);

// 7. Heltal, aldrig 0.0 — skabelonens validering pa C4:S303 er "whole".
const decimals = [...sheet1.matchAll(/<x:v>(-?\d+\.\d+)<\/x:v>/g)];
check(decimals.length === 0, `${decimals.length} celler blev skrevet som decimaltal`);

// 8. De ubrugte proeveraekker staar som skabelonen efterlod dem.
const rowXml = (n: number, xml: string) =>
  new RegExp(`<x:row r="${n}"[\\s\\S]*?</x:row>`).exec(xml)?.[0] ?? "";
for (const n of [10, 150, 303]) {
  check(
    rowXml(n, sheet1) === rowXml(n, sheet1Before),
    `raekke ${n} blev aendret, selv om den ikke bruges`,
  );
}

// 9. Strengtabellen udvides bagi, sa skabelonens egne indekser staar fast.
const stringsBefore = [
  ...readPart(before.get("xl/sharedStrings.xml")!).matchAll(
    /<x:t[^>]*>([\s\S]*?)<\/x:t>/g,
  ),
].map((m) => m[1]);
check(
  strings.slice(0, stringsBefore.length).join(" ") ===
    stringsBefore.join(" "),
  "skabelonens egne strenge blev flyttet rundt",
);
check(
  strings.length === stringsBefore.length + 7,
  `forventede 7 nye strenge (6 maerkninger + sagsnavn), fik ${strings.length - stringsBefore.length}`,
);

// 10. Filnavnet er sagens — men rent ASCII, uden mellemrum og med et
//     tidsstempel. Eurofins afviste et navn med ae, oe og en parentes i.
check(
  eurofinsFilename("Nørrebrogade 12, 2200 København N", 1750000000000) ===
    "Noerrebrogade_12_2200_Koebenhavn_N_Eurofins_t1750000000000.xlsx",
  `filnavnet blev ${eurofinsFilename("Nørrebrogade 12, 2200 København N", 1750000000000)}`,
);
check(
  eurofinsFilename('Testvej 1: "A/B"', 1) === "Testvej_1_A_B_Eurofins_t1.xlsx",
  "tegn Windows ikke tillader i filnavne blev ikke fjernet",
);
check(
  /^[A-Za-z0-9._-]+_t\d+\.xlsx$/.test(filename),
  `filnavnet er ikke rent ASCII uden mellemrum: ${filename}`,
);
// To hentninger af samme sag ma ikke give samme navn — sa doeber browseren
// nummer to "(1)", og det var netop en parentes Eurofins afviste.
check(
  eurofinsFilename(caseName, 1) !== eurofinsFilename(caseName, 2),
  "to hentninger af samme sag fik samme filnavn",
);
check(
  eurofinsFilename("Æblevej 3, Ærø", 1) === "Aeblevej_3_Aeroe_Eurofins_t1.xlsx",
  "store AE og OE blev ikke skrevet om",
);
check(
  eurofinsFilename("   ", 1) === "sag_Eurofins_t1.xlsx",
  "et tomt sagsnavn gav ikke et brugbart filnavn",
);

// 11. Valideringen fanger de sager der ikke kan eksporteres.
check(
  validateForExport("Testvej 1", [samples[6]]).some((i) => i.level === "error"),
  "valideringen fangede ikke en sag uden analyser",
);
check(
  validateForExport(
    "Testvej 1",
    Array.from({ length: MAX_SAMPLES + 1 }, (_, i) =>
      sample(i + 1, "Træ", "Maling", { analysis_pcb: true }),
    ),
  ).some((i) => i.message.includes("plads til")),
  `valideringen fangede ikke mere end ${MAX_SAMPLES} proever`,
);

// 12. Perioden: PCB og asbest hoerer ikke til pa en bygning efter 1990.
check(
  validateForExport("Testvej 1", [
    sample(1, "Træ", "Maling", {
      analysis_pcb: true,
      analysis_asbestos: true,
      period: "efter_1990",
    }),
  ]).filter((i) => i.level === "warning" && i.message.includes("efter 1990"))
    .length === 2,
  "valideringen advarede ikke om bade PCB og asbest pa en bygning efter 1990",
);
check(
  validateForExport("Testvej 1", [
    sample(1, "Træ", "Maling", { analysis_metals: true, period: "efter_1990" }),
  ]).every((i) => !i.message.includes("efter 1990")),
  "valideringen advarede om metaller, som perioden ikke slar fra",
);

const out = new URL("../.eurofins-test.xlsx", import.meta.url);
writeFileSync(out, file);

console.log(`${filename} — ${file.length} bytes, ${rowCount} proever til laboratoriet`);
console.log(`skrevet til ${out.pathname.slice(1)} sa den kan abnes i Excel`);
console.log(failures === 0 ? "OK" : `${failures} fejl.`);
process.exit(failures === 0 ? 0 : 1);
