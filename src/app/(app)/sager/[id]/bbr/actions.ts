"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BbrBuilding, BygningsNoter } from "@/lib/bbr/map";

export type SaveBuildingsInput = {
  caseId: string;
  buildings: (BbrBuilding & BygningsNoter & { isManual?: boolean })[];
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

  /*
   * De skrevne noter skal overleve et nyt BBR-opslag.
   *
   * Erstatningen ovenfor er med vilje, men den ma ikke koste tre afsnit, nogen
   * har skrevet staaende i bygningen. Derfor laeses de gemte noter FOR
   * sletningen og lappes tilbage pa den bygning, der har samme
   * bbr_building_id. Kommer browseren selv med en note — den er lige blevet
   * skrevet — vinder den; ellers falder vi tilbage pa det gemte.
   *
   * Manuelt oprettede bygninger har ingen bbr_building_id og kan derfor ikke
   * genkendes pa tvaers af et opslag. Deres noter folger med i browserens egen
   * raekke, sa laenge siden ikke er genindlaest.
   */
  const { data: gemte } = await supabase
    .from("case_buildings")
    .select("bbr_building_id, usage_note, construction_note, plan_note")
    .eq("case_id", input.caseId)
    .returns<
      {
        bbr_building_id: string | null;
        usage_note: string | null;
        construction_note: string | null;
        plan_note: string | null;
      }[]
    >();

  const tidligere = new Map(
    (gemte ?? [])
      .filter((b) => b.bbr_building_id)
      .map((b) => [b.bbr_building_id!, b]),
  );

  await supabase.from("case_buildings").delete().eq("case_id", input.caseId);

  if (input.buildings.length > 0) {
    await supabase.from("case_buildings").insert(
      input.buildings.map((b, i) => {
        const gammel = b.bbrBuildingId ? tidligere.get(b.bbrBuildingId) : null;
        return {
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
          floors: b.floors,
          wall_material_code: b.wallMaterialCode,
          roof_material_code: b.roofMaterialCode,
          heating_code: b.heatingCode,
          usage_note: b.usageNote ?? gammel?.usage_note ?? null,
          construction_note:
            b.constructionNote ?? gammel?.construction_note ?? null,
          plan_note: b.planNote ?? gammel?.plan_note ?? null,
          raw_bbr: b as unknown as Record<string, unknown>,
          is_manual: b.isManual ?? false,
          sort_order: i,
        };
      }),
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
