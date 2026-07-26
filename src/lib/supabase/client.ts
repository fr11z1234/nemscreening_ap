import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-klient. Peger pa `screening`-skemaet, ikke `public` — websitets
 * kundeportal bor i public og skal ikke kunne rammes herfra.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { db: { schema: "screening" } },
  );
}

/**
 * Klienten er bundet til `screening`-skemaet, sa den er ikke tilordningsbar til
 * den almindelige SupabaseClient-type (der antager `public`). Moduler der tager
 * en klient som parameter skal bruge denne type.
 */
export type ScreeningClient = ReturnType<typeof createClient>;
