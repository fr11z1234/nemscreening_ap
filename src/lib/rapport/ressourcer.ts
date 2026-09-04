import { formatHeltal } from "@/lib/format";
import { worstLevel, type LabLevel } from "@/lib/lab/parametre";
import {
  bortskaffelsestekst,
  conditionLabel,
  DISPOSAL_SENTENCE_FIELD,
  faktiskHandtering,
  SENTENCE_FIELD,
  type Bortskaffelsestekst,
  type BuildingPart,
  type Material,
  type ResourceHandling,
} from "@/lib/types";

/**
 * Ressourcescreeningen: hvilke materialer der kan genbruges, og hvor meget.
 *
 * Hele pointen er, at rapporten kun skriver det ud, der faktisk er registreret
 * pa sagen. I Word-skabelonen star alle fyrre linjer altid, og den der laver
 * rapporten skal slette de tredive, der ikke passer. Det er arbejde, en maskine
 * kan lave, og det er arbejde hvor en glemt sletning bliver en pastand om et
 * materiale, der ikke findes i bygningen.
 *
 * Teksten star IKKE her. Den ligger pa materialerne i databasen og rettes i
 * materialepanelet — det er kontoret der ved, hvad kommunen skal laese. Denne
 * fil samler linjerne, laegger maengderne sammen og deler siderne op; den
 * bestemmer intet om ordene.
 */

export const RESSOURCE_INDLEDNING = [
  "I forbindelse med den selektive nedrivning er der foretaget en systematisk vurdering af de væsentligste materialer identificeret gennem miljøscreeningen. Beskrivelsen har til formål at skabe et overskueligt overblik over de ressourcer, der vurderes at have en genbrugs- eller genanvendelsesværdi, og som dermed kan indgå i den videre planlægning af nedrivningen.",
  "Der er i vurderingen lagt vægt på estimerede mængder, materialernes stand, eventuelle miljøproblematiske stoffer samt materialernes potentiale for genbrug, genanvendelse eller anden nyttiggørelse.",
];

/**
 * Indledningen til forureningsafsnittet.
 *
 * Skabelonen begynder afsnittet med «Jordforureningsattesten for ejendommen er
 * vedlagt rapporten og kan findes pa de sidste sider». Den saetning star IKKE
 * her: appen kan ikke laegge en jordforureningsattest op, og en rapport der
 * henviser til et bilag, der ikke findes, er vaerre end en der ikke naevner det.
 * Skal saetningen med, skal attesten forst kunne vedhaeftes.
 */
export const FORURENING_INDLEDNING = [
  "I forbindelse med nedrivningen er der foretaget en vurdering af registrerede materialer og stoffer, som kræver særlig håndtering i forbindelse med nedrivningsarbejdet.",
];

export const FORURENING_SPORGSMAAL =
  "Er der potentielle materialer, som kan skabe risiko for forurening ved nedrivningsarbejdet?";

/**
 * Skabelonens andet sporgsmal. Svaret skrives i hand pa resultatsiden.
 *
 * Det forste sporgsmal svarer rapporten selv pa ud fra analyserne. Det her kan
 * den ikke: svaret afhaenger af hvad der konkret er fundet, hvilke regler der
 * gaelder for det, og hvordan entreprenoren skal gribe det an.
 */
export const FORURENING_HAANDTERING_SPORGSMAAL =
  "Hvordan skal disse materialer håndteres i forbindelse med nedrivningen (fx asbestregler, korrekt emballering, bortskaffelse som farligt affald)?";

/**
 * Anslaaet hojde i millimeter af en fritekst pa rapportens bredde.
 *
 * Arket giver 186 mm, og ved den skriftstorrelse gar der omkring 95 anslag pa en
 * linje a 6 mm. Bruges til at give sideopdelingen at vide, hvor meget af den
 * forste side teksten har taget — ellers ville en lang handteringsbeskrivelse
 * skubbe materialelinjerne ud over kanten, og `.print-side` braekker ikke af sig
 * selv.
 */
