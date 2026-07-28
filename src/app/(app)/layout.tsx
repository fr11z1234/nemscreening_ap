import { MemberGate } from "@/components/MemberGate";

/**
 * Marken. Indholdet holdes i en centreret kolonne: den her del er bygget til
 * en telefon i en tom bygning, og fuldbredde-tekstlinjer er ubehagelige at
 * laese.
 *
 * Resultatdelen ligger i (bred) i stedet — den laeses pa kontoret.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberGate>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col border-border sm:border-x">
        {children}
      </div>
    </MemberGate>
  );
}
