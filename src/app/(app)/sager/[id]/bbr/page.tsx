import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { BbrError, hentBygninger } from "@/lib/bbr/datafordeler";
import { mapBuildings, type BbrBuilding } from "@/lib/bbr/map";
import { BbrPicker } from "./BbrPicker";
import type { Case, CaseBuilding } from "@/lib/types";

export const metadata = { title: "BBR · Nemscreening" };

export default async function BbrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [caseRes, buildingsRes] = await Promise.all([
    supabase.from("cases").select("*").eq("id", id).maybeSingle<Case>(),
    supabase
      .from("case_buildings")
      .select("*")
      .eq("case_id", id)
      .order("sort_order")
      .returns<CaseBuilding[]>(),
  ]);

  const sag = caseRes.data;
  if (!sag) notFound();

  const saved: BbrBuilding[] = (buildingsRes.data ?? []).map((b) => ({
    bbrBuildingId: b.bbr_building_id,
    buildingNo: b.building_no,
    label: b.label,
    usageCode: b.usage_code,
    usageText: b.usage_text,
    builtYear: b.built_year,
    rebuiltYear: b.rebuilt_year,
    areaBuilt: b.area_built,
    areaTotal: b.area_total,
    areaResidential: b.area_residential,
  }));

  /**
   * BBR hentes her pa serveren, ikke i browseren.
   *
   * Screeneren har allerede trykket "Hent data fra BBR" pa sagen — at mode en
   * ny hent-knap her ville vaere at spoerge om det samme to gange. Sagens
   * gemte bygninger vinder, hvis de findes: dem har screeneren bekraeftet.
   */
  let suggested: BbrBuilding[] = [];
  let fetchError: string | null = null;
  const attempted = saved.length === 0 && Boolean(sag.dawa_adgangsadresse_id);

  if (attempted) {
    try {
      suggested = mapBuildings(
        await hentBygninger(sag.dawa_adgangsadresse_id!),
      );
      if (suggested.length === 0) {
        fetchError =
          "BBR har ingen registrerede bygninger på adressen. Tilføj dem i hånden.";
      }
    } catch (err) {
      fetchError =
        err instanceof BbrError ? err.message : "BBR-opslaget mislykkedes.";
    }
  }

  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col">
        <div className="px-4 pt-4 pb-5">
          <Link
            href={`/sager/${id}`}
            className="tap -ml-2 inline-block px-2 text-muted"
          >
            ← {sag.case_name}
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Bygningsdata</h1>
        </div>
        <BbrPicker
          caseId={id}
          husnummerId={sag.dawa_adgangsadresse_id}
          initial={saved.length > 0 ? saved : suggested}
          fromBbr={saved.length === 0 && suggested.length > 0}
          attempted={attempted}
          fetchError={fetchError}
        />
      </main>
    </>
  );
}
