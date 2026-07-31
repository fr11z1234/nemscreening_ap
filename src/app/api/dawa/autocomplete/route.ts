import { NextResponse, type NextRequest } from "next/server";

/**
 * Adressesogning via DAWA (Danmarks Adressers Web API).
 *
 * Ligger som proxy frem for et direkte kald fra browseren, fordi svaret sa kan
 * caches pa tvaers af screenere og formen pa dataen kan skaeres til her i
 * stedet for i UI'et.
 *
 * DAWA kraever ingen noglen og er gratis. Bemaerk at DAWA's egne BBR-data blev
 * lukket i april 2024 — bygningsoplysninger hentes separat via Datafordeleren.
 */
/**
 * DAWA's autocomplete er TRINVIS.
 *
 * Pa "aastrupvej" svarer den med vejnavne — ikke adresser — ogsa selv om vi
 * beder om type=adgangsadresse. Forst nar soegningen er snaever nok
 * ("aastrupvej 90") kommer de rigtige adresser med id og postnummer.
 *
 * De to slags ligner hinanden i svaret, men et vejnavn har hverken id eller
 * postnummer. Blander man dem sammen, far man en sag uden adresse-id, og sa
 * er der ingenting at sla op i BBR bagefter. Derfor er de to slags skilt ad
 * her, hvor forskellen kan ses, i stedet for i UI'et.
 */
export type AddressSuggestion =
  | {
      slags: "vejnavn";
      /** Slutter med et mellemrum, sa der kan soeges videre pa husnummeret. */
      tekst: string;
    }
  | {
      slags: "adresse";
      /** Adgangsadressens id. Bruges som husnummer-id ved BBR-opslaget. */
      id: string;
      tekst: string;
      vejnavn: string;
      husnr: string;
      postnr: string;
      postnrnavn: string;
    };

/** Kun en adresse kan vaelges. Et vejnavn er en indsnaevring, ikke et valg. */
export type AddressPick = Extract<AddressSuggestion, { slags: "adresse" }>;

type DawaItem = {
  type: string;
  tekst: string;
  data: {
    id?: string;
    vejnavn?: string;
    husnr?: string;
    postnr?: string;
    postnrnavn?: string;
  };
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json<AddressSuggestion[]>([]);

  const url = new URL("https://api.dataforsyningen.dk/autocomplete");
  url.searchParams.set("q", q);
  url.searchParams.set("type", "adgangsadresse");
  url.searchParams.set("per_side", "8");

  try {
    const res = await fetch(url, {
      // Adresser aendrer sig sjaeldent, og screenere pa samme vej rammer de
      // samme praefikser igen og igen.
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `DAWA svarede ${res.status}` },
        { status: 502 },
      );
    }

    const items = (await res.json()) as DawaItem[];
    return NextResponse.json<AddressSuggestion[]>(
      items.map((i) => {
        // Id'et afgor det, ikke typen: mangler det, er der ingenting at
        // haenge et BBR-opslag pa, og sa er forslaget en indsnaevring.
        const d = i.data;
        if (i.type !== "adgangsadresse" || !d.id || !d.postnr) {
          return { slags: "vejnavn", tekst: i.tekst };
        }
        return {
          slags: "adresse",
          id: d.id,
          tekst: i.tekst,
          vejnavn: d.vejnavn ?? "",
          husnr: d.husnr ?? "",
          postnr: d.postnr,
          postnrnavn: d.postnrnavn ?? "",
        };
      }),
    );
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke nå adressetjenesten" },
      { status: 502 },
    );
  }
}
