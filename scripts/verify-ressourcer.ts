/**
 * Kontrollerer ressourcescreeningen. Koeres med: npm run verify:ressourcer
 *
 * Teksten i rapporten ligger nu i databasen og rettes i materialepanelet, sa
 * den kan ikke proves her. Til gengaeld kan alt det proves, som IKKE ma kunne
 * rettes ved et uheld:
 *
 *   - hvad der bliver en ressource, og hvad der holdes ude
 *   - maengderne, der laegges sammen og regnes fra ton til kilo
 *   - raekkefolgen af overskrifter og linjer
 *   - sideopdelingen, sa hver side baerer maerket
 *   - analyseskemaets bredde, sa atten kolonner stadig kan vaere paa et A4
 *   - BBR's kodelister, hvor kode 3 betyder asbest og kode 10 ikke gor
 *
 * Derudover kontrolleres migrationen, der seeder saetningerne, mod den der
 * seeder materialelisten: et materialenavn stavet forkert dér giver ikke en
 * fejl, men en rapport hvor et materiale mangler sin saetning.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  maerkerFor,
  MAERKE_ORDEN,
  RESSOURCE_INDLEDNING,
  ressourceLinjeHoved,
  ressourceLinjeTekst,
  ressourceSider,
  ressourceoversigt,
  standardtekstHoejde,
  TEKST_ORDEN,
  tekstHoejde,
  type RessourceGruppe,
  type RessourceProve,
} from "../src/lib/rapport/ressourcer";
import {
  affaldsmaerke,
  AFFALDSMAERKE_LABEL,
  ANALYSIS_FIELDS,
  analyserLaast,
  analysesForSampleType,
  bortskaffelsestekst,
  DISPOSAL_SENTENCE_FIELD,
  faktiskHandtering,
  MAERKE_TEKST,
  MATERIAL_CONDITIONS,
  SENTENCE_FIELD,
  VISUELLE_FUND,
  visueltFund,
  type Bortskaffelsestekster,
  type BuildingPart,
  type Material,
} from "../src/lib/types";
import {
  faellesTekster,
  INDSTILLING_NOEGLER,
  laesIndstillinger,
} from "../src/lib/indstillinger";
import {
  MAERKE_CLASS,
  MAERKE_FLADE,
} from "../src/components/rapport/Linjegruppe";
import { LAB_PARAMETERS } from "../src/lib/lab/parametre";
import {
  PREVIEWRAEKKER,
  PREVIEW_STAND,
  PREVIEW_TON,
  previewOversigt,
} from "../src/lib/rapport/preview";
import {
  analysekolonne,
  asbestPaavist,
  gaeldendeFund,
  levelOfSample,
  NAVNEKOLONNER,
  NAVNEKOLONNER_SELEKTIV,
} from "../src/components/lab/ResultatSkema";
import {
  BBR_KODELISTER,
  konstruktionsForslag,
  TAG_VALG,
  tagTekst,
  VARME_VALG,
  varmeTekst,
  YDERVAEG_VALG,
  ydervaegTekst,
} from "../src/lib/bbr/map";
import {
  bygningsBlok,
  bygningsSider,
  samletOplysning,
} from "../src/lib/rapport/bygninger";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    console.error(`  FEJL: ${msg}`);
    failures++;
  }
};

const here = dirname(fileURLToPath(import.meta.url));
const migration = (navn: string) =>
  readFileSync(join(here, "..", "supabase", "migrations", navn), "utf8");
/** Seed-migrationen med materialer og provearter. Bruges i afsnit 1d og 10. */
const lookupsMigration = migration("20260725173227_screening_seed_lookups.sql");

// ---------------------------------------------------------------------------
// Prøveopstilling
// ---------------------------------------------------------------------------
// Bygningsdelene og materialerne kommer fra databasen i appen. Her bygges de i
// hand, sa udregningen kan proves uden en database.
const del = (navn: string, orden: number): BuildingPart => ({
  id: `del-${orden}`,
  name: navn,
  sort_order: orden,
  active: true,
});

const FUNDAMENT = del("Fundament og sokkel", 1);
const FACADE = del("Facade (udvendig)", 3);
const TAG = del("Tag", 7);
const DELE = [FUNDAMENT, FACADE, TAG];

const materiale = (m: Partial<Material> & { name: string }): Material => ({
  id: `mat-${m.name}`,
  sort_order: 0,
  active: true,
  report_name: null,
  sentence_genbrug: null,
  sentence_genanvendelse: null,
  sentence_farligt: null,
  sentence_forurenet: null,
  sentence_asbest: null,
  sentence_bortskaffelse: null,
  ...m,
});

const BETON = materiale({
  name: "Beton (undtagen, gasbeton, letbeton)",
  report_name: "Beton",
  sort_order: 3,
  sentence_genanvendelse: "egnet til nedknusning og genanvendelse.",
  sentence_genbrug: "kan genbruges som hele elementer.",
  sentence_farligt: "afleveres på godkendt modtageanlæg som farligt affald.",
  sentence_forurenet: "udsorteres som forurenet affald.",
  sentence_asbest: "emballeres støvtæt og afleveres som asbestholdigt affald.",
  sentence_bortskaffelse: "bortskaffes efter gældende regler.",
});
const TRAE = materiale({
  name: "Træ",
  sort_order: 24,
  sentence_genbrug: "har et højt genbrugspotentiale.",
});
const TAGPAP = materiale({ name: "Tagpap", sort_order: 22 });
const MATERIALER = [BETON, TRAE, TAGPAP];

const prove = (p: Partial<RessourceProve>): RessourceProve => ({
  label: "1",
  material: BETON.name,
  building_part_id: FUNDAMENT.id,
  material_condition: null,
  resource_handling: "genanvendelse",
  estimated_tons: 1,
  level: null,
  asbestPaavist: false,
  isLabSample: false,
  ...p,
});

const oversigt = (proever: RessourceProve[]) =>
  ressourceoversigt(proever, MATERIALER, DELE);
const linjer = (proever: RessourceProve[]) =>
  oversigt(proever).ressourcer.flatMap((g) => g.linjer);
const urene = (proever: RessourceProve[]) =>
  oversigt(proever).forureninger.flatMap((g) => g.linjer);

check(RESSOURCE_INDLEDNING.length === 2, "indledningen skulle vaere to afsnit");

// ---------------------------------------------------------------------------
// 1. Hvad der er en ressource, og hvad der ikke er
// ---------------------------------------------------------------------------
check(linjer([prove({})]).length === 1, "en kortlagt prove blev ikke en ressource");
check(
  linjer([prove({ isLabSample: true, level: "rent" })]).length === 1,
  "en ren prove blev ikke en ressource",
);

/*
 * Laboratoriesvaret afgor, hvor linjen lander.
 *
 * Det er den vigtigste regel i hele filen. En screener kan skrive genbrug pa en
 * prove i god tro, og hvis analysen kommer tilbage forurenet, SKAL linjen flytte
 * til forureningsafsnittet og baere bortskaffelsesteksten. Ellers loeber en
 * optimistisk vurdering hele vejen ud i et dokument til en kommune.
 */
// Saetningen er IKKE den samme for de to: forurenet affald skal udsorteres,
// farligt affald skal til et godkendt modtageanlaeg. Se afsnit 1b nedenfor.
const FORVENTET_SAETNING = {
  forurenet: "udsorteres som forurenet affald.",
  farligt: "afleveres på godkendt modtageanlæg som farligt affald.",
} as const;

for (const level of ["forurenet", "farligt"] as const) {
  const p = prove({ isLabSample: true, level, resource_handling: "genbrug" });
  check(
    linjer([p]).length === 0,
    `en ${level} prove kom med i ressourcescreeningen`,
  );
  const u = urene([p]);
  check(u.length === 1, `en ${level} prove kom ikke i forureningsafsnittet`);
  check(
    u[0]?.saetning === FORVENTET_SAETNING[level],
    `en ${level} prove med genbrug valgt fik saetningen "${u[0]?.saetning}"`,
  );
  check(u[0]?.niveau === level, `niveauet pa linjen blev "${u[0]?.niveau}"`);
}

// Rent svar, men screeneren valgte bortskaffelse: et materiale der skal
// bortskaffes er ikke en ressource, uanset hvad analysen siger.
const rentMenBortskaffes = prove({
  isLabSample: true,
  level: "rent",
  resource_handling: "bortskaffelse",
});
check(
  linjer([rentMenBortskaffes]).length === 0,
  "en ren prove med bortskaffelse blev en ressource",
);
check(
  urene([rentMenBortskaffes])[0]?.saetning === "bortskaffes efter gældende regler.",
  "en ren prove med bortskaffelse fik ikke bortskaffelsesteksten",
);
// Gront maerke i forureningsafsnittet ville forvirre — niveauet er rent, og
// rapporten viser kun gult og rodt.
check(
  urene([rentMenBortskaffes])[0]?.niveau === "rent",
  "niveauet skulle stadig staa som rent i dataen",
);

// Gult og rodt af samme materiale ma ikke laegges sammen: maerket skal betyde
// noget.
const gulOgRoed = urene([
  prove({ label: "1", isLabSample: true, level: "forurenet", estimated_tons: 4 }),
  prove({ label: "2", isLabSample: true, level: "farligt", estimated_tons: 6 }),
]);
check(gulOgRoed.length === 2, `gult og rodt gav ${gulOgRoed.length} linjer`);
check(
  gulOgRoed.map((l) => l.niveau).join(",") === "forurenet,farligt",
  `niveauerne blev ${gulOgRoed.map((l) => l.niveau).join(",")}`,
);

