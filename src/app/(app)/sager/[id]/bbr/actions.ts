"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BbrBuilding } from "@/lib/bbr/map";

export type SaveBuildingsInput = {
  caseId: string;
  buildings: (BbrBuilding & { isManual?: boolean })[];
  areaM2: number | null;
  builtYear: number | null;
  rebuiltYear: number | null;
};

/**
 * Gemmer de valgte bygninger pa sagen.
 *
 * Bygningerne erstattes samlet frem for at blive flettet: screeneren har lige
 * set listen og bekraeftet praecis den. Provernes reference til en bygning
 * nulstilles af sig selv (on delete set null), sa en fjernet bygning ikke
 * efterlader en prove der peger i tomrummet.
 */
export async function saveBuildings(input: SaveBuildingsInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("case_buildings").delete().eq("case_id", input.caseId);

  if (input.buildings.length > 0) {
    await supabase.from("case_buildings").insert(
      input.buildings.map((b, i) => ({
        case_id: input.caseId,
        bbr_building_id: b.bbrBuildingId,
        building_no: b.buildingNo,
        label: b.label,
        usage_code: b.usageCode,
        usage_text: b.usageText,
        built_year: b.builtYear,
        rebuilt_year: b.rebuiltYear,
        area_built: b.areaBuilt,
        area_total: b.areaTotal,
        area_residential: b.areaResidential,
        raw_bbr: b as unknown as Record<string, unknown>,
        is_manual: b.isManual ?? false,
        sort_order: i,
      })),
    );
  }

  await supabase
    .from("cases")
    .update({
      area_m2: input.areaM2,
      built_year: input.builtYear,
      rebuilt_year: input.rebuiltYear,
    })
    .eq("id", input.caseId);

  revalidatePath(`/sager/${input.caseId}`);
  redirect(`/sager/${input.caseId}`);
}
