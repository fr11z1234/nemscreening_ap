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