// Ressourcelinjer baerer intet maerke at vise: alt i afsnittet er gront.
check(
  linjer([prove({ isLabSample: true, level: "rent" })])[0]?.niveau === "rent",
  "en ren ressource mistede sit niveau i dataen",
);

// ---------------------------------------------------------------------------
// 1b. Hvilken af de fire bortskaffelsestekster linjen far
// ---------------------------------------------------------------------------
/*
 * Teksten folger maerket, og maerket folger laboratoriet:
 *
 *   asbest pavist               -> asbestteksten, uanset alt andet
 *   farligt affald              -> farligt-teksten
 *   forurenet affald            -> forureningsteksten
 *   screeneren valgte bortskaf. -> bortskaffelsesteksten, men KUN naar svaret
 *                                  er rent eller der ikke er nogen analyse
 *
 * Screenerens valg slaar ikke Eurofins. Der stod engang, at valgte hun
 * bortskaffelse, gjaldt det uanset svaret — det var harmlost, saa laenge
 * farligt og bortskaffelse delte tekst. Nu de har hver sin, er det
 * laboratoriet der bestemmer: de har et bevis, hvor hun antager.
 *
 * Reglen ligger i `bortskaffelsestekst` i types.ts. Her proves den gennem
 * rapporten, sa det er den vej fra prove til faerdig saetning der kontrolleres
 * — ikke bare funktionen for sig.
 */
const FARLIGT = "afleveres på godkendt modtageanlæg som farligt affald.";
const FORUR = "udsorteres som forurenet affald.";
const ASBEST = "emballeres støvtæt og afleveres som asbestholdigt affald.";
const BORT = "bortskaffes efter gældende regler.";

const saetningFor = (p: Partial<RessourceProve>) =>
  urene([prove({ isLabSample: true, ...p })])[0]?.saetning;

const tekstTilfaelde: [string, Partial<RessourceProve>, string][] = [
  [
    "gult svar pa en prove sat til genanvendelse",
    { level: "forurenet", resource_handling: "genanvendelse" },
    FORUR,
  ],
  [
    "rodt svar uden asbest",
    { level: "farligt", resource_handling: "genbrug" },
    FARLIGT,
  ],
  [
    "screeneren valgte bortskaffelse, svaret er gult",
    { level: "forurenet", resource_handling: "bortskaffelse" },
    FORUR,
  ],
  [
    "screeneren valgte bortskaffelse, svaret er rodt",
    { level: "farligt", resource_handling: "bortskaffelse" },
    FARLIGT,
  ],
  [
    "screeneren valgte bortskaffelse, svaret er rent",
    { level: "rent", resource_handling: "bortskaffelse" },
    BORT,
  ],
  [
    "screeneren valgte bortskaffelse, ingen analyse",
    { isLabSample: false, level: null, resource_handling: "bortskaffelse" },
    BORT,
  ],
  [
    "asbest pavist",
    { level: "farligt", asbestPaavist: true, resource_handling: "genbrug" },
    ASBEST,
  ],
  [
    "asbest pavist, og screeneren valgte bortskaffelse",
    {
      level: "farligt",
      asbestPaavist: true,
      resource_handling: "bortskaffelse",
    },
    ASBEST,
  ],
];

for (const [hvad, p, forventet] of tekstTilfaelde) {
  const fik = saetningFor(p);
  check(fik === forventet, `${hvad}: fik "${fik}", forventede "${forventet}"`);
}

/*
 * To rode prover af samme materiale, hvor asbest kun er pavist i den ene.
 *
 * De ma IKKE laegges sammen til en linje. Niveauet er det samme, sa uden
 * teksten i grupperingsnoglen ville de smelte sammen, og den ene af de to
 * saetninger ville forsvinde ud af rapporten — den om asbest, hvis P2 kom
 * forst. Maengderne skal blive hos hver sin.
 */
const roedMedOgUdenAsbest = urene([
  prove({ label: "P1", isLabSample: true, level: "farligt", estimated_tons: 4 }),
  prove({
    label: "P2",
    isLabSample: true,
    level: "farligt",
    asbestPaavist: true,
    estimated_tons: 6,
  }),
]);
check(
  roedMedOgUdenAsbest.length === 2,
  `rod med og uden asbest gav ${roedMedOgUdenAsbest.length} linjer, skulle give 2`,
);
check(
  roedMedOgUdenAsbest.map((l) => l.saetning).sort().join(" | ") ===
    [ASBEST, FARLIGT].sort().join(" | "),
  "de to rode linjer fik ikke hver sin saetning",
);
check(
  roedMedOgUdenAsbest.find((l) => l.saetning === ASBEST)?.kg === 6000,
  "asbestlinjen fik ikke sin egen maengde",
);

/*
 * Forureningslinjen navngives med provenummeret, ikke materialet.
 *
 * Entreprenoren skal kunne slaa den enkelte prove op i analyseskemaet;
 * «Glasseret tegl» siger ikke hvilket af tre stykker der var forurenet.
 * Ressourceafsnittet beholder navnet — der er materialet hele pointen.
 */
const toGule = urene([
  prove({ label: "P1", isLabSample: true, level: "forurenet", estimated_tons: 4 }),
  prove({ label: "P2", isLabSample: true, level: "forurenet", estimated_tons: 6 }),
]);
check(toGule.length === 1, "to ens gule prover blev ikke lagt sammen til en linje");
check(
  ressourceLinjeHoved(toGule[0]!) === "P1, P2",
  `forureningslinjens hoved blev "${ressourceLinjeHoved(toGule[0]!)}"`,
);
check(toGule[0]?.kg === 10000, "maengderne blev ikke lagt sammen");
// Ressourceafsnittet gaar den anden vej: der staar materialets rapportnavn.
check(
  linjer([prove({ label: "P1" })])[0]?.navn === "Beton",
  "ressourcelinjen mistede materialets rapportnavn",
);

/*
 * Reglen bag bade analyseskemaets kolonne og rapportens afsnit.
 *
 * De to laeser den samme funktion, og det er meningen: sagde skemaet «Genbrug»
 * pa en linje, som forureningsafsnittet havde skrevet bortskaffelse pa, ville
 * laeseren ikke vide hvem der havde ret.
 */
check(
  faktiskHandtering("genbrug", "forurenet") === "bortskaffelse",
  "et gult svar aendrede ikke handteringen til bortskaffelse",
);
check(
  faktiskHandtering("genbrug", "farligt") === "bortskaffelse",
  "et rodt svar aendrede ikke handteringen til bortskaffelse",
);
check(
  faktiskHandtering("genanvendelse", "forurenet") === "bortskaffelse",
  "genanvendelse blev ikke overstyret af et gult svar",
);
// Rent svar rorer ikke vurderingen — det er kun det gule og rode, der overstyrer.
check(
  faktiskHandtering("genbrug", "rent") === "genbrug",
  "et rent svar aendrede screenerens vurdering",
);
// Ingen analyse betyder intet svar, og sa staar vurderingen.
check(
  faktiskHandtering("genanvendelse", null) === "genanvendelse",
  "en prove uden svar mistede sin handtering",
);
check(
  faktiskHandtering(null, "farligt") === "bortskaffelse",
  "en prove uden valgt handtering fik ikke bortskaffelse af et rodt svar",
);
check(
  faktiskHandtering(null, null) === null,
  "uden valg og uden svar skal der ikke staa noget",
);

// Og reglen skal give det SAMME som rapportens fordeling. En prove der efter
// funktionen skal bortskaffes, ma ikke kunne ende i ressourceafsnittet.
for (const niveau of ["rent", "forurenet", "farligt", null] as const) {
  for (const valgt of ["genbrug", "genanvendelse", "bortskaffelse", null] as const) {
    const p = prove({
      isLabSample: niveau !== null,
      level: niveau,
      resource_handling: valgt,
    });
    const forventetIForureninger =
      faktiskHandtering(valgt, niveau) === "bortskaffelse";
    check(
      (urene([p]).length === 1) === forventetIForureninger,
      `${valgt ?? "intet valg"} + ${niveau ?? "intet svar"} landede i det forkerte afsnit`,
    );
    check(
      (linjer([p]).length === 1) === !forventetIForureninger,
      `${valgt ?? "intet valg"} + ${niveau ?? "intet svar"} landede i begge eller ingen afsnit`,
    );
  }
}

const venter = oversigt([prove({ isLabSample: true, level: null })]);
check(venter.ressourcer.length === 0, "en prove uden svar kom med som ressource");
check(
  venter.forureninger.length === 0,
  "en prove uden svar kom med i forureningsafsnittet",
);
check(venter.afventer === 1, `afventer blev ${venter.afventer}, forventede 1`);

const udenDel = oversigt([prove({ building_part_id: null })]);
check(udenDel.ressourcer.length === 0, "en prove uden bygningsdel kom med");
check(udenDel.afventer === 0, "en prove uden bygningsdel blev talt som afventende");

// En bygningsdel der er slettet i panelet: proven bliver, men den kan ikke
// placeres under en overskrift.
const ukendtDel = oversigt([prove({ building_part_id: "findes-ikke" })]);
check(ukendtDel.ressourcer.length === 0, "en ukendt bygningsdel gav en gruppe");

const udenMat = oversigt([prove({ material: null })]);
check(udenMat.ressourcer.length === 0, "en prove uden materiale kom med");
check(udenMat.udenMateriale === 1, `udenMateriale blev ${udenMat.udenMateriale}`);

