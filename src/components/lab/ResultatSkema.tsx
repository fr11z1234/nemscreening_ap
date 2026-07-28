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

export function LevelBadge({ level }: { level: LabLevel | null }) {
  if (!level) {
    return (
      <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-medium text-muted">
        Afventer svar
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
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border-strong text-left align-bottom">
            <Th className="w-16">Prøvenr.</Th>
            <Th className="min-w-40">Materiale</Th>
            <Th className="min-w-32">Prøveart</Th>
            <Th className="min-w-28">Lokalitet</Th>
            <Th className="w-20 text-right">Est. ton</Th>
            {LAB_PARAMETERS.map((p) => (
              <Th key={p.key} className="w-20 text-right">
                {p.label}
                {p.unit && (
                  <span className="block font-normal text-muted">{p.unit}</span>
                )}
              </Th>
            ))}
          </tr>
        </thead>

        <tbody>
          {samples.map((sample) => {
            const result = results.get(sample.id);
            return (
              <tr key={sample.id} className="border-b border-border">
                <Td className="font-semibold">{sample.label}</Td>
                <Td>{sample.material ?? "—"}</Td>
                <Td className="text-muted">{sample.sample_type ?? "—"}</Td>
                <Td className="text-muted">{sample.building_label ?? "—"}</Td>
                <Td className="tabular text-right text-muted">
                  {sample.estimated_tons != null
                    ? String(sample.estimated_tons).replace(".", ",")
                    : "—"}
                </Td>

                {LAB_PARAMETERS.map((p) => {
                  const value = readValue(result?.[p.key] ?? null);
                  const level = classify(p, value);
                  return (
                    <Td
                      key={p.key}
                      className={`tabular whitespace-nowrap text-right ${
                        level ? LEVEL_CLASS[level] : "text-muted"
                      }`}
                    >
                      {displayValue(value)}
                    </Td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>

        {showThresholds && (
          <tfoot className="text-xs">
            {(["rent", "forurenet", "farligt"] as LabLevel[]).map((level) => (
              <tr key={level} className="border-b border-border">
                <Td className="whitespace-nowrap font-medium" colSpan={5}>
                  {LEVEL_LABEL[level]}
                </Td>
                {LAB_PARAMETERS.map((p) => (
                  <Td
                    key={p.key}
                    className={`tabular whitespace-nowrap text-right ${LEVEL_CLASS[level]}`}
                  >
                    {thresholdText(p, level)}
                  </Td>
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

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-2 py-2 align-bottom font-medium ${className}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-2 py-1.5 ${className}`}>
      {children}
    </td>
  );
}
