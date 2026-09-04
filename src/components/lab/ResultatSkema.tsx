import {
  classify,
  displayValue,
  LAB_PARAMETERS,
  LEVEL_LABEL,
  readValue,
  thresholdText,
  worstLevel,
  type LabLevel,
  type LabParameterKey,
} from "@/lib/lab/parametre";
import {
  faktiskHandtering,
  RESOURCE_HANDLING_LABEL,
  type ResourceHandling,
} from "@/lib/types";

/**
 * Analyseskemaet, som screenerne kender det fra regnearket.
 *
 * En raekke pr. prove, elleve analysekolonner, og graenserne nederst. Det er
 * det samme skema pa skaermen og i rapporten — der skal ikke vaere to
 * versioner der kan komme til at sige hver sit.
 *
 * Selve stregerne og raekkehojderne ligger i `.skema` i `globals.css`, sa de
 * kun beskrives et sted.
 */

export type SkemaSample = {
  id: string;
  label: string;
  material: string | null;
  sample_type: string | null;
  building_label: string | null;
  estimated_tons: number | null;
  /** Kun udfyldt pa en selektiv nedrivning. Se `visRessourcer`. */
  material_condition?: number | null;
  resource_handling?: ResourceHandling | null;
};

/** Resultatraekken som den ligger i databasen: en tekst pr. parameter. */
export type SkemaResult = Partial<Record<LabParameterKey, string | null>>;

/**
 * Tailwind skal kunne se klassenavnene, sa de star ordret.
 *
 * Eksporteret, sa rapportens forureningsafsnit kan bruge de samme tre farver som
 * skemaet. To steder med hver sin gule nuance ville betyde, at farven holdt op
 * med at vaere et facit.
 */
export const LEVEL_CLASS: Record<LabLevel, string> = {
  rent: "level-rent",
  forurenet: "level-forurenet",
  farligt: "level-farligt",
};

export function levelOfSample(result: SkemaResult | undefined): LabLevel | null {
  if (!result) return null;
  return worstLevel(
    LAB_PARAMETERS.map((p) => classify(p, readValue(result[p.key] ?? null))),
  );
}

/**
 * Om Eurofins har svaret «Pavist» pa asbest i netop denne prove.
 *
 * Ikke det samme som at proven er rod: bly over graensen gor den ogsa rod. Det
 * er forskellen, der afgor om rapporten skriver asbestteksten, og den kan kun
 * laeses af asbestcellen selv — se `bortskaffelsestekst` i types.ts.
 */
export function asbestPaavist(result: SkemaResult | undefined): boolean {
  if (!result) return false;
  return readValue(result.asbestos ?? null).state === "pavist";
}

export function LevelBadge({
  level,
  erLabprove = true,
}: {
  level: LabLevel | null;
  /**
   * Om proven overhovedet er sendt til laboratoriet.
   *
   * En kortlagt prove uden analyse far aldrig et svar, sa "Afventer svar"
   * ville love noget der ikke kommer — og fa kontoret til at lede efter en
   * raekke i Eurofins' fil der ikke findes.
   */
  erLabprove?: boolean;
}) {
  if (!level) {
    return (
      <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-medium text-muted">
        {erLabprove ? "Afventer svar" : "Ubehandlet"}
      </span>
    );
  }
  return (
    <span
      className={`rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide ${LEVEL_CLASS[level]}`}
    >
      {LEVEL_LABEL[level]}
    </span>
  );
}

/**
 * Skemaets designbredde i px.
 *
 * Den var sat efter den laengste kolonneoverskrift, "Chlorerede paraffiner",
 * dengang overskrifterne laa ned. Rejst op fylder de ingen bredde, og saa er
 * det papiret der bestemmer: arket giver skemaet 186 mm, og skriften skal
 * staa lige saa stort pa skaermen som den kommer ud af printeren. 13 px paa
 * skaermen skaleret ned i en 21 cm bred side rammer papirets 10 px ved
 * omkring 915 — se TilpasBredde.
 *
 * Er skaermen smallere, skaleres hele skemaet ned frem for at kolonnerne
 * klemmes hver for sig.
 */
export const SKEMA_BREDDE = 915;

/**
 * Designbredden pa kontorets resultatside.
 *
 * Den side skal ikke ligne papir — den skal bruges. Skemaet far hele bordet,
 * og skriften bliver derefter. Rapporten er bundet til arkets 186 mm; det er
 * denne her ikke.
 */
