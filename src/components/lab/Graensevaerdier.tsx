import {
  GRAENSE_RAEKKER,
  LEVEL_LABEL,
  graenseTekst,
  type LabLevel,
} from "@/lib/lab/parametre";

/**
 * Graensevaerdierne som deres egen side i rapporten.
 *
 * Her ER farven pointen — det er den side der forklarer hvad gront, gult og
 * rodt betyder i skemaet. Det er ogsa grunden til at graenseraekkerne UNDER
 * selve skemaet ikke er farvede: forklaringen hoerer et sted, ikke pa hver
 * eneste side.
 *
 * Tallene kommer fra LAB_PARAMETERS. Se GRAENSE_RAEKKER i parametre.ts for
 * hvorfor raekkefolgen er en anden end skemaets.
 */

const LEVEL_CLASS: Record<LabLevel, string> = {
  rent: "level-rent",
  forurenet: "level-forurenet",
  farligt: "level-farligt",
};

const NIVEAUER: LabLevel[] = ["rent", "forurenet", "farligt"];

export function Graensevaerdier() {
  return (
    <table className="graenser">
      <thead>
        <tr>
          <th>Grænseværdier</th>
          {NIVEAUER.map((level) => (
            <th key={level}>{LEVEL_LABEL[level]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {GRAENSE_RAEKKER.map((raekke) => (
          <tr key={raekke.navn}>
            <td>{raekke.navn}</td>
            {NIVEAUER.map((level) => (
              <td key={level} className={`tabular ${LEVEL_CLASS[level]}`}>
                {graenseTekst(raekke, level)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
