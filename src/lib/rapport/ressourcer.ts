import { formatHeltal } from "@/lib/format";
import type { LabLevel } from "@/lib/lab/parametre";
import {
  BUILDING_PARTS,
  conditionLabel,
  type BuildingPart,
  type ResourceHandling,
} from "@/lib/types";

/**
 * Ressourcescreeningen: hvilke materialer der kan genbruges, og hvor meget.
 *
 * Hele pointen med denne fil er, at rapporten kun skriver det ud, der faktisk
 * er registreret pa sagen. I Word-skabelonen star alle fyrre linjer altid, og
 * den der laver rapporten skal slette de tredive, der ikke passer. Det er
 * arbejde, en maskine kan lave, og det er arbejde, hvor en glemt sletning
 * bliver en pastand om et materiale, der ikke findes i bygningen.
 *
 * Teksterne er ikke vores. De star ordret som i skabelonen — kun standen er
 * taget ud af saetningerne, fordi den nu er et felt screeneren udfylder frem
 * for et ord i en skabelon. Ret dem ikke for at gore dem paenere.
 */

/**
 * Indledningen til afsnittet.
 *
 * Ordlyden er planens og ikke den gamle Word-skabelons: skabelonen skriver
 * «genbrugsvaerdi» og «genbrugspotentiale i henhold til principperne for
 * selektiv nedrivning og den cirkulaere okonomi», hvor planen har udvidet
 * begge til ogsa at daekke genanvendelse og anden nyttiggorelse. Planen er
 * det nyeste, nogen har besluttet. Skriv den ikke tilbage.
 */
export const RESSOURCE_INDLEDNING = [
  "I forbindelse med den selektive nedrivning er der foretaget en systematisk vurdering af de væsentligste materialer identificeret gennem miljøscreeningen. Beskrivelsen har til formål at skabe et overskueligt overblik over de ressourcer, der vurderes at have en genbrugs- eller genanvendelsesværdi, og som dermed kan indgå i den videre planlægning af nedrivningen.",
  "Der er i vurderingen lagt vægt på estimerede mængder, materialernes stand, eventuelle miljøproblematiske stoffer samt materialernes potentiale for genbrug, genanvendelse eller anden nyttiggørelse.",
];

/**
 * Overskrifterne i rapporten.
 *
 * `facade` og `vaegge` deler overskrift med vilje: skabelonen har bade
 * udvendigt og indvendigt teglmurvaerk under «Facader og vaegge», men giver dem
 * hver sin skaebne. De er to bygningsdele og en overskrift.
 */
const OVERSKRIFT: Record<BuildingPart, string> = {
  fundament: "Fundament og sokkel",
  baerende: "Bærende konstruktioner",
  facade: "Facader og vægge",
  vaegge: "Facader og vægge",
  vinduer_doere: "Vinduer og døre",
  indvendige_overflader: "Indvendige overflader",
  tag: "Tag",
  oevrige: "Øvrige ressourcer",
};

export type RessourceKatalogLinje = {
  part: BuildingPart;
  /** Materialets navn i `screening.materials`, ordret. */
  material: string;
  /** Navnet linjen har i rapporten. */
  navn: string;
  /**
   * Det der star efter maengden. Slutter med punktum.
   *
   * Null nar skabelonen ikke siger noget om materialet. Sa skriver rapporten
   * navn og maengde og intet mere — en manglende saetning er en linje uden sin
   * anden halvdel, men en opdigtet saetning er en fagligt begrundet pastand,
   * som ingen fagperson har staet bag. Kun den forste kan rettes bagefter
   * uden at nogen har handlet pa den.
   */
  saetning: string | null;
};

/**
 * Linjerne fra skabelonen, en pr. bygningsdel og materiale.
 *
 * Parret (bygningsdel, materiale) er nogle, og det er derfor bygningsdelen
 * betyder noget: `Trae` bliver spaertrae i den baerende konstruktion,
 * facadebeklaedning pa facaden, en dor i dorhullet, et traegulv indenfor og en
 * tagkonstruktion oppe. Samme materiale, fem forskellige skaebner.
 *
 * Parret skal vaere entydigt. `npm run verify:ressourcer` fejler, hvis to
 * linjer far det samme, sa en ny linje ikke kan skygge for en gammel i
 * tavshed.
 *
 * Skabelonen har en linje, der ikke er med: «Rustiklofter» ville dele parret
 * (indvendige overflader, Trae) med traegulve, og traegulve er det almindelige.
 *
 * En saetning ma genbruges ordret for det SAMME materiale i en anden
 * bygningsdel — beton knuses ens, om den sad i fundamentet eller i en baerende
 * vaeg. Den ma ikke lanes til et andet materiale: sa er det en ny faglig
 * pastand, og den skal komme fra Nemscreening og ikke herfra. Derfor star
 * planens materialer uden saetning, hvor skabelonen ikke naevner dem.
 */