export const SKEMA_BREDDE_SKAERM = 1480;

/**
 * Kolonnebredder i procent af skemaet.
 *
 * Procent og ikke px, fordi det samme skema skal passe bade i designbredden
 * pa skaermen og i papirets bredde, hvor der ikke skaleres.
 *
 * Provenr., Materiale, Proveart, Lokalitet, Est. ton.
 */
export const NAVNEKOLONNER = [5, 11.5, 9, 8, 5.5];

/**
 * Det samme skema med de to selektive kolonner: Materiale stand og
 * Ressourcehandtering, indsat mellem Lokalitet og Est. ton som i regnearket.
 *
 * REGNESTYKKET, og det ma ikke rores uden at en rapport med et FULDT skema
 * printes bagefter:
 *
 * Arket giver skemaet 186 mm. I dag deler de elleve analysekolonner 61 % af
 * dem — 10,31 mm hver — og med 0,2 rem sideluft i hver side gar 1,7 mm til
 * luft. Der er altsa 8,6 mm til tallet, og «< 2500» skal have 9,2 mm... nej:
 * malt den anden vej rundt er der 32,6 px indhold ved 10 px skrift, og det er
 * praecis hvad «< 2500» kraever. Slupen er under en millimeter.
 *
 * De to nye kolonner kan derfor ikke tages af analysekolonnerne alene. I
 * stedet skrues sideluften ned til 0,15 rem (`.skema-selektiv` i globals.css),
 * og det er den, der betaler: 0,05 rem sparet i atten kolonners to sider giver
 * 1,8 rem = 7,6 mm tilbage til indhold. Regnet igennem far en analysekolonne
 * 5,318 % = 9,89 mm, minus 4,8 px luft = 32,6 px indhold. Altsaa PRAECIS lige
 * saa meget plads til tallet som i dag.
 *
 * Handteringskolonnen er 6 %, fordi «Genbrug» skal kunne staa pa en linje;
 * «Genanvendelse» og «Bortskaffelse» braekker til to, og det koster ingen
 * hojde, fordi hver raekke alligevel er mindst to linjer hoj. Standkolonnen er
 * 3 % — cellen er et ciffer, men et lodret hoved skal have plads til sin egen
 * linjehojde, og under 2,6 % kan overskriften ikke sta.
 */
export const NAVNEKOLONNER_SELEKTIV = [4, 9, 7, 8, 3, 6, 4.5];

export const analysekolonne = (navne: number[]) =>
  (100 - navne.reduce((sum, n) => sum + n, 0)) / LAB_PARAMETERS.length;

