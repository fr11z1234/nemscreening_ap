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
};

/** Resultatraekken som den ligger i databasen: en tekst pr. parameter. */
export type SkemaResult = Partial<Record<LabParameterKey, string | null>>;

/** Tailwind skal kunne se klassenavnene, sa de star ordret. */
const LEVEL_CLASS: Record<LabLevel, string> = {
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
 * Bredden er sat efter den laengste kolonneoverskrift, "Chlorerede
 * paraffiner": under den her braekker ordet midt over. Er der mindre plads pa
 * skaermen, skaleres hele skemaet ned — se TilpasBredde — frem for at
 * kolonnerne klemmes hver for sig.
 */
export const SKEMA_BREDDE = 1480;

/**
 * Kolonnebredder i procent af skemaet.
 *
 * Procent og ikke px, fordi det samme skema skal passe bade i designbredden
 * pa skaermen og i papirets bredde, hvor der ikke skaleres.
 */
const NAVNEKOLONNER = [5, 11.5, 9, 8, 5.5];
const ANALYSEKOLONNE =
  (100 - NAVNEKOLONNER.reduce((sum, n) => sum + n, 0)) / LAB_PARAMETERS.length;

export function ResultatSkema({
  samples,
  results,
  showThresholds = true,
}: {
  samples: SkemaSample[];
  results: Map<string, SkemaResult>;
  showThresholds?: boolean;
}) {
  return (
    <div className="skema-ramme">
      <table className="skema">
        <colgroup>
          {NAVNEKOLONNER.map((andel, i) => (
            <col key={i} style={{ width: `${andel}%` }} />
          ))}
          {LAB_PARAMETERS.map((p) => (
            <col key={p.key} style={{ width: `${ANALYSEKOLONNE}%` }} />
          ))}
        </colgroup>

        <thead>
          <tr>
            <th>Prøvenr.</th>
            <th>Materiale</th>
            <th>Prøveart</th>
            <th>Lokalitet</th>
            <th className="skel text-right">Est. ton</th>
            {LAB_PARAMETERS.map((p) => (
              <th key={p.key} className="text-right">
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
            return (
              <tr key={sample.id}>
                <td className="tabular font-semibold">{sample.label}</td>
                <td className="font-medium">{sample.material ?? "—"}</td>
                <td className="text-muted">{sample.sample_type ?? "—"}</td>
                <td className="text-muted">{sample.building_label ?? "—"}</td>
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
                <td className="skel font-medium text-fg-2" colSpan={5}>
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
export function SkemaForklaring() {
  return (
    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
      <Forklaring term="I.a." desc="Ikke analyseret" />
      <Forklaring term="I.P." desc="Ikke påvist" />
      <Forklaring term="<" desc="Under detektionsgrænsen" />
      <Forklaring term="Enhed" desc="mg/kg, med mindre andet er angivet" />
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