// ---------------------------------------------------------------------------
// 1c. Maerket paa linjen
// ---------------------------------------------------------------------------
/*
 * Maerket svarer paa: hvad ER det her for noget affald? Ikke hvad der skal ske
 * med det, og ikke hvad der skal staa.
 *
 * Det vigtige er, at MAERKET FOLGER LABORATORIET og ikke screenerens valg.
 * Sagde Eurofins gult, staar der «Forurenet affald» — ogsa naar screeneren selv
 * havde skrevet bortskaffelse paa proven, og ogsa selvom linjen saa faar
 * bortskaffelsesteksten. Ellers ville rapporten kalde en prove rod, som
 * analyseskemaet farver gul, og laeseren ville ikke vide hvem der havde ret.
 *
 * Derfor proves alle kombinationer: maerket maa aldrig paastaa et andet niveau,
 * end det skemaet viser.
 */
const maerkeFor = (p: Partial<RessourceProve>) =>
  urene([prove({ isLabSample: true, ...p })])[0]?.maerke;

for (const niveau of ["rent", "forurenet", "farligt", null] as const) {
  for (const valgt of ["genbrug", "genanvendelse", "bortskaffelse", null] as const) {
    for (const asbest of [false, true]) {
      const forventet = affaldsmaerke(niveau, asbest);
      const linje = urene([
        prove({
          isLabSample: niveau !== null,
          level: niveau,
          resource_handling: valgt,
          asbestPaavist: asbest,
        }),
      ])[0];
      if (!linje) continue;

      check(
        linje.maerke === forventet,
        `${valgt ?? "intet valg"} + ${niveau ?? "intet svar"}${asbest ? " + asbest" : ""} fik maerket "${linje.maerke}", forventede "${forventet}"`,
      );
      // Og den anden vej: maerket maa ikke sige et niveau, proven ikke har.
      check(
        !(linje.maerke === "farligt" && niveau !== "farligt"),
        `en prove med svaret ${niveau ?? "intet"} fik det rode maerke`,
      );
      check(
        !(linje.maerke === "forurenet" && niveau !== "forurenet"),
        `en prove med svaret ${niveau ?? "intet"} fik det gule maerke`,
      );
      check(
        (linje.maerke === "asbest") === asbest,
        "asbestmaerket fulgte ikke asbestsvaret",
      );
    }
  }
}

// Det gule svar beholder sit gule maerke, ogsa naar screeneren valgte
// bortskaffelse — og teksten folger maerket. Eurofins overruler: de har et
// bevis paa standen, hvor screeneren antager.
check(
  maerkeFor({ level: "forurenet", resource_handling: "bortskaffelse" }) ===
    "forurenet",
  "screenerens valg flyttede det gule maerke",
);
check(
  saetningFor({ level: "forurenet", resource_handling: "bortskaffelse" }) === FORUR,
  "screenerens bortskaffelse slog det gule svar",
);

// Og teksten er ALTID maerkets. Det er reglen i en saetning: hvad linjen ER,
// og hvad der skal STAA, maa ikke kunne pege hver sin vej.
for (const niveau of ["rent", "forurenet", "farligt", null] as const) {
  for (const asbest of [false, true]) {
    check(
      bortskaffelsestekst(niveau, asbest) ===
        MAERKE_TEKST[affaldsmaerke(niveau, asbest)],
      `${niveau ?? "intet svar"}${asbest ? " + asbest" : ""}: teksten fulgte ikke maerket`,
    );
  }
}

// Pavist asbest er stadig farligt affald — skemaet farver den rod. Det er kun
// maerket i rapporten, der siger hvilken slags.
check(
  maerkeFor({ level: "farligt", asbestPaavist: true }) === "asbest",
  "asbest fik ikke sit eget maerke",
);
check(
  urene([prove({ isLabSample: true, level: "farligt", asbestPaavist: true })])[0]
    ?.niveau === "farligt",
  "asbestlinjen holdt op med at vaere farligt affald",
);

// Det neutrale maerke: screeneren valgte bortskaffelse, og laboratoriet har
// ikke fundet noget. Linjen stod for uden maerke — med en faelles tekst ville
// den saa staa uden tekst overhovedet.
check(
  maerkeFor({ level: "rent", resource_handling: "bortskaffelse" }) ===
    "bortskaffelse",
  "en ren prove sat til bortskaffelse fik ikke det neutrale maerke",
);
check(
  urene([prove({ resource_handling: "bortskaffelse", isLabSample: false })])[0]
    ?.maerke === "bortskaffelse",
  "en prove uden analyse fik ikke det neutrale maerke",
);

// Ressourceafsnittet har ingen maerker: alt i det er gront, og et gront maerke
// paa hver linje betyder ingenting.
check(
  linjer([prove({})]).every((l) => l.maerke === null),
  "en ressourcelinje fik et maerke",
);

// Hvert maerke skal have et navn og en tekst at hente. Mangler et af dem, staar
// der en tom firkant i rapporten.
for (const m of MAERKE_ORDEN) {
  check(
    (AFFALDSMAERKE_LABEL[m] ?? "").trim().length > 0,
    `maerket "${m}" mangler sit navn`,
  );
  check(MAERKE_TEKST[m] !== undefined, `maerket "${m}" peger ikke paa en tekst`);
}
// Hvert maerke sin egen tekst. Farligt og bortskaffelse delte engang — det
// maa de ikke igen: rodt er et bevis, bortskaffelse er en vurdering.
check(
  MAERKE_TEKST.farligt !== MAERKE_TEKST.bortskaffelse,
  "farligt affald og bortskaffelse deler tekst igen",
);
check(
  new Set(Object.values(MAERKE_TEKST)).size === MAERKE_ORDEN.length,
  "to maerker peger paa den samme tekst",
);
for (const t of TEKST_ORDEN) {
  check(
    maerkerFor(t).length === 1,
    `teksten "${t}" hentes af ${maerkerFor(t).length} maerker, forventede 1`,
  );
}

// ---------------------------------------------------------------------------
// 1d. Provearten som fund
// ---------------------------------------------------------------------------
/*
 * Asbest og Sod er fund uden analyse. Screeneren ved, hvad hun staar med, og
 * der bestilles ingen analyse — provearten laaser den. Se `visueltFund` i
 * types.ts.
 *
 * Det vigtige er, at HELE kaeden er enig: reglen, skemaets niveau, asbestcellen
 * og rapportens fordeling. Stod skemaet rodt paa en linje, rapporten ikke havde
 * flyttet, ville laeseren ikke vide hvem der havde ret.
 */
check(visueltFund("Asbest")?.level === "farligt", "Asbest er ikke farligt affald");
check(visueltFund("Asbest")?.asbest === true, "Asbest er ikke asbest");
check(visueltFund("Sod")?.level === "forurenet", "Sod er ikke forurenet affald");
check(visueltFund("Sod")?.asbest === false, "Sod blev til asbest");
// «Mulig asbest» er den proveart, der SKAL til laboratoriet. Den er ikke et fund.
check(visueltFund("Mulig asbest") === null, "Mulig asbest blev et fund uden analyse");
check(visueltFund("Hvid maling") === null, "en almindelig proveart blev et fund");
check(visueltFund(null) === null, "ingen proveart blev et fund");
// Navnene er noegler i et objekt. Et arvet navn maa ikke kunne blive et fund.
check(visueltFund("constructor") === null, "et arvet objektnavn blev et fund");

// Laasen: alle fire analyser slaas fra, og kun for de to.
for (const navn of Object.keys(VISUELLE_FUND)) {
  check(analyserLaast(navn), `${navn} laaser ikke analyserne`);
  const fra = analysesForSampleType(navn);
  check(
    ANALYSIS_FIELDS.every((a) => fra[a.key] === false),
    `${navn} slog ikke alle fire analyser fra`,
  );
}
check(!analyserLaast("Mulig asbest"), "Mulig asbest laaser analyserne");
check(
  Object.keys(analysesForSampleType("Hvid maling")).length === 0,
  "en almindelig proveart aendrede analyserne",
);
check(Object.keys(analysesForSampleType(null)).length === 0, "ingen proveart aendrede analyserne");

// Skemaets niveau: provearten taeller med, ogsaa uden et labsvar.
check(levelOfSample(undefined, "Asbest") === "farligt", "Asbest gav ikke rodt i skemaet");
check(levelOfSample(undefined, "Sod") === "forurenet", "Sod gav ikke gult i skemaet");
check(levelOfSample(undefined, "Hvid maling") === null, "en almindelig proveart fik et niveau");
// Uden proveart er det laboratoriet alene — det er saadan svarene taelles.
check(levelOfSample(undefined) === null, "ingen svar og ingen proveart gav et niveau");
check(levelOfSample({ pb: "5" }) === "rent", "et rent svar blev ikke rent");
check(asbestPaavist(undefined, "Asbest"), "Asbest gav ikke pavist asbest");
check(!asbestPaavist(undefined, "Sod"), "Sod gav pavist asbest");
check(!asbestPaavist(undefined), "ingenting gav pavist asbest");
check(asbestPaavist({ asbestos: "Påvist" }), "laboratoriets pavist blev ikke laest");

// Det vaerste vinder, naar der baade er et svar og en proveart: sod paa en
// prove, hvor bly ligger over graensen, er stadig rod.
check(
  levelOfSample({ pb: "3000" }, "Sod") === "farligt",
  "sod trak et rodt svar ned til gult",
);
check(
  levelOfSample({ pb: "5" }, "Sod") === "forurenet",
  "sod blev rent af et rent svar",
);