export const RESSOURCE_KATALOG: RessourceKatalogLinje[] = [
  {
    part: "fundament",
    material: "Beton (undtagen, gasbeton, letbeton)",
    navn: "Beton",
    saetning:
      "egnet til nedknusning og genanvendelse i bygge- og anlægsprojekter.",
  },
  {
    part: "fundament",
    material: "Natursten, fx granit og flint",
    navn: "Fundamentsten",
    saetning: null,
  },

  {
    part: "baerende",
    material: "Træ",
    navn: "Konstruktions- og spærtræ",
    saetning:
      "ubehandlet træ har et højt genbrugspotentiale, alternativt kan det energiudnyttes.",
  },
  {
    part: "baerende",
    material: "Jern og metal",
    navn: "Jern og Metal",
    saetning:
      "med højt genbrugspotentiale gennem omsmeltning og recirkulering.",
  },
  {
    part: "baerende",
    material: "Beton (undtagen, gasbeton, letbeton)",
    navn: "Beton",
    saetning:
      "egnet til nedknusning og genanvendelse i bygge- og anlægsprojekter.",
  },

  {
    part: "facade",
    material: "Mursten",
    navn: "Udvendigt teglmurværk",
    saetning:
      "kan genbruges som hele sten eller nedknuses til sekundært råmateriale.",
  },
  {
    part: "facade",
    material: "Letbeton",
    navn: "Letbeton",
    saetning:
      "kan knuses og genanvendes som fyldmateriale eller bruges i produktionen af nye byggematerialer.",
  },
  {
    part: "facade",
    material: "Puds",
    navn: "Puds og kalklag",
    saetning: "kan genanvendes som fyldmateriale.",
  },
  {
    part: "facade",
    material: "Træ",
    navn: "Træfacader / beklædning",
    saetning: "har genbrugspotentiale afhængigt af overfladebehandling.",
  },
  {
    part: "facade",
    material: "Eternit, asbestfri",
    navn: "Facadeplader",
    saetning:
      "kan knuses og genanvendes som fyldmateriale eller indgå i produktionen af nye byggematerialer.",
  },

  {
    part: "vaegge",
    material: "Mursten",
    navn: "Indvendigt teglmurværk",
    saetning: "kan nyttiggøres ved nedknusning og genanvendelse.",
  },
  {
    part: "vaegge",
    material: "Letbeton",
    navn: "Letbeton",
    saetning:
      "kan knuses og genanvendes som fyldmateriale eller bruges i produktionen af nye byggematerialer.",
  },
  {
    part: "vaegge",
    material: "Puds",
    navn: "Puds og kalklag",
    saetning: "kan genanvendes som fyldmateriale.",
  },

  {
    part: "vinduer_doere",
    material: "Glas",
    navn: "Vinduesglas",
    saetning: "kan genbruges eller anvendes i ny glasproduktion.",
  },
  {
    part: "vinduer_doere",
    material: "Vinduer",
    navn: "Vinduesrammer (træ/metal)",
    saetning:
      "med potentiale for genbrug, afhængigt af stand og eventuelle forurenende stoffer.",
  },
  {
    part: "vinduer_doere",
    material: "Træ",
    navn: "Døre, gerigter og fodlister",
    saetning: "velegnet til genbrug.",
  },

  {
    part: "indvendige_overflader",
    material: "Gips",
    navn: "Gipsplader/lofter",
    saetning: "kan genanvendes, hvis korrekt frasorteret.",
  },
  {
    part: "indvendige_overflader",
    material: "Træ",
    navn: "Trægulve",
    saetning: "vurderes egnede til genbrug eller energiudnyttelse.",
  },
  {
    part: "indvendige_overflader",
    material: "Tæppe",
    navn: "Tæpper",
    saetning:
      "begrænset genbrugspotentiale, men kan i nogle tilfælde materialegenanvendes.",
  },
  {
    part: "indvendige_overflader",
    material: "Glasseret tegl / Fliser / Klinker",
    navn: "Klinker/fliser/glaseret tegl",
    saetning:
      "kan genbruges ved sortering og knusning til sekundære råmaterialer, f.eks. stabilgrus eller til vej- og anlægsprojekter.",
  },
  {
    part: "indvendige_overflader",
    material: "Fugemasse",
    navn: "Fugemasse",
    saetning:
      "kan typisk genanvendes som mineralholdigt materiale efter behandling.",
  },
  {
    part: "indvendige_overflader",
    material: "Tapet",
    navn: "Tapet",
    saetning:
      "kan genanvendes og bruges til nye produkter, f.eks. papirprodukter.",
  },

  {
    part: "tag",
    material: "Træ",
    navn: "Tagkonstruktion af træ",
    saetning: "kan genbruges eller energiudnyttes.",
  },
  {
    part: "tag",
    material: "Tagpap",
    navn: "Tagpap",
    saetning:
      "begrænset genbrugspotentiale, primært til energiudnyttelse.",
  },
  {
    part: "tag",
    material: "Jern og metal",
    navn: "Profilerede stålplader",
    saetning: "har højt genbrugspotentiale gennem omsmeltning.",
  },
  {
    part: "tag",
    material: "PVC",
    navn: "PVC-tagdækning",
    saetning: "kan genanvendes, hvis ubehandlet.",
  },
  {
    part: "tag",
    material: "Uglaseret tegl (mur- og tagsten)",
    navn: "Teglsten (tag)",
    saetning:
      "kan genbruges som hele sten eller nedknuses til sekundært råmateriale.",
  },
  {
    part: "tag",
    material: "Eternit, asbestfri",
    navn: "Eternit",
    saetning:
      "kan knuses og genanvendes som fyldmateriale eller indgå i produktionen af nye byggematerialer.",
  },

  {
    part: "oevrige",
    material: "Jern og metal",
    navn: "Jern og metal",
    saetning:
      "med højt genbrugspotentiale gennem omsmeltning og recirkulering.",
  },
  {
    part: "oevrige",
    material: "Glas",
    navn: "Glas (uden for vinduer, fx glaspartier)",
    saetning: "kan genbruges eller indgå i glasproduktion.",
  },
  {
    part: "oevrige",
    material: "Letbeton",
    navn: "Troldtekt / letbetonplader",
    saetning: "kan nyttiggøres gennem genanvendelse.",
  },
  {
    part: "oevrige",
    material: "PVC",
    navn: "PVC",
    saetning:
      "kan genanvendes og bruges til fremstilling af nye plastprodukter.",
  },
  {
    part: "oevrige",
    material: "Plast",
    navn: "Plast",
    saetning: null,
  },
  {
    part: "oevrige",
    material: "Isolering",
    navn: "Isolering",
    saetning:
      "kan genanvendes og bruges til fremstilling af ny isolering eller andre byggematerialer.",
  },
  {
    part: "oevrige",
    material: "Sanitet",
    navn: "Sanitetsudstyr",
    saetning: null,
  },
];

