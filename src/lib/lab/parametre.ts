/**
 * De elleve resultater vi rapporterer, og graenserne de farves efter.
 *
 * Raekkefolgen her ER kolonnernes raekkefolge i skemaet og i rapporten. Den
 * folger det regneark screenerne udfyldte i handen, sa en gammel og en ny
 * rapport kan laegges ved siden af hinanden.
 *
 * Eurofins' svarfil indeholder langt mere end det her — vi bestiller kun de
 * fire analysepakker, og resten af deres kolonner star tomme. Alt hvad vi
 * ikke bestiller, vises som I.a.
 */

export type LabParameterKey =
  | "pb"
  | "cd"
  | "cr"
  | "cu"
  | "hg"
  | "ni"
  | "zn"
  | "asbestos"
  | "pcb_total"
  | "chlor_paraffins"
  | "pah_total";

/** Rent, forurenet eller farligt affald. */
export type LabLevel = "rent" | "forurenet" | "farligt";

export type LabParameter = {
  key: LabParameterKey;
  /** Kolonneoverskriften i skemaet. */
  label: string;
  unit: string | null;
  /**
   * Kolonnenavne i Eurofins' AllResults-fil.
   *
   * En liste, fordi filen har to saet PCB-kolonner og to kolonner der begge
   * hedder "Spor af Chlorparaffiner". Vi tager den forste der har en vaerdi,
   * i stedet for at binde os til et kolonnenummer der kan flytte sig.
   */
  eurofins: string[];
} & (
  | {
      kind: "numeric";
      /** Fra og med denne vaerdi er materialet forurenet. */
      forurenetFra: number;
      /** Over denne vaerdi er det farligt affald. */
      farligtOver: number;
    }
  | {
      kind: "presence";
      /** Hvad "pavist" betyder for netop denne parameter. */
      pavist: LabLevel;
    }
);

/**
 * Graenserne kommer fra Nemscreenings egen tabel, juli 2026.
 *
 * To af dem er ANDERLEDES end i det gamle regneark: PCB gik fra 2.500 til
 * 50 mg/kg, og nikkel fra 2.500 til 1.000 mg/kg. Rapporter farvelagt efter
 * det gamle ark kan derfor vaere for milde pa netop de to.
 *
 * Tallene i tabellen for kulbrinter (C6-C35) og for opdelingen af klorerede
 * paraffiner i kort- og mellemkaedede staar ikke her: vi bestiller ingen af
 * delene, sa der ville aldrig komme en vaerdi at farve.
 */
export const LAB_PARAMETERS: LabParameter[] = [
  {
    key: "pb",
    label: "Bly, Pb",
    unit: "mg/kg",
    eurofins: ["Bly (Pb)"],
    kind: "numeric",
    forurenetFra: 40,
    farligtOver: 2500,
  },
  {
    key: "cd",
    label: "Cadmium, Cd",
    unit: "mg/kg",
    eurofins: ["Cadmium (Cd)"],
    kind: "numeric",
    forurenetFra: 0.5,
    farligtOver: 1000,
  },
  {
    key: "cr",
    label: "Chrom total",
    unit: "mg/kg",
    eurofins: ["Chrom (Cr)"],
    kind: "numeric",
    forurenetFra: 500,
    farligtOver: 1000,
  },
  {
    key: "cu",
    label: "Kobber, Cu",
    unit: "mg/kg",
    eurofins: ["Kobber (Cu)"],
    kind: "numeric",
    forurenetFra: 500,
    farligtOver: 2500,
  },
  {
    key: "hg",
    label: "Kviksølv, Hg",
    unit: "mg/kg",
    eurofins: ["Kviksølv (Hg)"],
    kind: "numeric",
    forurenetFra: 1,
    farligtOver: 1000,
  },
  {
    key: "ni",
    label: "Nikkel, Ni",
    unit: "mg/kg",
    eurofins: ["Nikkel (Ni)"],
    kind: "numeric",
    forurenetFra: 30,
    farligtOver: 1000,
  },
  {
    key: "zn",
    label: "Zink, Zn",
    unit: "mg/kg",
    eurofins: ["Zink (Zn)"],
    kind: "numeric",
    forurenetFra: 500,
    farligtOver: 2500,
  },
  {
    key: "asbestos",
    label: "Asbest",
    unit: null,
    eurofins: ["Asbest i materialeprøver"],
    kind: "presence",
    // Pavist asbest er farligt affald. Vi skelnede for mellem stovende og
    // ikke-stovende, men den forskel skulle saettes i handen — og en
    // vurdering ingen nar at saette, lader proven sta gul. Asbest skal vaere
    // rod.
    pavist: "farligt",
  },
  {
    key: "pcb_total",
    label: "PCB total",
    unit: "mg/kg",
    eurofins: ["PCB total (sum af 7 PCB x 5)", "Sum af 7 PCB'er x 5 excl LOQ"],
    kind: "numeric",
    forurenetFra: 0.1,
    farligtOver: 50,
  },
  {
    key: "chlor_paraffins",
    label: "Chlorerede paraffiner",
    unit: null,
    eurofins: ["Spor af Chlorparaffiner"],
    kind: "presence",
    // Graensetabellen har ingen rod kolonne for klorerede paraffiner: pavist
    // goer materialet forurenet, aldrig farligt i sig selv.
    pavist: "forurenet",
  },
  {
    key: "pah_total",
    label: "PAH total",
    unit: "mg/kg",
    eurofins: ["PAH sum"],
    kind: "numeric",
    forurenetFra: 4,
    farligtOver: 1000,
  },
];