// Har laboratoriet analyseret for asbest, vinder de — de har et bevis, hvor
// screeneren antager. Laasen forhindrer at det sker paa nye prover; det her
// er raekker fra for laasen.
check(
  gaeldendeFund({ asbestos: "Ikke påvist" }, "Asbest") === null,
  "provearten Asbest slog laboratoriets ikke pavist",
);
check(
  levelOfSample({ asbestos: "Ikke påvist" }, "Asbest") === "rent",
  "proven blev rod, selvom laboratoriet svarede ikke pavist paa asbest",
);
check(
  !asbestPaavist({ asbestos: "Ikke påvist" }, "Asbest"),
  "asbest stod pavist, selvom laboratoriet svarede ikke pavist",
);
// Men et svar uden asbestanalyse rorer ikke fundet: I.a. er ikke et svar.
check(
  gaeldendeFund({ pb: "5", asbestos: "" }, "Asbest")?.asbest === true,
  "et svar uden asbestanalyse slog provearten Asbest",
);
check(
  levelOfSample({ pb: "5" }, "Asbest") === "farligt",
  "Asbest blev rent af et svar, der ikke maalte asbest",
);
// Sod har ingen kolonne at tabe til.
check(
  gaeldendeFund({ asbestos: "Ikke påvist", pb: "5" }, "Sod")?.level === "forurenet",
  "sod forsvandt af et labsvar",
);

// Rapporten: fundet lander i Forureninger med sit maerke og sin tekst, uden
// P, og uden at taelle som afventende — det er ikke en labprove.
const sodProve = prove({
  label: "3",
  isLabSample: false,
  level: "forurenet",
  resource_handling: "genanvendelse",
  estimated_tons: 2,
});
const sodOversigt = oversigt([sodProve]);
check(sodOversigt.afventer === 0, "en sodprove blev talt som afventende");
check(sodOversigt.ressourcer.length === 0, "en sodprove blev en ressource");
check(
  sodOversigt.forureninger.flatMap((g) => g.linjer)[0]?.maerke === "forurenet",
  "sod fik ikke det gule maerke",
);
check(
  sodOversigt.forureninger.flatMap((g) => g.linjer)[0]?.saetning === FORUR,
  "sod fik ikke forureningsteksten",
);
check(
  ressourceLinjeHoved(sodOversigt.forureninger.flatMap((g) => g.linjer)[0]!) === "3",
  "sodlinjen fik et P, den ikke har",
);

const asbestProve = prove({
  label: "4",
  isLabSample: false,
  level: "farligt",
  asbestPaavist: true,
  resource_handling: "genbrug",
});
const asbestOversigt = oversigt([asbestProve]);
check(asbestOversigt.afventer === 0, "en asbestprove blev talt som afventende");
check(
  asbestOversigt.forureninger.flatMap((g) => g.linjer)[0]?.maerke === "asbest",
  "proveart-asbest fik ikke asbestmaerket",
);
check(
  asbestOversigt.forureninger.flatMap((g) => g.linjer)[0]?.saetning === ASBEST,
  "proveart-asbest fik ikke asbestteksten",
);
// Og skemaets kolonne siger bortskaffelse, som rapporten goer.
check(
  faktiskHandtering("genbrug", levelOfSample(undefined, "Asbest")) === "bortskaffelse",
  "skemaet sagde genbrug paa en asbestprove",
);

// Navnene skal vaere dem, der staar i databasen. Er «Sod» stavet anderledes i
// seed-migrationen, sker der ingenting — reglen rammer bare aldrig.
const provearterISeed = new Set(
  [
    ...(function () {
      const fra = lookupsMigration.indexOf("screening.sample_types");
      const til = lookupsMigration.indexOf("screening.app_settings", fra);
      return lookupsMigration.slice(fra, til).matchAll(/'([^']+)'/g);
    })(),
  ].map((m) => m[1]),
);
check(
  provearterISeed.size > 15,
  `fandt kun ${provearterISeed.size} provearter i migrationen — er filen flyttet?`,
);
for (const navn of Object.keys(VISUELLE_FUND)) {
  check(
    provearterISeed.has(navn),
    `provearten "${navn}" findes ikke i screening.sample_types`,
  );
}
check(provearterISeed.has("Mulig asbest"), "«Mulig asbest» er vaek fra listen");

// ---------------------------------------------------------------------------
// 2. Navn og saetning kommer fra materialet
// ---------------------------------------------------------------------------
const betonLinje = linjer([prove({})])[0]!;
check(
  betonLinje.navn === "Beton",
  `rapportnavnet blev "${betonLinje.navn}" — parentesen skal ikke med ud til kunden`,
);
check(
  betonLinje.saetning === "egnet til nedknusning og genanvendelse.",
  `saetningen blev "${betonLinje.saetning}"`,
);

// Handteringen vaelger saetningen. Samme materiale, to udfald.
check(
  linjer([prove({ resource_handling: "genbrug" })])[0]?.saetning ===
    "kan genbruges som hele elementer.",
  "genbrug hentede ikke sin egen saetning",
);

// Uden handtering er der intet at vaelge imellem, og sa loves der ingenting.
check(
  linjer([prove({ resource_handling: null })])[0]?.saetning === null,
  "en prove uden handtering fik en saetning",
);

// Er saetningen ikke skrevet i panelet, skal linjen stadig med — maengden er
// registreret. En manglende saetning er en halv linje; en forsvundet linje er
// et materiale, kommunen ikke hoerer om.
const utekstet = linjer([
  prove({ material: TAGPAP.name, building_part_id: TAG.id }),
]);
check(utekstet.length === 1, "et materiale uden saetning forsvandt");
check(utekstet[0]?.navn === "Tagpap", `navnet blev "${utekstet[0]?.navn}"`);
check(utekstet[0]?.saetning === null, "et materiale uden saetning fik en");

// Et materiale der er lukket eller omdobt siden proven blev taget: provens egen
// tekst bruges som navn, sa maengden ikke falder ud af rapporten.
const fremmed = linjer([prove({ material: "Findes ikke længere" })]);
check(fremmed.length === 1, "et ukendt materiale forsvandt ud af rapporten");
check(
  fremmed[0]?.navn === "Findes ikke længere",
  `et ukendt materiale blev navngivet "${fremmed[0]?.navn}"`,
);
check(fremmed[0]?.saetning === null, "et ukendt materiale fik en saetning");

// Feltnavnene skal passe pa Material. Rammer de ved siden af, bliver hver
// saetning tavst null, og rapporten ser bare tom ud.
for (const [handling, felt] of Object.entries(SENTENCE_FIELD)) {
  check(felt in BETON, `${handling} peger pa feltet "${felt}", som ikke findes`);
}

// ---------------------------------------------------------------------------
// 2b. Den faelles bortskaffelsestekst
// ---------------------------------------------------------------------------
/*
 * Kontoret kan slaa en faelles tekst til: de tre saetninger er de samme uanset
 * materiale, og gentaget paa tredive linjer er de stoej frem for en anvisning.
 * Saa staar de EN gang under linjerne, og maerket peger paa den, der gaelder.
 *
 * Materialernes egne saetninger roeres ikke — kontakten skal kunne gaa begge
 * veje. Det proves ved at koere de samme prover igennem med og uden.
 */
const FAELLES: Bortskaffelsestekster = {
  farligt: "F-FARLIGT.",
  forurenet: "F-FORUR.",
  asbest: "F-ASBEST.",
  bortskaffelse: "F-BORT.",
};
const medFaelles = (proever: RessourceProve[]) =>
  ressourceoversigt(proever, MATERIALER, DELE, FAELLES);

const alleSlags = [
  prove({ label: "P1", isLabSample: true, level: "farligt", estimated_tons: 3 }),
  prove({ label: "P2", isLabSample: true, level: "forurenet", estimated_tons: 2 }),
  prove({
    label: "P3",
    isLabSample: true,
    level: "farligt",
    asbestPaavist: true,
    estimated_tons: 1,
  }),
  prove({
    label: "P4",
    isLabSample: false,
    level: null,
    resource_handling: "bortskaffelse",
    estimated_tons: 4,
  }),
  // En ren prove, sa ressourceafsnittet ogsa er med.
  prove({ label: "P5", isLabSample: true, level: "rent", estimated_tons: 5 }),
];

const faelles = medFaelles(alleSlags);
const faellesUrene = faelles.forureninger.flatMap((g) => g.linjer);

// Saetningen staar ikke paa linjen laengere. Den staar under dem.
check(
  faellesUrene.every((l) => l.saetning === null),
  "en forureningslinje beholdt sin egen saetning, da teksten blev faelles",
);
check(
  faellesUrene.every((l) => l.maerke !== null),
  "en forureningslinje stod uden maerke — saa peger den ikke paa nogen tekst",
);
// Ressourceafsnittet roeres ikke: genbrug og genanvendelse ER forskellige fra
// materiale til materiale, og de bliver staaende paa materialet.
check(
  faelles.ressourcer.flatMap((g) => g.linjer)[0]?.saetning ===
    BETON.sentence_genanvendelse,
  "ressourcelinjen mistede materialets egen saetning",
);

// De fire tekster, i den orden kunden moder dem, og med det maerke der henter
// hver af dem. Farligt og bortskaffelse staar hver for sig.
check(
  faelles.standardtekster.length === 4,
  `fik ${faelles.standardtekster.length} standardtekster, forventede 4`,
);
check(
  faelles.standardtekster.map((s) => s.tekst).join(" | ") ===
    "F-FARLIGT. | F-FORUR. | F-ASBEST. | F-BORT.",
  `standardteksterne stod som "${faelles.standardtekster.map((s) => s.tekst).join(" | ")}"`,
);
check(
  faelles.standardtekster.map((s) => s.maerker.join(",")).join(" | ") ===
    "farligt | forurenet | asbest | bortskaffelse",
  `standardteksterne hentes af ${faelles.standardtekster.map((s) => s.maerker.join(",")).join(" | ")}`,
);

