import type { BbrBuildingRaw } from "./datafordeler";

/** Bygning som resten af appen kender den — uafhaengigt af BBR's feltnavne. */
export type BbrBuilding = {
  bbrBuildingId: string | null;
  buildingNo: string | null;
  label: string;
  usageCode: string | null;
  usageText: string | null;
  builtYear: number | null;
  rebuiltYear: number | null;
  areaBuilt: number | null;
  areaTotal: number | null;
  areaResidential: number | null;
  /**
   * Rapportens bygningsoversigt. Koderne gemmes og ikke teksten: ordlyden
   * kommer fra BBR's egen kodeliste, som star et sted her i filen, sa en
   * rettelse gaelder hver sag med det samme og ikke kun de naeste.
   */
  floors: number | null;
  wallMaterialCode: string | null;
  roofMaterialCode: string | null;
  heatingCode: string | null;
};

/**
 * Screenerens egne ord om bygningen.
 *
 * De tre findes ikke i BBR og kan ikke komme derfra: «Bygningen er planlagt til
 * delvis nedrivning» er en beslutning i projektet, ikke en registrering om
 * ejendommen. De skrives i hand pa BBR-siden og staar i rapporten.
 */
export type BygningsNoter = {
  /** Hvad bygningen bruges til — erhverv, bolig, lager. */
  usageNote: string | null;
  /** Konstruktion og overordnet stand. */
  constructionNote: string | null;
  /** Hvad der skal ske med bygningen. */
  planNote: string | null;
};

export const TOMME_NOTER: BygningsNoter = {
  usageNote: null,
  constructionNote: null,
  planNote: null,
};

/**
 * Anvendelseskoder, ordret fra BBR's kodeliste (bbr.dk/kodelister).
 *
 * Listen stod for med elleve koder skrevet efter hukommelsen, og resten faldt
 * ned i gruppen: en bygning til kontor blev "Kontor, handel eller lager (321)".
 * Nu star hver kode med BBR's eget navn, sa rapportens «Bygning 1 –
 * Benyttelse» siger det samme som BBR-udskriften i kundens haand.
 *
 * Gruppen nedenfor er stadig sikkerhedsnettet. En forkert bygningsbetegnelse er
 * vaerre end ingen — screeneren kan altid rette teksten, og feltet indgar ikke
 * i Eurofins-filen.
 */
const USAGE_EXACT: Record<string, string> = {
  "110": "Stuehus til landbrugsejendom",
  "120": "Fritliggende enfamiliehus",
  "121": "Sammenbygget enfamiliehus",
  "122": "Fritliggende enfamiliehus i tæt-lav bebyggelse",
  "130": "Række-, kæde-, eller dobbelthus",
  "131": "Række-, kæde- og klyngehus",
  "132": "Dobbelthus",
  "140": "Etagebolig-bygning, flerfamiliehus eller to-familiehus",
  "150": "Kollegium",
  "160": "Boligbygning til døgninstitution",
  "185": "Anneks i tilknytning til helårsbolig",
  "190": "Anden bygning til helårsbeboelse",

  "211": "Stald til svin",
  "212": "Stald til kvæg, får mv.",
  "213": "Stald til fjerkræ",
  "214": "Minkhal",
  "215": "Væksthus",
  "216": "Lade til foder, afgrøder mv.",
  "217": "Maskinhus, garage mv.",
  "218": "Lade til halm, hø mv.",
  "219": "Anden bygning til landbrug mv.",

  "221": "Bygning til industri med integreret produktionsapparat",
  "222": "Bygning til industri uden integreret produktionsapparat",
  "223": "Værksted",
  "229": "Anden bygning til produktion",

  "231": "Bygning til energiproduktion",
  "232": "Bygning til energidistribution",
  "233": "Bygning til vandforsyning",
  "234": "Bygning til håndtering af affald og spildevand",
  "239": "Anden bygning til energiproduktion og forsyning",

  "311": "Bygning til jernbane- og busdrift",
  "312": "Bygning til luftfart",
  "313": "Bygning til parkering- og transportanlæg",
  "314": "Bygning til parkering af flere end to køretøjer i tilknytning til boliger",
  "315": "Havneanlæg",
  "319": "Andet transportanlæg",

  "321": "Bygning til kontor",
  "322": "Bygning til detailhandel",
  "323": "Bygning til lager",
  "324": "Butikscenter",
  "325": "Tankstation",
  "329": "Anden bygning til kontor, handel og lager",

  "331": "Hotel, kro eller konferencecenter med overnatning",
  "332": "Bed & breakfast mv.",
  "333": "Restaurant, café og konferencecenter uden overnatning",
  "334": "Privat servicevirksomhed som frisør, vaskeri, netcafé mv.",
  "339": "Anden bygning til serviceerhverv",

  "411": "Biograf, teater, koncertsted mv.",
  "412": "Museum",
  "413": "Bibliotek",
  "414": "Kirke eller anden bygning til trosudøvelse",
  "415": "Forsamlingshus",
  "416": "Forlystelsespark",
  "419": "Anden bygning til kulturelle formål",

  "421": "Grundskole",
  "422": "Universitet",
  "429": "Anden bygning til undervisning og forskning",

  "431": "Hospital og sygehus",
  "432": "Hospice, behandlingshjem mv.",
  "433": "Sundhedscenter, lægehus, fødeklinik mv.",
  "439": "Anden bygning til sundhedsformål",

  "441": "Daginstitution",
  "442": "Servicefunktion på døgninstitution",
  "443": "Kaserne",
  "444": "Fængsel, arresthus mv.",
  "449": "Anden bygning til institutionsformål",
  "451": "Beskyttelsesrum",

  "510": "Sommerhus",
  "521": "Feriecenter, center til campingplads mv.",
  "522": "Bygning med ferielejligheder til erhvervsmæssig udlejning",
  "523": "Bygning med ferielejligheder til eget brug",
  "529": "Anden bygning til ferieformål",

  "531": "Klubhus i forbindelse med fritid og idræt",
  "532": "Svømmehal",
  "533": "Idrætshal",
  "534": "Tribune i forbindelse med stadion",
  "535": "Bygning til træning og opstaldning af heste",
  "539": "Anden bygning til idrætsformål",

  "540": "Kolonihavehus",
  "585": "Anneks i tilknytning til fritids- og sommerhus",
  "590": "Anden bygning til fritidsformål",

  "910": "Garage",
  "920": "Carport",
  "930": "Udhus",
  "940": "Drivhus",
  "950": "Fritliggende overdækning",
  "960": "Fritliggende udestue",
  "970": "Tiloversbleven landbrugsbygning",

  "990": "Faldefærdig bygning",
  "999": "Ukendt bygning",
};

