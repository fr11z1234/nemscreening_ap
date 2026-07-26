"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCamera } from "@/lib/camera/useCamera";
import { compressImageFile } from "@/lib/camera/compress";
import { PickerField } from "@/components/PickerField";
import { flush, PHOTO_BUCKET } from "@/lib/offline/sync";
import {
  enqueuePhoto,
  pendingCounts,
  savePendingSample,
  type PendingSample,
} from "@/lib/offline/store";
import { formatDecimal, parseDecimal } from "@/lib/format";
import {
  ANALYSIS_FIELDS,
  PERIOD_LABEL,
  type BuildingPeriod,
  type CaseBuilding,
  type Sample,
} from "@/lib/types";

type Draft = Omit<PendingSample, "touchedAt">;
type Thumb = { id: string; url: string; local: boolean };
export type InitialPhoto = { id: string; sample_id: string; url: string };

const uuid = () => crypto.randomUUID();

const labelFor = (d: Draft) =>
  ANALYSIS_FIELDS.some((a) => d[a.key]) ? `P${d.seq}` : String(d.seq);

/**
 * En ny raekke starter blank. Kun bygningen folger med.
 *
 * Bygningen er den eneste oplysning der er givet af hvor screeneren fysisk
 * star, og den kan skiftes i dropdown'en som alt andet. Alt ovrigt —
 * materiale, proveart, maengde og ikke mindst analyserne — skal vaelges
 * bevidst for hver prove.
 */
function nextDraft(caseId: string, seq: number, userId: string, from?: Draft): Draft {
  return {
    id: uuid(),
    case_id: caseId,
    seq,
    material: null,
    sample_type: null,
    building_id: from?.building_id ?? null,
    period: null,
    location_note: null,
    estimated_tons: null,
    analysis_pcb: false,
    analysis_asbestos: false,
    analysis_metals: false,
    analysis_pah: false,
    comment: null,
    created_by: userId,
  };
}

function toDraft(s: Sample, userId: string): Draft {
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
    created_by: s.created_by ?? userId,
  };
}

