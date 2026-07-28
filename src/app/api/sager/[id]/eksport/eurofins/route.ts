import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateEurofinsXlsx,
  validateForExport,
  type ExportSample,
} from "@/lib/eurofins/generate";
import { loadOrderTemplate } from "@/lib/eurofins/skabelon";
import type { Case, Sample } from "@/lib/types";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Genererer Eurofins-import-filen for en sag og logger eksporten.
 *
 * Filen er Eurofins' egen .xlsx-skabelon med proeverne skrevet ind i
 * Sample_Data. Vi genererer ikke en ny projektmappe: de skjulte ark — isaer
 * Order_Metadata med kunde-, kontrakt- og ordreskabelonnoglen — er det deres
 * import bruger til at genkende ordren.
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

  const [caseRes, samplesRes] = await Promise.all([
    supabase.from("cases").select("*").eq("id", id).maybeSingle<Case>(),
    supabase
      .from("samples")
      .select("*")
      .eq("case_id", id)
      .order("seq")
      .returns<Sample[]>(),
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

  const { file, filename, rowCount } = generateEurofinsXlsx({
    template: loadOrderTemplate(),
    caseName: sag.case_name,
    samples,
  });

  await supabase.from("exports").insert({
    case_id: id,
    kind: "eurofins_xlsx",
    filename,
    row_count: rowCount,
    sample_ids: (samplesRes.data ?? [])
      .filter((s) => s.is_lab_sample)
      .map((s) => s.id),
    generated_by: user.id,
  });

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Length": String(file.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