// Kun det, sagen faktisk har. En standardtekst om asbest i en rapport uden
// asbest er en oplysning om ingenting — praecis det, Word-skabelonen gjorde.
const kunGul = medFaelles([
  prove({ label: "P1", isLabSample: true, level: "forurenet" }),
]);
check(
  kunGul.standardtekster.length === 1 &&
    kunGul.standardtekster[0]?.tekst === "F-FORUR.",
  "en sag med kun gult fik andre standardtekster end den gule",
);

// Uden kontakten: ingen tekster nederst, og saetningen staar paa linjen igen.
const udenFaelles = oversigt(alleSlags);
check(
  udenFaelles.standardtekster.length === 0,
  "der stod standardtekster, selvom teksten kommer fra materialerne",
);
check(
  udenFaelles.forureninger
    .flatMap((g) => g.linjer)
    .some((l) => l.saetning !== null),
  "linjerne mistede materialets saetninger, da den faelles tekst var slaaet fra",
);

// En tekst, ingen har skrevet, springes over. Maerket staar stadig paa linjen —
// den lover bare ingenting, praecis som et materiale uden saetning.
const asbestprove = prove({
  label: "P1",
  isLabSample: true,
  level: "farligt",
  asbestPaavist: true,
});
check(
  ressourceoversigt([asbestprove], MATERIALER, DELE, { ...FAELLES, asbest: null })
    .standardtekster.length === 0,
  "en uskreven faelles tekst blev alligevel til en raekke",
);
check(
  medFaelles([asbestprove]).forureninger[0]?.linjer[0]?.maerke === "asbest",
  "asbestlinjen mistede sit maerke",
);

/*
 * To gule prover af samme materiale, hvor screeneren valgte hver sit.
 *
 * De faar samme maerke og dermed samme tekst — Eurofins overruler begge — og
 * skal derfor staa som EN linje, hvad enten teksten er faelles eller
 * materialets. Engang stod de hver for sig uden faelles tekst, fordi
 * screenerens bortskaffelse dengang gav en anden saetning end det gule svar.
 */
const toGuleForskelligtValg = [
  prove({
    label: "P1",
    isLabSample: true,
    level: "forurenet",
    resource_handling: "genbrug",
    estimated_tons: 4,
  }),
  prove({
    label: "P2",
    isLabSample: true,
    level: "forurenet",
    resource_handling: "bortskaffelse",
    estimated_tons: 6,
  }),
];
check(
  urene(toGuleForskelligtValg).length === 1,
  "de to gule blev ikke lagt sammen, selvom de faar samme saetning",
);
check(
  urene(toGuleForskelligtValg)[0]?.saetning === FORUR,
  "de to gule fik ikke forureningsteksten",
);
const lagtSammen = medFaelles(toGuleForskelligtValg).forureninger.flatMap(
  (g) => g.linjer,
);
check(
  lagtSammen.length === 1,
  `de to gule blev til ${lagtSammen.length} ens linjer under en faelles tekst`,
);
check(lagtSammen[0]?.kg === 10000, "maengderne blev ikke lagt sammen");

// Men rodt med og uden asbest maa ALDRIG smelte sammen: de peger paa hver sin
// tekst, og den ene af dem ville forsvinde ud af rapporten.
const asbestAdskilt = medFaelles([
  prove({ label: "P1", isLabSample: true, level: "farligt", estimated_tons: 4 }),
  prove({
    label: "P2",
    isLabSample: true,
    level: "farligt",
    asbestPaavist: true,
    estimated_tons: 6,
  }),
]);
check(
  asbestAdskilt.forureninger.flatMap((g) => g.linjer).length === 2,
  "rod med og uden asbest blev lagt sammen under en faelles tekst",
);

// Indstillingerne, som de laeses ud af databasen.
check(
  laesIndstillinger([{ key: INDSTILLING_NOEGLER.faelles, value: true }])
    .faellesBortskaffelse,
  "kontakten blev ikke laest som slaaet til",
);
check(
  !laesIndstillinger(null).faellesBortskaffelse,
  "en tom tabel slog den faelles tekst TIL",
);
check(
  laesIndstillinger([
    { key: INDSTILLING_NOEGLER.bortskaffelse, value: "  Tekst.  " },
  ]).tekster.bortskaffelse === "Tekst.",
  "teksten blev ikke trimmet",
);
check(
  laesIndstillinger([{ key: INDSTILLING_NOEGLER.forurenet, value: "" }]).tekster
    .forurenet === null,
  "en tom tekst blev ikke laest som ingen tekst",
);
// Kontakten kan vaere slaaet til, uden at nogen har skrevet teksterne. Sa
// falder rapporten tilbage paa materialerne frem for at tie.
check(
  faellesTekster(
    laesIndstillinger([{ key: INDSTILLING_NOEGLER.faelles, value: true }]),
  ) === null,
  "en slaaet til kontakt uden tekster tomte forureningsafsnittet",
);
check(
  faellesTekster(
    laesIndstillinger([
      { key: INDSTILLING_NOEGLER.faelles, value: true },
      { key: INDSTILLING_NOEGLER.asbest, value: "Kun asbest." },
    ]),
  )?.asbest === "Kun asbest.",
  "en enkelt skreven tekst blev ikke taget i brug",
);
check(
  faellesTekster(
    laesIndstillinger([
      { key: INDSTILLING_NOEGLER.faelles, value: false },
      { key: INDSTILLING_NOEGLER.asbest, value: "Kun asbest." },
    ]),
  ) === null,
  "teksterne blev brugt, selvom kontakten var slaaet fra",
);

// ---------------------------------------------------------------------------
// 3. Sammenlaegning
// ---------------------------------------------------------------------------
const samlet = linjer([
  prove({ label: "1", estimated_tons: 12, material_condition: 2 }),
  prove({ label: "2", estimated_tons: 30, material_condition: 4 }),
]);
check(samlet.length === 1, `to ens prover gav ${samlet.length} linjer`);
check(samlet[0]?.kg === 42000, `12 + 30 ton blev ${samlet[0]?.kg} kg`);
// Daarligste stand og ikke gennemsnittet: rapporten ma ikke love den bedste.
check(samlet[0]?.condition === 4, `standen blev ${samlet[0]?.condition}, forventede 4`);
check(samlet[0]?.labels.join(",") === "1,2", "linjen pegede ikke pa begge prover");

// Forskellig handtering er forskellig skaebne, og dermed to linjer.
const toUdfald = linjer([
  prove({ label: "1", resource_handling: "genbrug", estimated_tons: 5 }),
  prove({ label: "2", resource_handling: "genanvendelse", estimated_tons: 7 }),
]);
check(toUdfald.length === 2, `to handteringer gav ${toUdfald.length} linjer`);
check(
  toUdfald.map((l) => l.kg).join("+") === "5000+7000",
  `maengderne blev ${toUdfald.map((l) => l.kg).join("+")} — de ma ikke blandes`,
);

// En prove uden maengde ma ikke gore linjen til nul kilo.
check(
  linjer([prove({ estimated_tons: null })])[0]?.kg === null,
  "en prove uden maengde gav nul kilo",
);
check(
  linjer([
    prove({ estimated_tons: null }),
    prove({ label: "2", estimated_tons: 5 }),
  ])[0]?.kg === 5000,
  "en tom og en pa 5 ton gav ikke 5000 kg",
);

// Decimaler. 0,4 ton er 400 kg.
check(linjer([prove({ estimated_tons: 0.4 })])[0]?.kg === 400, "0,4 ton blev ikke 400 kg");
check(linjer([prove({ estimated_tons: 2.8 })])[0]?.kg === 2800, "2,8 ton blev ikke 2800 kg");

// ---------------------------------------------------------------------------
// 4. Raekkefolge
// ---------------------------------------------------------------------------
// Overskrifterne folger bygningsdelenes sort_order — den staar i databasen og
// rettes i panelet, sa afsnittene kan flyttes uden en udrulning.
const raekkefolge = oversigt([
  prove({ label: "1", building_part_id: TAG.id, material: TAGPAP.name }),
  prove({ label: "2", building_part_id: FUNDAMENT.id }),
  prove({ label: "3", building_part_id: FACADE.id, material: TRAE.name, resource_handling: "genbrug" }),
]);
check(
  raekkefolge.ressourcer.map((g) => g.overskrift).join(" | ") ===
    "Fundament og sokkel | Facade (udvendig) | Tag",
  `raekkefolgen blev "${raekkefolge.ressourcer.map((g) => g.overskrift).join(" | ")}"`,
);

// Samme materiale i to bygningsdele bliver to linjer under hver sin overskrift.
const toSteder = oversigt([
  prove({ label: "1", building_part_id: FUNDAMENT.id }),
  prove({ label: "2", building_part_id: FACADE.id }),
]);
check(toSteder.ressourcer.length === 2, "samme materiale to steder blev lagt sammen");

// Inden for en gruppe folger linjerne materialelistens egen orden.
const indenfor = oversigt([
  prove({ label: "1", building_part_id: TAG.id, material: TRAE.name, resource_handling: "genbrug" }),
  prove({ label: "2", building_part_id: TAG.id, material: TAGPAP.name }),
]);
check(
  indenfor.ressourcer[0]?.linjer.map((l) => l.navn).join(" | ") === "Tagpap | Træ",
  `linjerne blev "${indenfor.ressourcer[0]?.linjer.map((l) => l.navn).join(" | ")}"`,
);

