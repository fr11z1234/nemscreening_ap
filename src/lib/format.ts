const dateFmt = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/**
 * Screenere skriver "0,4" — ikke "0.4". Baade komma og punktum accepteres ved
 * indtastning, men tal vises altid med dansk komma.
 */
export function parseDecimal(input: string): number | null {
  const cleaned = input.trim().replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(".", ",");
}

const heltalFmt = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 });

/**
 * Hele tal med dansk tusindtalsskilletegn: 42000 bliver "42.000".
 *
 * Maengderne i ressourcescreeningen star i kilo og bliver store. Uden
 * skilletegn er 42000 og 4200 svaere at skelne pa en side med tyve linjer.
 */
export function formatHeltal(value: number): string {
  return heltalFmt.format(value);
}
