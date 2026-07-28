"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Skalerer for bredt indhold ned, sa det passer i vinduet.
 *
 * Analyseskemaet er bredt af natur — seksten kolonner lader sig ikke presse
 * sammen uden at tallene bliver til noget andet. Alternativet var en vandret
 * rullebjaelke, men et skema man ruller i, er et skema man ikke kan
 * overskue: man kan ikke se provenummeret og asbestkolonnen samtidig, og
 * netop den sammenstilling er hele grunden til at skemaet findes.
 *
 * Derfor staar hele bredden altid pa skaermen, i mindre skrift. Skal et tal
 * laeses, zoomer man ind i browseren — det aendrer ikke skalaen her, kun hvor
 * stort det hele tegnes, og det er den samme handbevaegelse som pa rapporten.
 *
 * Skalaen rammer bredden praecist, sa der er intet at rulle i. `.tilpas`
 * klipper (overflow: hidden) frem for at rulle: browseren regner rulleomradet
 * ud fra indholdets layoutbredde, ikke den skalerede, og ville derfor saette
 * en rullebjaelke pa noget der passer — og den bjaelke ad sig ind i hojden og
 * kappede den nederste raekke.
 *
 * Print rammes ikke: CSS saetter transformen ud af kraft, sa siden fylder
 * papiret.
 */
export function TilpasBredde({
  bredde,
  children,
}: {
  /** Indholdets designbredde i px — den bredde det er tegnet til. */
  bredde: number;
  children: React.ReactNode;
}) {
  const ydre = useRef<HTMLDivElement>(null);
  const indre = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(1);
  const [hojde, setHojde] = useState<number | null>(null);

  useLayoutEffect(() => {
    const ydreEl = ydre.current;
    const indreEl = indre.current;
    if (!ydreEl || !indreEl) return;

    const maal = () => {
      const plads = ydreEl.clientWidth;
      if (plads === 0) return;
      // Ingen nedre graense: skemaet skal passe, hvor smalt vinduet end er.
      // En graense ville betyde at noget blev klippet af, og et halvt
      // analyseskema er vaerre end et lille et.
      const k = Math.min(1, plads / bredde);
      setSkala(k);
      // En transform flytter ikke pladsen i layoutet. Uden en hojde sat i
      // handen ville der sta et hul under skemaet, praecis sa hojt som det
      // der blev skaleret vaek. offsetHeight er layouthojden — den er ikke
      // paavirket af transformen, sa den skal ganges med skalaen selv.
      //
      // De to px oveni er slup: hojden regnes i hele px, og uden dem klipper
      // den nederste graensevaerdiraekke sin egen kant af.
      setHojde(Math.ceil(indreEl.offsetHeight * k) + 2);
    };

    const iagttager = new ResizeObserver(maal);
    iagttager.observe(ydreEl);
    iagttager.observe(indreEl);
    return () => iagttager.disconnect();
  }, [bredde]);

  return (
    <div
      ref={ydre}
      className="tilpas"
      style={hojde === null ? undefined : { height: hojde }}
    >
      <div
        ref={indre}
        className="tilpas-indhold"
        style={{ width: bredde, transform: `scale(${skala})` }}
      >
        {children}
      </div>
    </div>
  );
}
