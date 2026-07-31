"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Sagen omdirigerer ikke selv.
 *
 * Forsidebilledet tages for sagen findes, sa det kan forst laegges op nar vi
 * har et id. Derfor gives id'et tilbage til browseren, som uploader billedet
 * og ForST derefter navigerer videre.
 */
export type CreateCaseState = { error?: string; caseId?: string };

export async function createCase(
  _prev: CreateCaseState,
  formData: FormData,
): Promise<CreateCaseState> {
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const caseName = str("case_name");
  if (!caseName) return { error: "Sagsnavn skal udfyldes." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("cases")
    .insert({
      case_name: caseName,
      address_text: str("address_text"),
      dawa_adgangsadresse_id: str("dawa_adgangsadresse_id"),
      postnr: str("postnr"),
      city: str("city"),
      customer_name: str("customer_name"),
      customer_contact: str("customer_contact"),
      customer_email: str("customer_email"),
      customer_phone: str("customer_phone"),
      note: str("note"),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: `Kunne ikke oprette sagen: ${error.message}` };

  revalidatePath("/sager");
  return { caseId: data.id };
}
