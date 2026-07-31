/**
 * Maerket, som det skal sta pa hver side i rapporten.
 *
 * Filerne ligger i public/logo/ og er ikke tegnet i kode: et logo hortet
 * efter et skaermbillede rammer aldrig helt, og det her er det forste kunden
 * ser. Slar filen fejl, viser browseren alt-teksten — en rapport med
 * firmanavnet i skrift er bedre end en med et tomt hul.
 *
 * Den hvide udgave er til forsiden, hvor baggrunden er navy. Den morke er
 * til alt andet.
 */
export function Logo({
  hvid = false,
  className = "",
}: {
  hvid?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={hvid ? "/logo/nemscreening-hvid.svg" : "/logo/nemscreening.svg"}
      alt="Nem Screening"
      className={`object-contain ${hvid ? "text-white" : "text-fg"} ${className}`}
    />
  );
}
