import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  eurofinsFilename,
  generateEurofinsCsv,
  validateForExport,
  type ExportSample,
} from "@/lib/eurofins/generate";
import { DEFAULT_ANALYSES_DETAILS } from "@/lib/eurofins/template";
import type { Case, Sample } from "@/lib/types";

/**
 * Genererer Eurofins-import-filen for en sag og logger eksporten.
 *
 * Filen skrives som UTF-8 MED BOM. Uden den viser Excel danske tegn som
 * mojibake nar filen abnes lokalt for upload — praecis den fejl der ses i den
 * skabelon vi fik udleveret ("PrÃ¸vedetaljer" i stedet for "Prøvedetaljer").
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  const [caseRes, samplesRes, settingRes] = await Promise.all([
    supabase.from("cases").select("*").eq("id", id).maybeSingle<Case>(),
    supabase
      .from("samples")
      .select("*")
      .eq("case_id", id)
      .order("seq")
      .returns<Sample[]>(),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "eurofins_analyses_details")
      .maybeSingle<{ value: string }>(),
  ]);

  const sag = caseRes.data;
  if (!sag) {
    return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  }

  const samples: ExportSample[] = (samplesRes.data ?? []).map((s) => ({
    label: s.label,
    material: s.material,
    sample_type: s.sample_type,
    is_lab_sample: s.is_lab_sample,
    analysis_pcb: s.analysis_pcb,
    analysis_asbestos: s.analysis_asbestos,
    analysis_metals: s.analysis_metals,
    analysis_pah: s.analysis_pah,
  }));

  const blocking = validateForExport(sag.case_name, samples).filter(
    (i) => i.level === "error",
  );
  if (blocking.length > 0) {
    return NextResponse.json(
      { error: blocking.map((i) => i.message).join(" ") },
      { status: 422 },
    );
  }

  const { csv, rowCount } = generateEurofinsCsv({
    caseName: sag.case_name,
    samples,
    analysesDetails: settingRes.data?.value ?? DEFAULT_ANALYSES_DETAILS,
  });

  const filename = eurofinsFilename(sag.case_name);

  await supabase.from("exports").insert({
    case_id: id,
    kind: "eurofins_csv",
    filename,
    row_count: rowCount,
    sample_ids: (samplesRes.data ?? [])
      .filter((s) => s.is_lab_sample)
      .map((s) => s.id),
    generated_by: user.id,
  });

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
