import { NextResponse, type NextRequest } from "next/server";

/**
 * Adressesogning via Klimadatastyrelsens Adressevaelger.
 *
 * DAWA lukkede 1. oktober 2026 og svarer nu 410 pa alt. Adressevaelgeren er
 * den officielle afloeser for DAWA's autocomplete:
 * https://confluence.sdfi.dk/pages/viewpage.action?pageId=244318431
 *
 * Id'et er stadig DAR-husnummerets id_lokalId, praecis som DAWA's
 * adgangsadresse-id var. Derfor virker BBR-opslaget uaendret, og derfor
 * hedder kolonnen stadig `dawa_adgangsadresse_id` — det er det samme id.
 *
 * Ligger som proxy frem for et direkte kald fra browseren, fordi svaret sa kan
 * caches pa tvaers af screenere og formen pa dataen kan skaeres til her i
 * stedet for i UI'et.
 */

/**
 * Tokenet er obligatorisk, men der er endnu ingen brugerstyring: KDS beder
 * alle sende den samme streng, sa overgangen bliver nem, nar brugerstyringen
 * kommer (ventet ultimo 2026 eller primo 2027). Derfor kan den overskrives fra
 * miljoet — sa er skiftet en variabel og ikke en rettelse i koden.
 */
const TOKEN = process.env.ADRESSEVAELGER_TOKEN || "adressevaelger123";

/**
 * Soegningen er TRINVIS, ligesom DAWA's var.
 *
 * Pa "fridtjo" svarer den med vejnavne, pa "fridtjof nansens" med vej og
 * postnummer, og forst nar soegningen er snaever nok ("fridtjof nansens vej
 * 3") kommer der husnumre med id. Kun et husnummer har noget at sla op i BBR
 * pa — resten er indsnaevringer, og de er skilt ad her, hvor forskellen kan
 * ses, i stedet for i UI'et.
 */
export type AddressSuggestion =
  | {
      slags: "indsnaevring";
      /** Det der star i listen. */
      tekst: string;
      /** Det der skrives i feltet, nar forslaget vaelges. */
      soeg: string;
      /** Hvor markoeren skal sta bagefter: der hvor det manglende skrives. */
      markoer: number;
      mangler: "husnummer" | "postnummer";
    }
  | {
      slags: "adresse";
      /** DAR-husnummerets id. Bruges som husnummer-id ved BBR-opslaget. */
      id: string;
      tekst: string;
      vejnavn: string;
      husnr: string;
      postnr: string;
      postnrnavn: string;
    };

/** Kun en adresse kan vaelges. En indsnaevring er ikke et valg. */
export type AddressPick = Extract<AddressSuggestion, { slags: "adresse" }>;

/**
 * Feltnavnene staves ikke ens pa tvaers af typerne — `vejNavn` pa et vejnavn,
 * `vejnavn` pa et husnummer. Det er Adressevaelgerens, ikke en tastefejl.
 */
type Fund = {
  type: string;
  id?: string;
  titel: string;
  vejnavn?: string;
  vejNavn?: string;
  husnummer?: string;
  husNummer?: string;
  postnr?: string;
  postdistrikt?: string;
};

type Svar = { status: string; beskrivelse?: string; fund?: Fund[] };

/**
 * Et husnummer har intet postnummer-felt; det star kun i titlen, som er DAR's
 * adgangsadressebetegnelse: "Vej 3, [supplerende bynavn, ]8200 Aarhus N".
 * Postnummeret er altid det sidste led.
 */
function postnummerAfTitel(titel: string) {
  const m = /,\s*(\d{4})\s+([^,]+)$/.exec(titel);
  return m ? { postnr: m[1], postnrnavn: m[2].trim() } : null;
}

function tilForslag(f: Fund): AddressSuggestion | null {
  const vej = f.vejnavn ?? f.vejNavn ?? "";

  switch (f.type) {
    case "husnummer": {
      // Uden id er der ingenting at haenge et BBR-opslag pa, og uden
      // postnummer bliver sagen oprettet uden by.
      const post = postnummerAfTitel(f.titel);
      if (!f.id || !post) {
        return {
          slags: "indsnaevring",
          tekst: f.titel,
          soeg: `${f.titel}, `,
          markoer: f.titel.length + 2,
          mangler: "postnummer",
        };
      }
      return {
        slags: "adresse",
        id: f.id,
        tekst: f.titel,
        vejnavn: vej,
        husnr: f.husnummer ?? f.husNummer ?? "",
        ...post,
      };
    }

    case "vejnavn":
      return {
        slags: "indsnaevring",
        tekst: f.titel,
        soeg: `${vej} `,
        markoer: vej.length + 1,
        mangler: "husnummer",
      };

    /*
     * Vejen i et bestemt postnummer. Postnummeret skal blive staende i feltet:
     * "Nørrebrogade 12" alene giver Nørrebrogade 12 i seks byer, og den
     * screeneren valgte, var maaske ikke blandt de otte der vises. Markoeren
     * sattes foran kommaet, sa husnummeret skrives ind pa sin plads.
     *
     * Kommaet skal efterfoelges af et mellemrum; uden det finder
     * Adressevaelgeren ingenting (kendt fejl nr. 6 hos KDS).
     */
    case "navngivenvejpostnummer": {
      if (!f.postnr) return null;
      const post = `${f.postnr} ${f.postdistrikt ?? ""}`.trim();
      return {
        slags: "indsnaevring",
        tekst: `${vej}, ${post}`,
        soeg: `${vej} , ${post}`,
        markoer: vej.length + 1,
        mangler: "husnummer",
      };
    }

    // For mange byer har samme vej og nummer; det er postnummeret der mangler.
    case "vejnavnhusnummer":
      return {
        slags: "indsnaevring",
        tekst: f.titel,
        soeg: `${f.titel}, `,
        markoer: f.titel.length + 2,
        mangler: "postnummer",
      };

    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json<AddressSuggestion[]>([]);

  const url = new URL("https://adressevaelger.dk/husnumre/soeg");
  url.searchParams.set("tekst", q);
  url.searchParams.set("maksimum", "8");
  url.searchParams.set("token", TOKEN);

  try {
    const res = await fetch(url, {
      // Adresser aendrer sig sjaeldent — KDS opdaterer en gang i doegnet — og
      // screenere pa samme vej rammer de samme praefikser igen og igen.
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Adressevælgeren svarede ${res.status}` },
        { status: 502 },
      );
    }

    const svar = (await res.json()) as Svar;
    if (svar.status !== "ok") {
      return NextResponse.json(
        { error: svar.beskrivelse || "Adressevælgeren afviste søgningen" },
        { status: 502 },
      );
    }

    return NextResponse.json<AddressSuggestion[]>(
      (svar.fund ?? [])
        .map(tilForslag)
        .filter((s): s is AddressSuggestion => s !== null),
    );
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke nå adressetjenesten" },
      { status: 502 },
    );
  }
}