/**
 * Nogle for et par af bygningsdel og materiale.
 *
 * Nultegnet som skilletegn, sa et materialenavn med bindestreg eller skrastreg
 * i sig ikke kan komme til at danne den samme nogle som et andet par.
 */
const katalogNoegle = (part: BuildingPart, material: string) =>
  `${part}\u0000${material}`;

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
  building_part: BuildingPart | null;
  material_condition: number | null;
  resource_handling: ResourceHandling | null;
  estimated_tons: number | null;
  /** Niveauet fra laboratoriet. Null nar der ikke er kommet et svar. */
  level: LabLevel | null;
  /** Om der er bestilt analyser. En prove uden er kun kortlagt. */
  isLabSample: boolean;
};

export type RessourceLinje = {
  navn: string;
  /** Maengden i kilo. Null nar ingen af proverne bag linjen har en maengde. */
  kg: number | null;
  /** Daarligste stand blandt proverne bag linjen. */
  condition: number | null;
  /** Handteringen, nar proverne er enige om den. Ellers null. */
  handling: ResourceHandling | null;
  saetning: string | null;
  /** Provenumrene bag linjen, sa den kan spores tilbage. */
  labels: string[];
};

export type RessourceGruppe = {
  overskrift: string;
  linjer: RessourceLinje[];
};

export type Ressourceoversigt = {
  grupper: RessourceGruppe[];
  /**
   * Prover med bygningsdel, der stadig venter pa laboratoriet.
   *
   * De er holdt ude: for svaret er der, kan rapporten ikke vide om materialet
   * er en ressource eller forurenet affald. Tallet siges hojt frem for at
   * afsnittet bare bliver kortere end det burde.
   */
  afventer: number;
  /** Prover med bygningsdel men uden materiale — de kan ikke navngives. */
  udenMateriale: number;
};

/**
 * Om proven er et rent materiale, der kan indga som ressource.
 *
 * En prove uden analyser er kun kortlagt, og der kommer aldrig et svar pa den
 * — den er ren i den forstand, at intet har vist andet. Er der bestilt
 * analyser, skal svaret vaere kommet og vaere rent. Forurenet og farligt
 * affald er ikke ressourcer, og rapporten ma ikke love at de kan genbruges.
 */
function erRen(p: RessourceProve): boolean {
  if (!p.isLabSample) return true;
  return p.level === "rent";
}

