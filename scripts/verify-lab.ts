/**
 * Kontrollerer at Eurofins' AllResults-fil laeses som den skal, og at
 * farverne falder hvor de skal. Koeres med: npm run verify:lab
 *
 * Provefilen er en rigtig Eurofins-leverance med adressen skiftet ud. Tallene
 * er bevaret, fordi det netop er dem der kobler kolonnerne til det regneark
 * screenerne udfyldte i handen — hver forventning herunder er slaet op i
 * 2.csv, ikke gaettet.
 */
import {
  classify,
  displayValue,
  LAB_PARAMETER_BY_KEY,
  readValue,
  thresholdText,
  worstLevel,
  type LabLevel,
  type LabParameterKey,
} from "../src/lib/lab/parametre";
import { decodeLabFile, matchRows, parseLabFile } from "../src/lib/lab/parse";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    console.error(`  FEJL: ${msg}`);
    failures++;
  }
};

const CSV = [
  "Batch;EUAA59-26038155;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
  "SagsNavn;Testvej 2, 8300 Testby;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
  "Sagsnummer/lokalitetsnr;156;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
  "Udtagningsdato;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
  "Modtaget på laboratoriet;09-06-2026;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
  "Rapport (seneste rapportrevision);16-06-2026/AR-26-VL-01038155-01;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
  "Komponent;;Arsen (As);Bly (Pb);Cadmium (Cd);Chrom (Cr);Kobber (Cu);Kviksølv (Hg);Nikkel (Ni);Zink (Zn);Naphthalen;Fluoranthen;Benzo(b+j+k)fluoranthen;Benzo(a)pyren;Indeno(1,2,3-cd)pyren ;Dibenz(a,h)anthracen;Benzo(g,h,i)perylen;PAH sum;PCB nr. 28;PCB nr. 52;PCB nr. 101;PCB nr. 138;PCB nr. 153;PCB nr. 180;PCB nr. 118;Sum af 7 PCB'er x 5 excl LOQ ;Sum af 7 PCB'er;Spor af Chlorparaffiner;Sum C10-C13 chlorparaffiner incl. LOQ [0.01%];Sum C14-C17 chlorparaffiner incl. LOQ [0.01%];Sum C10-C13 chlorparaffiner incl. LOQ [0.1%];Sum C14-C17 chlorparaffiner incl. LOQ [0.1%];Asbest i materialeprøver;PCB 28;PCB 52;PCB 101;PCB 118;PCB 138;PCB 153;PCB 180;PCB sum;PCB total (sum af 7 PCB x 5);Spor af Chlorparaffiner",
  "Enhed;;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;%;%;%;%;;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;mg/kg;",
  "Prøver;Prøvemærke;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
  "862-2026-03815501;1;;5,3;< 0,05;12;1100;0,02;3,9;35;;;;;;;;;;;;;;;;;;;;;;;;< 0,01;< 0,01;< 0,01;< 0,01;< 0,01;< 0,01;< 0,01;#;#;Ikke påvist",
  "862-2026-03815502;2;;5,5;< 0,05;25;12;0,02;6,7;170;;;;;;;;;;;;;;;;;;;;;;;;< 0,02;< 0,02;< 0,02;< 0,02;< 0,02;< 0,02;< 0,02;#;#;Ikke påvist",
  "862-2026-03815503;3;;200;< 0,05;< 1;17;2,1;1,2;220;;;;;;;;;;;;;;;;;;;;;;;;< 0,009;0,012;0,016;0,021;0,011;0,01;< 0,009;0,07;0,35;Ikke påvist",
  "862-2026-03815504;4;;2,7;< 0,05;67;3,1;< 0,01;17;34;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
  "862-2026-03815505;5;;< 2;0,064;35;< 2;0,03;8,7;36;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
  "862-2026-03815506;6;;300;1,1;16;5;2,7;5,3;1800;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
].join("\r\n");

const file = parseLabFile(CSV);

// 1. Hovedet.
check(file.batch === "EUAA59-26038155", `batch blev ${file.batch}`);
check(file.receivedAt === "2026-06-09", `modtagedato blev ${file.receivedAt}`);
check(
  file.reportRef === "16-06-2026/AR-26-VL-01038155-01",
  `rapportreference blev ${file.reportRef}`,
);
check(file.rows.length === 6, `forventede 6 raekker, fik ${file.rows.length}`);

// 2. Vaerdierne skal staa ordret som i det udfyldte ark.
const row = (mark: string) => file.rows.find((r) => r.mark === mark)!;
const shown = (mark: string, key: LabParameterKey) =>
  displayValue(row(mark).values[key]);

const p1 = {
  pb: "5,3",
  cd: "< 0,05",
  cr: "12",
  cu: "1100",
  hg: "0,02",
  ni: "3,9",
  zn: "35",
  asbestos: "I.a.",
  pcb_total: "I.P.",
  chlor_paraffins: "I.P.",
  pah_total: "I.a.",
} satisfies Record<LabParameterKey, string>;

