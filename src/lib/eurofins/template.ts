import type { AnalysisKey } from "@/lib/types";

/**
 * Eurofins' import-skabelon, kolonne for kolonne.
 *
 * Skabelonen har 19 kolonner: Provemaerkning, Sagsnavn og 17 analyser.
 * Raekkefolgen her ER filens kolonneraekkefolge — den ma ikke aendres uden at
 * en ny skabelon fra Eurofins er sammenlignet mod den.
 *
 * Alt Eurofins-specifikt samles i denne fil, sa generatoren i ./generate.ts
 * ikke behover vide noget om laboratoriets navngivning.
 */

export type EurofinsAnalysis = {
  /** Analysekoden fra skabelonens anden raekke, uden [AAA].-praefiks. */
  code: string;
  /** Kolonneoverskriften fra tredje raekke, ordret. */
  name: string;
  /** Hvilket af appens fire felter der saetter 1 i denne kolonne. */
  mappedFrom?: AnalysisKey;
};

export const EUROFINS_ANALYSES: EurofinsAnalysis[] = [
  {
    code: "PVL7X",
    name: "Enkeltstående analyser.7 PCB'er + Chlorparaffinscreening (bygmat, hexan)",
    mappedFrom: "analysis_pcb",
  },
  {
    code: "PVL9Z",
    name: "Enkeltstående analyser.Chlorparaffiner (SCCP+MCCP) [mg/kg]",
  },
  {
    code: "PVL81",
    name: "Enkeltstående analyser.Kulbrintefraktioner (THC) - Ref4",
  },
  {
    code: "PVL93",
    name: "Enkeltstående analyser.Asbest inkl. prøveforberedelse",
    mappedFrom: "analysis_asbestos",
  },
  { code: "PVLAP", name: "Enkeltstående analyser.Asbest (GelTape)" },
  { code: "PVLA2", name: "Enkeltstående analyser.Asbest walk-in analyse" },
  {
    code: "PVL69",
    name: "Enkeltstående analyser.6 metaller (Pb, Cd, Cr, Cu, Ni, Zn)",
  },
  {
    code: "PVL7A",
    name: "Enkeltstående analyser.6 metaller+Hg [Pb, Cd, Cr, Cu, Ni, Zn, Hg]",
    mappedFrom: "analysis_metals",
  },
  {
    code: "PVL76",
    name: "Enkeltstående analyser.6 metaller+As [Pb, Cd, Cr, Cu, Ni, Zn, As]",
  },
  {
    code: "PVL5R",
    name: "Enkeltstående analyser.8 metaller (As, Pb, Cd, Cr, Cu, Hg, Ni, Zn)",
  },
  { code: "PVL6B", name: "Enkeltstående analyser.Bly (Pb) inkl. oplukning" },
  { code: "PVL6A", name: "Enkeltstående analyser.Arsen (As) inkl. oplukning" },
  {
    code: "PVL6F",
    name: "Enkeltstående analyser.Kviksølv (Hg) inkl. oplukning",
  },
  { code: "PVL6I", name: "Enkeltstående analyser.Chrom (Cr6) inkl. findeling" },
  {
    code: "PVL2U",
    name: "Enkeltstående analyser.10 PAH - Forvaltningsgrundlag 2023",
    mappedFrom: "analysis_pah",
  },
  { code: "PVL8R", name: "Enkeltstående analyser.Asbest v. TEM" },
  {
    code: "PVL8C",
    name: "Enkeltstående analyser.Kulbrintefraktioner (THC) - Ref1 ",
  },
];

/** 2 tekstkolonner + 17 analysekolonner. */
export const EUROFINS_COLUMN_COUNT = 2 + EUROFINS_ANALYSES.length;

/** Aftalekoden i skabelonens forste raekke. Overskrives af screening.app_settings. */
export const DEFAULT_ANALYSES_DETAILS = "YVD5SC230009";
