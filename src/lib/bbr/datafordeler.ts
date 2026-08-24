import "server-only";

/**
 * Alt Datafordeler-specifikt ligger her.
 *
 * Vi bruger BBR GraphQL — ikke den gamle REST-tjeneste, som udfases ultimo
 * 2026. GraphQL autentificerer med en API-nogle fra et IT-system oprettet i
 * Datafordelerens administration, sendt som query-parameteren `apiKey`.
 * REST-tjenesten bruger derimod en tjenestebruger med username/password; de to
 * modeller kan ikke blandes.
 */

const ENDPOINT = "https://graphql.datafordeler.dk/BBR/v3";

export class BbrError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type BbrBuildingRaw = {
  id_lokalId: string | null;
  byg007Bygningsnummer: number | null;
  byg021BygningensAnvendelse: string | null;
  byg026Opfoerelsesaar: number | null;
  byg027OmTilbygningsaar: number | null;
  byg038SamletBygningsareal: number | null;
  byg039BygningensSamledeBoligAreal: number | null;
  byg041BebyggetAreal: number | null;
  /**
   * Felterne bag rapportens bygningsoversigt.
   *
   * De tre materiale- og varmefelter er kodelister — BBR svarer med "1" og
   * ikke med "Mursten". Oversaettelsen ligger i ./map.ts.
   *
   * Ydervaeg og tag er ikke kun oplysninger til rapporten: koden 3 hedder
   * «Fibercement herunder asbest», og den siger altsa for besoeget, at der kan
   * vaere asbest i facaden eller taget.
   */
  byg032YdervaeggensMateriale: string | null;
  byg033Tagdaekningsmateriale: string | null;
  byg054AntalEtager: number | null;
  byg056Varmeinstallation: string | null;
};

/**
 * BBR er bitemporalt. Bade registreringstid og virkningstid skal saettes —
 * med kun den ene returneres samme bygning en gang pr. historisk registrering,
 * med forskellige arealer i hver kopi.
 *
 * status "6" er en opfort bygning. Uden det filter kommer ogsa projekterede og
 * ophorte bygninger med, og de har typisk tomme felter.
 */
const QUERY = `query Bygninger($hus: String!, $nu: DafDateTime!) {
  BBR_Bygning(
    registreringstid: $nu
    virkningstid: $nu
    first: 100
    where: { husnummer: { eq: $hus }, status: { eq: "6" } }
  ) {
    nodes {
      id_lokalId
      byg007Bygningsnummer
      byg021BygningensAnvendelse
      byg026Opfoerelsesaar
      byg027OmTilbygningsaar
      byg038SamletBygningsareal
      byg039BygningensSamledeBoligAreal
      byg041BebyggetAreal
      byg032YdervaeggensMateriale
      byg033Tagdaekningsmateriale
      byg054AntalEtager
      byg056Varmeinstallation
    }
  }
}`;

type GraphQLResponse = {
  data?: { BBR_Bygning?: { nodes?: BbrBuildingRaw[] } };
  errors?: { message: string }[];
};

export async function hentBygninger(
  husnummerId: string,
): Promise<BbrBuildingRaw[]> {
  const apiKey = process.env.DATAFORDELER_API_KEY;
  if (!apiKey) {
    throw new BbrError(
      "Datafordeler-adgang mangler. Sæt DATAFORDELER_API_KEY.",
      503,
    );
  }

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?apiKey=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: QUERY,
        variables: { hus: husnummerId, nu: new Date().toISOString() },
      }),
      // BBR-data aendrer sig sjaeldent, og screeneren rammer typisk den samme
      // adresse et par gange mens oplysningerne gennemgas.
      next: { revalidate: 3600 },
    });
  } catch {
    throw new BbrError("Kunne ikke nå Datafordeleren.", 502);
  }

  if (res.status === 401 || res.status === 403) {
    throw new BbrError("Datafordeleren afviste API-nøglen.", 502);
  }
  if (!res.ok) {
    throw new BbrError(`Datafordeleren svarede ${res.status}.`, 502);
  }

  const body = (await res.json()) as GraphQLResponse;
  if (body.errors?.length) {
    throw new BbrError(
      `Datafordeleren afviste forespørgslen: ${body.errors[0].message}`,
      502,
    );
  }

  return body.data?.BBR_Bygning?.nodes ?? [];
}
