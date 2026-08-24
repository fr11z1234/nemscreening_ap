import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Klient med den hemmelige nogle. Kan oprette logins og gar uden om RLS.
 *
 * DEN MA ALDRIG BRUGES UDEN AT KALDEREN FORST HAR TJEKKET is_admin().
 *
 * Alle appens andre klienter arbejder med den publicerbare nogle og brugerens
 * egen session, sa RLS afgor hvad der kan naas. Denne her har ingen sadan
 * spaerre: nogle er nok. `auth.users` deles desuden med nemscreening.dk, sa en
 * fejl her rammer ikke kun screening-appen men ogsa websitets kunder.
 *
 * "server-only" ovenfor faar bygget til at fejle, hvis filen nogensinde bliver
 * importeret fra en klientkomponent. Uden det ville nogleen kunne ende i
 * browserens bundt, og saa er den ikke laengere hemmelig.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "SUPABASE_SECRET_KEY mangler. Uden den kan der ikke oprettes logins.",
    );
  }

  return createClient(url, secret, {
    db: { schema: "screening" },
    // Ingen session at holde ved lige: klienten lever et enkelt kald.
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
