import { Skal } from "@/components/Skal";

/**
 * Kontoret. Indholdet far hele rammens bredde.
 *
 * Rammen er 1480 px, og det tal er ikke tilfaeldigt: analyseskemaet er tegnet
 * til 1480, og bliver der mindre plads, skalerer `TilpasBredde` det ned. Elleve
 * analysekolonner skal kunne overskues uden at rulle — det er hele pointen i at
 * skemaet findes.
 *
 * Navigationen i siden tager 15 rem af det pa en stor skaerm. Det er derfor
 * rammen ikke ogsa polstrer indholdet: hver side saetter sin egen luft.
 */
export default function WideLayout({ children }: { children: React.ReactNode }) {
  return (
    <Skal>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </Skal>
  );
}