/**
 * Ydervaeggens materiale, tagdaekningen og varmeinstallationen.
 *
 * Ordret fra BBR's kodelister. To af koderne betyder noget ud over rapporten:
 * kode 3 hedder «Fibercement herunder asbest» i bade ydervaeg og tag, og kode
 * 10 er den samme plade uden asbest. Skriv dem ikke om — forskellen pa de to er
 * hele forskellen pa en asbestsanering og ingen.
 */
const YDERVAEG: Record<string, string> = {
  "1": "Mursten",
  "2": "Letbetonsten",
  "3": "Fibercement herunder asbest",
  "4": "Bindingsværk",
  "5": "Træ",
  "6": "Betonelementer",
  "8": "Metal",
  "10": "Fibercement uden asbest",
  "11": "Plastmaterialer",
  "12": "Glas",
  "80": "Ingen",
  "90": "Andet materiale",
};

const TAGDAEKNING: Record<string, string> = {
  "1": "Tagpap med lille hældning",
  "2": "Tagpap med stor hældning",
  "3": "Fibercement herunder asbest",
  "4": "Betontagsten",
  "5": "Tegl",
  "6": "Metal",
  "7": "Stråtag",
  "10": "Fibercement uden asbest",
  "11": "Plastmaterialer",
  "12": "Glas",
  "20": "Levende tage",
  "90": "Andet materiale",
};

const VARMEINSTALLATION: Record<string, string> = {
  "1": "Fjernvarme/blokvarme",
  "2": "Centralvarme med én fyringsenhed",
  "3": "Ovn til fast og flydende brændsel",
  "5": "Varmepumpe",
  "6": "Centralvarme med to fyringsenheder",
  "7": "Elvarme",
  "8": "Gasradiator",
  "9": "Ingen varmeinstallation",
  "99": "Blandet",
};

/**
 * Koden slaaet op i sin liste.
 *
 * Kender vi ikke koden, vises den ra — «Kode 14» — frem for ingenting. BBR far
 * nye koder, og et tomt felt i rapporten ser ud som om oplysningen ikke findes,
 * hvor den i virkeligheden bare er ny for os.
 */
function kodeTekst(
  liste: Record<string, string>,
  code: string | number | null,
): string | null {
  if (code === null || code === undefined || code === "") return null;
  const key = String(code);
  return liste[key] ?? `Kode ${key}`;
}

export const ydervaegTekst = (code: string | null) =>
  kodeTekst(YDERVAEG, code);
export const tagTekst = (code: string | null) =>
  kodeTekst(TAGDAEKNING, code);
export const varmeTekst = (code: string | null) =>
  kodeTekst(VARMEINSTALLATION, code);

/**
 * De tre kodelister, sa verifikationen kan naa dem.
 *
 * Kun til kontrol — appen slar op gennem funktionerne ovenfor.
 */