export function ResultatSkema({
  samples,
  results,
  showThresholds = true,
  visRessourcer = false,
}: {
  samples: SkemaSample[];
  results: Map<string, SkemaResult>;
  showThresholds?: boolean;
  /**
   * Tag Materiale stand og Ressourcehandtering med.
   *
   * Kun pa en selektiv nedrivning: pa en almindelig miljoscreening er
   * felterne tomme, og to tomme kolonner ville tage plads fra tallene uden at
   * sige noget. Skemaet skal ogsa blive ved med at vaere praecis det samme,
   * som det altid har vaeret, pa de sager der fandtes for.
   */
  visRessourcer?: boolean;
}) {
  const navnekolonner = visRessourcer
    ? NAVNEKOLONNER_SELEKTIV
    : NAVNEKOLONNER;
  const analysebredde = analysekolonne(navnekolonner);

  return (
    <div className="skema-ramme">
      <table className={`skema${visRessourcer ? " skema-selektiv" : ""}`}>
        <colgroup>
          {navnekolonner.map((andel, i) => (
            <col key={i} style={{ width: `${andel}%` }} />
          ))}
          {LAB_PARAMETERS.map((p) => (
            <col key={p.key} style={{ width: `${analysebredde}%` }} />
          ))}
        </colgroup>

        <thead>
          <tr>
            <th>Prøvenr.</th>
            <th>Materiale</th>
            <th>Prøveart</th>
            <th>Lokalitet</th>
            {visRessourcer && (
              <>
                <th>Materiale stand</th>
                {/* Regnearket skriver «Miljø & Ressourcehåndtering». Forkortet
                    her, fordi et lodret hoved kun har 11 em: den fulde titel
                    braekker til to lodrette linjer, og de koster bredde i
                    netop den kolonne, hvor ordene skal staa. */}
                <th>Ressourcehåndtering</th>
              </>
            )}
            {/* Ingen text-align her: hovedet staar op, og hvor teksten
                begynder styres af `.skema thead th` — en vandret klasse ville
                betyde noget andet end den ser ud til. */}
            <th className="skel">Est. ton</th>
            {LAB_PARAMETERS.map((p) => (
              <th key={p.key}>
                {p.label}
                {p.unit && (
                  <span className="block font-normal text-muted">{p.unit}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {samples.map((sample) => {
            const result = results.get(sample.id);
            /*
             * Handteringen som den gaelder efter laboratoriets svar.
             *
             * Screeneren kan have skrevet genbrug pa proven, for der var et
             * svar. Er svaret gult eller rodt, staar der bortskaffelse her — den
             * samme regel som flytter linjen til forureningsafsnittet i
             * rapporten. Ellers ville skemaet og afsnittet sige hver sit om den
             * samme prove, og laeseren ville ikke vide hvem der havde ret.
             */
            const handling = faktiskHandtering(
              sample.resource_handling ?? null,
              levelOfSample(result),
            );
            return (
              <tr key={sample.id}>
                <td className="tabular font-semibold">{sample.label}</td>
                <td className="font-medium">{sample.material ?? "—"}</td>
                <td className="text-muted">{sample.sample_type ?? "—"}</td>
                <td className="text-muted">{sample.building_label ?? "—"}</td>
                {visRessourcer && (
                  <>
                    <td className="tabular text-center text-muted">
                      {sample.material_condition ?? "—"}
                    </td>
                    <td className="text-muted">
                      {handling ? RESOURCE_HANDLING_LABEL[handling] : "—"}
                    </td>
                  </>
                )}
                <td className="skel tabular text-right text-muted">
                  {sample.estimated_tons != null
                    ? String(sample.estimated_tons).replace(".", ",")
                    : "—"}
                </td>

                {LAB_PARAMETERS.map((p) => {
                  const value = readValue(result?.[p.key] ?? null);
                  const level = classify(p, value);
                  return (
                    <td
                      key={p.key}
                      className={`tabular text-right ${
                        level ? LEVEL_CLASS[level] : "text-muted"
                      }`}
                    >
                      {displayValue(value)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>

        {/* Graenserne er en forklaring, ikke en maaling, og de star pa hver
            eneste side i rapporten. Farvede man dem, ville hver side have
            rodt og gult pa sig, og farven i provens egne felter ville holde
            op med at betyde noget. Prikken holder koblingen mellem niveau og
            farve — den fylder ingenting. Hojden ligger i `.skema tfoot`. */}
        {showThresholds && (
          <tfoot>
            {(["rent", "forurenet", "farligt"] as LabLevel[]).map((level) => (
              <tr key={level}>
                <td
                  className="skel font-medium text-fg-2"
                  colSpan={navnekolonner.length}
                >
                  <span
                    className={`mr-1.5 inline-block h-[0.6em] w-[0.6em] rounded-full align-middle ${LEVEL_CLASS[level]}`}
                  />
                  {LEVEL_LABEL[level]}
                </td>
                {LAB_PARAMETERS.map((p) => (
                  <td key={p.key} className="tabular text-right text-muted">
                    {thresholdText(p, level)}
                  </td>
                ))}
              </tr>
            ))}
          </tfoot>
        )}
      </table>
    </div>
  );
}

/** Forklaringen der altid har staet under skemaet. */
export function SkemaForklaring({
  visRessourcer = false,
}: {
  visRessourcer?: boolean;
}) {
  return (
    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
      <Forklaring term="I.a." desc="Ikke analyseret" />
      <Forklaring term="I.P." desc="Ikke påvist" />
      <Forklaring term="<" desc="Under detektionsgrænsen" />
      <Forklaring term="Enhed" desc="mg/kg, med mindre andet er angivet" />
      {/* Standen staar som et ciffer i skemaet, fordi kolonnen ikke kan
          rumme ordet. Uden skalaen her ville "3" ikke betyde noget. */}
      {visRessourcer && (
        <Forklaring
          term="Stand"
          desc="1 fremragende, 2 god, 3 middel, 4 ringe, 5 dårlig"
        />
      )}
    </dl>
  );
}

function Forklaring({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="font-medium text-fg-2">{term}</dt>
      <dd>{desc}</dd>
    </div>
  );
}