export const LAB_PARAMETER_BY_KEY = new Map(
  LAB_PARAMETERS.map((p) => [p.key, p]),
);

/**
 * En maling som den star i svaret.
 *
 * Teksten gemmes ordret — "< 0,05" siger noget andet end "0,05", og det skal
 * kunden kunne se. Tallet er kun til at afgore farven.
 */
export type LabValue =
  | { state: "ikke_analyseret" }
  | { state: "ikke_pavist"; text: string }
  | { state: "pavist"; text: string }
  | { state: "tal"; text: string; number: number; underDetektion: boolean };

export const IKKE_ANALYSERET = "I.a.";
export const IKKE_PAVIST = "I.P.";

/**
 * Det der skal sta i cellen — og det der gemmes i databasen.
 *
 * Vi gemmer teksten, ikke tallet. "< 0,05" siger noget andet end "0,05", og
 * en raekke i lab_results skal kunne laeses direkte af et menneske der
 * kigger i databasen, praecis som regnearket kunne.
 */
export function displayValue(value: LabValue): string {
  switch (value.state) {
    case "ikke_analyseret":
      return IKKE_ANALYSERET;
    case "ikke_pavist":
      return IKKE_PAVIST;
    default:
      return value.text;
  }
}

/**
 * Oversaetter en celle fra svarfilen — eller fra databasen — til en maling.
 *
 * Tom celle betyder at analysen ikke blev bestilt. "#" er Excels mark for at
 * summen ikke kunne beregnes, fordi hvert enkelt stof la under
 * detektionsgraensen — altsa ikke pavist.
 */
export function readValue(cell: string | null): LabValue {
  const text = (cell ?? "").trim();
  if (text === "" || text === IKKE_ANALYSERET) {
    return { state: "ikke_analyseret" };
  }
  if (text === "#" || text === "#VALUE!" || text === IKKE_PAVIST) {
    return { state: "ikke_pavist", text };
  }

  const lower = text.toLowerCase();
  if (lower.startsWith("ikke påvist") || lower.startsWith("ikke pavist")) {
    return { state: "ikke_pavist", text };
  }
  if (lower.startsWith("påvist") || lower.startsWith("pavist")) {
    return { state: "pavist", text };
  }

  const number = toNumber(text);
  if (number === null) return { state: "pavist", text };

  return { state: "tal", text, number, underDetektion: text.startsWith("<") };
}

/** "< 0,05" og "1.800" er begge tal. Komma er decimaltegn, punktum tusinde. */
function toNumber(text: string): number | null {
  const cleaned = text
    .replace(/^[<>]\s*/, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/**
 * Hvilket niveau malingen ligger pa. null betyder at der ikke er malt.
 *
 * En vaerdi under detektionsgraensen — "< 2" — vurderes pa tallet efter
 * tegnet. Det er den ovre graense for hvad der kan gemme sig, sa vi kommer
 * aldrig til at farve for mildt.
 */
export function classify(
  parameter: LabParameter,
  value: LabValue,
): LabLevel | null {
  if (value.state === "ikke_analyseret") return null;
  if (value.state === "ikke_pavist") return "rent";

  if (parameter.kind === "presence") return parameter.pavist;

  if (value.state === "pavist") return "forurenet";
  if (value.number > parameter.farligtOver) return "farligt";
  if (value.number >= parameter.forurenetFra) return "forurenet";
  return "rent";
}

/** Provens samlede niveau er det vaerste af dens malinger. */
export function worstLevel(levels: (LabLevel | null)[]): LabLevel | null {
  if (levels.includes("farligt")) return "farligt";
  if (levels.includes("forurenet")) return "forurenet";
  if (levels.some((l) => l === "rent")) return "rent";
  return null;
}

export const LEVEL_LABEL: Record<LabLevel, string> = {
  rent: "Rent affald",
  forurenet: "Forurenet affald",
  farligt: "Farligt affald",
};

/** Graensen skrevet ud, som den star nederst i skemaet. */
export function thresholdText(
  parameter: LabParameter,
  level: LabLevel,
): string {
  if (parameter.kind === "presence") {
    if (level === "rent") return "Ikke påvist";
    return parameter.pavist === level ? "Påvist" : "—";
  }
  const { forurenetFra, farligtOver } = parameter;
  if (level === "rent") return `< ${da(forurenetFra)}`;
  if (level === "forurenet") return `${da(forurenetFra)}–${da(farligtOver)}`;
  return `> ${da(farligtOver)}`;
}

function da(n: number): string {
  return n.toLocaleString("da-DK", { maximumFractionDigits: 2 });
}
