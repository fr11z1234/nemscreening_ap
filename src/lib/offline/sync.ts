import type { ScreeningClient } from "@/lib/supabase/client";
import {
  allPendingPhotos,
  allPendingSamples,
  dropPendingSample,
  dropPhoto,
  type PendingSample,
} from "./store";

export const PHOTO_BUCKET = "screening-photos";

/**
 * Kolonnerne der sendes til databasen, listet eksplicit.
 *
 * Alternativet — at sprede hele objektet og fjerne de lokale felter — ville
 * betyde at et nyt felt i PendingSample lydlost blev sendt med og fik hele
 * synkroniseringen til at fejle. Her skal listen udvides bevidst.
 */
function toRow(s: PendingSample) {
  return {
    id: s.id,
    case_id: s.case_id,
    seq: s.seq,
    material: s.material,
    sample_type: s.sample_type,
    building_id: s.building_id,
    location_note: s.location_note,
    estimated_tons: s.estimated_tons,
    period: s.period,
    analysis_pcb: s.analysis_pcb,
    analysis_asbestos: s.analysis_asbestos,
    analysis_metals: s.analysis_metals,
    analysis_pah: s.analysis_pah,
    comment: s.comment,
    created_by: s.created_by,
  };
}

export type SyncResult = {
  samplesSynced: number;
  photosSynced: number;
  failed: number;
};

/**
 * Sender alt lokalt arbejde til Supabase.
 *
 * Prover forst, sa fotos — et foto kan ikke pege pa en prove der ikke findes.
 * Fejler noget, bliver det liggende i koen og forsoges igen; det er derfor
 * hver post slettes lokalt EFTER at serveren har bekraeftet den.
 */
export async function flush(supabase: ScreeningClient): Promise<SyncResult> {
  const result: SyncResult = { samplesSynced: 0, photosSynced: 0, failed: 0 };

  const samples = await allPendingSamples();
  const syncedSampleIds = new Set<string>();

  for (const sample of samples) {
    const { error } = await supabase
      .from("samples")
      .upsert(toRow(sample), { onConflict: "id" });

    if (error) {
      result.failed++;
      continue;
    }
    await dropPendingSample(sample.id);
    syncedSampleIds.add(sample.id);
    result.samplesSynced++;
  }

  const photos = await allPendingPhotos();
  for (const photo of photos) {
    // Hvis provens egen raekke stadig ligger i koen, ma fotoet vente til
    // naeste runde — ellers rammer vi en fremmednoglefejl.
    const stillPending = samples.some(
      (s) => s.id === photo.sample_id && !syncedSampleIds.has(s.id),
    );
    if (stillPending) {
      result.failed++;
      continue;
    }

    const path = `${photo.case_id}/${photo.sample_id}/${photo.id}.jpg`;

    const upload = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, photo.blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (upload.error) {
      result.failed++;
      continue;
    }

    const { error } = await supabase.from("sample_photos").upsert(
      {
        id: photo.id,
        sample_id: photo.sample_id,
        storage_path: path,
        width: photo.width,
        height: photo.height,
        bytes: photo.blob.size,
        taken_at: photo.taken_at,
        sort_order: photo.sort_order,
      },
      { onConflict: "id" },
    );

    if (error) {
      result.failed++;
      continue;
    }

    await dropPhoto(photo.id);
    result.photosSynced++;
  }

  return result;
}
