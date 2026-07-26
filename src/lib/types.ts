export type UserRole = "screener" | "office" | "admin";

export type CaseStatus =
  | "oprettet"
  | "under_screening"
  | "proever_taget"
  | "sendt_til_lab"
  | "afsluttet";

export type BuildingPeriod = "foer_1990" | "efter_1990";

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
  building_id: string | null;
  location_note: string | null;
  estimated_tons: number | null;
  period: BuildingPeriod | null;
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

export type LookupItem = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

/** De fire analysevalg screeneren ser i felten. */
export const ANALYSIS_FIELDS = [
  { key: "analysis_pcb", label: "PCB + Chlor" },
  { key: "analysis_asbestos", label: "Asbest" },
  { key: "analysis_metals", label: "Metaller + HG" },
  { key: "analysis_pah", label: "PAH" },
] as const;

export type AnalysisKey = (typeof ANALYSIS_FIELDS)[number]["key"];