for (const [key, expected] of Object.entries(p1)) {
  const got = shown("1", key as LabParameterKey);
  check(got === expected, `P1 ${key} blev "${got}", forventede "${expected}"`);
}

check(shown("3", "pcb_total") === "0,35", `P3 PCB total blev ${shown("3", "pcb_total")}`);
check(shown("3", "pb") === "200", `P3 bly blev ${shown("3", "pb")}`);
check(shown("6", "zn") === "1800", `P6 zink blev ${shown("6", "zn")}`);
check(shown("5", "pb") === "< 2", `P5 bly blev ${shown("5", "pb")}`);

// 3. "#" er ikke pavist, tom celle er ikke analyseret. To vidt forskellige
//    ting der begge ligner ingenting.
check(
  row("1").values.pcb_total.state === "ikke_pavist",
  "# blev ikke laest som ikke pavist",
);
check(
  row("4").values.pcb_total.state === "ikke_analyseret",
  "tom PCB-celle blev ikke laest som ikke analyseret",
);

// 4. Den dublerede kolonne. "Spor af Chlorparaffiner" star bade som nr. 27
//    og nr. 42; kun den sidste er udfyldt.
check(
  row("1").values.chlor_paraffins.state === "ikke_pavist",
  "chlorparaffiner blev laest fra den tomme af de to ens kolonner",
);

// 5. Farverne, malt mod graensetabellen.
const level = (mark: string, key: LabParameterKey): LabLevel | null =>
  classify(LAB_PARAMETER_BY_KEY.get(key)!, row(mark).values[key]);

const expectLevel = (
  mark: string,
  key: LabParameterKey,
  want: LabLevel | null,
  why: string,
) => {
  const got = level(mark, key);
  check(got === want, `P${mark} ${key} blev "${got}", forventede "${want}" (${why})`);
};

expectLevel("1", "pb", "rent", "5,3 er under 40");
expectLevel("3", "pb", "forurenet", "200 ligger i 40-2500");
expectLevel("1", "cu", "forurenet", "1100 ligger i 500-2500");
expectLevel("1", "hg", "rent", "0,02 er under 1");
expectLevel("3", "hg", "forurenet", "2,1 er over 1");
expectLevel("6", "zn", "forurenet", "1800 ligger i 500-2500");
expectLevel("3", "pcb_total", "forurenet", "0,35 ligger i 0,10-50");
expectLevel("1", "pcb_total", "rent", "ikke pavist");
expectLevel("1", "pah_total", null, "ikke analyseret");
expectLevel("1", "cd", "rent", "< 0,05 er under 0,50");
expectLevel("5", "cd", "rent", "0,064 er under 0,50");

// 6. Graenser der ligger praecis pa kanten.
const pb = LAB_PARAMETER_BY_KEY.get("pb")!;
const at = (n: number) =>
  classify(pb, { state: "tal", text: String(n), number: n, underDetektion: false });
check(at(39.9) === "rent", "39,9 mg/kg bly skulle vaere rent");
check(at(40) === "forurenet", "40 mg/kg bly skulle vaere forurenet");
check(at(2500) === "forurenet", "2500 mg/kg bly skulle stadig vaere forurenet");
check(at(2500.1) === "farligt", "over 2500 mg/kg bly skulle vaere farligt");

// 7. Provens samlede niveau er det vaerste den har.
const levelsFor = (mark: string) =>
  ([...LAB_PARAMETER_BY_KEY.keys()] as LabParameterKey[]).map((k) =>
    level(mark, k),
  );
check(worstLevel(levelsFor("1")) === "forurenet", "P1 skulle vaere forurenet (kobber)");
check(worstLevel(levelsFor("3")) === "forurenet", "P3 skulle vaere forurenet");
check(worstLevel([null, null]) === null, "en prove uden malinger har intet niveau");
check(worstLevel([null, "rent"]) === "rent", "en prove med kun rene malinger er ren");

// 8. Koblingen til sagens prover.
//
//    Eurofins sender kun de prover tilbage vi har bestilt analyse pa, og de
//    skriver maerket uden P. Sender vi P1, 2, P3, P4, 5, far vi 1, 3, 4
//    retur — 2 og 5 er kortlagte materialer der aldrig har vaeret pa
//    laboratoriet. Deres tal ma derfor kun ramme prover med analyse.
const lab = (id: string, seq: number) => ({
  id,
  label: `P${seq}`,
  seq,
  is_lab_sample: true,
});
const kortlagt = (id: string, seq: number) => ({
  id,
  label: String(seq),
  seq,
  is_lab_sample: false,
});

const samples = [
  lab("a", 1),
  kortlagt("b", 2),
  lab("c", 3),
  lab("d", 4),
  kortlagt("e", 5),
];
const matched = matchRows(file.rows, samples);