export function tekstHoejde(tekst: string | null): number {
  if (!tekst?.trim()) return 0;
  const linjer = tekst
    .split("\n")
    .reduce((sum, afsnit) => sum + Math.max(1, Math.ceil(afsnit.length / 95)), 0);
  // Otte til overskriften over teksten, seks pr. linje.
  return 8 + linjer * 6;
}

/**
 * En prove, som ressourcescreeningen har brug for at se den.
 *
 * En flad form frem for `Sample` og `lab_results`, sa udregningen kan proves
 * uden en database — se `scripts/verify-ressourcer.ts`.
 */
export type RessourceProve = {
  /** "P3" eller "3". Bruges til at pege tilbage pa registreringen. */
  label: string;
  material: string | null;
  building_part_id: string | null;
  material_condition: number | null;
  resource_handling: ResourceHandling | null;
  estimated_tons: number | null;
  /** Niveauet fra laboratoriet. Null nar der ikke er kommet et svar. */
  level: LabLevel | null;
  /**
   * Om asbest er pavist i netop denne prove.
   *
   * Star ved siden af `level` og ikke i den: pavist asbest gor proven rod, men
   * en rod prove er ikke noedvendigvis asbest. Det er forskellen, der afgor
   * hvilken bortskaffelsestekst linjen far.
   */
  asbestPaavist: boolean;
  /** Om der er bestilt analyser. En prove uden er kun kortlagt. */
  isLabSample: boolean;
};

export type RessourceLinje = {
  navn: string;
  /** Maengden i kilo. Null nar ingen af proverne bag linjen har en maengde. */
  kg: number | null;
  /** Daarligste stand blandt proverne bag linjen. */
  condition: number | null;
  handling: ResourceHandling | null;
  /** Materialets saetning for den handtering. Null nar den ikke er skrevet. */
  saetning: string | null;
  /** Vaerste niveau blandt proverne. Null nar der ikke er malt noget. */
  niveau: LabLevel | null;
  /** Provenumrene bag linjen, sa den kan spores tilbage. */
  labels: string[];
};

export type RessourceGruppe = {
  overskrift: string;
  linjer: RessourceLinje[];
};

export type Ressourceoversigt = {
  /** Rene materialer, der skal genbruges eller genanvendes. */
  ressourcer: RessourceGruppe[];
  /**
   * Alt der ikke er en ressource: forurenet og farligt affald, plus det rene,
   * der alligevel bortskaffes.
   *
   * Linjerne baerer en af materialets TRE bortskaffelsestekster — hvilken, star
   * i `bortskaffelsestekst` i types.ts. Og de navngives med provenummeret frem
   * for materialet: se `ressourceLinjeHoved`.
   */
  forureninger: RessourceGruppe[];
  /**
   * Prover med bygningsdel, der stadig venter pa laboratoriet.
   *
   * De er holdt ude af begge afsnit: for svaret er der, kan rapporten ikke vide
   * om materialet er en ressource eller forurenet affald. Tallet siges hojt frem
   * for at afsnittene bare bliver kortere end de burde.
   */
  afventer: number;
  /** Prover med bygningsdel men uden materiale — de kan ikke navngives. */
  udenMateriale: number;
};

const noegle = (...dele: string[]) => dele.join("\u0000");

type Post = {
  part: BuildingPart;
  material: string;
  handling: ResourceHandling | null;
  /**
   * Hvilken bortskaffelsestekst linjen skal baere. Null i ressourceafsnittet,
   * hvor `handling` vaelger saetningen i stedet.
   */
  tekst: Bortskaffelsestekst | null;
  proever: RessourceProve[];
};

