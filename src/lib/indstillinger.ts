import type { Bortskaffelsestekst, Bortskaffelsestekster } from "@/lib/types";

/**
 * Appens indstillinger — det, kontoret skal kunne rette uden en udrulning.
 *
 * De ligger i `screening.app_settings`, en noegle/vaerdi-tabel der har staaet
 * siden skemaet blev bygget. Alle medlemmer laeser, kun kontoret skriver: en
 * screener skal kunne hente en rapport, og rapporten kan ikke tegnes uden
 * teksterne.
 *
 * Filen laeser og skriver ikke selv — den oversaetter kun raekker til noget med
 * en form. Det er med vilje: sa kan `verify:ressourcer` naa den uden en
 * database, og den samme oversaettelse gaelder alle tre steder, der spoerger
 * (rapporten, materialepanelet og indstillingssiden).
 */

/** Noeglerne i tabellen. De hedder det samme som kolonnerne paa `materials`. */
export const INDSTILLING_NOEGLER = {
  faelles: "shared_disposal_text",
  bortskaffelse: "sentence_bortskaffelse",
  forurenet: "sentence_forurenet",
  asbest: "sentence_asbest",
} as const;

export type Indstillinger = {
  /**
   * Om de tre bortskaffelsestekster er faelles for alle materialer.
   *
   * Slaaet til skriver rapporten dem EN gang, under linjerne, og maerket paa
   * linjen peger paa den tekst der gaelder. Slaaet fra henter hver linje
   * saetningen fra sit eget materiale, som appen altid har gjort — og
   * materialernes saetninger staar uroerte i databasen imens, sa kontakten kan
   * gaa begge veje uden at noget gaar tabt.
   */
  faellesBortskaffelse: boolean;
  tekster: Bortskaffelsestekster;
};

/** Raekken som PostgREST giver den. `value` er jsonb og kan vaere hvad som helst. */
export type Indstillingsraekke = { key: string; value: unknown };

/**
 * Hvad appen goer, nar tabellen ikke svarer.
 *
 * Faelles tekst SLAAET FRA og tre tomme felter: sa henter rapporten
 * materialernes egne saetninger, praecis som for indstillingen fandtes. En
 * manglende raekke maa aldrig kunne tomme et forureningsafsnit — det er den ene
 * fejl, der ikke ses paa en rapport, for teksten mangler jo bare.
 */
export const STANDARD_INDSTILLINGER: Indstillinger = {
  faellesBortskaffelse: false,
  tekster: { bortskaffelse: null, forurenet: null, asbest: null },
};

const tekst = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

export function laesIndstillinger(
  raekker: Indstillingsraekke[] | null | undefined,
): Indstillinger {
  const vaerdi = new Map((raekker ?? []).map((r) => [r.key, r.value]));

  const felter: [Bortskaffelsestekst, string][] = [
    ["bortskaffelse", INDSTILLING_NOEGLER.bortskaffelse],
    ["forurenet", INDSTILLING_NOEGLER.forurenet],
    ["asbest", INDSTILLING_NOEGLER.asbest],
  ];

  return {
    faellesBortskaffelse: vaerdi.get(INDSTILLING_NOEGLER.faelles) === true,
    tekster: Object.fromEntries(
      felter.map(([felt, noegle]) => [felt, tekst(vaerdi.get(noegle))]),
    ) as Bortskaffelsestekster,
  };
}

/**
 * Teksterne, rapporten skal bruge — eller null, hvis den skal spoerge
 * materialerne.
 *
 * Kontakten kan vaere slaaet til, uden at nogen har skrevet teksterne endnu.
 * Sker det, falder rapporten tilbage paa materialernes egne saetninger frem for
 * at skrive et forureningsafsnit uden et ord om, hvad der skal ske med
 * affaldet. Det er den samme regel som ellers i rapporten: en manglende
 * saetning lover ingenting, men den maa ikke tage de andre med sig.
 */
export function faellesTekster(
  indstillinger: Indstillinger,
): Bortskaffelsestekster | null {
  if (!indstillinger.faellesBortskaffelse) return null;
  const t = indstillinger.tekster;
  if (!t.bortskaffelse && !t.forurenet && !t.asbest) return null;
  return t;
}
