import { createStore, del, entries, set } from "idb-keyval";
import type { BuildingPeriod } from "@/lib/types";

/**
 * Lokalt lager for prover og fotos der endnu ikke er landet i Supabase.
 *
 * Screenere arbejder i kaeldre og tomme bygninger hvor daekningen kommer og
 * gar. Alt skrives her forst, og synkroniseres nar der er hul igennem — sa et
 * dropout midt i prove 4 hverken koster data eller afbryder arbejdet.
 *
 * To separate databaser med hver sit store: idb-keyval opretter kun et store
 * pr. database, sa to createStore-kald mod samme databasenavn ville give en
 * database uden det andet store.
 */
const sampleStore = createStore("nemscreening-samples", "items");
const photoStore = createStore("nemscreening-photos", "items");

export type PendingSample = {
  id: string;
  case_id: string;
  seq: number;
  material: string | null;
  sample_type: string | null;
  building_id: string | null;
  location_note: string | null;
  estimated_tons: number | null;
  period: BuildingPeriod | null;
  analysis_pcb: boolean;
  analysis_asbestos: boolean;
  analysis_metals: boolean;
  analysis_pah: boolean;
  comment: string | null;
  created_by: string | null;
  /** Hvornar raekken sidst blev aendret lokalt. Nyeste vinder ved synk. */
  touchedAt: number;
};

export type PendingPhoto = {
  id: string;
  sample_id: string;
  case_id: string;
  blob: Blob;
  width: number;
  height: number;
  taken_at: string;
  sort_order: number;
};

export async function savePendingSample(s: PendingSample) {
  await set(s.id, s, sampleStore);
}

export async function dropPendingSample(id: string) {
  await del(id, sampleStore);
}

export async function allPendingSamples(): Promise<PendingSample[]> {
  const rows = await entries<string, PendingSample>(sampleStore);
  return rows.map(([, v]) => v).sort((a, b) => a.touchedAt - b.touchedAt);
}

export async function enqueuePhoto(p: PendingPhoto) {
  await set(p.id, p, photoStore);
}

export async function dropPhoto(id: string) {
  await del(id, photoStore);
}

/**
 * Fjerner alt lokalt der horer til en prove.
 *
 * Kaldes nar proven slettes. Bliver noget liggende, ville naeste synk
 * genskabe raekken — eller lade et foto uden prove blokere koen for evigt.
 */
export async function dropSampleEverywhere(sampleId: string) {
  const photos = await entries<string, PendingPhoto>(photoStore);
  await Promise.all([
    del(sampleId, sampleStore),
    ...photos
      .filter(([, p]) => p.sample_id === sampleId)
      .map(([key]) => del(key, photoStore)),
  ]);
}

export async function allPendingPhotos(): Promise<PendingPhoto[]> {
  const rows = await entries<string, PendingPhoto>(photoStore);
  return rows.map(([, v]) => v);
}

export async function pendingCounts() {
  const [samples, photos] = await Promise.all([
    allPendingSamples(),
    allPendingPhotos(),
  ]);
  return { samples: samples.length, photos: photos.length };
}