/**
 * Bygger rapportens to afsnit af sagens prover.
 *
 * SVARET FRA LABORATORIET AFGOR, HVOR EN LINJE LANDER — ikke hvad screeneren
 * troede i marken. Kommer en prove tilbage som forurenet eller farligt affald,
 * flytter den til forureningsafsnittet og far materialets
 * bortskaffelsestekst, ogsa selvom der stod genbrug pa den. Det er hele
 * pointen: analysen validerer vurderingen, og en optimistisk screener kan ikke
 * komme til at love kommunen, at forurenet beton kan genbruges.
 *
 * Vaelger screeneren selv bortskaffelse, flytter proven ogsa — et materiale, der
 * skal bortskaffes, er ikke en ressource, uanset hvad analysen siger.
 *
 * En prove uden analyser bliver aldrig flyttet: der kommer intet svar, og intet
 * har vist andet end at den er ren.
 *
 * `materialer` og `bygningsdele` kommer fra databasen; de er panelets indhold.
 * Kender vi ikke et materiale — det kan vaere lukket eller omdobt siden proven
 * blev taget — bruges provens egen tekst som navn, og linjen far ingen saetning.
 * Sa forsvinder en registreret maengde ikke ud af rapporten, fordi nogen rettede
 * i listen.
 */
export function ressourceoversigt(
  proever: RessourceProve[],
  materialer: Material[],
  bygningsdele: BuildingPart[],
): Ressourceoversigt {
  const materialeVedNavn = new Map(materialer.map((m) => [m.name, m]));
  const delVedId = new Map(bygningsdele.map((b) => [b.id, b]));

  let afventer = 0;
  let udenMateriale = 0;

  const rene = new Map<string, Post>();
  const urene = new Map<string, Post>();

  for (const p of proever) {
    if (!p.building_part_id) continue;
    const del = delVedId.get(p.building_part_id);
    if (!del) continue;

    if (p.isLabSample && p.level === null) {
      afventer++;
      continue;
    }
    const materiale = p.material;
    if (!materiale) {
      udenMateriale++;
      continue;
    }

    // Den samme funktion som analyseskemaets kolonne bruger: er svaret gult
    // eller rodt, er handteringen bortskaffelse, uanset hvad screeneren valgte.
    const handling = faktiskHandtering(p.resource_handling, p.level);

    if (handling === "bortskaffelse") {
      // Niveauet er med i noglen og ikke handteringen: gult og rodt ma ikke
      // laegges sammen til en linje — maerket ved siden af skal betyde noget.
      //
      // Teksten er med af samme grund, og den er ikke afledt af niveauet: to
      // rode prover af samme materiale far hver sin saetning, hvis asbest kun er
      // pavist i den ene. Uden den i noglen ville de to smelte sammen til en
      // linje, og den ene af saetningerne ville forsvinde ud af rapporten.
      const tekst = bortskaffelsestekst(
        p.resource_handling,
        p.level,
        p.asbestPaavist,
      );
      laegTil(
        urene,
        noegle(del.id, materiale, p.level ?? "", tekst),
        del,
        materiale,
        p,
        "bortskaffelse",
        tekst,
      );
    } else {
      // Her vaelger handteringen saetningen: er halvdelen af betonen til genbrug
      // og halvdelen til genanvendelse, er det to linjer med hver sin skaebne.
      laegTil(
        rene,
        noegle(del.id, materiale, handling ?? ""),
        del,
        materiale,
        p,
        handling,
        null,
      );
    }
  }

  return {
    ressourcer: byggGrupper(rene, bygningsdele, materialeVedNavn),
    forureninger: byggGrupper(urene, bygningsdele, materialeVedNavn),
    afventer,
    udenMateriale,
  };
}

function laegTil(
  kort: Map<string, Post>,
  k: string,
  part: BuildingPart,
  material: string,
  p: RessourceProve,
  handling: ResourceHandling | null,
  tekst: Bortskaffelsestekst | null,
) {
  const post = kort.get(k);
  if (post) post.proever.push(p);
  else kort.set(k, { part, material, handling, tekst, proever: [p] });
}

