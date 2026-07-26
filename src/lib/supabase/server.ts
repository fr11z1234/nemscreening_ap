import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-klient til Server Components, Server Actions og route handlers.
 * Samme skema-binding som browser-klienten.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: { schema: "screening" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Kaldt fra en Server Component. Middleware opdaterer sessionen,
            // sa det er sikkert at ignorere.
          }
        },
      },
    },
  );
}
