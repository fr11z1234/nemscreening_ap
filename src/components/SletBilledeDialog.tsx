"use client";

import { SletDialog } from "./SletDialog";

/**
 * Bekraeftelse af et enkelt billede.
 *
 * Ingen flueben: det der forsvinder er praecis det billede, der blev trykket
 * pa. Det staar i dialogen, sa man kan se at det er det rigtige af de to.
 * Og en dialog i siden frem for window.confirm, som satte sogeren paa pause
 * bag sig.
 */
export function SletBilledeDialog({
  url,
  onSlet,
  onLuk,
}: {
  url: string;
  onSlet: () => Promise<string | null>;
  onLuk: () => void;
}) {
  return (
    <SletDialog
      titel="Slet billedet?"
      indledning="Det kan ikke fortrydes — og et billede kan ikke tages om, når du er kørt fra adressen."
      lag={[]}
      sletTekst="Slet billedet"
      onSlet={onSlet}
      onLuk={onLuk}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Billedet der slettes"
        className="mt-4 max-h-[45vh] w-full rounded-xl bg-surface-2 object-contain"
      />
    </SletDialog>
  );
}
