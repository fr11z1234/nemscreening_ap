"use server";

import { createClient } from "@/lib/supabase/server";

export type KodeordState = { error?: string; ok?: boolean };

/**
 * Skifter den indloggede brugers eget kodeord.
 *
 * Ingen hemmelig nogle og intet admin-API: `updateUser` virker pa den session,
 * browseren allerede har, og kan derfor kun ramme en selv. Siden findes, fordi
 * en ny bruger far et midlertidigt kodeord laest hojt — uden en vej til at
 * skifte det, ville det midlertidige blive det permanente.
 *
 * auth deles med nemscreening.dk, sa det skiftede kodeord gaelder ogsa dér.
 * Det staar i teksten pa siden.
 */
export async function skiftKodeord(
  _prev: KodeordState,
  formData: FormData,
): Promise<KodeordState> {
  const nyt = String(formData.get("kodeord") ?? "");
  const gentag = String(formData.get("gentag") ?? "");

  if (nyt.length < 10) {
    return { error: "Kodeordet skal være mindst 10 tegn." };
  }
  if (nyt !== gentag) {
    return { error: "De to kodeord er ikke ens." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Du er ikke logget ind." };

  const { error } = await supabase.auth.updateUser({ password: nyt });
  if (error) return { error: `Kunne ikke skifte kodeordet: ${error.message}` };

  return { ok: true };
}