function byggGrupper(
  poster: Map<string, Post>,
  bygningsdele: BuildingPart[],
  materialeVedNavn: Map<string, Material>,
): RessourceGruppe[] {
  // Grupperne folger bygningsdelenes egen raekkefolge. Den staar i databasen og
  // rettes i panelet, sa afsnittene kan flyttes uden en udrulning.
  const dele = [...bygningsdele].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "da"),
  );

  const grupper: RessourceGruppe[] = [];

  for (const del of dele) {
    const iDelen = [...poster.values()]
      .filter((p) => p.part.id === del.id)
      // Materialelistens egen raekkefolge, som kontoret kender den fra
      // regnearket. Ukendte materialer laegges bagest, alfabetisk.
      .sort((a, b) => {
        const oa = materialeVedNavn.get(a.material)?.sort_order ?? Number.MAX_SAFE_INTEGER;
        const ob = materialeVedNavn.get(b.material)?.sort_order ?? Number.MAX_SAFE_INTEGER;
        return oa - ob || a.material.localeCompare(b.material, "da");
      });

    const linjer = iDelen.map((post) => {
      const m = materialeVedNavn.get(post.material);
      const saetning = m
        ? post.tekst
          ? m[DISPOSAL_SENTENCE_FIELD[post.tekst]]
          : post.handling
            ? m[SENTENCE_FIELD[post.handling]]
            : null
        : null;

      return byggLinje(
        m?.report_name?.trim() || post.material,
        post.handling,
        saetning ?? null,
        post.proever,
      );
    });

    if (linjer.length > 0) grupper.push({ overskrift: del.name, linjer });
  }

  return grupper;
}

function byggLinje(
  navn: string,
  handling: ResourceHandling | null,
  saetning: string | null,
  proever: RessourceProve[],
): RessourceLinje {
  const medMaengde = proever.filter((p) => p.estimated_tons != null);
  const ton = medMaengde.reduce((sum, p) => sum + (p.estimated_tons ?? 0), 0);

  const grader = proever
    .map((p) => p.material_condition)
    .filter((g): g is number => g != null);

  // Daarligste stand og ikke et gennemsnit. Laegges to prover sammen til en
  // linje, ma rapporten ikke love den bedste af dem. Samme regel for niveauet.
  const condition = grader.length ? Math.max(...grader) : null;

  return {
    navn,
    // Ton til kilo. Screeneren taster ton — det er den enhed, en prove og en
    // aflaesning i marken haenger sammen i — og rapporten skriver kilo, fordi
    // det er sadan kunden kender den.
    kg: medMaengde.length ? Math.round(ton * 1000) : null,
    condition,
    handling,
    saetning: saetning?.trim() || null,
    niveau: worstLevel(proever.map((p) => p.level)),
    labels: proever.map((p) => p.label),
  };
}

/**
 * Alt efter materialets navn: «– 12.000 kg i god stand, kan genbruges ...».
 *
 * Standen sidder mellem maengden og saetningen med et komma efter, praecis som
 * i skabelonen. Er den ikke sat, falder bade den og kommaet ud, og saetningen
 * laener sig direkte pa maengden — ogsa som i skabelonen.
 */
export function ressourceLinjeHale(linje: RessourceLinje): string {
  const dele = ["–"];

  dele.push(
    linje.kg != null ? `${formatHeltal(linje.kg)} kg` : "mængde ikke opgjort",
  );

  const stand = conditionLabel(linje.condition);
  if (stand) dele.push(`i ${stand.toLowerCase()},`);

  if (linje.saetning) dele.push(linje.saetning);

  return dele.join(" ");
}

/**
 * Linjens forreste led: materialets navn, eller provenumrene.
 *
 * I ressourceafsnittet staar materialet — det er et overblik over hvad
 * bygningen indeholder, og navnet er hele pointen.
 *
 * I forureningsafsnittet staar provenummeret i stedet. Der peger linjen paa en
 * konkret prove, som entreprenoren skal kunne slaa op i analyseskemaet og finde
 * malingerne bag; materialenavnet siger ikke hvilken af de tre stykker
 * glasseret tegl der var forurenet. Er to prover af samme materiale lagt sammen
 * til en linje, staar de begge: «P1, P2».
 */
