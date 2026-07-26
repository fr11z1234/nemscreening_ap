import { NextResponse, type NextRequest } from "next/server";
import { BbrError, hentBygninger } from "@/lib/bbr/datafordeler";
import { mapBuildings, type BbrBuilding } from "@/lib/bbr/map";

/**
 * Bygningsopslag i BBR.
 *
 * Ligger som server-rute fordi API-noglen aldrig ma na browseren — den sendes
 * som query-parameter og ville ellers sta i klartekst i netvaerksfanen.
 */
export async function GET(request: NextRequest) {
  const husnummer = request.nextUrl.searchParams.get("husnummer")?.trim();
  if (!husnummer) {
    return NextResponse.json(
      { error: "Adressen mangler et husnummer-id." },
      { status: 400 },
    );
  }

  try {
    const rows = await hentBygninger(husnummer);
    return NextResponse.json<BbrBuilding[]>(mapBuildings(rows));
  } catch (err) {
    if (err instanceof BbrError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Uventet fejl ved BBR-opslag." },
      { status: 500 },
    );
  }
}
