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
};

/**
 * Anvendelseskoder.
 *
 * Kun de koder der er entydige star praecist. For resten bruges gruppen (forste
 * ciffer/to cifre), og ellers vises koden ra som "Anvendelse 217". En forkert
 * bygningsbetegnelse er vaerre end ingen — screeneren kan altid rette teksten,
 * og feltet indgar ikke i Eurofins-filen.
 */
const USAGE_EXACT: Record<string, string> = {
  "110": "Stuehus til landbrugsejendom",
  "120": "Fritliggende enfamiliehus",
  "130": "Række-, kæde- eller dobbelthus",
  "140": "Etagebolig",
  "150": "Kollegium",
  "190": "Anden helårsbeboelse",
  "510": "Sommerhus",
  "910": "Garage",
  "920": "Carport",
  "930": "Udhus",
  "940": "Drivhus",
};

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
      };
    })
    .sort((a, b) =>
      (a.buildingNo ?? "").localeCompare(b.buildingNo ?? "", "da", {
        numeric: true,
      }),
    );
}
