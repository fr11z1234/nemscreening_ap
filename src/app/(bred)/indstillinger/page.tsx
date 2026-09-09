import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMember } from "@/lib/auth";
import {
  INDSTILLING_NOEGLER,
  laesIndstillinger,
  type Indstillingsraekke,
} from "@/lib/indstillinger";
import { IndstillingerPanel } from "./IndstillingerPanel";

export const metadata = { title: "Indstillinger · Nemscreening" };

/**
 * Indstillinger.
 *
 * Her staar det, der gaelder alle sager — i dag de tre bortskaffelsestekster
 * og kontakten, der afgor om de er faelles eller staar paa hvert materiale.
 *
 * Kun kontor og admin, samme graense som RLS handhaever paa `app_settings`.
 * `notFound` og ikke en besked: en screener har ikke brug for at vide, at siden
 * findes.
 */
export default async function IndstillingerPage() {
  const member = await getMember();
  const rolle = member?.profile?.role;
  if (!member?.profile?.active || (rolle !== "office" && rolle !== "admin")) {
    notFound();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", Object.values(INDSTILLING_NOEGLER))
    .returns<Indstillingsraekke[]>();

  return (
    <main className="flex flex-1 flex-col px-6 pb-20 pt-5">
      <Link
        href="/sager"
        className="tap -ml-2 inline-flex items-center px-2 text-sm text-muted hover:text-fg"
      >
        ← Sager
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">Indstillinger</h1>

      <IndstillingerPanel indstillinger={laesIndstillinger(data)} />
    </main>
  );
}