export function SamplingView({
  caseId,
  userId,
  buildings,
  materials,
  sampleTypes,
  initialSamples,
  initialPhotos,
}: {
  caseId: string;
  userId: string;
  buildings: CaseBuilding[];
  materials: string[];
  sampleTypes: string[];
  initialSamples: Sample[];
  initialPhotos: InitialPhoto[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Alle raekker i sagen, inklusive en tom i enden der venter pa at blive udfyldt.
  const [rows, setRows] = useState<Draft[]>(() => {
    const existing = initialSamples.map((s) => toDraft(s, userId));
    const last = existing[existing.length - 1];
    const seq = Math.max(0, ...existing.map((d) => d.seq)) + 1;
    return [...existing, nextDraft(caseId, seq, userId, last)];
  });
  const [index, setIndex] = useState(() => initialSamples.length);

  const [photos, setPhotos] = useState<Record<string, Thumb[]>>(() => {
    const map: Record<string, Thumb[]> = {};
    for (const p of initialPhotos) {
      (map[p.sample_id] ??= []).push({ id: p.id, url: p.url, local: false });
    }
    return map;
  });

  const draft = rows[index];
  const [tonsText, setTonsText] = useState(() =>
    formatDecimal(rows[initialSamples.length]?.estimated_tons),
  );
  const [pending, setPending] = useState({ samples: 0, photos: 0 });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    videoRef,
    state: cameraState,
    capture,
    retry: retryCamera,
    torchOn,
    torchSupported,
    toggleTorch,
  } = useCamera();
  const fileInput = useRef<HTMLInputElement>(null);

  const thumbs = photos[draft.id] ?? [];
  const isLabSample = ANALYSIS_FIELDS.some((a) => draft[a.key]);
  const label = labelFor(draft);
  const isLastRow = index === rows.length - 1;

  const recentMaterials = useMemo(
    () =>
      [...new Set(rows.map((r) => r.material).filter(Boolean))]
        .reverse()
        .slice(0, 4) as string[],
    [rows],
  );
  const recentTypes = useMemo(
    () =>
      [...new Set(rows.map((r) => r.sample_type).filter(Boolean))]
        .reverse()
        .slice(0, 4) as string[],
    [rows],
  );

  const refreshPending = useCallback(async () => {
    setPending(await pendingCounts());
  }, []);

  const persist = useCallback(
    async (d: Draft) => {
      await savePendingSample({ ...d, touchedAt: Date.now() });
      await refreshPending();
    },
    [refreshPending],
  );

  const update = useCallback(
    (patch: Partial<Draft>) => {
      setRows((prev) => {
        const next = [...prev];
        const merged = { ...next[index], ...patch };
        next[index] = merged;
        void persist(merged);
        return next;
      });
    },
    [index, persist],
  );

  const sync = useCallback(async () => {
    const res = await flush(supabase);
    await refreshPending();
    return res;
  }, [supabase, refreshPending]);

  useEffect(() => {
    // At tomme uploadkoen mod Supabase er synkronisering med et eksternt
    // system — netop det effekter er beregnet til.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void sync();
    const onOnline = () => void sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sync]);

  // Object-URL'er til lokale billeder skal frigives, ellers vokser
  // hukommelsen gennem en lang sag med mange fotos. Saettet fyldes kun fra
  // event handlers, aldrig under render.
  const localUrls = useRef<Set<string>>(new Set());
  useEffect(() => {
    const urls = localUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  async function addPhoto(shot: { blob: Blob; width: number; height: number }) {
    const id = uuid();
    await enqueuePhoto({
      id,
      sample_id: draft.id,
      case_id: caseId,
      blob: shot.blob,
      width: shot.width,
      height: shot.height,
      taken_at: new Date().toISOString(),
      sort_order: thumbs.length,
    });
    // Provens raekke skal findes for fotoet kan gemmes.
    await persist(draft);
    const url = URL.createObjectURL(shot.blob);
    localUrls.current.add(url);
    setPhotos((p) => ({
      ...p,
      [draft.id]: [...(p[draft.id] ?? []), { id, url, local: true }],
    }));
    void sync();
  }

  async function onShutter() {
    const shot = await capture();
    if (shot) await addPhoto(shot);
    else fileInput.current?.click();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await addPhoto(await compressImageFile(file));
  }

  async function removePhoto(id: string) {
    const thumb = thumbs.find((t) => t.id === id);
    if (thumb?.local) {
      URL.revokeObjectURL(thumb.url);
      localUrls.current.delete(thumb.url);
    }
    setPhotos((p) => ({
      ...p,
      [draft.id]: (p[draft.id] ?? []).filter((t) => t.id !== id),
    }));
    await supabase.from("sample_photos").delete().eq("id", id);
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([`${caseId}/${draft.id}/${id}.jpg`]);
    void refreshPending();
  }

  /** Gemmer den aktuelle raekke. Tomme raekker springes over uden brok. */
  async function commit(require: boolean): Promise<boolean> {
    const empty = !draft.material && !draft.sample_type && thumbs.length === 0;
    if (empty) return !require;

    if (!draft.material) {
      setNotice("Vælg et materiale, før du går videre.");
      return false;
    }
    setNotice(null);
    setBusy(true);
    try {
      await persist(draft);
      const res = await sync();
      if (res.failed > 0) {
        setNotice(
          "Gemt på telefonen. Sendes automatisk, når forbindelsen er tilbage.",
        );
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  function goTo(target: number) {
    setIndex(target);
    setTonsText(formatDecimal(rows[target]?.estimated_tons));
    setNotice(null);
    window.scrollTo({ top: 0 });
  }

  async function onPrev() {
    if (index === 0) return;
    await commit(false);
    goTo(index - 1);
  }

  /** Naeste raekke — enten den naeste eksisterende, eller en ny i enden. */
  async function onNext() {
    if (!(await commit(true))) return;

    if (!isLastRow) {
      goTo(index + 1);
      return;
    }

    const seq = Math.max(...rows.map((r) => r.seq)) + 1;
    const fresh = nextDraft(caseId, seq, userId, draft);
    setRows((prev) => [...prev, fresh]);
    setIndex(rows.length);
    setTonsText(formatDecimal(fresh.estimated_tons));
    window.scrollTo({ top: 0 });
  }

  async function onFinish() {
    if (!(await commit(false))) return;
    await supabase
      .from("cases")
      .update({ status: "proever_taget" })
      .eq("id", caseId);
    router.push(`/sager/${caseId}`);
    router.refresh();
  }

  const unsynced = pending.samples + pending.photos;
  const filled = rows.filter((r) => r.material).length;

  return (
    <div className="flex flex-1 flex-col">
      <header className="safe-t sticky top-0 z-20 border-b border-border bg-surface">
        <div className="flex h-12 items-center gap-1 px-2">
          <Link href={`/sager/${caseId}`} className="tap px-2 text-muted">
            ←
          </Link>

          <button
            type="button"
            onClick={onPrev}
            disabled={index === 0 || busy}
            aria-label="Forrige prøve"
            className="tap px-2 text-lg disabled:opacity-25"
          >
            ‹
          </button>

          <span className="font-semibold">Prøve {draft.seq}</span>
          <span
            className={`tabular rounded-md px-1.5 text-sm font-semibold ${
              isLabSample ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted"
            }`}
          >
            {label}
          </span>

          <button
            type="button"
            onClick={onNext}
            disabled={busy}
            aria-label="Næste prøve"
            className="tap px-2 text-lg disabled:opacity-25"
          >
            ›
          </button>

          <span className="ml-auto pr-2 text-xs text-muted">
            {filled} registreret
          </span>
        </div>
        {unsynced > 0 && (
          <p className="bg-warning/10 px-4 py-1 text-xs text-warning">
            {unsynced} ting venter på at blive sendt
          </p>
        )}
      </header>

      <div className="relative aspect-4/3 w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
        />

        {cameraState === "ready" ? (
          <button
            type="button"
            onClick={onShutter}
            aria-label="Tag billede"
            className="absolute inset-0"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-white">
            <p className="text-sm">
              {cameraState === "starting"
                ? "Starter kamera…"
                : cameraState === "denied"
                  ? "Appen har ikke adgang til kameraet."
                  : "Live-kamera kræver en sikker forbindelse (https)."}
            </p>
            <div className="flex gap-2">
              {cameraState === "denied" && (
                <button
                  type="button"
                  onClick={retryCamera}
                  className="tap rounded-lg border border-white/40 px-4"
                >
                  Prøv igen
                </button>
              )}
              {cameraState !== "starting" && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="tap rounded-lg bg-white px-4 text-black"
                >
                  Brug systemets kamera
                </button>
              )}
            </div>
          </div>
        )}

        {cameraState === "ready" && torchSupported && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-pressed={torchOn}
            className="tap absolute right-3 top-3 rounded-full bg-black/50 px-3 text-white"
          >
            {torchOn ? "Lys fra" : "Lys til"}
          </button>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPickFile}
        className="hidden"
      />

      <div className="flex items-center gap-2 overflow-x-auto px-4 py-3">
        {thumbs.length === 0 ? (
          <p className="text-sm text-muted">
            Tryk på billedet for at fotografere prøven
          </p>
        ) : (
          thumbs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => removePhoto(t.id)}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border"
              aria-label="Fjern billede"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.url} alt="" className="h-full w-full object-cover" />
              <span className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white">
                ×
              </span>
            </button>
          ))
        )}
      </div>

      <div className="flex flex-col gap-5 px-4 pb-44">
        <PickerField
          label="Materiale"
          value={draft.material}
          items={materials}
          recent={recentMaterials}
          onChange={(v) => update({ material: v })}
        />

        <PickerField
          label="Prøveart"
          value={draft.sample_type}
          items={sampleTypes}
          recent={recentTypes}
          onChange={(v) => update({ sample_type: v })}
        />

        {buildings.length > 0 && (
          <PickerField
            label="Lokalitet"
            value={buildings.find((b) => b.id === draft.building_id)?.label ?? null}
            items={buildings.map((b) => b.label)}
            onChange={(v) =>
              update({
                building_id: buildings.find((b) => b.label === v)?.id ?? null,
              })
            }
          />
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Periode</span>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PERIOD_LABEL) as BuildingPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => update({ period: draft.period === p ? null : p })}
                aria-pressed={draft.period === p}
                className={`tap rounded-lg border px-3 ${
                  draft.period === p
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border bg-surface"
                }`}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Estimeret mængde (ton)</span>
          <input
            type="text"
            inputMode="decimal"
            value={tonsText}
            onChange={(e) => setTonsText(e.target.value)}
            onBlur={() => {
              const n = parseDecimal(tonsText);
              setTonsText(formatDecimal(n));
              update({ estimated_tons: n });
            }}
            placeholder="0,2"
            className="tap w-full rounded-lg border border-border bg-surface px-3 py-2.5"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Analyser</span>
          <div className="grid grid-cols-2 gap-2">
            {ANALYSIS_FIELDS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => update({ [a.key]: !draft[a.key] })}
                aria-pressed={draft[a.key]}
                className={`tap rounded-lg border px-3 text-sm ${
                  draft[a.key]
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border bg-surface"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            {isLabSample
              ? `Sendes til laboratoriet som ${label}.`
              : "Uden analyse registreres materialet kun — det sendes ikke til laboratoriet."}
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Kommentar</span>
          <textarea
            rows={2}
            value={draft.comment ?? ""}
            onChange={(e) => update({ comment: e.target.value || null })}
            className="tap w-full rounded-lg border border-border bg-surface px-3 py-2.5"
          />
        </label>

        {filled > 0 && (
          <section>
            <h2 className="text-sm font-medium">Registreret på sagen</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {rows.map((r, i) =>
                r.material ? (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (i === index) return;
                        await commit(false);
                        goTo(i);
                      }}
                      className={`tap flex w-full items-center gap-2 rounded-lg border px-3 text-left text-sm ${
                        i === index
                          ? "border-primary bg-primary/5"
                          : "border-border bg-surface"
                      }`}
                    >
                      <span className="tabular w-9 shrink-0 font-semibold">
                        {labelFor(r)}
                      </span>
                      <span className="truncate">{r.material}</span>
                      <span className="ml-auto shrink-0 truncate text-muted">
                        {r.sample_type ?? ""}
                      </span>
                    </button>
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        )}
      </div>

      <div className="safe-b fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pt-3">
        {notice && <p className="pb-2 text-xs text-warning">{notice}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onNext}
            disabled={busy}
            className="tap rounded-lg bg-primary px-4 font-medium text-primary-fg active:bg-primary-hover disabled:opacity-60"
          >
            {isLastRow ? "Næste prøve" : "Næste"}
          </button>
          <button
            type="button"
            onClick={onFinish}
            disabled={busy}
            className="tap rounded-lg border border-border px-4 font-medium disabled:opacity-60"
          >
            Afslut
          </button>
        </div>
      </div>
    </div>
  );
}