check(matched[0].sample?.id === "a", "maerket 1 fandt ikke P1");
check(
  matched[1].sample === null,
  "maerket 2 blev koblet til den kortlagte prove 2 — den har aldrig vaeret pa lab",
);
check(matched[2].sample?.id === "c", "maerket 3 fandt ikke P3");
check(matched[3].sample?.id === "d", "maerket 4 fandt ikke P4");
check(
  matched[4].sample === null,
  "maerket 5 blev koblet til den kortlagte prove 5",
);
check(matched[5].sample === null, "maerket 6 blev koblet til en prove der ikke findes");

// Skulle Eurofins en dag skrive P'et med, skal det stadig ramme.
const newStyle = parseLabFile(CSV.replace(/\n862-2026-03815501;1;/, "\n862-2026-03815501;P1;"));
check(
  matchRows(newStyle.rows, samples)[0].sample?.id === "a",
  "maerket P1 fandt ikke P1",
);

// 9. Tegnsaet. Eurofins leverer bade UTF-8 og Windows-1252.
const ansi = Buffer.from("Komponent;;Kviksølv (Hg)\r\n862-2026-1;1;;0,02", "latin1");
check(
  decodeLabFile(
    ansi.buffer.slice(ansi.byteOffset, ansi.byteOffset + ansi.byteLength),
  ).includes("Kviksølv"),
  "Windows-1252 blev ikke afkodet",
);
const utf8 = Buffer.from("Komponent;;Kviksølv (Hg)", "utf8");
check(
  decodeLabFile(
    utf8.buffer.slice(utf8.byteOffset, utf8.byteOffset + utf8.byteLength),
  ).includes("Kviksølv"),
  "UTF-8 blev ikke afkodet",
);

// 10. Asbest er rod eller ingenting. Der er ikke et gult mellemniveau: er
//     asbest pavist, er materialet farligt affald.
const asbest = LAB_PARAMETER_BY_KEY.get("asbestos")!;
const pavist = readValue("Påvist");
const ikkePavist = readValue("Ikke påvist");

check(classify(asbest, pavist) === "farligt", "påvist asbest skulle vaere farligt affald");
check(classify(asbest, ikkePavist) === "rent", "ikke påvist asbest skulle vaere rent");
check(
  classify(asbest, readValue("")) === null,
  "en asbestanalyse der aldrig blev bestilt har intet niveau",
);

// Graenseraekkerne nederst i skemaet folger den samme regel: asbest star
// under farligt affald, og den gule raekke har ingenting at sige om den.
check(
  thresholdText(asbest, "rent") === "Ikke påvist",
  `asbestens rene graense blev "${thresholdText(asbest, "rent")}"`,
);
check(
  thresholdText(asbest, "forurenet") === "—",
  `asbestens gule graense blev "${thresholdText(asbest, "forurenet")}"`,
);
check(
  thresholdText(asbest, "farligt") === "Påvist",
  `asbestens rode graense blev "${thresholdText(asbest, "farligt")}"`,
);

// Klorerede paraffiner har ingen rod kolonne i graensetabellen: pavist er og
// bliver forurenet.
const chlor = LAB_PARAMETER_BY_KEY.get("chlor_paraffins")!;
check(
  classify(chlor, pavist) === "forurenet",
  "klorerede paraffiner skulle blive pa forurenet",
);
check(
  thresholdText(chlor, "farligt") === "—",
  "klorerede paraffiner skulle ikke have en rod graense",
);

// En prove hvor asbesten er den eneste dyre maling skal traekke hele proven
// med op — det er den samlede farve rapporten viser pa provens side.
check(
  worstLevel([classify(asbest, pavist), "rent", null]) === "farligt",
  "en prove med påvist asbest skulle vaere farligt affald",
);

// 11. Turen gennem databasen. Vi gemmer teksten, ikke tallet, sa den skal
//     betyde noget efter den er laest tilbage — ikke mindst forskellen pa
//     "ikke analyseret" og "ikke pavist", der begge ligner ingenting.
for (const mark of ["1", "3", "4", "6"]) {
  for (const [key, parameter] of LAB_PARAMETER_BY_KEY) {
    const original = row(mark).values[key];
    const stored = displayValue(original);
    const reread = readValue(stored);
    check(
      displayValue(reread) === stored,
      `P${mark} ${key}: "${stored}" blev til "${displayValue(reread)}"`,
    );
    check(
      classify(parameter, reread) === classify(parameter, original),
      `P${mark} ${key}: niveauet aendrede sig efter gemt og laest igen`,
    );
  }
}
check(
  readValue(null).state === "ikke_analyseret",
  "en tom kolonne i databasen er ikke analyseret",
);

// 12. En fil der ikke er en AllResults-fil skal afvises tydeligt.
let rejected = false;
try {
  parseLabFile("navn;vaerdi\nnoget;andet");
} catch {
  rejected = true;
}
check(rejected, "en fremmed fil blev ikke afvist");

console.log(
  failures === 0
    ? `OK — ${file.rows.length} prøver, ${LAB_PARAMETER_BY_KEY.size} parametre`
    : `${failures} fejl.`,
);
process.exit(failures === 0 ? 0 : 1);
