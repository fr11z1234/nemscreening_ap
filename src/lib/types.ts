import type { LabLevel } from "@/lib/lab/parametre";

export type UserRole = "screener" | "office" | "admin";

/**
 * Rollerne, og hvad de ma.
 *
 * Graenserne er RLS's egne: `office` og `admin` ma skrive labsvar og slette en
 * sag, `admin` ma desuden aendre medlemskab. Teksten star her, sa brugersiden
 * ikke opfinder sin egen beskrivelse af hvad et valg betyder.
 */
export const USER_ROLE_LABEL: Record<UserRole, string> = {
  screener: "Screener",
  office: "Kontor",
  admin: "Administrator",
};

export const USER_ROLE_BESKRIVELSE: Record<UserRole, string> = {
  screener: "Opretter sager og tager prøver. Kan ikke indlæse svar fra laboratoriet.",
  office: "Alt det en screener kan, plus indlæse labsvar og slette sager.",
  admin: "Som kontor, og kan desuden oprette og lukke brugere.",
};

export const USER_ROLES: UserRole[] = ["screener", "office", "admin"];

export type CaseStatus =
  | "oprettet"
  | "under_screening"
  | "proever_taget"
  | "sendt_til_lab"
  | "afsluttet";

export type BuildingPeriod = "foer_1990" | "efter_1990";

/**
 * Hvad sagen skal ende som.
 *
 * `miljoescreening` er det appen altid har lavet, og den er standard. `selektiv`
 * korer den samme miljoscreening igennem — samme prover, samme fil til Eurofins
 * — men beder om tre felter mere pr. prove og giver rapporten et
 * ressourceafsnit. Typen er derfor et valg om rapportens indhold, ikke om
 * hvordan der arbejdes i marken.
 */
export type ReportType = "miljoescreening" | "selektiv";

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  miljoescreening: "Miljøscreening og kortlægning",
  selektiv: "Selektiv nedrivning",
};

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  oprettet: "Oprettet",
  under_screening: "Under screening",
  proever_taget: "Prøver taget",
  sendt_til_lab: "Sendt til lab",
  afsluttet: "Afsluttet",
};

export const PERIOD_LABEL: Record<BuildingPeriod, string> = {
  foer_1990: "Før 1990",
  efter_1990: "Efter 1990",
};

/**
 * Hvor i bygningen materialet sidder — og dermed hvilken fed overskrift det
 * havner under i ressourcescreeningen.
 *
 * Ikke det samme som `building_ids`, der siger hvilke BYGNINGER proven daekker.
 * Bygningsdelen siger hvor i huset: fundament, baerende konstruktion, facade,
 * tag.
 *
 * Listen ligger i databasen og styres i materialepanelet. Den var en enum i
 * koden, men en enum kan ikke rettes uden en udrulning, og overskrifterne skal
 * kunne rettes af dem der skriver rapporten. `sort_order` ER afsnittenes
 * raekkefolge i rapporten.
 */
export type BuildingPart = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

/** Screenerens vurdering af hvad der skal ske med materialet. */
export type ResourceHandling = "genbrug" | "genanvendelse" | "bortskaffelse";

export const RESOURCE_HANDLINGS: ResourceHandling[] = [
  "genbrug",
  "genanvendelse",
  "bortskaffelse",
];

export const RESOURCE_HANDLING_LABEL: Record<ResourceHandling, string> = {
  genbrug: "Genbrug",
  genanvendelse: "Genanvendelse",
  bortskaffelse: "Bortskaffelse",
};

/**
 * Materialets stand, 1-5, hvor 1 er bedst.
 *
 * Graderne og forklaringerne er regnearkets egne og staar ordret. Forklaringen
 * er ikke pynt: forskellen mellem «god» og «middel» afgor om et materiale kan
 * genbruges som det er eller skal knuses, og to screenere skal laegge samme
 * betydning i tallet.
 */
