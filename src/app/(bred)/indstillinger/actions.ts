"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { kraevKontor as kraevKontorMed } from "@/lib/auth";
import { INDSTILLING_NOEGLER } from "@/lib/indstillinger";
import type { PanelState } from "@/lib/panel";

const kraevKontor = () =>
  kraevKontorMed("Kun kontoret kan rette indstillingerne.");

/**
 * Gemmer bortskaffelsesteksterne og kontakten, der afgor om de bruges.
 *
 * Alle fem raekker skrives paa en gang. De hoerer sammen: slaas kontakten til
 * i den ene skrivning og teksterne fejler i den naeste, staar rapporten med en
 * faelles tekst, ingen har skrevet — og saa er forureningsafsnittet tavst uden
 * at nogen kan se hvorfor.
 *
 * Tom tekst gemmes som "" og ikke som null: `value` er `jsonb not null`, og
 * PostgREST oversaetter et JSON-null til SQL NULL. `laesIndstillinger` laeser
 * dem ens.
 */
export async function gemIndstillinger(
  _prev: PanelState,
  formData: FormData,
): Promise<PanelState> {
  const fejl = await kraevKontor();
  if (fejl) return { error: fejl };

  const tekst = (felt: string) => String(formData.get(felt) ?? "").trim();
  const faelles = formData.get("faelles") === "on";

  const supabase = await createClient();
  const naa = new Date().toISOString();

  const { error, data } = await supabase
    .from("app_settings")
    .upsert(
      [
        { key: INDSTILLING_NOEGLER.faelles, value: faelles, updated_at: naa },
        {
          key: INDSTILLING_NOEGLER.farligt,
          value: tekst("sentence_farligt"),
          updated_at: naa,
        },
        {
          key: INDSTILLING_NOEGLER.forurenet,
          value: tekst("sentence_forurenet"),
          updated_at: naa,
        },
        {
          key: INDSTILLING_NOEGLER.asbest,
          value: tekst("sentence_asbest"),
          updated_at: naa,
        },
        {
          key: INDSTILLING_NOEGLER.bortskaffelse,
          value: tekst("sentence_bortskaffelse"),
          updated_at: naa,
        },
      ],
      { onConflict: "key" },
    )
    .select("key");

  if (error) return { error: `Kunne ikke gemme: ${error.message}` };
  // RLS afviser ved at ramme nul raekker, ikke ved at give en fejl. Uden det her
  // ville brugeren faa at vide, at teksten er gemt, og se den gamle igen ved
  // naeste opdatering.
  if (!data?.length) return { error: "Ingen rækker blev rettet. Har du adgang?" };

  // Rapporten laeser dem ved hver visning, og materialepanelet viser dem.
  revalidatePath("/indstillinger");
  revalidatePath("/materialer");
  revalidatePath("/sager", "layout");

  return {
    ok: faelles
      ? "Gemt. Rapporten bruger den fælles tekst."
      : "Gemt. Rapporten bruger materialernes egne sætninger.",
  };
}
