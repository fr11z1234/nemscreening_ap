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
export type AddressSuggestion = {
  /** Adgangsadressens id. Bruges som husnummer-id ved BBR-opslaget. */
  id: string;
  tekst: string;
  vejnavn: string;
  husnr: string;
  postnr: string;
  postnrnavn: string;
};

type DawaItem = {
  tekst: string;
  data: {
    id: string;
    vejnavn: string;
    husnr: string;
    postnr: string;
    postnrnavn: string;
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
      items.map((i) => ({
        id: i.data.id,
        tekst: i.tekst,
        vejnavn: i.data.vejnavn,
        husnr: i.data.husnr,
        postnr: i.data.postnr,
        postnrnavn: i.data.postnrnavn,
      })),
    );
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke nå adressetjenesten" },
      { status: 502 },
    );
  }
}