export const MATERIAL_CONDITIONS: {
  grade: number;
  label: string;
  description: string;
}[] = [
  {
    grade: 1,
    label: "Fremragende stand",
    description: "Intet eller minimalt slid, fuldt funktionsdygtigt.",
  },
  {
    grade: 2,
    label: "God stand",
    description: "Lettere brugsspor, men uden betydning for funktion.",
  },
  {
    grade: 3,
    label: "Middel stand",
    description: "Synligt slid og begyndende funktionsmæssige svagheder.",
  },
  {
    grade: 4,
    label: "Ringe stand",
    description: "Betydeligt slid, nedsat funktionalitet.",
  },
  {
    grade: 5,
    label: "Dårlig stand",
    description:
      "Defekt eller uanvendeligt uden væsentlig reparation/udskiftning.",
  },
];

export const conditionLabel = (grade: number | null): string | null =>
  MATERIAL_CONDITIONS.find((c) => c.grade === grade)?.label ?? null;

export type AppUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  active: boolean;
};

export type Case = {
  id: string;
  case_name: string;
  status: CaseStatus;
  report_type: ReportType;
  customer_name: string | null;
  customer_contact: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  address_text: string | null;
  dawa_adgangsadresse_id: string | null;
  postnr: string | null;
  city: string | null;
  area_m2: number | null;
  built_year: number | null;
  rebuilt_year: number | null;
  source_booking_id: string | null;
  note: string | null;
  /**
   * Svaret pa skabelonens «Hvordan skal disse materialer handteres i forbindelse
   * med nedrivningen?». Skrives i hand pa resultatsiden — rapporten kan ikke
   * regne den ud, og den gar til en kommune.
   */
  contamination_handling_note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseBuilding = {
  id: string;
  case_id: string;
  bbr_building_id: string | null;
  building_no: string | null;
  label: string;
  usage_code: string | null;
  usage_text: string | null;
  built_year: number | null;
  rebuilt_year: number | null;
  area_built: number | null;
  area_total: number | null;
  area_residential: number | null;
  /**
   * Rapportens bygningsoversigt. De tre materiale- og varmefelter er BBR-koder
   * og ikke tekst; ordlyden slas op i `src/lib/bbr/map.ts`.
   */
  floors: number | null;
  wall_material_code: string | null;
  roof_material_code: string | null;
  heating_code: string | null;
  /** Skrevet i hand pa BBR-siden. BBR har ingen felter for dem. */
  usage_note: string | null;
  construction_note: string | null;
  plan_note: string | null;
  raw_bbr: unknown;
  is_manual: boolean;
  sort_order: number;
};

export type Sample = {
  id: string;
  case_id: string;
  seq: number;
  material: string | null;
  sample_type: string | null;
  /**
   * Bygningerne proven er taget pa, i den raekkefolge de blev valgt.
   *
   * Samme materiale sidder tit pa flere bygninger — en hvid facademaling gar
   * hele vejen rundt — og der er ingen grund til at bestille den samme analyse
   * tre gange. Lokaliteten er intern information og styrer intet i eksporten.
   */
  building_ids: string[];
  /**
   * Den forste af `building_ids`, vedligeholdt for det der laeser databasen
   * udenom appen. Appen selv laeser altid listen.
   */
  building_id: string | null;
  location_note: string | null;
  estimated_tons: number | null;
  period: BuildingPeriod | null;
  /**
   * De tre selektive felter. Null pa en almindelig miljoscreening, hvor de
   * hverken vises eller bruges.
   */
  building_part_id: string | null;
  /** 1-5, hvor 1 er bedst. Se MATERIAL_CONDITIONS. */
  material_condition: number | null;
  resource_handling: ResourceHandling | null;
  analysis_pcb: boolean;
  analysis_asbestos: boolean;
  analysis_metals: boolean;
  analysis_pah: boolean;
  comment: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Genereret i databasen: "P7" nar mindst en analyse er valgt, ellers "7". */
  label: string;
  /** Genereret i databasen. Afgor om proven kommer med i Eurofins-eksporten. */
  is_lab_sample: boolean;
};

export type SamplePhoto = {
  id: string;
  sample_id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  taken_at: string | null;
  sort_order: number;
};

/**
 * Rapportens bilag.
 *
 * `eurofins_pdf` er filen som den kom fra laboratoriet. `eurofins_side` er den
 * samme fil tegnet om til et billede pr. side, fordi rapporten printes fra
 * browseren og en browser ikke printer indholdet af en indlejret PDF med.
 */
export type CaseFileKind =
  | "plantegning"
  /** Billedet af ejendommen pa rapportens side 2. */
  | "forsidebillede"
  | "eurofins_pdf"
  | "eurofins_side";

export type CaseFile = {
  id: string;
  case_id: string;
  kind: CaseFileKind;
  storage_path: string;
  filename: string | null;
  mime: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  /**
   * Binder et bilags PDF sammen med dens sider.
   *
   * En sag har ofte flere dokumenter fra Eurofins — analyserapporten og et
   * asbestappendiks kommer hver for sig — og et af dem skal kunne fjernes
   * uden at de andre folger med. Null for plantegningen.
   */
  doc_id: string | null;
  /** Bilagets plads bagest i rapporten. Nul for plantegningen. */
  doc_order: number;
  /** Sidetallet inde i det enkelte bilag. Nul for de hele filer. */
  sort_order: number;
  created_at: string;
};

export type LookupItem = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

/**
 * Et materiale, som materialepanelet og rapporten kender det.
 *
 * `name` er det screeneren vaelger i marken — affaldsfraktionens navn.
 * `report_name` er det kunden laeser: screeneren vaelger «Beton (undtagen,
 * gasbeton, letbeton)», men rapporten skriver «Beton». Er feltet tomt, bruges
 * navnet.
 *
 * Saetningerne printes efter maengden. To for de rene — screeneren vaelger
 * handtering pa proven, og rapporten henter den saetning — og fire for det, der
 * skal vaek, en pr. affaldsmaerke. Er den tom, skriver rapporten navn og
 * maengde og lover ingenting.
 */
export type Material = LookupItem & {
  report_name: string | null;
  sentence_genbrug: string | null;
  sentence_genanvendelse: string | null;
  sentence_farligt: string | null;
  sentence_forurenet: string | null;
  sentence_asbest: string | null;
  sentence_bortskaffelse: string | null;
};

/** Feltet pa `Material` der baerer saetningen for en given handtering. */
export const SENTENCE_FIELD = {
  genbrug: "sentence_genbrug",
  genanvendelse: "sentence_genanvendelse",
  bortskaffelse: "sentence_bortskaffelse",
} as const satisfies Record<ResourceHandling, keyof Material>;

/**
 * Hvilken af de fire bortskaffelsestekster en linje skal baere.
 *
 * En pr. affaldsmaerke, og de hedder det samme. `farligt` og `bortskaffelse`
 * delte engang et felt, fordi de blev regnet for den samme besked. Det er de
 * ikke: rodt er laboratoriets bevis paa, at materialet ER farligt affald;
 * bortskaffelse er screenerens vurdering af noget rent eller uanalyseret, der
 * bare skal vaek.
 */
export type Bortskaffelsestekst =
  | "farligt"
  | "forurenet"
  | "asbest"
  | "bortskaffelse";

export const DISPOSAL_SENTENCE_FIELD = {
  farligt: "sentence_farligt",
  forurenet: "sentence_forurenet",
  asbest: "sentence_asbest",
  bortskaffelse: "sentence_bortskaffelse",
} as const satisfies Record<Bortskaffelsestekst, keyof Material>;

export const DISPOSAL_SENTENCE_LABEL: Record<Bortskaffelsestekst, string> = {
  farligt: "Farligt affald",
  forurenet: "Forurenet affald",
  asbest: "Asbest påvist",
  bortskaffelse: "Bortskaffelse",
};

/**
 * De fire saetninger, loesrevet fra et materiale.
 *
 * Samme fire felter, hvad enten de staar paa materialet eller er den faelles
 * tekst fra indstillingerne. Det er hele pointen i at kunne slaa faelles tekst
 * til: rapporten spoerger om det samme, og kun kilden skifter.
 */
export type Bortskaffelsestekster = Record<Bortskaffelsestekst, string | null>;

/**
 * Hvornar hver af de fire bruges. Vises i materialepanelet, sa kontoret ikke
 * skal gaette hvilket felt der ender i hvilken rapport.
 */
export const DISPOSAL_SENTENCE_HINT: Record<Bortskaffelsestekst, string> = {
  farligt: "Rødt svar fra laboratoriet.",
  forurenet: "Gult svar fra laboratoriet, eller prøvearten Sod.",
  asbest:
    "Asbest påvist — af laboratoriet eller ved prøvearten Asbest. Overruler de andre.",
  bortskaffelse:
    "Screeneren valgte bortskaffelse, og svaret er rent eller prøven er uden analyse.",
};

/**
 * Handteringen som den GAELDER, nar laboratoriet har svaret.
 *
 * Screeneren vaelger i marken, for der er et svar. Kommer proven tilbage som
 * forurenet eller farligt affald, gaelder screenerens vurdering ikke laengere:
 * materialet skal bortskaffes, uanset at der stod genbrug pa den. Det er hele
 * pointen i at analysere — vurderingen bliver efterproevet.
 *
 * Reglen star HER og ikke to steder. Bade analyseskemaets kolonne og rapportens
 * afsnit spoerger den samme funktion, sa skemaet ikke kan komme til at sige
 * genbrug pa en linje, forureningsafsnittet har skrevet bortskaffelse pa.
 *
 * Den gemte vaerdi paa proven roeres ikke. Screenerens oprindelige vurdering er
 * vaerd at kunne se — den fortaeller, at analysen fangede noget — og et svar der
 * bliver rettet senere skal kunne flytte linjen tilbage. Havde vi overskrevet
 * feltet, var begge dele vaek.
 */
export function faktiskHandtering(
  valgt: ResourceHandling | null,
  niveau: LabLevel | null,
): ResourceHandling | null {
  if (niveau === "forurenet" || niveau === "farligt") return "bortskaffelse";
  return valgt;
}

/**
 * Maerket paa en linje i forureningsafsnittet.
 *
 * Den anden regel ved siden af `faktiskHandtering`, og den svarer paa: hvad ER
 * det her for noget affald? Ikke hvad der skal ske med det.
 *
 * `asbest` er hele grunden til at funktionen findes. For havde en asbestprove
 * det samme rode maerke som alt andet farligt affald, og saa kunne
 * entreprenoren ikke se paa linjen, at netop den skal befugtes og emballeres
 * stovtaet. Pavist asbest ER stadig farligt affald — analyseskemaet farver den
 * rod som for, og det er med vilje: maerket siger hvilken slags, ikke hvor slemt.
 *
 * `bortskaffelse` er det neutrale. Det staar paa den prove, screeneren selv
 * satte til bortskaffelse, og som hverken er gul eller rod — tagpap uden
 * analyse, en mineraluld der bare skal vaek. Den linje stod for uden maerke,
 * fordi der ikke var et niveau at farve. Det gaar ikke laengere: med en faelles
 * tekst er maerket det eneste, der peger paa hvilken standardtekst der gaelder,
 * og en linje uden maerke ville staa uden tekst overhovedet.
 *
 * MAERKET FOLGER LABORATORIET, ikke screenerens valg. Sagde Eurofins gult, staar
 * der «Forurenet affald» — ogsa selvom screeneren havde skrevet bortskaffelse
 * paa proven. Ellers ville rapporten kalde en prove rod, som analyseskemaet
 * farver gul, og laeseren ville ikke vide hvem der havde ret.
 *
 * Niveauet kan ogsa komme fra provearten og ikke fra laboratoriet — se
 * `visueltFund`. Reglen her er ligeglad med hvor det kom fra.
 *
 * Kaldes kun for linjer i forureningsafsnittet. Ressourceafsnittet har ingen
 * maerker — alt i det er gront, og et gront maerke paa hver linje betyder
 * ingenting.
 */
export type Affaldsmaerke =
  | "farligt"
  | "forurenet"
  | "asbest"
  | "bortskaffelse";

export function affaldsmaerke(
  niveau: LabLevel | null,
  asbestPaavist: boolean,
): Affaldsmaerke {
  if (asbestPaavist) return "asbest";
  if (niveau === "farligt") return "farligt";
  if (niveau === "forurenet") return "forurenet";
  return "bortskaffelse";
}

export const AFFALDSMAERKE_LABEL: Record<Affaldsmaerke, string> = {
  farligt: "Farligt affald",
  forurenet: "Forurenet affald",
  asbest: "Asbest affald",
  bortskaffelse: "Bortskaffelse",
};

/**
 * Hvilken tekst et maerke henter. En-til-en.
 *
 * `farligt` og `bortskaffelse` pegede engang paa det samme felt, ud fra at
 * farligt affald og screenerens eget valg var den samme besked. Det holdt ikke:
 * rodt er et bevis, bortskaffelse er en vurdering, og de skal ikke skrives med
 * samme ord. Afbildningen staar alligevel som en tabel og ikke som en
 * identitet, fordi maerket og teksten svarer paa hver sit sporgsmal — hvad
 * linjen ER, og hvad der skal STAA — og de to steder, der spoerger, skal kunne
 * laeses hver for sig.
 */
export const MAERKE_TEKST: Record<Affaldsmaerke, Bortskaffelsestekst> = {
  farligt: "farligt",
  forurenet: "forurenet",
  asbest: "asbest",
  bortskaffelse: "bortskaffelse",
};

/**
 * HVILKEN bortskaffelsestekst linjen far. Soesterreglen til `faktiskHandtering`.
 *
 * `faktiskHandtering` afgor OM proven skal bortskaffes; den her afgor hvad der
 * sa staar. De er delt, fordi de svarer pa hver sit sporgsmal — skemaets
 * kolonne skal kun vide det forste.
 *
 * Teksten folger maerket, og maerket folger laboratoriet. Rangfolgen er derfor
 * `affaldsmaerke`s egen:
 *
 *   1. Asbest pavist    — overruler alt. Pavist asbest er farligt affald hver
 *                         gang, og handteringen er en anden end for andet
 *                         farligt affald: befugtes, emballeres stovtaet, holdes
 *                         adskilt.
 *   2. Farligt affald   — rodt svar.
 *   3. Forurenet affald — gult svar.
 *   4. Bortskaffelse    — screeneren valgte det selv, og laboratoriet har ikke
 *                         fundet noget, eller er aldrig spurgt.
 *
 * Screenerens eget valg staar IKKE i rangfolgen laengere. Der stod engang, at
 * valgte hun bortskaffelse, gjaldt det uanset hvad Eurofins svarede — det var
 * harmlost, dengang farligt og bortskaffelse delte tekst. Nu de har hver sin,
 * er det laboratoriet der bestemmer: Eurofins har et konkret bevis paa
 * standen, hvor screeneren antager. Valgte hun bortskaffelse, og svaret er
 * gult, faar linjen forureningsteksten — det er den anvisning, der passer til
 * det affald, linjen er.
 *
 * Kaldes kun for linjer, der ER endt i forureningsafsnittet. Er niveauet rent
 * eller ukendt, og valgte screeneren ikke bortskaffelse, er proven en ressource
 * og kommer aldrig herind — se `ressourceoversigt`.
 */
export function bortskaffelsestekst(
  niveau: LabLevel | null,
  asbestPaavist: boolean,
): Bortskaffelsestekst {
  return MAERKE_TEKST[affaldsmaerke(niveau, asbestPaavist)];
}

/** De fire analysevalg screeneren ser i felten. */
export const ANALYSIS_FIELDS = [
  { key: "analysis_pcb", label: "PCB + Chlor" },
  { key: "analysis_asbestos", label: "Asbest" },
  { key: "analysis_metals", label: "Metaller + HG" },
  { key: "analysis_pah", label: "PAH" },
] as const;

export type AnalysisKey = (typeof ANALYSIS_FIELDS)[number]["key"];

/**
 * Analyser der ikke bestilles pa en bygning fra efter 1990.
 *
 * PCB og asbest var udfaset i byggematerialer for den periode, sa proven
 * ville koste kunden penge uden at kunne finde andet end nul.
 */
const EXCLUDED_AFTER_1990: readonly AnalysisKey[] = [
  "analysis_pcb",
  "analysis_asbestos",
];

/** Om analysen overhovedet kan vaelges for en bygning fra den periode. */
export function analysisApplies(
  key: AnalysisKey,
  period: BuildingPeriod | null,
): boolean {
  return period !== "efter_1990" || !EXCLUDED_AFTER_1990.includes(key);
}

/** De analyser perioden slar fra, som en aendring der kan gemmes. */
export function analysesForPeriod(
  period: BuildingPeriod | null,
): Partial<Record<AnalysisKey, false>> {
  const off: Partial<Record<AnalysisKey, false>> = {};
  for (const a of ANALYSIS_FIELDS) {
    if (!analysisApplies(a.key, period)) off[a.key] = false;
  }
  return off;
}

/**
 * Provearter, der i sig selv er et fund.
 *
 * Provearten er ellers bare tekst — «Hvid maling», «Fuger» — og styrer
 * ingenting. To af dem er anderledes: screeneren ved, hvad hun staar med, og
 * der bestilles ingen analyse.
 *
 *   Asbest — en plade hun kan se er asbest. Rapporten skriver «Pavist» i
 *            asbestkolonnen, proven er farligt affald, og linjen faar
 *            asbestteksten. Sendes ALDRIG til Eurofins; det ville vaere en fejl.
 *   Sod    — der er ingen kolonne for sod i skemaet, og der bestilles ingen
 *            analyse for det. Proven er forurenet affald; i skemaet er det
 *            proveart-cellen selv, der bliver gul.
 *
 * Begge LAASER analyserne paa proven. Det er hele pointen: et labsvar, der
 * siger «ikke pavist» paa en prove, screeneren har registreret som asbest,
 * ville modsige rapporten — og den konflikt forebygges frem for at afgoeres.
 * Uden analyser er proven ikke en labprove, faar intet P og kommer aldrig med i
 * Eurofins-filen. Linjen i Forureninger hedder derfor «3» og ikke «P3».
 *
 * «Mulig asbest» er ikke med. Den er den proveart, der SKAL til laboratoriet.
 *
 * Noeglerne er navnene i `screening.sample_types`, ordret. `verify:ressourcer`
 * holder dem op mod seed-migrationen, saa et omdoebt navn ikke stille goer
 * reglen virkningsloes.
 */
export type VisueltFund = {
  level: LabLevel;
  /** Om fundet er asbest. Det afgor baade kolonnen i skemaet og teksten. */
  asbest: boolean;
};

export const VISUELLE_FUND: Record<string, VisueltFund> = {
  Asbest: { level: "farligt", asbest: true },
  Sod: { level: "forurenet", asbest: false },
};

export function visueltFund(sampleType: string | null): VisueltFund | null {
  if (!sampleType || !Object.hasOwn(VISUELLE_FUND, sampleType)) return null;
  return VISUELLE_FUND[sampleType] ?? null;
}

/** Om provearten laaser analyserne. */
export const analyserLaast = (sampleType: string | null): boolean =>
  visueltFund(sampleType) !== null;

/**
 * De analyser provearten slar fra, som en aendring der kan gemmes.
 *
 * Alle fire, naar provearten er et fund. Vaelges Asbest eller Sod paa en prove,
 * der allerede havde analyser, nulstilles de — samme greb som perioden.
 */
export function analysesForSampleType(
  sampleType: string | null,
): Partial<Record<AnalysisKey, false>> {
  if (!analyserLaast(sampleType)) return {};
  return Object.fromEntries(ANALYSIS_FIELDS.map((a) => [a.key, false]));
}
