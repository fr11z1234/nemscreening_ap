"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CaseStatus } from "@/lib/types";

export async function setCaseStatus(caseId: string, status: CaseStatus) {
  const supabase = await createClient();
  await supabase.from("cases").update({ status }).eq("id", caseId);
  revalidatePath(`/sager/${caseId}`);
  revalidatePath(`/sager/${caseId}/eksport`);
}
