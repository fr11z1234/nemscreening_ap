import type { LabLevel } from "@/lib/lab/parametre";

export type UserRole = "screener" | "office" | "admin";

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
 * De tre saetninger printes efter maengden, en pr. handtering. Screeneren
 * vaelger handteringen pa proven, og rapporten henter den saetning. Er den tom,
 * skriver rapporten navn og maengde og lover ingenting.
 */
export type Material = LookupItem & {
  report_name: string | null;
  sentence_genbrug: string | null;
  sentence_genanvendelse: string | null;
  sentence_bortskaffelse: string | null;
};

/** Feltet pa `Material` der baerer saetningen for en given handtering. */
export const SENTENCE_FIELD = {
  genbrug: "sentence_genbrug",
  genanvendelse: "sentence_genanvendelse",
  bortskaffelse: "sentence_bortskaffelse",
} as const satisfies Record<ResourceHandling, keyof Material>;

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