// ---------------------------------------------------------------------------
// 5. Linjen som den staar i rapporten
// ---------------------------------------------------------------------------
const tekst = (proever: RessourceProve[]) => ressourceLinjeTekst(linjer(proever)[0]!);

// Med stand: maengde, stand, komma, saetning — praecis som skabelonen.
check(
  tekst([prove({ estimated_tons: 42, material_condition: 2 })]) ===
    "Beton – 42.000 kg i god stand, egnet til nedknusning og genanvendelse.",
  `linjen med stand blev: ${tekst([prove({ estimated_tons: 42, material_condition: 2 })])}`,
);

// Uden stand laener saetningen sig direkte pa maengden, ogsa som skabelonen.
check(
  tekst([prove({ estimated_tons: 42 })]) ===
    "Beton – 42.000 kg egnet til nedknusning og genanvendelse.",
  `linjen uden stand blev: ${tekst([prove({ estimated_tons: 42 })])}`,
);

// Dansk tusindtalsskilletegn. 42000 og 4200 skal kunne skelnes.
check(
  tekst([prove({ estimated_tons: 4.2 })]).includes("4.200 kg"),
  `4,2 ton blev skrevet som: ${tekst([prove({ estimated_tons: 4.2 })])}`,
);

check(
  tekst([prove({ estimated_tons: null })]).includes("mængde ikke opgjort"),
  "en linje uden maengde sagde det ikke",
);

// Et materiale uden saetning slutter efter maengden og lover ingenting.
check(
  tekst([prove({ material: TAGPAP.name, building_part_id: TAG.id, estimated_tons: 1 })]) ===
    "Tagpap – 1.000 kg",
  `linjen uden saetning blev: ${tekst([prove({ material: TAGPAP.name, building_part_id: TAG.id, estimated_tons: 1 })])}`,
);

for (const c of MATERIAL_CONDITIONS) {
  const t = tekst([prove({ estimated_tons: 1, material_condition: c.grade })]);
  check(t.includes(`i ${c.label.toLowerCase()},`), `stand ${c.grade} blev: ${t}`);
}

// ---------------------------------------------------------------------------
// 6. Sideopdelingen
// ---------------------------------------------------------------------------
check(ressourceSider([]).length === 0, "ingen grupper skulle give ingen sider");

/*
 * Handteringsteksten tager plads pa afsnittets forste side.
 *
 * Den skrives i hand og kan blive lang. Far sideopdelingen ikke dens hojde at
 * vide, bliver materialelinjerne lagt pa en side, der ikke har plads — og
 * `.print-side` braekker ikke af sig selv, sa de bliver klippet.
 */
check(tekstHoejde(null) === 0, "ingen tekst skulle tage ingen plads");
check(tekstHoejde("   ") === 0, "kun mellemrum skulle tage ingen plads");
check(tekstHoejde("Kort tekst.") === 14, `en linje blev ${tekstHoejde("Kort tekst.")} mm`);
// Afsnit taeller hver for sig: to korte linjer fylder mere end deres anslag.
check(
  tekstHoejde("En linje.\nEn anden linje.") === 20,
  `to afsnit blev ${tekstHoejde("En linje.\nEn anden linje.")} mm`,
);
check(
  tekstHoejde("x".repeat(190)) === 20,
  `190 anslag blev ${tekstHoejde("x".repeat(190))} mm, forventede to linjer`,
);

const enLinje: RessourceGruppe[] = [
  { overskrift: "Tag", linjer: linjer([prove({})]) },
];
check(
  ressourceSider(enLinje, 0).length === 1,
  "en linje uden tekst over sig fyldte mere end en side",
);
// En tekst der fylder hele siden skubber linjen til naeste ark frem for at
// presse den ud over kanten.
check(
  ressourceSider(enLinje, 300).length === 1,
  "en meget lang tekst gav ikke plads til linjen pa naeste side",
);
check(
  ressourceSider(enLinje, 300)[0]?.[0]?.linjer.length === 1,
  "linjen forsvandt, da teksten fyldte siden",
);
check(
  ressourceSider([{ overskrift: "Tag", linjer: linjer([prove({})]) }]).length === 1,
  "en enkelt linje gav mere end en side",
);

const mange: RessourceGruppe[] = [
  {
    overskrift: "Tag",
    linjer: Array.from({ length: 40 }, (_, i) => ({
      navn: `Materiale ${i}`,
      kg: 1000,
      condition: null,
      handling: null,
      saetning: null,
      niveau: null,
      maerke: null,
      labels: [String(i)],
    })),
  },
];
const delt = ressourceSider(mange);
check(delt.length > 1, "fyrre linjer blev ikke delt op");
check(
  delt.reduce((n, s) => n + s.reduce((m, g) => m + g.linjer.length, 0), 0) === 40,
  "en linje forsvandt i sideopdelingen",
);
check(delt[0]![0]!.overskrift === "Tag", "forste side mistede sin overskrift");
check(
  delt[1]![0]!.overskrift === "Tag (fortsat)",
  `anden side fik overskriften "${delt[1]![0]!.overskrift}"`,
);
for (const [nr, s] of delt.entries()) {
  for (const g of s) {
    check(g.linjer.length > 0, `side ${nr + 1} har en overskrift uden linjer under`);
  }
}

/*
 * De faelles tekster staar nederst paa den sidste side, og de skal have plads.
 *
 * Er der ikke plads, faar de et ark for sig. Sker det ikke, loeber de ud over
 * kanten — `.print-side` braekker ikke af sig selv, og det ses forst naar nogen
 * printer.
 */
check(standardtekstHoejde([]) === 0, "ingen tekster skulle tage ingen plads");
check(
  standardtekstHoejde([{ maerker: ["asbest"], tekst: "Kort." }]) === 20,
  `en kort tekst blev ${standardtekstHoejde([{ maerker: ["asbest"], tekst: "Kort." }])} mm`,
);
check(
  standardtekstHoejde([{ maerker: ["asbest"], tekst: "x".repeat(170) }]) === 26,
  "en tekst over to linjer blev ikke hojere end en over en",
);

// Den sidste af de tre sider har syv linjer og altsaa god plads. 200 mm er mere
// end der er tilbage, og saa skal teksterne have et ark.
const fyldtSide = ressourceSider(mange);
const medPlads = ressourceSider(mange, 0, 200);
check(
  medPlads.length === fyldtSide.length + 1,
  "teksterne nederst fik ikke et ark, da den sidste side var fuld",
);
check(
  medPlads[medPlads.length - 1]?.length === 0,
  "det sidste ark skulle vaere tomt og kun baere teksterne",
);
check(
  medPlads.reduce((n, s) => n + s.reduce((m, g) => m + g.linjer.length, 0), 0) === 40,
  "en linje forsvandt, da teksterne fik plads",
);
// Er der luft tilbage, faar de ikke et ark for sig — et halvtomt ark mere er
// ogsa en fejl, bare en billigere en.
check(
  ressourceSider(enLinje, 0, 60).length === 1,
  "teksterne fik et ark for sig, selvom der var plads",
);
check(
  ressourceSider([], 0, 60).length === 0,
  "en tom oversigt gav en side alligevel",
);

// ---------------------------------------------------------------------------
// 7. Analyseskemaets bredde
// ---------------------------------------------------------------------------
// Det selektive skema har to kolonner mere, men det samme ark. Pladsen tages af
// cellernes sideluft og ikke af tallene, og det er den regning der
// kontrolleres: en analysekolonne skal have mindst lige saa mange pixel til
// "< 2500" som det almindelige skema. Bliver den smallere, braekker tallet i to
// linjer paa papiret — og det ses foerst, naar nogen printer.
const css = readFileSync(join(here, "..", "src", "app", "globals.css"), "utf8");
const sideluft = (selektor: string) => {
  const blok = css.slice(css.indexOf(`${selektor} {`));
  const fundet = blok
    .slice(0, blok.indexOf("}"))
    .match(/--skema-sideluft:\s*([\d.]+)rem/);
  return fundet ? Number(fundet[1]) : null;
};

let bredder = "";
const luftAlm = sideluft(".skema");
const luftSel = sideluft(".skema-selektiv");
check(luftAlm !== null, "fandt ikke --skema-sideluft i .skema");
check(luftSel !== null, "fandt ikke --skema-sideluft i .skema-selektiv");

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
  check(alm >= 32, `det almindelige skema er nede paa ${alm.toFixed(2)} px pr. analysekolonne`);
  check(sel >= 32, `det selektive skema er nede paa ${sel.toFixed(2)} px pr. analysekolonne`);
  bredder = `analysekolonne ${alm.toFixed(2)} px alm. / ${sel.toFixed(2)} px selektiv`;
}

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

check(
  NAVNEKOLONNER_SELEKTIV.length === NAVNEKOLONNER.length + 2,
  `det selektive skema har ${NAVNEKOLONNER_SELEKTIV.length} navnekolonner, forventede ${NAVNEKOLONNER.length + 2}`,
);

// ---------------------------------------------------------------------------
// 7b. Maerkernes farver
// ---------------------------------------------------------------------------
// Klassen skal findes i globals.css, og den skal ogsa staa i @media print.
// Farverne tvinges igennem med print-color-adjust, men et token, der kun findes
// paa skaermen, kommer ud som ingenting — og saa staar der et navnloest maerke
// paa papiret. Det ses forst, naar nogen printer.
const printblok = css.slice(css.indexOf("@media print"));