/** Bygger afsnittets grupper og linjer af sagens prover. */
export function ressourceoversigt(
  proever: RessourceProve[],
): Ressourceoversigt {
  let afventer = 0;
  let udenMateriale = 0;

  // Nogle er bygningsdel og materiale. Bygningsdelen og ikke overskriften:
  // udvendigt og indvendigt teglmurvaerk deler overskrift men er to linjer.
  const samlet = new Map<
    string,
    { part: BuildingPart; material: string; proever: RessourceProve[] }
  >();

  for (const p of proever) {
    if (!p.building_part) continue;

    if (p.isLabSample && p.level === null) {
      afventer++;
      continue;
    }
    if (!erRen(p)) continue;
    if (!p.material) {
      udenMateriale++;
      continue;
    }

    const noegle = katalogNoegle(p.building_part, p.material);
    const post = samlet.get(noegle);
    if (post) post.proever.push(p);
    else
      samlet.set(noegle, {
        part: p.building_part,
        material: p.material,
        proever: [p],
      });
  }

  const grupper: RessourceGruppe[] = [];

  for (const { key: part } of BUILDING_PARTS) {
    const linjer: RessourceLinje[] = [];

    // Katalogets raekkefolge forst, sa rapporten laeser som skabelonen. Det der
    // ikke star i kataloget kommer bagefter, alfabetisk.
    const iKatalog = RESSOURCE_KATALOG.filter((l) => l.part === part);
    const brugt = new Set<string>();

    for (const l of iKatalog) {
      const post = samlet.get(katalogNoegle(part, l.material));
      if (!post) continue;
      brugt.add(l.material);
      linjer.push(byggLinje(l.navn, l.saetning, post.proever));
    }

    const udenLinje = [...samlet.values()]
      .filter((p) => p.part === part && !brugt.has(p.material))
      .sort((a, b) => a.material.localeCompare(b.material, "da"));

    for (const post of udenLinje) {
      // Uden en linje i kataloget kan materialet ikke fa en saetning, men
      // maengden er registreret og skal med. Ellers forsvinder et materiale
      // ud af rapporten, fordi kataloget mangler en raekke — og det er
      // vaerre end en linje uden sin sidste halvdel.
      linjer.push(byggLinje(post.material, null, post.proever));
    }

    if (linjer.length === 0) continue;

    // Bygningsdele der deler overskrift laegges i samme gruppe.
    const overskrift = OVERSKRIFT[part];
    const sidste = grupper[grupper.length - 1];
    if (sidste?.overskrift === overskrift) sidste.linjer.push(...linjer);
    else grupper.push({ overskrift, linjer });
  }

  return { grupper, afventer, udenMateriale };
}

function byggLinje(
  navn: string,
  saetning: string | null,
  proever: RessourceProve[],
): RessourceLinje {
  const medMaengde = proever.filter((p) => p.estimated_tons != null);
  const ton = medMaengde.reduce((sum, p) => sum + (p.estimated_tons ?? 0), 0);

  const grader = proever
    .map((p) => p.material_condition)
    .filter((g): g is number => g != null);

  // Daarligste stand og ikke et gennemsnit. Laegges to prover sammen til en
  // linje, ma rapporten ikke love den bedste af dem.
  const condition = grader.length ? Math.max(...grader) : null;

  const handlinger = new Set(
    proever.map((p) => p.resource_handling).filter((h) => h != null),
  );

  return {
    navn,
    // Ton til kilo. Screeneren taster ton — det er den enhed, en prove og en
    // laesning i marken haenger sammen i — og rapporten skriver kilo, fordi
    // det er sadan kunden kender den.
    kg: medMaengde.length ? Math.round(ton * 1000) : null,
    condition,
    handling: handlinger.size === 1 ? [...handlinger][0]! : null,
    saetning,
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
 * baere maerket i hovedet, og en sektion der lober over efterlader den naeste
 * uden.
 *
 * Regnestykket: arket er 297 mm, polstringen tager 24, sa der er 273. Deraf
 * gaar 14 til sidehovedet. Forste side mister yderligere 9 til
 * afsnitsoverskriften og 46 til de to indledende afsnit — 340 anslag pa 186 mm
 * bliver fire linjer, det naeste tre, og linjeafstanden er 6 mm.
 *
 * En linje saettes til 13 mm, altsa to tekstlinjer plus luft. De fleste
 * saetninger er lange nok til at brakke om; de korte giver bare lidt luft
 * nederst, og luft nederst er billigere end en linje der ryger ud over kanten.
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
): RessourceGruppe[][] {
  const sider: RessourceGruppe[][] = [];
  let side: RessourceGruppe[] = [];
  let hoejde = 0;
  let plads = SIDEPLADS.foerste;

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
