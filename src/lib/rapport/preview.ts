import {
  DISPOSAL_SENTENCE_FIELD,
  DISPOSAL_SENTENCE_LABEL,
  RESOURCE_HANDLING_LABEL,
  SENTENCE_FIELD,
  type Bortskaffelsestekst,
  type Bortskaffelsestekster,
  type BuildingPart,
  type Material,
  type ResourceHandling,
} from "@/lib/types";
import type { LabLevel } from "@/lib/lab/parametre";
import {
  ressourceoversigt,
  type Ressourceoversigt,
  type RessourceProve,
} from "@/lib/rapport/ressourcer";

/**
 * Materialepanelets preview: materialets seks saetninger, som de kommer til at
 * staa i rapporten.
 *
 * Der stod for et eksempel under hvert felt, sat sammen i hand. Det var forkert
 * to gange: det fyldte panelet med gentagen tekst, og det var panelets egen
 * gaetning paa hvad rapporten ville skrive. Her koeres saetningerne i stedet
 * gennem `ressourceoversigt` — RAPPORTENS egen funktion — sa previewet ikke kan
 * vise en genbrugssaetning paa en linje, rapporten havde flyttet til
 * Forureninger.
 *
 * Reglen ligger her og ikke i panelet, saa `verify:ressourcer` kan naa den:
 * panelet er en klientkomponent med serverhandlinger, og den kan et script uden
 * browser ikke importere.
 */

/** Feltet paa `Material`, der baerer en af de seks saetninger. */
export type Saetningsfelt =
  | typeof SENTENCE_FIELD.genbrug
  | typeof SENTENCE_FIELD.genanvendelse
  | typeof DISPOSAL_SENTENCE_FIELD.farligt
  | typeof DISPOSAL_SENTENCE_FIELD.forurenet
  | typeof DISPOSAL_SENTENCE_FIELD.asbest
  | typeof DISPOSAL_SENTENCE_FIELD.bortskaffelse;

export type Previewraekke = {
  felt: Saetningsfelt;
  /** Feltets egen overskrift i panelet, saa previewet kan pege tilbage. */
  navn: string;
  label: string;
  handling: ResourceHandling;
  niveau: LabLevel;
  asbest: boolean;
  /**
   * Hvilken af de fire bortskaffelsestekster raekken viser — null for de to
   * rene.
   *
   * Staar her, fordi teksten kan komme to steder fra: materialets eget felt,
   * eller den faelles tekst fra indstillingerne. Previewet skal laese den
   * samme, som rapporten vil.
   */
  bortskaffelse: Bortskaffelsestekst | null;
};

/**
 * De seks situationer, der hver udloeser en af saetningerne.
 *
 * Valgene er ikke tilfaeldige — de er laest ud af `bortskaffelsestekst`:
 *
 *   P1, P2  rent svar, screenerens valg staar ved magt        -> ressource
 *   P3      rodt svar overruler genbrug                       -> farligt
 *   P4      gult svar overruler genbrug                       -> forurenet
 *   P5      asbest pavist, som overruler niveauet             -> asbest
 *   P6      screeneren valgte bortskaffelse, svaret er rent   -> bortskaffelse
 *
 * P6 vises med et rent svar og ikke uden analyse. Feltet daekker begge veje,
 * men previewets prover er labprover alle sammen, og hjaelpeteksten ved feltet
 * siger allerede, at der er to.
 */
export const PREVIEWRAEKKER: Previewraekke[] = [
  {
    felt: SENTENCE_FIELD.genbrug,
    navn: RESOURCE_HANDLING_LABEL.genbrug,
    label: "P1",
    handling: "genbrug",
    niveau: "rent",
    asbest: false,
    bortskaffelse: null,
  },
  {
    felt: SENTENCE_FIELD.genanvendelse,
    navn: RESOURCE_HANDLING_LABEL.genanvendelse,
    label: "P2",
    handling: "genanvendelse",
    niveau: "rent",
    asbest: false,
    bortskaffelse: null,
  },
  {
    felt: DISPOSAL_SENTENCE_FIELD.farligt,
    navn: DISPOSAL_SENTENCE_LABEL.farligt,
    label: "P3",
    handling: "genbrug",
    niveau: "farligt",
    asbest: false,
    bortskaffelse: "farligt",
  },
  {
    felt: DISPOSAL_SENTENCE_FIELD.forurenet,
    navn: DISPOSAL_SENTENCE_LABEL.forurenet,
    label: "P4",
    handling: "genbrug",
    niveau: "forurenet",
    asbest: false,
    bortskaffelse: "forurenet",
  },
  {
    felt: DISPOSAL_SENTENCE_FIELD.asbest,
    navn: DISPOSAL_SENTENCE_LABEL.asbest,
    label: "P5",
    handling: "genbrug",
    niveau: "farligt",
    asbest: true,
    bortskaffelse: "asbest",
  },
  {
    felt: DISPOSAL_SENTENCE_FIELD.bortskaffelse,
    navn: DISPOSAL_SENTENCE_LABEL.bortskaffelse,
    label: "P6",
    handling: "bortskaffelse",
    niveau: "rent",
    asbest: false,
    bortskaffelse: "bortskaffelse",
  },
];

/**
 * Maengden og standen i previewet.
 *
 * Et eksempel og ikke en paastand: paa en sag kommer begge fra proven. De staar
 * her, fordi saetningerne er skrevet til at laene sig paa dem — «... kan
 * genbruges» giver ingen mening uden noget foran.
 */
export const PREVIEW_TON = 12;
export const PREVIEW_STAND = 2;

export type Preview = {
  oversigt: Ressourceoversigt;
  /** De raekker, der har en saetning at vise. */
  skrevne: Previewraekke[];
  /** De raekker, der ikke har. Naevnes under arket frem for at mangle i tavshed. */
  tomme: Previewraekke[];
};

/**
 * Bygger previewet af et materiale.
 *
 * Kun de saetninger, der er skrevet, bliver til prover. En tom saetning ville
 * ellers give en linje med et haengende komma efter standen — og det er ikke
 * det, previewet skal laere kontoret at rapporten goer.
 *
 * Er den faelles tekst slaaet til, laeser de fire bortskaffelsesraekker den frem
 * for materialets egne felter — for det er den, rapporten vil skrive. Ellers
 * ville panelet vise en tekst, ingen kommer til at laese, og skjule den der
 * bliver trykt.
 */
export function previewOversigt(
  materiale: Material,
  del: BuildingPart,
  faelles: Bortskaffelsestekster | null = null,
): Preview {
  const raekketekst = (r: Previewraekke) =>
    (r.bortskaffelse && faelles
      ? faelles[r.bortskaffelse]
      : materiale[r.felt]
    )?.trim();

  const skrevne = PREVIEWRAEKKER.filter((r) => raekketekst(r));
  const tomme = PREVIEWRAEKKER.filter((r) => !raekketekst(r));

  const proever: RessourceProve[] = skrevne.map((r) => ({
    label: r.label,
    material: materiale.name,
    building_part_id: del.id,
    material_condition: PREVIEW_STAND,
    resource_handling: r.handling,
    estimated_tons: PREVIEW_TON,
    level: r.niveau,
    asbestPaavist: r.asbest,
    isLabSample: true,
  }));

  return {
    oversigt: ressourceoversigt(proever, [materiale], [del], faelles),
    skrevne,
    tomme,
  };
}
