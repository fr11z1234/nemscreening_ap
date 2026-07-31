/**
 * Maerket, som det staar i rapportens sidehoved og pa forsiden.
 *
 * En fil og ikke to: mintet er lyst nok til at baere bade pa hvidt papir og
 * pa forsidens morke billede, sa der er ingen hvid udgave at holde ajour.
 *
 * Filen er 384 px bred. Ved de hojder den bruges i — 28 px i hovedet, 44 px
 * pa forsiden — svarer det til over 200 dpi pa papir, sa den kan taale at
 * blive printet. Skal den vaesentligt storre, skal der en SVG til.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo/logo-klar.png"
      alt="Nem Screening"
      className={`object-contain ${className}`}
    />
  );
}
