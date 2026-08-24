"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMember } from "@/lib/auth";
import { USER_ROLE_LABEL, type UserRole } from "@/lib/types";

export type BrugerState = {
  error?: string;
  /** Kun sat lige efter en oprettelse. Vises en gang og gemmes ingen steder. */
  oprettet?: { email: string; kodeord: string | null; besked: string };
};

/**
 * Kodeord der kan laeses hojt.
 *
 * Det gives videre mundtligt, sa tegn man kan hore forkert er udeladt: intet O
 * mod 0, intet l mod 1. Grupperet i tre, fordi tolv tegn i en snor bliver laest
 * forkert uanset hvor tydeligt man taler.
 */
function midlertidigtKodeord(): string {
  const tegn = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const raa = [...bytes].map((b) => tegn[b % tegn.length]).join("");
  return `${raa.slice(0, 4)}-${raa.slice(4, 8)}-${raa.slice(8, 12)}`;
}

/**
 * Den indloggede admin, eller en fejl.
 *
 * Rollen slas op i databasen ved hvert kald og laeses aldrig fra formularen
 * eller en cookie. Det er ikke pynt: naeste skridt bruger den hemmelige nogle,
 * og den gar uden om RLS. Uden dette tjek kunne enhver der er logget ind —
 * ogsa en kunde fra nemscreening.dk, som allerede er `authenticated` hos os —
 * oprette sig selv adgang til alle sager.
 */
async function kraevAdmin() {
  const member = await getMember();
  if (!member) return { fejl: "Du er ikke logget ind.", userId: null };
  if (!member.profile?.active || member.profile.role !== "admin") {
    return {
      fejl: "Kun en administrator kan administrere brugere.",
      userId: null,
    };
  }
  return { fejl: null, userId: member.userId };
}

export async function opretBruger(
  _prev: BrugerState,
  formData: FormData,
): Promise<BrugerState> {
  const { fejl } = await kraevAdmin();
  if (fejl) return { error: fejl };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "screener") as UserRole;

  if (!email.includes("@")) return { error: "Skriv en gyldig e-mail." };
  if (!(role in USER_ROLE_LABEL)) return { error: "Vælg en rolle." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Nøglen mangler." };
  }

  const kodeord = midlertidigtKodeord();

  const oprettet = await admin.auth.admin.createUser({
    email,
    password: kodeord,
    // Ingen bekraeftelsesmail: kodeordet gives videre mundtligt, og personen
    // skal kunne logge ind med det samme.
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  let userId = oprettet.data.user?.id ?? null;
  let besked = "Brugeren er oprettet. Giv kodeordet videre mundtligt.";
  let visKodeord: string | null = kodeord;

  if (oprettet.error) {
    /*
     * auth.users deles med nemscreening.dk.
     *
     * Har personen bestilt noget pa hjemmesiden, findes kontoen allerede — og
     * sa ma vi ikke skifte deres kodeord. De skal have adgang til
     * screening-appen, ikke et nyt login. Derfor findes id'et frem, og der
     * skrives kun en raekke i app_users.
     */
    const findesAllerede =
      oprettet.error.status === 422 ||
      /already|registered|exists/i.test(oprettet.error.message);

    if (!findesAllerede) {
      return {
        error: `Kunne ikke oprette brugeren: ${oprettet.error.message}`,
      };
    }

    userId = await findUserId(admin, email);
    if (!userId) {
      return {
        error:
          "E-mailen har allerede en konto, men brugeren kunne ikke findes. Slå den op i Supabase under Authentication.",
      };
    }

    besked =
      "E-mailen havde allerede en konto — sandsynligvis fra hjemmesiden. Adgangen er givet, og personen logger ind med sit eget kodeord.";
    visKodeord = null;
  }

  if (!userId) return { error: "Brugeren blev oprettet uden et id." };

  // Medlemskabet er det, der giver adgang. Uden denne raekke er personen kun
  // "authenticated" og bliver afvist af bade MemberGate og RLS.
  const { error: medlemFejl } = await admin
    .from("app_users")
    .upsert(
      { id: userId, full_name: fullName, email, role, active: true },
      { onConflict: "id" },
    );

  if (medlemFejl) {
    return {
      error: `Login blev oprettet, men adgangen fejlede: ${medlemFejl.message}`,
    };
  }

  revalidatePath("/brugere");
  return { oprettet: { email, kodeord: visKodeord, besked } };
}

/**
 * Bruger-id'et bag en e-mail.
 *
 * GoTrue's admin-API kan ikke sla op pa e-mail, sa listen bladres igennem. Den
 * deles med websitet og kan vaere lang; graensen pa tyve sider er der, sa et
 * kald ikke kan lobe i det uendelige.
 */
async function findUserId(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  const PR_SIDE = 200;
  for (let side = 1; side <= 20; side++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page: side,
      perPage: PR_SIDE,
    });
    if (error || data.users.length === 0) return null;

    const fundet = data.users.find((u) => u.email?.toLowerCase() === email);
    if (fundet) return fundet.id;
    if (data.users.length < PR_SIDE) return null;
  }
  return null;
}

/**
 * Slar en brugers adgang til eller fra.
 *
 * Raekken i app_users bliver staaende, og login'et slettes ALDRIG: kontoen kan
 * hore til en kunde pa nemscreening.dk, og sletter vi den, mister de ogsa
 * adgangen dér. `active` er nok — bade MemberGate og RLS hviler pa den.
 */
export async function skiftAdgang(formData: FormData) {
  const { fejl, userId } = await kraevAdmin();
  if (fejl) return;

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;

  // Ingen kan lukke sig selv ude. Er man den eneste admin, ville appen vaere
  // uden administrator bagefter, og der er ingen vej tilbage gennem UI'et.
  if (id === userId) return;

  const supabase = await createClient();
  await supabase.from("app_users").update({ active }).eq("id", id);
  revalidatePath("/brugere");
}

/** Skifter rolle. Samme graense: kun admin, og aldrig sin egen. */
export async function skiftRolle(formData: FormData) {
  const { fejl, userId } = await kraevAdmin();
  if (fejl) return;

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!id || !(role in USER_ROLE_LABEL)) return;
  if (id === userId) return;

  const supabase = await createClient();
  await supabase.from("app_users").update({ role }).eq("id", id);
  revalidatePath("/brugere");
}
