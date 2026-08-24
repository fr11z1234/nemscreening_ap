import { tagTekst, varmeTekst, ydervaegTekst } from "@/lib/bbr/map";
import { formatDecimal } from "@/lib/format";
import type { CaseBuilding } from "@/lib/types";

/**
 * Rapportens «Projektets omfang» — BBR's bygningsoversigt og
 * konstruktionsbeskrivelse.
 *
 * Seks oplysninger kommer fra BBR. De tre saetninger under dem gor ikke og kan
 * ikke: «Bygningen er planlagt til delvis nedrivning» er en beslutning i
 * projektet, ikke en registrering om ejendommen. De skrives pa BBR-siden.
 *
 * Tomme linjer springes over. Skabelonen har en stjerne ved hvert felt, der
 * skal udfyldes i hand, og en «HUSK AT SLETTE» nederst — begge er spor af, at
 * et menneske skulle rydde op i et ark, der altid viste alt. Her staar der kun
 * det, der er.
 */

export type BygningsBlok = {
  label: string;
  usageText: string | null;
  fakta: { navn: string; vaerdi: string }[];
  noter: { navn: string; tekst: string }[];
};

export function bygningsBlok(b: CaseBuilding): BygningsBlok {
  const fakta: { navn: string; vaerdi: string | null }[] = [
    { navn: "Opført", vaerdi: b.built_year ? String(b.built_year) : null },
    {
      navn: "Ombygget",
      vaerdi: b.rebuilt_year ? String(b.rebuilt_year) : null,
    },
    { navn: "Etager", vaerdi: b.floors != null ? String(b.floors) : null },
    {
      navn: "Samlet areal",
      vaerdi: b.area_total ? `${formatDecimal(b.area_total)} m²` : null,
    },
    { navn: "Ydervægge", vaerdi: ydervaegTekst(b.wall_material_code) },
    { navn: "Tag", vaerdi: tagTekst(b.roof_material_code) },
    { navn: "Varmeforsyning", vaerdi: varmeTekst(b.heating_code) },
  ];

  const noter: { navn: string; tekst: string | null }[] = [
    { navn: "Anvendelse", tekst: b.usage_note },
    { navn: "Konstruktion og stand", tekst: b.construction_note },
    { navn: "Planlagt arbejde", tekst: b.plan_note },
  ];

  return {
    label: b.label,
    usageText: b.usage_text,
    fakta: fakta.filter(
      (f): f is { navn: string; vaerdi: string } => f.vaerdi !== null,
    ),
    noter: noter
      .filter(
        (n): n is { navn: string; tekst: string } =>
          n.tekst !== null && n.tekst.trim() !== "",
      )
      .map((n) => ({ navn: n.navn, tekst: n.tekst.trim() })),
  };
}

/**
 * Anslaaet hojde af en bygningsblok i millimeter.
 *
 * Overskriften og de syv oplysninger i to spalter fylder omkring 30 mm. Hver
 * skrevet saetning laegger 13 mm til: en etiket og to tekstlinjer. En bygning
 * med alle tre beskrivelser fylder altsa knap 70 mm, og der er plads til tre pa
 * et ark — praecis som i skabelonen.
 */
const HOEJDE = { blok: 30, note: 13 };
const SIDEPLADS = { foerste: 250, senere: 259 };

const blokHoejde = (b: BygningsBlok) =>
  HOEJDE.blok + b.noter.length * HOEJDE.note;

/**
 * Deler bygningerne op i sider, en sektion pr. side.
 *
 * Samme grund som ressourceafsnittet og metodeteksten: `.print-side` har
 * `break-inside: avoid`, og hver side skal baere maerket i hovedet. En bygning
 * braekkes ikke over to ark — dens oplysninger og dens beskrivelse hoerer
 * sammen — sa en blok, der ikke kan vaere pa resten af siden, flyttes hel.
 */
export function bygningsSider(blokke: BygningsBlok[]): BygningsBlok[][] {
  const sider: BygningsBlok[][] = [];
  let side: BygningsBlok[] = [];
  let hoejde = 0;
  let plads = SIDEPLADS.foerste;

  for (const blok of blokke) {
    const behov = blokHoejde(blok);
    if (side.length > 0 && hoejde + behov > plads) {
      sider.push(side);
      side = [];
      hoejde = 0;
      plads = SIDEPLADS.senere;
    }
    side.push(blok);
    hoejde += behov;
  }

  if (side.length > 0) sider.push(side);
  return sider;
}