export function ressourceLinjeHoved(linje: RessourceLinje): string {
  return linje.labels.length ? linje.labels.join(", ") : linje.navn;
}

/** Hele linjen som den staar i rapporten. */
export function ressourceLinjeTekst(linje: RessourceLinje): string {
  return `${linje.navn} ${ressourceLinjeHale(linje)}`;
}

/**
 * Anslaaede hojder i millimeter, brugt til at dele afsnittet op i sider.
 *
 * `.print-side` har `break-inside: avoid`, sa en sektion der er hojere end
 * arket bliver ikke braekket paent — den bliver braekket af browseren et
 * tilfaeldigt sted eller klippet. Derfor deles listen her, praecis som
 * metodeteksten er delt i RAPPORT_SIDER, og af samme grund: hver side skal
 * baere maerket i hovedet.
 *
 * Regnestykket: arket er 297 mm, polstringen tager 24, sa der er 273. Deraf
 * gaar 14 til sidehovedet. Forste side mister yderligere 9 til
 * afsnitsoverskriften og 46 til de to indledende afsnit.
 *
 * En linje saettes til 13 mm, altsa to tekstlinjer plus luft. De fleste
 * saetninger er lange nok til at brakke om; de korte giver bare lidt luft
 * nederst, og luft nederst er billigere end en linje der lober ud over kanten.
 */
const HOEJDE = { overskrift: 10, linje: 13 };
const SIDEPLADS = { foerste: 204, senere: 259 };

/**
 * Deler grupperne op i sider, en sektion pr. side.
 *
 * En overskrift bliver aldrig staaende alene nederst: er der ikke plads til
 * bade den og en linje, flyttes begge til naeste side. Braekkes en gruppe over
 * to sider, gentages overskriften med «(fortsat)», sa laeseren ikke skal
 * gaette hvilken kategori de forste linjer pa siden hoerer til.
 */
export function ressourceSider(
  grupper: RessourceGruppe[],
  /**
   * Millimeter, der allerede er brugt paa den forste side.
   *
   * Forureningsafsnittet har en fritekst under sporgsmalet, og den kan vaere
   * lang. Uden at trakke den fra ville linjerne blive lagt paa en side, der ikke
   * havde plads til dem.
   */
  forbrugtPaaFoersteSide = 0,
): RessourceGruppe[][] {
  const sider: RessourceGruppe[][] = [];
  let side: RessourceGruppe[] = [];
  let hoejde = 0;
  // Bliver teksten laengere end siden, er der intet tilbage til linjerne, og de
  // begynder pa naeste ark. Nul og ikke et negativt tal, sa den forste linje
  // ikke ryger paa en side for sig.
  let plads = Math.max(0, SIDEPLADS.foerste - forbrugtPaaFoersteSide);

  for (const gruppe of grupper) {
    let paabegyndt = false;
    let aktuel: RessourceGruppe | null = null;

    for (const linje of gruppe.linjer) {
      const behov = HOEJDE.linje + (aktuel === null ? HOEJDE.overskrift : 0);

      if (side.length > 0 && hoejde + behov > plads) {
        sider.push(side);
        side = [];
        hoejde = 0;
        plads = SIDEPLADS.senere;
        aktuel = null;
      }

      if (aktuel === null) {
        aktuel = {
          overskrift: paabegyndt
            ? `${gruppe.overskrift} (fortsat)`
            : gruppe.overskrift,
          linjer: [],
        };
        paabegyndt = true;
        side.push(aktuel);
        hoejde += HOEJDE.overskrift;
      }

      aktuel.linjer.push(linje);
      hoejde += HOEJDE.linje;
    }
  }

  if (side.length > 0) sider.push(side);
  return sider;
}
