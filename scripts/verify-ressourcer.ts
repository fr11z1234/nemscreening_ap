/**
 * Kontrollerer ressourcescreeningen. Koeres med: npm run verify:ressourcer
 *
 * To slags fejl er dyre her, og ingen af dem raaber op af sig selv.
 *
 * Den forste er et materialenavn i kataloget, der ikke findes i
 * `screening.materials`. Linjen bliver aldrig fundet, materialet havner i
 * rapporten uden sin saetning, og det ser ud som om kataloget mangler en
 * raekke — ikke som om der er en tastefejl. Derfor slaas hvert navn op i
 * migrationen, der seeder listen.
 *
 * Den anden er maengden. Screeneren taster ton, rapporten skriver kilo, og
 * flere prover af samme materiale laegges sammen til en linje. Et forkert tal
 * dér er en pastand om hvor meget beton der kommer ud af en bygning.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  RESSOURCE_INDLEDNING,
  RESSOURCE_KATALOG,
  ressourceLinjeTekst,
  ressourceSider,
  ressourceoversigt,
  type RessourceProve,
} from "../src/lib/rapport/ressourcer";
import { BUILDING_PARTS, MATERIAL_CONDITIONS } from "../src/lib/types";
import { LAB_PARAMETERS } from "../src/lib/lab/parametre";
import {
  analysekolonne,
  NAVNEKOLONNER,
  NAVNEKOLONNER_SELEKTIV,
} from "../src/components/lab/ResultatSkema";
import {
  BBR_KODELISTER,
  tagTekst,
  varmeTekst,
  ydervaegTekst,
} from "../src/lib/bbr/map";
import { bygningsBlok, bygningsSider } from "../src/lib/rapport/bygninger";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    console.error(`  FEJL: ${msg}`);
    failures++;
  }
};

// ---------------------------------------------------------------------------
// 1. Kataloget
// ---------------------------------------------------------------------------
const noegler = RESSOURCE_KATALOG.map((l) => `${l.part}/${l.material}`);
for (const n of new Set(noegler)) {
  const antal = noegler.filter((k) => k === n).length;
  check(antal === 1, `${n} star ${antal} gange i kataloget — den anden bliver aldrig brugt`);
}

const kendteDele = new Set(BUILDING_PARTS.map((p) => p.key));
for (const l of RESSOURCE_KATALOG) {
  check(kendteDele.has(l.part), `${l.navn} peger pa bygningsdelen "${l.part}", som ikke findes`);
  check(l.navn.trim() !== "", `en katalograekke for ${l.material} mangler navn`);
  check(
    l.saetning === null || l.saetning.endsWith("."),
    `saetningen for "${l.navn}" slutter ikke med punktum`,
  );
  check(
    l.saetning === null || !/^[A-ZÆØÅ]/.test(l.saetning),
    `saetningen for "${l.navn}" begynder med stort — den skal laene sig pa maengden`,
  );
}

// Materialenavnene skal findes ordret i den liste, appen faktisk viser.
const here = dirname(fileURLToPath(import.meta.url));
const seedSql = readFileSync(
  join(here, "..", "supabase", "migrations", "20260725173227_screening_seed_lookups.sql"),
  "utf8",
);
const materialBlok = seedSql.slice(
  seedSql.indexOf("screening.materials"),
  seedSql.indexOf("screening.sample_types"),
);
const kendteMaterialer = new Set(
  [...materialBlok.matchAll(/'([^']+)'/g)].map((m) => m[1]),
);
check(
  kendteMaterialer.size > 40,
  `fandt kun ${kendteMaterialer.size} materialer i migrationen — er filen flyttet?`,
);
for (const l of RESSOURCE_KATALOG) {
  check(
    kendteMaterialer.has(l.material),
    `"${l.material}" (${l.navn}) findes ikke i screening.materials — linjen kan aldrig rammes`,
  );
}

check(RESSOURCE_INDLEDNING.length === 2, "indledningen skulle vaere to afsnit");

// ---------------------------------------------------------------------------
// 2. Hvad der er en ressource, og hvad der ikke er
// ---------------------------------------------------------------------------
const prove = (p: Partial<RessourceProve>): RessourceProve => ({
  label: "1",
  material: "Beton (undtagen, gasbeton, letbeton)",
  building_part: "fundament",
  material_condition: null,
  resource_handling: null,
  estimated_tons: 1,
  level: null,
  isLabSample: false,
  ...p,
});

const linjer = (proever: RessourceProve[]) =>
  ressourceoversigt(proever).grupper.flatMap((g) => g.linjer);

// Kortlagt uden analyse: der kommer aldrig et svar, og intet har vist andet.
check(linjer([prove({})]).length === 1, "en kortlagt prove blev ikke en ressource");

// Analyseret og ren.
check(
  linjer([prove({ isLabSample: true, level: "rent" })]).length === 1,
  "en ren prove blev ikke en ressource",
);

// Forurenet og farligt er ikke ressourcer. Rapporten ma ikke love at de kan
// genbruges — det er den fejl, der koster noget udenfor skaermen.
for (const level of ["forurenet", "farligt"] as const) {
  check(
    linjer([prove({ isLabSample: true, level })]).length === 0,
    `en ${level} prove kom med i ressourcescreeningen`,
  );
}

// Bestilt, men intet svar endnu: holdes ude og taelles.
const venter = ressourceoversigt([prove({ isLabSample: true, level: null })]);
check(venter.grupper.length === 0, "en prove uden svar kom med som ressource");
check(venter.afventer === 1, `afventer blev ${venter.afventer}, forventede 1`);

// Uden bygningsdel kan materialet ikke placeres under en overskrift.
const udenDel = ressourceoversigt([prove({ building_part: null })]);
check(udenDel.grupper.length === 0, "en prove uden bygningsdel kom med");
check(udenDel.afventer === 0, "en prove uden bygningsdel blev talt som afventende");

// Uden materiale kan linjen ikke navngives — men det skal siges hojt.
const udenMat = ressourceoversigt([prove({ material: null })]);
check(udenMat.grupper.length === 0, "en prove uden materiale kom med");
check(udenMat.udenMateriale === 1, `udenMateriale blev ${udenMat.udenMateriale}`);

// ---------------------------------------------------------------------------
// 3. Sammenlaegning
// ---------------------------------------------------------------------------
const samlet = linjer([
  prove({ label: "1", estimated_tons: 12, material_condition: 2 }),
  prove({ label: "2", estimated_tons: 30, material_condition: 4 }),
]);
check(samlet.length === 1, `to prover af samme materiale gav ${samlet.length} linjer`);
check(samlet[0]?.kg === 42000, `12 + 30 ton blev ${samlet[0]?.kg} kg, forventede 42000`);
// Daarligste stand og ikke gennemsnittet: rapporten ma ikke love den bedste.
check(
  samlet[0]?.condition === 4,
  `standen blev ${samlet[0]?.condition}, forventede 4 (den daarligste)`,
);
check(
  samlet[0]?.labels.join(",") === "1,2",
  `linjen peger pa ${samlet[0]?.labels.join(",")}, forventede begge prover`,
);

// Handteringen star kun, nar proverne er enige om den.
const enige = linjer([
  prove({ resource_handling: "genbrug" }),
  prove({ label: "2", resource_handling: "genbrug" }),
]);
check(enige[0]?.handling === "genbrug", "to enige prover mistede handteringen");
const uenige = linjer([
  prove({ resource_handling: "genbrug" }),
  prove({ label: "2", resource_handling: "bortskaffelse" }),
]);
check(
  uenige[0]?.handling === null,
  `to uenige prover gav handteringen "${uenige[0]?.handling}"`,
);

// En prove uden maengde ma ikke gore linjen til nul kilo — det ville laese som
// om der ikke er noget af materialet.
const udenTon = linjer([prove({ estimated_tons: null })]);
check(udenTon[0]?.kg === null, `en prove uden maengde gav ${udenTon[0]?.kg} kg`);
const delvis = linjer([
  prove({ estimated_tons: null }),
  prove({ label: "2", estimated_tons: 5 }),
]);
check(delvis[0]?.kg === 5000, `en tom og en pa 5 ton gav ${delvis[0]?.kg} kg`);

// Decimaler. 0,4 ton er 400 kg, ikke 400,00000001.
check(
  linjer([prove({ estimated_tons: 0.4 })])[0]?.kg === 400,
  "0,4 ton blev ikke 400 kg",
);
check(
  linjer([prove({ estimated_tons: 2.8 })])[0]?.kg === 2800,
  "2,8 ton blev ikke 2800 kg",
);

// ---------------------------------------------------------------------------
// 4. Overskrifter og raekkefolge
// ---------------------------------------------------------------------------
// Udvendigt og indvendigt teglmurvaerk deler overskrift, men er to linjer med
// hver sin skaebne. Det er hele grunden til at facade og vaegge er to
// bygningsdele.
const murvaerk = ressourceoversigt([
  prove({ label: "1", building_part: "facade", material: "Mursten", estimated_tons: 10 }),
  prove({ label: "2", building_part: "vaegge", material: "Mursten", estimated_tons: 4 }),
]);
check(
  murvaerk.grupper.length === 1,
  `facade og vaegge gav ${murvaerk.grupper.length} grupper, forventede en delt overskrift`,
);
check(
  murvaerk.grupper[0]?.overskrift === "Facader og vægge",
  `overskriften blev "${murvaerk.grupper[0]?.overskrift}"`,
);
check(
  murvaerk.grupper[0]?.linjer.length === 2,
  "udvendigt og indvendigt murvaerk blev lagt sammen til en linje",
);
check(
  murvaerk.grupper[0]?.linjer[0]?.navn === "Udvendigt teglmurværk",
  `forste linje blev "${murvaerk.grupper[0]?.linjer[0]?.navn}"`,
);
check(
  murvaerk.grupper[0]?.linjer[1]?.navn === "Indvendigt teglmurværk",
  `anden linje blev "${murvaerk.grupper[0]?.linjer[1]?.navn}"`,
);

// Samme materiale, forskellig bygningsdel, forskellig skaebne.
const trae = ressourceoversigt([
  prove({ label: "1", building_part: "baerende", material: "Træ" }),
  prove({ label: "2", building_part: "tag", material: "Træ" }),
  prove({ label: "3", building_part: "indvendige_overflader", material: "Træ" }),
]);
const traeNavne = trae.grupper.flatMap((g) => g.linjer.map((l) => l.navn));
check(
  traeNavne.join(" | ") ===
    "Konstruktions- og spærtræ | Trægulve | Tagkonstruktion af træ",
  `trae blev "${traeNavne.join(" | ")}"`,
);

// Grupperne folger bygningen nedefra og op, som BUILDING_PARTS staar.
const raekkefolge = ressourceoversigt([
  prove({ label: "1", building_part: "tag", material: "Tagpap" }),
  prove({ label: "2", building_part: "fundament" }),
  prove({ label: "3", building_part: "vinduer_doere", material: "Vinduer" }),
]);
check(
  raekkefolge.grupper.map((g) => g.overskrift).join(" | ") ===
    "Fundament og sokkel | Vinduer og døre | Tag",
  `raekkefolgen blev "${raekkefolge.grupper.map((g) => g.overskrift).join(" | ")}"`,
);

// Et materiale uden katalograekke skal stadig med. Ellers forsvinder en
// registreret maengde ud af rapporten, fordi kataloget mangler noget.
const ukendt = linjer([prove({ material: "Flamingo", building_part: "oevrige" })]);
check(ukendt.length === 1, "et materiale uden katalograekke forsvandt");
check(ukendt[0]?.navn === "Flamingo", `linjen blev navngivet "${ukendt[0]?.navn}"`);
check(ukendt[0]?.saetning === null, "et materiale uden katalograekke fik en saetning");

// Katalogets linjer kommer for de ukendte, sa afsnittet laeser som skabelonen.
const blandet = ressourceoversigt([
  prove({ label: "1", building_part: "oevrige", material: "Flamingo" }),
  prove({ label: "2", building_part: "oevrige", material: "Jern og metal" }),
]);
check(
  blandet.grupper[0]?.linjer.map((l) => l.navn).join(" | ") ===
    "Jern og metal | Flamingo",
  `blandet raekkefolge blev "${blandet.grupper[0]?.linjer.map((l) => l.navn).join(" | ")}"`,
);

// ---------------------------------------------------------------------------
// 5. Linjen som den staar i rapporten
// ---------------------------------------------------------------------------
const tekst = (proever: RessourceProve[]) => ressourceLinjeTekst(linjer(proever)[0]!);

// Med stand: maengde, stand, komma, saetning — praecis som skabelonen.
check(
  tekst([
    prove({ building_part: "facade", material: "Mursten", estimated_tons: 12, material_condition: 2 }),
  ]) ===
    "Udvendigt teglmurværk – 12.000 kg i god stand, kan genbruges som hele sten eller nedknuses til sekundært råmateriale.",
  `linjen med stand blev: ${tekst([prove({ building_part: "facade", material: "Mursten", estimated_tons: 12, material_condition: 2 })])}`,
);

// Uden stand laener saetningen sig direkte pa maengden, ogsa som skabelonen.
check(
  tekst([prove({ estimated_tons: 42 })]) ===
    "Beton – 42.000 kg egnet til nedknusning og genanvendelse i bygge- og anlægsprojekter.",
  `linjen uden stand blev: ${tekst([prove({ estimated_tons: 42 })])}`,
);

// Tusindtalsskilletegnet er dansk. 42000 og 4200 skal kunne skelnes.
check(
  tekst([prove({ estimated_tons: 4.2 })]).includes("4.200 kg"),
  `4,2 ton blev skrevet som: ${tekst([prove({ estimated_tons: 4.2 })])}`,
);

// Uden maengde skrives det, frem for at linjen viser nul kilo.
check(
  tekst([prove({ estimated_tons: null })]).includes("mængde ikke opgjort"),
  `en linje uden maengde blev: ${tekst([prove({ estimated_tons: null })])}`,
);

// Et materiale uden saetning slutter efter maengden og lover ingenting.
check(
  tekst([prove({ material: "Flamingo", building_part: "oevrige", estimated_tons: 1 })]) ===
    "Flamingo – 1.000 kg",
  `linjen uden saetning blev: ${tekst([prove({ material: "Flamingo", building_part: "oevrige", estimated_tons: 1 })])}`,
);

// Alle fem standsgrader skal kunne skrives ud.
for (const c of MATERIAL_CONDITIONS) {
  const t = tekst([prove({ estimated_tons: 1, material_condition: c.grade })]);
  check(
    t.includes(`i ${c.label.toLowerCase()},`),
    `stand ${c.grade} blev skrevet som: ${t}`,
  );
}

// ---------------------------------------------------------------------------
// 6. Sideopdelingen
// ---------------------------------------------------------------------------
// Afsnittet skal kunne braekke over flere ark uden at miste maerket i hovedet.
// Ingen linje ma forsvinde undervejs, og ingen overskrift ma staa alene.
const enSide = ressourceSider([
  { overskrift: "Fundament og sokkel", linjer: linjer([prove({})]) },
]);
check(enSide.length === 1, `en enkelt linje gav ${enSide.length} sider`);

// En sag med alt registreret. Kataloget er 35 linjer, og de kan ikke vaere pa
// et ark — sa skal de fordeles, ikke klippes.
const alt = RESSOURCE_KATALOG.map((l, i) =>
  prove({
    label: String(i + 1),
    building_part: l.part,
    material: l.material,
    estimated_tons: 1,
  }),
);
const fuld = ressourceoversigt(alt);
const fuldeLinjer = fuld.grupper.reduce((n, g) => n + g.linjer.length, 0);
check(
  fuldeLinjer === RESSOURCE_KATALOG.length,
  `hele kataloget gav ${fuldeLinjer} linjer, forventede ${RESSOURCE_KATALOG.length}`,
);

const sider = ressourceSider(fuld.grupper);
check(sider.length > 1, "hele kataloget blev presset ned pa en enkelt side");

// Ingen linje tabt, ingen linje dobbelt.
const paaSider = sider.reduce(
  (n, s) => n + s.reduce((m, g) => m + g.linjer.length, 0),
  0,
);
check(
  paaSider === fuldeLinjer,
  `sideopdelingen gav ${paaSider} linjer af ${fuldeLinjer}`,
);

for (const [nr, s] of sider.entries()) {
  for (const g of s) {
    check(
      g.linjer.length > 0,
      `side ${nr + 1} har overskriften "${g.overskrift}" uden linjer under`,
    );
  }
}

// En gruppe der braekkes far sin overskrift igen, sa laeseren ved hvor de
// forste linjer pa siden hoerer til.
const mange = ressourceSider([
  {
    overskrift: "Tag",
    linjer: Array.from({ length: 40 }, (_, i) => ({
      navn: `Materiale ${i}`,
      kg: 1000,
      condition: null,
      handling: null,
      saetning: null,
      labels: [String(i)],
    })),
  },
]);
check(mange.length > 1, "fyrre linjer blev ikke delt op");
check(
  mange[0]![0]!.overskrift === "Tag",
  `forste side fik overskriften "${mange[0]![0]!.overskrift}"`,
);
check(
  mange[1]![0]!.overskrift === "Tag (fortsat)",
  `anden side fik overskriften "${mange[1]![0]!.overskrift}"`,
);

check(ressourceSider([]).length === 0, "ingen grupper skulle give ingen sider");

// ---------------------------------------------------------------------------
// 7. Analyseskemaets bredde
// ---------------------------------------------------------------------------
// Det selektive skema har to kolonner mere, men det samme ark. Pladsen tages
// af cellernes sideluft og ikke af tallene, og det er den regning der
// kontrolleres her: en analysekolonne skal have mindst lige saa mange pixel til
// "< 2500" som det almindelige skema har i dag. Bliver den smallere, braekker
// tallet i to linjer paa papiret — og det ses foerst, naar nogen printer.
//
// Sideluften laeses ud af globals.css, sa CSS'en bliver ved med at vaere det
// ene sted den staar.
const css = readFileSync(join(here, "..", "src", "app", "globals.css"), "utf8");
const sideluft = (selektor: string) => {
  const blok = css.slice(css.indexOf(`${selektor} {`));
  const fundet = blok.slice(0, blok.indexOf("}")).match(/--skema-sideluft:\s*([\d.]+)rem/);
  return fundet ? Number(fundet[1]) : null;
};

let bredder = "";
const luftAlm = sideluft(".skema");
const luftSel = sideluft(".skema-selektiv");
check(luftAlm !== null, "fandt ikke --skema-sideluft i .skema");
check(luftSel !== null, "fandt ikke --skema-sideluft i .skema-selektiv");

// Arket giver skemaet 186 mm, skriften er 10 px paa print, og en rem er 16 px.
const PX_PR_MM = 96 / 25.4;
const indholdPx = (navne: number[], luftRem: number) =>
  186 * (analysekolonne(navne) / 100) * PX_PR_MM - 2 * luftRem * 16;

if (luftAlm !== null && luftSel !== null) {
  const alm = indholdPx(NAVNEKOLONNER, luftAlm);
  const sel = indholdPx(NAVNEKOLONNER_SELEKTIV, luftSel);
  check(
    sel >= alm - 0.05,
    `en analysekolonne har ${sel.toFixed(2)} px i det selektive skema mod ${alm.toFixed(2)} px i det almindelige — "< 2500" braekker`,
  );
  // AGENTS.md: "< 2500" kraever de omkring 32,5 px der er i dag. Falder begge
  // skemaer under, er det ikke laengere en sammenligning der redder printet.
  check(alm >= 32, `det almindelige skema er nede paa ${alm.toFixed(2)} px pr. analysekolonne`);
  check(sel >= 32, `det selektive skema er nede paa ${sel.toFixed(2)} px pr. analysekolonne`);
  bredder = `analysekolonne ${alm.toFixed(2)} px alm. / ${sel.toFixed(2)} px selektiv`;
}

// Kolonnerne skal give 100 % tilsammen, ellers skalerer browseren dem selv og
// `table-layout: fixed` holder ikke laengere skemaet ens fra sag til sag.
for (const [navn, navne] of [
  ["det almindelige", NAVNEKOLONNER],
  ["det selektive", NAVNEKOLONNER_SELEKTIV],
] as const) {
  const sum =
    navne.reduce((n, v) => n + v, 0) + analysekolonne(navne) * LAB_PARAMETERS.length;
  check(
    Math.abs(sum - 100) < 0.001,
    `kolonnerne i ${navn} skema giver ${sum.toFixed(3)} % og ikke 100`,
  );
}

// De to nye kolonner skal staa mellem Lokalitet og Est. ton, som i regnearket.
check(
  NAVNEKOLONNER_SELEKTIV.length === NAVNEKOLONNER.length + 2,
  `det selektive skema har ${NAVNEKOLONNER_SELEKTIV.length} navnekolonner, forventede ${NAVNEKOLONNER.length + 2}`,
);

// ---------------------------------------------------------------------------
// 8. Bygningsoversigten
// ---------------------------------------------------------------------------
// BBR svarer med koder. Rammer en kode ikke sin liste, star der «Kode 14» i
// rapporten frem for et materiale — synligt, men forkert. Og to koder betyder
// noget ud over ordlyden: 3 er fibercement MED asbest, 10 er den samme plade
// uden. Byttes de om, siger rapporten det modsatte af sandheden.
check(
  BBR_KODELISTER.ydervaeg["3"] === "Fibercement herunder asbest",
  `ydervaeg kode 3 blev "${BBR_KODELISTER.ydervaeg["3"]}"`,
);
check(
  BBR_KODELISTER.ydervaeg["10"] === "Fibercement uden asbest",
  `ydervaeg kode 10 blev "${BBR_KODELISTER.ydervaeg["10"]}"`,
);
check(
  BBR_KODELISTER.tag["3"] === "Fibercement herunder asbest",
  `tag kode 3 blev "${BBR_KODELISTER.tag["3"]}"`,
);
check(
  BBR_KODELISTER.tag["10"] === "Fibercement uden asbest",
  `tag kode 10 blev "${BBR_KODELISTER.tag["10"]}"`,
);

// Opslagene skal ramme listen, og en ukendt kode skal vises frem for at blive
// tavs.
check(ydervaegTekst("1") === "Mursten", `ydervaeg 1 blev "${ydervaegTekst("1")}"`);
check(tagTekst("5") === "Tegl", `tag 5 blev "${tagTekst("5")}"`);
check(
  varmeTekst("1") === "Fjernvarme/blokvarme",
  `varme 1 blev "${varmeTekst("1")}"`,
);
check(ydervaegTekst(null) === null, "en tom kode skulle give ingenting");
check(ydervaegTekst("") === null, "en tom streng skulle give ingenting");
check(
  ydervaegTekst("14") === "Kode 14",
  `en ukendt kode blev "${ydervaegTekst("14")}"`,
);

for (const [navn, liste] of Object.entries(BBR_KODELISTER)) {
  const tekster = Object.values(liste);
  check(
    tekster.every((t) => t.trim() !== ""),
    `kodelisten ${navn} har en tom tekst`,
  );
  for (const kode of Object.keys(liste)) {
    check(
      /^\d+$/.test(kode),
      `kodelisten ${navn} har nøglen "${kode}", som ikke er et tal`,
    );
  }
}

// Anvendelseskoderne skal daekke de koder, appen faktisk moder. Listen stod for
// med elleve, og resten faldt ned i gruppen.
for (const kode of ["120", "140", "321", "323", "910", "930", "222"]) {
  check(
    BBR_KODELISTER.anvendelse[kode] !== undefined,
    `anvendelseskode ${kode} mangler i listen`,
  );
}

// Blokken tager kun det med, der er udfyldt. Skabelonens stjerner og «HUSK AT
// SLETTE» er netop det, der skal vaek.
const tomBygning = {
  label: "Bygning 1",
  usage_text: null,
  built_year: null,
  rebuilt_year: null,
  floors: null,
  area_total: null,
  wall_material_code: null,
  roof_material_code: null,
  heating_code: null,
  usage_note: null,
  construction_note: null,
  plan_note: "  ",
} as unknown as Parameters<typeof bygningsBlok>[0];

const tom = bygningsBlok(tomBygning);
check(tom.fakta.length === 0, `en tom bygning gav ${tom.fakta.length} oplysninger`);
check(
  tom.noter.length === 0,
  "en note med kun mellemrum kom med i rapporten",
);

const heleBygning = bygningsBlok({
  ...tomBygning,
  built_year: 1968,
  floors: 4,
  area_total: 418,
  wall_material_code: "1",
  roof_material_code: "5",
  heating_code: "1",
  usage_note: "Privat beboelse.",
  construction_note: "Muret med tegltag.",
  plan_note: "Planlagt til nedrivning.",
} as unknown as Parameters<typeof bygningsBlok>[0]);
check(
  heleBygning.fakta.length === 6,
  `en fuld bygning gav ${heleBygning.fakta.length} oplysninger, forventede 6`,
);
check(
  heleBygning.fakta.map((f) => f.vaerdi).join(" | ") ===
    "1968 | 4 | 418 m² | Mursten | Tegl | Fjernvarme/blokvarme",
  `oplysningerne blev "${heleBygning.fakta.map((f) => f.vaerdi).join(" | ")}"`,
);
check(
  heleBygning.noter.length === 3,
  `en fuld bygning gav ${heleBygning.noter.length} noter`,
);

// Tre bygninger med alle tre beskrivelser skal kunne vaere pa et ark, som i
// skabelonen. Den fjerde skal flyttes hel og ikke braekkes.
const blok = (n: number) => ({ ...heleBygning, label: `Bygning ${n}` });
check(
  bygningsSider([blok(1), blok(2), blok(3)]).length === 1,
  `tre bygninger gav ${bygningsSider([blok(1), blok(2), blok(3)]).length} sider`,
);
const fireSider = bygningsSider([blok(1), blok(2), blok(3), blok(4)]);
check(fireSider.length === 2, `fire bygninger gav ${fireSider.length} sider`);
check(
  fireSider.reduce((n, s) => n + s.length, 0) === 4,
  "en bygning forsvandt i sideopdelingen",
);
check(bygningsSider([]).length === 0, "ingen bygninger skulle give ingen sider");

console.log(
  failures === 0
    ? `OK — ${RESSOURCE_KATALOG.length} katalogtekster, ${BUILDING_PARTS.length} bygningsdele, ${sider.length} sider ved fuldt katalog, ${bredder}`
    : `${failures} fejl.`,
);
process.exit(failures === 0 ? 0 : 1);
