import { MemberGate } from "@/components/MemberGate";

/**
 * Kontoret. Resultater og rapport laeses stort set altid pa en pc, og et
 * skema med elleve analysekolonner har brug for bordet — det er hele
 * pointen i at overblikket kan ses uden at scrolle vandret.
 */
export default function WideLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberGate>
      <div className="mx-auto flex w-full max-w-[92rem] flex-1 flex-col">
        {children}
      </div>
    </MemberGate>
  );
}
