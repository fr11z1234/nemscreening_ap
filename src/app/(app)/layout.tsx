import { Skal } from "@/components/Skal";

/**
 * Marken. Indholdet holdes i en smal kolonne inde i rammen: den her del er
 * bygget til en telefon i en tom bygning, og fuldbredde-tekstlinjer er
 * ubehagelige at laese.
 *
 * Sagslisten ligger bevidst IKKE her, men i (bred). Den bliver ogsa moedt pa en
 * pc, og en liste over hundrede sager i en kolonne pa 36 rem er spild af et
 * bord. Formularerne — ny sag, BBR, billeder, eksport — hoerer til her.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Skal>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        {children}
      </div>
    </Skal>
  );
}
