import { LEVEL_CLASS } from "@/components/lab/ResultatSkema";
import { LEVEL_LABEL, type LabLevel } from "@/lib/lab/parametre";
import {
  ressourceLinjeHale,
  ressourceLinjeHoved,
  type RessourceGruppe,
} from "@/lib/rapport/ressourcer";

/**
 * En bygningsdel med sine linjer — den samme opbygning i begge afsnit.
 *
 * Kunden genkender formen fra siden for: den fede overskrift, og under den de
 * materialer der hoerer til. Forskellen er niveaumaerket, som kun de urene
 * linjer baerer.
 *
 * Ligger i en fil for sig, fordi materialepanelets preview tegner de samme
 * linjer. Sad den stadig i rapportens side, skulle previewet efterligne den —
 * og to gengivelser af den samme linje ender med at sige hver sit, praecis som
 * skemaets kolonne og rapportens afsnit ville, hvis ikke de spurgte den samme
 * `faktiskHandtering`.
 */
export function Linjegruppe({
  gruppe,
  /**
   * Om linjerne skal navngives med provenummeret frem for materialet.
   *
   * Sat i forureningsafsnittet. Der peger linjen paa en konkret prove, som
   * entreprenoren skal kunne slaa op i analyseskemaet og se malingerne bag —
   * materialenavnet siger ikke hvilket af tre stykker glasseret tegl der var
   * forurenet. Ressourceafsnittet beholder navnene: det er et overblik over
   * hvad bygningen indeholder, og der er navnet hele pointen.
   */
  visProvenumre = false,
}: {
  gruppe: RessourceGruppe;
  visProvenumre?: boolean;
}) {
  return (
    <div className="mt-5">
      <h3 className="font-semibold">{gruppe.overskrift}</h3>
      <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed">
        {gruppe.linjer.map((linje) => (
          <li
            // Provenumrene er entydige: den samme prove kan kun ligge paa en
            // linje. Navn og niveau alene er det ikke, nu hvor to rode linjer af
            // samme materiale kan staa ved siden af hinanden med hver sin
            // bortskaffelsestekst.
            key={`${linje.navn}-${linje.niveau ?? ""}-${linje.labels.join(",")}`}
            className="mt-1 first:mt-0"
          >
            <span className="font-medium">
              {visProvenumre ? ressourceLinjeHoved(linje) : linje.navn}
            </span>
            <Niveaumaerke niveau={linje.niveau} /> {ressourceLinjeHale(linje)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Gult eller rodt maerke pa linjen.
 *
 * Kun nar der er malt noget, og kun for det der ikke er rent: i
 * ressourceafsnittet er alt gront, og et gront maerke pa hver linje ville
 * betyde ingenting. Farverne er skemaets egne, sa de to steder ikke kan komme
 * til at sige hver sit.
 */
function Niveaumaerke({ niveau }: { niveau: LabLevel | null }) {
  if (!niveau || niveau === "rent") return null;
  return (
    <span
      className={`ml-1.5 rounded px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide ${LEVEL_CLASS[niveau]}`}
    >
      {LEVEL_LABEL[niveau]}
    </span>
  );
}

/**
 * Afsnitsoverskrift i rapporten — daempet, sa den ikke kappes om pladsen med
 * sagens navn og provenumrene.
 */
export function Overskrift({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
      {children}
    </h2>
  );
}
