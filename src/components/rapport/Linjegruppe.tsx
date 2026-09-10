import { LEVEL_CLASS } from "@/components/lab/ResultatSkema";
import {
  AFFALDSMAERKE_LABEL,
  type Affaldsmaerke,
} from "@/lib/types";
import {
  ressourceLinjeHale,
  ressourceLinjeHoved,
  type RessourceGruppe,
  type Standardtekst,
} from "@/lib/rapport/ressourcer";

/**
 * En bygningsdel med sine linjer — den samme opbygning i begge afsnit.
 *
 * Kunden genkender formen fra siden for: den fede overskrift, og under den de
 * materialer der hoerer til. Forskellen er maerket, som kun de urene linjer
 * baerer.
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
            // linje. Navn og maerke alene er det ikke, nu hvor to rode linjer af
            // samme materiale kan staa ved siden af hinanden med hver sin
            // bortskaffelsestekst.
            key={`${linje.navn}-${linje.maerke ?? ""}-${linje.labels.join(",")}`}
            className="mt-1 first:mt-0"
          >
            <span className="font-medium">
              {visProvenumre ? ressourceLinjeHoved(linje) : linje.navn}
            </span>
            {linje.maerke && (
              <>
                {" "}
                <Maerke maerke={linje.maerke} />
              </>
            )}{" "}
            {ressourceLinjeHale(linje)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Klassen bag hvert maerke.
 *
 * De tre farvede er skemaets egne, sa de to steder ikke kan komme til at sige
 * hver sit. Det neutrale er ikke en farve i skalaen med vilje: det staar paa en
 * prove, laboratoriet ikke har fundet noget i, og en farve ville paastaa noget
 * om et svar, der ikke findes.
 *
 * Navnene staar ordret, sa Tailwind kan finde dem — en klasse sat sammen i en
 * skabelonstreng ville aldrig blive genereret.
 */
export const MAERKE_CLASS: Record<Affaldsmaerke, string> = {
  farligt: LEVEL_CLASS.farligt,
  forurenet: LEVEL_CLASS.forurenet,
  asbest: "level-asbest",
  bortskaffelse: "bg-surface-2 text-muted",
};

/**
 * Fladen bag standardteksten, i maerkets egen kulor.
 *
 * Den binder teksten nederst sammen med maerket paa linjen laengere oppe. Uden
 * den skal laeseren holde et ord op mod et andet ord paa et ark uden anden
 * farve — og saa er de fire tekster lige saa gode som en.
 */
export const MAERKE_FLADE: Record<Affaldsmaerke, string> = {
  farligt: "flade-farligt",
  forurenet: "flade-forurenet",
  asbest: "flade-asbest",
  bortskaffelse: "flade-bortskaffelse",
};

/**
 * Maerket paa en forureningslinje, og det samme maerke i teksten nedenunder.
 *
 * Lille og med tal-luft omkring: det skal kunne laeses inde i en linje uden at
 * bryde den op, praecis som graenserne under skemaet.
 */
export function Maerke({ maerke }: { maerke: Affaldsmaerke }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide ${MAERKE_CLASS[maerke]}`}
    >
      {AFFALDSMAERKE_LABEL[maerke]}
    </span>
  );
}

/**
 * De faelles bortskaffelsestekster, samlet under linjerne.
 *
 * Staar kun naar kontoret har slaaet faelles tekst til. Saa er saetningen den
 * samme for alle materialer, og gentaget paa tredive linjer er den stoej frem
 * for en anvisning — den hoerer hjemme et sted, med maerket foran, sa
 * entreprenoren kan slaa fra linjen til teksten.
 *
 * Kun de affaldstyper, sagen faktisk har. En standardtekst om asbest i en
 * rapport uden asbest er en oplysning om ingenting.
 */
export function Standardtekster({ raekker }: { raekker: Standardtekst[] }) {
  if (raekker.length === 0) return null;

  return (
    <div className="mt-5">
      <h3 className="font-semibold">Standardtekst for affaldstyper</h3>
      <dl className="mt-1 text-sm leading-relaxed">
        {raekker.map((r) => (
          <div
            key={r.maerker.join("-")}
            // Fladen faar farve af det forste maerke. Der er et pr. tekst, nu
            // hvor hvert maerke har sin egen — listen staar, fordi to engang
            // delte.
            className={`mt-2 flex flex-wrap gap-x-4 gap-y-2 rounded-lg px-4 py-3 first:mt-0 sm:flex-nowrap ${MAERKE_FLADE[r.maerker[0]!]}`}
          >
            {/* Maerkerne i en spalte for sig, sa teksterne begynder samme sted
                og kan sammenlignes lodret. */}
            <dt className="flex w-40 shrink-0 flex-wrap items-start gap-1">
              {r.maerker.map((m) => (
                <Maerke key={m} maerke={m} />
              ))}
            </dt>
            <dd className="streg-arvet min-w-0 flex-1 border-l pl-4">
              {r.tekst}
            </dd>
          </div>
        ))}
      </dl>
    </div>
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