export const BBR_KODELISTER = {
  ydervaeg: YDERVAEG,
  tag: TAGDAEKNING,
  varme: VARMEINSTALLATION,
  anvendelse: USAGE_EXACT,
};

/**
 * De samme lister som valg, i BBR's egen raekkefolge.
 *
 * Screeneren skal kunne rette dem: BBR er ikke altid ajour, og en plade kan
 * vaere skiftet uden at nogen har indberettet det. Rettelsen sker ved at vaelge
 * en anden KODE og ikke ved at skrive fri tekst — sa bliver «Fibercement
 * herunder asbest» ved med at kunne genkendes af det, der advarer om asbest, og
 * rapporten skriver stadig BBR's egne ord.
 */
const somValg = (liste: Record<string, string>) =>
  Object.entries(liste).map(([code, text]) => ({ code, text }));

export const YDERVAEG_VALG = somValg(YDERVAEG);
export const TAG_VALG = somValg(TAGDAEKNING);
export const VARME_VALG = somValg(VARMEINSTALLATION);

/**
 * Forslag til «Konstruktion og stand», bygget af det BBR ved.
 *
 * Screeneren skal skrive en saetning — skabelonens eksempel er «opført som
 * traditionel muret konstruktion med tegltag og fremstar i aeldre stand» — og
 * det er hurtigere at rette to oplysninger til en saetning end at slaa dem op
 * igen. Standen kan BBR ikke vide noget om; den skal skrives.
 */
export function konstruktionsForslag(
  wallMaterialCode: string | null,
  roofMaterialCode: string | null,
): string | null {
  const dele = [
    ydervaegTekst(wallMaterialCode) &&
      `Ydervægge: ${ydervaegTekst(wallMaterialCode)}`,
    tagTekst(roofMaterialCode) && `Tag: ${tagTekst(roofMaterialCode)}`,
  ].filter((d): d is string => !!d);

  return dele.length ? `${dele.join(". ")}.` : null;
}

const USAGE_GROUP: [RegExp, string][] = [
  [/^1\d\d$/, "Beboelse"],
  [/^21\d$/, "Landbrugsbygning"],
  [/^22\d$/, "Industri eller produktion"],
  [/^23\d$/, "Forsyningsanlæg"],
  [/^3[12]\d$/, "Kontor, handel eller lager"],
  [/^33\d$/, "Hotel, restaurant eller service"],
  [/^4\d\d$/, "Institution, kultur eller undervisning"],
  [/^5\d\d$/, "Fritidsformål"],
  [/^9\d\d$/, "Mindre bygning eller overdækning"],
];

function usageText(code: string | null): string | null {
  if (!code) return null;
  if (USAGE_EXACT[code]) return USAGE_EXACT[code];
  for (const [pattern, text] of USAGE_GROUP) {
    if (pattern.test(code)) return `${text} (${code})`;
  }
  return `Anvendelse ${code}`;
}

export function mapBuildings(rows: BbrBuildingRaw[]): BbrBuilding[] {
  // BBR kan returnere samme bygning flere gange. Vi holder pa den forste af
  // hvert id_lokalId og sorterer efter bygningsnummer, som screeneren kender
  // dem fra BBR-udskriften.
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const key = r.id_lokalId ?? "";
    if (key && seen.has(key)) return false;
    if (key) seen.add(key);
    return true;
  });

  return unique
    .map((row, index): BbrBuilding => {
      const buildingNo =
        row.byg007Bygningsnummer != null
          ? String(row.byg007Bygningsnummer)
          : null;
      const code = row.byg021BygningensAnvendelse ?? null;

      return {
        bbrBuildingId: row.id_lokalId,
        buildingNo,
        label: `Bygning ${buildingNo ?? index + 1}`,
        usageCode: code,
        usageText: usageText(code),
        builtYear: row.byg026Opfoerelsesaar,
        rebuiltYear: row.byg027OmTilbygningsaar,
        areaBuilt: row.byg041BebyggetAreal,
        areaTotal: row.byg038SamletBygningsareal,
        areaResidential: row.byg039BygningensSamledeBoligAreal,
        floors: row.byg054AntalEtager,
        // Koderne skrives som tekst: BBR har svaret med tal for det samme felt
        // i andre tjenester, og en kodeliste slaas op pa "3" og ikke pa 3.
        wallMaterialCode:
          row.byg032YdervaeggensMateriale != null
            ? String(row.byg032YdervaeggensMateriale)
            : null,
        roofMaterialCode:
          row.byg033Tagdaekningsmateriale != null
            ? String(row.byg033Tagdaekningsmateriale)
            : null,
        heatingCode:
          row.byg056Varmeinstallation != null
            ? String(row.byg056Varmeinstallation)
            : null,
      };
    })
    .sort((a, b) =>
      (a.buildingNo ?? "").localeCompare(b.buildingNo ?? "", "da", {
        numeric: true,
      }),
    );
}
