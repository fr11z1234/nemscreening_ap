import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";

export type Member = { userId: string; email: string | null; profile: AppUser | null };

/**
 * Den indloggede bruger og vedkommendes medlemskab i screening-appen.
 *
 * Pakket i Reacts cache(), fordi bade layoutet og sidehovedet har brug for
 * den. Uden det ville hver navigation lave to ekstra netvaerkskald til
 * Supabase Auth — getUser() validerer token'et hos auth-serveren, den laeser
 * ikke bare en cookie. cache() gor at de deler ét kald pr. request.
 */
export const getMember = cache(async (): Promise<Member | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("app_users")
    .select("id, full_name, email, role, active")
    .eq("id", user.id)
    .maybeSingle<AppUser>();

  return { userId: user.id, email: user.email ?? null, profile: data ?? null };
});

/**
 * Kun kontor og admin. Giver en besked, eller null hvis der er adgang.
 *
 * Samme graense som RLS: `materials_write`, `building_parts_write` og
 * `app_settings_write` kraever alle `screening.is_office()`. Tjekket her findes
 * for at give en forstaelig besked frem for en handling, der ikke gor noget —
 * RLS afviser ved at ramme nul raekker, ikke ved at fejle.
 */
export async function kraevKontor(
  hvad = "Kun kontoret kan rette det her.",
): Promise<string | null> {
  const member = await getMember();
  const rolle = member?.profile?.role;
  if (!member?.profile?.active || (rolle !== "office" && rolle !== "admin")) {
    return hvad;
  }
  return null;
}
