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