/** Alt hvad en @utility slaar op i, saa tokenet kan foelges hele vejen. */
const tokensI = (klasse: string): string[] | null => {
  const start = css.indexOf(`@utility ${klasse} {`);
  if (start === -1) return null;
  const blok = css.slice(start, css.indexOf("}", start));
  return [...blok.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((t) => t[1]!);
};

for (const m of MAERKE_ORDEN) {
  const klasser = `${MAERKE_CLASS[m]} ${MAERKE_FLADE[m]}`.split(" ");
  for (const klasse of klasser) {
    // Tailwinds egne klasser staar ikke i filen; det er vores egne, der skal
    // kontrolleres.
    if (!klasse.startsWith("level-") && !klasse.startsWith("flade-")) continue;

    const tokens = tokensI(klasse);
    check(
      tokens !== null,
      `maerket "${m}" bruger .${klasse}, som ikke findes i globals.css`,
    );
    check(
      (tokens?.length ?? 0) > 0,
      `.${klasse} slaar ikke et eneste token op — saa har den ingen farve`,
    );

    // Og hvert token skal ogsa staa i @media print. Farverne tvinges igennem
    // med print-color-adjust, men et token, der kun findes paa skaermen, kommer
    // ud som ingenting — og saa staar der en navnloes firkant paa papiret. Det
    // ses forst, naar nogen printer.
    for (const token of tokens ?? []) {
      check(
        printblok.includes(`${token}:`),
        `${token} mangler i @media print — .${klasse} kommer ud uden farve`,
      );
    }
  }
}

// Stregen mellem maerket og teksten skal arve fladens farve. Uden den er
// Tailwinds standard currentColor, altsa en sort streg gennem en bleg flade.
check(
  /@utility streg-arvet \{\s*border-color: inherit;/.test(css),
  "streg-arvet arver ikke fladens farve",
);

// ---------------------------------------------------------------------------
// 8. BBR's kodelister
// ---------------------------------------------------------------------------
// Kode 3 er fibercement MED asbest, kode 10 er den samme plade uden. Byttes de
// om, siger rapporten det modsatte af sandheden — og screeneren tager de
// forkerte vaernemidler med.
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

check(ydervaegTekst("1") === "Mursten", `ydervaeg 1 blev "${ydervaegTekst("1")}"`);
check(tagTekst("5") === "Tegl", `tag 5 blev "${tagTekst("5")}"`);
check(varmeTekst("1") === "Fjernvarme/blokvarme", `varme 1 blev "${varmeTekst("1")}"`);
check(ydervaegTekst(null) === null, "en tom kode skulle give ingenting");
check(ydervaegTekst("") === null, "en tom streng skulle give ingenting");
check(ydervaegTekst("14") === "Kode 14", `en ukendt kode blev "${ydervaegTekst("14")}"`);

for (const [navn, liste] of Object.entries(BBR_KODELISTER)) {
  check(
    Object.values(liste).every((t) => t.trim() !== ""),
    `kodelisten ${navn} har en tom tekst`,
  );
  for (const kode of Object.keys(liste)) {
    check(/^\d+$/.test(kode), `kodelisten ${navn} har nøglen "${kode}", som ikke er et tal`);
  }
}

for (const kode of ["120", "140", "321", "323", "910", "930", "222"]) {
  check(
    BBR_KODELISTER.anvendelse[kode] !== undefined,
    `anvendelseskode ${kode} mangler i listen`,
  );
}

// Valglisterne skal daekke de samme koder som opslagene. Manglede en kode i
// vaelgeren, kunne screeneren ikke rette BBR til den rigtige vaerdi.
for (const [navn, valg, liste] of [
  ["ydervaeg", YDERVAEG_VALG, BBR_KODELISTER.ydervaeg],
  ["tag", TAG_VALG, BBR_KODELISTER.tag],
  ["varme", VARME_VALG, BBR_KODELISTER.varme],
] as const) {
  check(
    valg.length === Object.keys(liste).length,
    `vaelgeren for ${navn} har ${valg.length} valg mod ${Object.keys(liste).length} koder`,
  );
  for (const v of valg) {
    check(
      liste[v.code] === v.text,
      `${navn}-valget "${v.text}" passer ikke med koden ${v.code}`,
    );
  }
}

// Asbestkoden skal kunne vaelges. Kan den ikke, kan screeneren ikke rette en
// BBR-registrering, der er forkert netop dér — og det er den vigtigste af dem.
for (const [navn, valg] of [
  ["ydervaeg", YDERVAEG_VALG],
  ["tag", TAG_VALG],
] as const) {
  check(
    valg.some((v) => v.code === "3" && v.text === "Fibercement herunder asbest"),
    `asbestkoden kan ikke vaelges under ${navn}`,
  );
}

// Forslaget til «Konstruktion og stand» bygges af det, BBR ved.
check(
  konstruktionsForslag("1", "5") === "Ydervægge: Mursten. Tag: Tegl.",
  `forslaget blev "${konstruktionsForslag("1", "5")}"`,
);
check(
  konstruktionsForslag("1", null) === "Ydervægge: Mursten.",
  `kun ydervaeg gav "${konstruktionsForslag("1", null)}"`,
);
check(
  konstruktionsForslag(null, "5") === "Tag: Tegl.",
  `kun tag gav "${konstruktionsForslag(null, "5")}"`,
);
// Ved BBR intet, foreslas intet — sa staar feltet tomt frem for med en tom
// saetning, screeneren skal rydde op i.
check(
  konstruktionsForslag(null, null) === null,
  "uden oplysninger skulle der ikke foreslaas noget",
);

// ---------------------------------------------------------------------------
// 9. Bygningsoversigten
// ---------------------------------------------------------------------------
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
check(tom.noter.length === 0, "en note med kun mellemrum kom med i rapporten");

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
check(heleBygning.fakta.length === 6, `en fuld bygning gav ${heleBygning.fakta.length} oplysninger`);
check(
  heleBygning.fakta.map((f) => f.vaerdi).join(" | ") ===
    "1968 | 4 | 418 m² | Mursten | Tegl | Fjernvarme/blokvarme",
  `oplysningerne blev "${heleBygning.fakta.map((f) => f.vaerdi).join(" | ")}"`,
);
check(heleBygning.noter.length === 3, `en fuld bygning gav ${heleBygning.noter.length} noter`);

// Oplysningsboksen paa side 2 samler pa tvaers af bygningerne. Den ma ikke kunne
// skjule, at garagen har et andet tag end huset.
const bygning = (tag: string | null, vaeg: string | null) =>
  ({ roof_material_code: tag, wall_material_code: vaeg }) as unknown as Parameters<
    typeof samletOplysning
  >[0][number];

check(
  samletOplysning([bygning("5", "1"), bygning("5", "1")], (b) =>
    tagTekst(b.roof_material_code),
  ) === "Tegl",
  "to ens tage blev ikke lagt sammen til én værdi",
);
check(
  samletOplysning([bygning("5", "1"), bygning("6", "1")], (b) =>
    tagTekst(b.roof_material_code),
  ) === "Tegl, Metal",
  `to forskellige tage blev "${samletOplysning([bygning("5", "1"), bygning("6", "1")], (b) => tagTekst(b.roof_material_code))}"`,
);
check(
  samletOplysning([bygning(null, null)], (b) => tagTekst(b.roof_material_code)) ===
    null,
  "en bygning uden tag skulle give ingenting, sa linjen kan udelades",
);
check(
  samletOplysning([], (b) => tagTekst(b.roof_material_code)) === null,
  "ingen bygninger skulle give ingenting",
);

const blok = (n: number) => ({ ...heleBygning, label: `Bygning ${n}` });
check(bygningsSider([blok(1), blok(2), blok(3)]).length === 1, "tre bygninger fyldte mere end et ark");
const fireSider = bygningsSider([blok(1), blok(2), blok(3), blok(4)]);
check(fireSider.length === 2, `fire bygninger gav ${fireSider.length} sider`);
check(
  fireSider.reduce((n, s) => n + s.length, 0) === 4,
  "en bygning forsvandt i sideopdelingen",
);
check(bygningsSider([]).length === 0, "ingen bygninger skulle give ingen sider");

// ---------------------------------------------------------------------------
// 9b. Materialepanelets preview
// ---------------------------------------------------------------------------
// Previewet viser kontoret, hvor hver af de seks saetninger lander, FOR den
// bliver til en rapport nogen sender til en kommune. Det bygger ikke selv
// linjerne — det koerer seks opdigtede prover gennem `ressourceoversigt` — men
// det VAELGER de seks prover, og det valg er en paastand om `bortskaffelsestekst`
// og `faktiskHandtering`: at netop de seks situationer rammer de seks felter, en
// hver. Aendres rangfolgen i `bortskaffelsestekst`, holder paastanden op med at
// passe, og previewet vil vise en saetning under den forkerte overskrift uden
// at noget gaar i stykker. Derfor proves afbildningen her.
const PREVIEWMAT = materiale({
  name: "Previewmateriale",
  report_name: "Preview",
  // Feltets eget navn som saetning, sa hver linje kan kendes fra de andre.
  sentence_genbrug: "S-GENBRUG.",
  sentence_genanvendelse: "S-GENANVENDELSE.",
  sentence_farligt: "S-FARLIGT.",
  sentence_forurenet: "S-FORURENET.",
  sentence_asbest: "S-ASBEST.",
  sentence_bortskaffelse: "S-BORTSKAFFELSE.",
});

const fuldtPreview = previewOversigt(PREVIEWMAT, FACADE);

check(
  fuldtPreview.skrevne.length === 6 && fuldtPreview.tomme.length === 0,
  `previewet fandt ${fuldtPreview.skrevne.length} skrevne saetninger, forventede 6`,
);

const previewLinjer = (grupper: RessourceGruppe[]) =>
  grupper.flatMap((g) => g.linjer);

const previewRessourcer = previewLinjer(fuldtPreview.oversigt.ressourcer);
const previewForureninger = previewLinjer(fuldtPreview.oversigt.forureninger);

check(
  previewRessourcer.length === 2,
  `previewet gav ${previewRessourcer.length} ressourcelinjer, forventede 2`,
);
check(
  previewForureninger.length === 4,
  `previewet gav ${previewForureninger.length} forureningslinjer, forventede 4`,
);

// Hver saetning praecis en gang, og i det afsnit den hoerer til.
for (const [saetning, linjer, afsnit] of [
  ["S-GENBRUG.", previewRessourcer, "Ressourcescreening"],
  ["S-GENANVENDELSE.", previewRessourcer, "Ressourcescreening"],
  ["S-FARLIGT.", previewForureninger, "Forureninger"],
  ["S-FORURENET.", previewForureninger, "Forureninger"],
  ["S-ASBEST.", previewForureninger, "Forureninger"],
  ["S-BORTSKAFFELSE.", previewForureninger, "Forureninger"],
] as const) {
  const traf = linjer.filter((l) => l.saetning === saetning);
  check(
    traf.length === 1,
    `"${saetning}" stod ${traf.length} gange under ${afsnit}, forventede 1`,
  );
}

// Maengden og standen er previewets eget eksempel. Slaar de fejl, laeser
// kontoret en linje, der ikke ligner den rapporten skriver.
check(
  previewRessourcer.every(
    (l) => l.kg === PREVIEW_TON * 1000 && l.condition === PREVIEW_STAND,
  ),
  "previewets maengde eller stand kom ikke igennem til linjen",
);

// Farverne. Uden dem viser previewet ikke det, det blev lavet for at vise.
const previewNiveau = (saetning: string) =>
  previewForureninger.find((l) => l.saetning === saetning)?.niveau ?? null;
check(previewNiveau("S-FARLIGT.") === "farligt", "farligt mistede sit rode maerke");
check(previewNiveau("S-FORURENET.") === "forurenet", "forurenet mistede sit gule maerke");
check(previewNiveau("S-ASBEST.") === "farligt", "asbest mistede sit rode maerke");
// Bortskaffelse er det rene, screeneren selv vil af med: neutralt maerke.
check(previewNiveau("S-BORTSKAFFELSE.") === "rent", "bortskaffelse fik en farve");
check(
  previewForureninger.find((l) => l.saetning === "S-BORTSKAFFELSE.")?.maerke ===
    "bortskaffelse",
  "bortskaffelse i previewet mistede det neutrale maerke",
);
check(
  previewRessourcer.every((l) => l.niveau === "rent"),
  "en ressourcelinje i previewet var ikke ren",
);

// Tomme saetninger bliver aldrig til en linje: rapporten ville skrive
// «Preview – 12.000 kg i god stand,» med et haengende komma, og det er ikke det
// previewet skal laere kontoret at den goer.
const halvtPreview = previewOversigt(
  materiale({ name: "Halvt", sentence_genbrug: "S-GENBRUG." }),
  FACADE,
);
check(
  halvtPreview.skrevne.length === 1 && halvtPreview.tomme.length === 5,
  "previewet talte de tomme saetninger forkert",
);
check(
  previewLinjer(halvtPreview.oversigt.ressourcer).length === 1 &&
    previewLinjer(halvtPreview.oversigt.forureninger).length === 0,
  "en tom saetning blev til en linje i previewet",
);
check(
  PREVIEWRAEKKER.every((r) => r.navn.trim().length > 0),
  "en previewraekke manglede sit navn",
);

/*
 * Previewet under en faelles tekst.
 *
 * Panelet viser ikke materialets tre felter, naar teksten er faelles — saa
 * skal previewet heller ikke. Gjorde det det, ville kontoret se en tekst, ingen
 * kommer til at laese, og ikke den der bliver trykt.
 */
const faellesPreview = previewOversigt(
  materiale({ name: "Kun genbrug", sentence_genbrug: "S-GENBRUG." }),
  FACADE,
  FAELLES,
);
check(
  faellesPreview.skrevne.length === 5,
  `previewet fandt ${faellesPreview.skrevne.length} skrevne saetninger med faelles tekst, forventede 5`,
);
check(
  faellesPreview.tomme.map((r) => r.felt).join(",") === "sentence_genanvendelse",
  "previewet regnede de tomme forkert, da teksten var faelles",
);
check(
  faellesPreview.oversigt.standardtekster.length === 4,
  "previewet viste ikke de fire faelles tekster",
);
check(
  previewLinjer(faellesPreview.oversigt.forureninger).every(
    (l) => l.saetning === null,
  ),
  "previewets forureningslinjer beholdt en saetning under en faelles tekst",
);
// Og materialets egne felter er stadig dem, der bruges for de rene.
check(
  previewLinjer(faellesPreview.oversigt.ressourcer)[0]?.saetning === "S-GENBRUG.",
  "previewet mistede materialets genbrugssaetning",
);

// ---------------------------------------------------------------------------
// 10. Migrationen der seeder saetningerne
// ---------------------------------------------------------------------------
// Rammer et materialenavn ikke listen, sker der ingenting — og resultatet er en
// rapport, hvor et materiale mangler sin saetning. Det ser ud som om skabelonen
// var ufuldstaendig, ikke som om der var en tastefejl. Migrationen taeller selv
// efter, men den kores kun ved en opbygning; her fanges det i kontrolkaeden.
const lookups = lookupsMigration;
const kendteMaterialer = new Set(
  [
    ...lookups
      .slice(
        lookups.indexOf("screening.materials"),
        lookups.indexOf("screening.sample_types"),
      )
      .matchAll(/'([^']+)'/g),
  ].map((m) => m[1]),
);
check(
  kendteMaterialer.size > 40,
  `fandt kun ${kendteMaterialer.size} materialer i migrationen — er filen flyttet?`,
);

const saetninger = migration("20260825120500_saetninger_fra_skabelonen.sql");
const brugte = [
  ...saetninger.matchAll(/^\s*\('([^']+)',\s*$/gm),
].map((m) => m[1]);
check(
  brugte.length === 12,
  `fandt ${brugte.length} materialer i saetningsmigrationen, forventede 12`,
);
for (const navn of brugte) {
  check(
    kendteMaterialer.has(navn),
    `"${navn}" i saetningsmigrationen findes ikke i screening.materials`,
  );
}

// ---------------------------------------------------------------------------
// 11. Migrationen der slar den faelles tekst til
// ---------------------------------------------------------------------------
// Kontakten seedes, sa et miljo bygget op fra bunden staar som kunden har bedt
// om. Noeglen skal vaere den, appen laeser — staar der en tastefejl, laeser
// appen standardvaerdien i stedet, og ingen kan se paa rapporten, at det ikke
// var det, der var meningen.
const faellesMigration = migration("20260909120000_faelles_bortskaffelsestekst.sql");
check(
  new RegExp(`\\('${INDSTILLING_NOEGLER.faelles}', 'true'::jsonb\\)`).test(
    faellesMigration,
  ),
  `migrationen slar ikke "${INDSTILLING_NOEGLER.faelles}" til`,
);

// Og teksterne skal IKKE staa her. Det er kundens ord, og de hoerer i
// databasen — samme regel som rapportens ovrige saetninger, der flyttede ud af
// koden med materialepanelet. En seedet tekst ville desuden vaere umulig at
// skelne fra en, kontoret selv havde skrevet.
for (const felt of TEKST_ORDEN) {
  check(
    !faellesMigration.includes(`to_jsonb`) &&
      !new RegExp(`'${DISPOSAL_SENTENCE_FIELD[felt]}',\\s*\\n?\\s*'`).test(
        faellesMigration,
      ),
    `migrationen seeder en tekst for "${felt}" — den hoerer paa /indstillinger`,
  );
}

// ---------------------------------------------------------------------------
// 12. Migrationen der giver farligt affald sin egen tekst
// ---------------------------------------------------------------------------
// Det nye felt skal fyldes med det gamle, ellers mister de rode linjer i hver
// eksisterende rapport deres saetning uden en fejl nogen steder — de slaar op i
// et felt, der lige er oprettet tomt. Og den faelles tekst skal kopieres paa
// samme maade, men aldrig seedes: den er kundens ord.
const farligtMigration = migration("20260910120000_farligt_affald_egen_tekst.sql");
check(
  /add column sentence_farligt text/.test(farligtMigration),
  "migrationen opretter ikke sentence_farligt",
);
check(
  /set sentence_farligt = coalesce\(sentence_farligt, sentence_bortskaffelse\)/.test(
    farligtMigration,
  ),
  "migrationen kopierer ikke den gamle bortskaffelsestekst over i farligt",
);
check(
  new RegExp(
    `select '${INDSTILLING_NOEGLER.farligt}', value\\s*\\n\\s*from screening.app_settings\\s*\\n\\s*where key = '${INDSTILLING_NOEGLER.bortskaffelse}'`,
  ).test(farligtMigration),
  "migrationen kopierer ikke den faelles bortskaffelsestekst over i farligt",
);
check(
  !farligtMigration.includes("to_jsonb") &&
    !new RegExp(`'${INDSTILLING_NOEGLER.farligt}',\\s*\\n?\\s*'`).test(farligtMigration),
  "migrationen seeder en tekst for farligt affald — den hoerer paa /indstillinger",
);

console.log(
  failures === 0
    ? `OK — ${kendteMaterialer.size} materialer, ${brugte.length} med seedet tekst, ${bredder}`
    : `${failures} fejl.`,
);
process.exit(failures === 0 ? 0 : 1);
