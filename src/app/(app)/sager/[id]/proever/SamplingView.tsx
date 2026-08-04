"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCamera } from "@/lib/camera/useCamera";
import { compressImageFile } from "@/lib/camera/compress";
import { PickerField } from "@/components/PickerField";
import { SletDialog, type SletLag } from "@/components/SletDialog";
import { flush, PHOTO_BUCKET } from "@/lib/offline/sync";
import {
  dropSampleEverywhere,
  enqueuePhoto,
  pendingCounts,
  savePendingSample,
  type PendingSample,
} from "@/lib/offline/store";
import { formatDecimal, parseDecimal } from "@/lib/format";
import {
  ANALYSIS_FIELDS,
  PERIOD_LABEL,
  analysesForPeriod,
  analysisApplies,
  type BuildingPeriod,
  type CaseBuilding,
  type Sample,
} from "@/lib/types";

type Draft = Omit<PendingSample, "touchedAt">;
type Thumb = { id: string; url: string; local: boolean };
export type InitialPhoto = { id: string; sample_id: string; url: string };

const uuid = () => crypto.randomUUID();

/**
 * Billeder pr. prove.
 *
 * To raekker: et oversigtsbillede af hvor proven er taget, og et naerbillede
 * af materialet. Flere goer hverken dokumentationen staerkere eller
 * gennemgangen inden afgang hurtigere — den bliver bare laengere at scrolle.
 */
const MAX_PHOTOS = 2;

const labelFor = (d: Draft) =>
  ANALYSIS_FIELDS.some((a) => d[a.key]) ? `P${d.seq}` : String(d.seq);

/** Navnene pa de analyser perioden slar fra, som "A og B". */
const EXCLUDED_LABELS = (() => {
  const names = ANALYSIS_FIELDS.filter(
    (a) => !analysisApplies(a.key, "efter_1990"),
  ).map((a) => a.label);
  return names.length > 1
    ? `${names.slice(0, -1).join(", ")} og ${names[names.length - 1]}`
    : names.join("");
})();

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
    // Raekker gemt for perioden begraensede analyserne kan baere et valg der
    // ikke laengere kan traeffes. Draften viser det perioden tillader, sa
    // knappen og det gemte ikke siger hver sit.
    ...analysesForPeriod(s.period),
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
  samplesWithResults,
  initialSeq,
}: {
  caseId: string;
  userId: string;
  buildings: CaseBuilding[];
  materials: string[];
  sampleTypes: string[];
  initialSamples: Sample[];
  initialPhotos: InitialPhoto[];
  /** Prover der har et svar fra laboratoriet. Det folger med, hvis de slettes. */
  samplesWithResults: string[];
  /** Aabner direkte pa en bestemt prove, nar man kommer fra sagsoverblikket. */
  initialSeq?: number;
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

  const startIndex =
    initialSeq != null
      ? Math.max(
          0,
          initialSamples.findIndex((s) => s.seq === initialSeq),
        )
      : initialSamples.length;

  const [index, setIndex] = useState(startIndex);

  const [photos, setPhotos] = useState<Record<string, Thumb[]>>(() => {
    const map: Record<string, Thumb[]> = {};
    for (const p of initialPhotos) {
      (map[p.sample_id] ??= []).push({ id: p.id, url: p.url, local: false });
    }
    return map;
  });

  /**
   * Om nogen har rort raekken.
   *
   * Skelner den blanke raekke i enden — som bare ligger klar — fra en prove
   * der bevidst er efterladt uden materiale. Materiale kan ikke laengere
   * bruges til det, nu hvor det er frivilligt.
   */
  const started = (d: Draft) =>
    (photos[d.id]?.length ?? 0) > 0 ||
    !!d.material ||
    !!d.sample_type ||
    !!d.comment ||
    d.estimated_tons != null ||
    ANALYSIS_FIELDS.some((a) => d[a.key]);

  const draft = rows[index];
  const [tonsText, setTonsText] = useState(() =>
    formatDecimal(initialSamples[startIndex]?.estimated_tons ?? null),
  );
  const [pending, setPending] = useState({ samples: 0, photos: 0 });
  /** Sidste forsog efterlod noget i koen — typisk fordi der ikke er daekning. */
  const [stalled, setStalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sletter, setSletter] = useState(false);

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
  const atPhotoLimit = thumbs.length >= MAX_PHOTOS;
  const photoLimitNotice = `Der er plads til ${MAX_PHOTOS} billeder pr. prøve. Slet et for at tage et nyt.`;
  const isLabSample = ANALYSIS_FIELDS.some((a) => draft[a.key]);
  const label = labelFor(draft);
  const isLastRow = index === rows.length - 1;
  const harSvar = samplesWithResults.includes(draft.id);

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

  const sync = useCallback(async () => {
    const res = await flush(supabase);
    setStalled(res.failed > 0);
    await refreshPending();
    return res;
  }, [supabase, refreshPending]);

  /**
   * Tommer koen kort efter at screeneren er holdt op med at aendre noget.
   *
   * Uden den ville en raekke blive liggende til naeste sideskift, og
   * ventebanneret dukke op ved hvert eneste tastetryk.
   */
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => void sync(), 1500);
  }, [sync]);

  useEffect(
    () => () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    },
    [],
  );

  const persist = useCallback(
    async (d: Draft) => {
      await savePendingSample({ ...d, touchedAt: Date.now() });
      await refreshPending();
      scheduleSync();
    },
    [refreshPending, scheduleSync],
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
    // Sidste laas. De tre veje ind stopper hver for sig med en besked, men
    // graensen skal ogsa holde hvis en af dem far en vej udenom.
    if (atPhotoLimit) return;

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

  /** Systemets kamera, nar det indbyggede ikke kan bruges. */
  function openFilePicker() {
    if (atPhotoLimit) {
      setNotice(photoLimitNotice);
      return;
    }
    fileInput.current?.click();
  }

  async function onShutter() {
    if (atPhotoLimit) {
      setNotice(photoLimitNotice);
      return;
    }
    const shot = await capture();
    if (shot) await addPhoto(shot);
    else openFilePicker();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (atPhotoLimit) {
      setNotice(photoLimitNotice);
      return;
    }
    await addPhoto(await compressImageFile(file));
  }

  async function removePhoto(id: string) {
    // Et billede kan ikke tages om, nar screeneren er kort hjem fra adressen.
    // Derfor en bekraeftelse frem for et tryk der bare sletter.
    if (!window.confirm("Slet billedet?")) return;

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

  /**
   * Hvad der forsvinder med proven, skrevet ud et lag ad gangen.
   *
   * Kommentaren og analyserne er felter pa raekken og ikke egne tabeller, men
   * de er arbejde nogen har lagt, og de er vaek bagefter. Sa staar de der.
   */
  function sletLag(): SletLag[] {
    const lag: SletLag[] = [
      {
        id: "proeve",
        tekst: `Prøve ${label} — ${draft.material ?? "uden materiale"}${
          draft.sample_type ? `, ${draft.sample_type}` : ""
        }`,
      },
    ];

    if (thumbs.length > 0) {
      lag.push({
        id: "billeder",
        tekst: `${thumbs.length} billede${thumbs.length === 1 ? "" : "r"} af prøven`,
      });
    }

    const valgte = ANALYSIS_FIELDS.filter((a) => draft[a.key]);
    if (valgte.length > 0) {
      lag.push({
        id: "analyser",
        tekst: `De valgte analyser: ${valgte.map((a) => a.label).join(", ")}`,
      });
    }

    if (draft.comment?.trim()) {
      lag.push({ id: "kommentar", tekst: "Kommentaren til prøven" });
    }

    if (harSvar) {
      lag.push({ id: "svar", tekst: "Svaret fra laboratoriet på prøven" });
    }

    return lag;
  }

  /**
   * Sletter den aktuelle prove med billeder og det hele.
   *
   * Det lokale slettes forst. Ellers kunne en synk der allerede er i gang na
   * at skrive raekken op igen, eller et foto uden prove blive liggende i koen
   * og fejle pa fremmednoglen resten af dagen.
   *
   * Daekningen ma ikke kunne spaerre vejen: proven forsvinder pa telefonen
   * uanset hvad. Naede raekken i Supabase ikke med, siges det — den kommer
   * tilbage naeste gang siden hentes.
   */
  async function sletProeve(): Promise<string | null> {
    setBusy(true);
    try {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      await dropSampleEverywhere(draft.id);

      // Raekkerne i sample_photos falder med proven, men filerne i storage
      // skal fjernes selv — og stierne skal laeses for raekkerne er vaek.
      const { data: stored } = await supabase
        .from("sample_photos")
        .select("storage_path")
        .eq("sample_id", draft.id)
        .returns<{ storage_path: string }[]>();

      const { error } = await supabase
        .from("samples")
        .delete()
        .eq("id", draft.id);

      if (!error && stored?.length) {
        await supabase.storage
          .from(PHOTO_BUCKET)
          .remove(stored.map((r) => r.storage_path));
      }

      for (const t of photos[draft.id] ?? []) {
        if (!t.local) continue;
        URL.revokeObjectURL(t.url);
        localUrls.current.delete(t.url);
      }
      setPhotos((p) => {
        const next = { ...p };
        delete next[draft.id];
        return next;
      });

      const remaining = rows.filter((r) => r.id !== draft.id);
      const last = remaining[remaining.length - 1];
      const nextSeq =
        Math.max(0, ...remaining.filter((r) => started(r)).map((r) => r.seq)) + 1;

      // Der skal altid ligge en blank raekke klar i enden. Slettes den sidste
      // prove, arver den blanke nummeret igen — ellers ville naeste prove
      // springe et nummer over uden grund.
      if (!last || started(last)) {
        remaining.push(nextDraft(caseId, nextSeq, userId, last));
      } else {
        remaining[remaining.length - 1] = { ...last, seq: nextSeq };
      }

      const target = Math.min(index, remaining.length - 1);
      setRows(remaining);
      setIndex(target);
      setTonsText(formatDecimal(remaining[target]?.estimated_tons ?? null));
      setSletter(false);
      setNotice(
        error
          ? "Prøven er væk på telefonen, men kunne ikke slettes i skyen. Prøv igen, når der er forbindelse."
          : null,
      );
      await refreshPending();
      router.refresh();
      return null;
    } finally {
      setBusy(false);
    }
  }

  /**
   * Gemmer den aktuelle raekke.
   *
   * En prove skal have en lokalitet og mindst et billede. Materiale,
   * proveart, maengde og analyser er frivillige — screeneren skal kunne
   * registrere at hun har staet et sted og fotograferet det, uden at kunne
   * sige hvad det er. En sadan raekke far ingen P og sendes ikke til
   * laboratoriet, praecis som en raekke uden analyser.
   *
   * require er "screeneren gar videre til naeste prove"; sa skal raekken vaere
   * hel. Uden require er det et sideskift eller en afslutning, og sa gemmes
   * det der star, uden at spaerre vejen tilbage.
   */
  async function commit(require: boolean): Promise<boolean> {
    if (require) {
      if (buildings.length > 0 && !draft.building_id) {
        setNotice("Vælg en lokalitet, før du går videre.");
        return false;
      }
      if (thumbs.length === 0) {
        setNotice("Tag mindst ét billede, før du går videre.");
        return false;
      }
    } else if (!started(draft)) {
      // Den blanke raekke i enden er ikke en prove endnu. Den ligger bare
      // klar, og skal ikke gemmes som en tom registrering.
      return true;
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
  const filled = rows.filter((r) => started(r)).length;

  return (
    <div className="flex flex-1 flex-col">
      <header className="safe-t sticky top-0 z-20 border-b border-border bg-surface">
        <div className="flex h-12 items-center gap-1 px-2">
          <Link href={`/sager/${caseId}`} className="tap px-2 text-muted hover:text-fg">
            ←
          </Link>

          <button
            type="button"
            onClick={onPrev}
            disabled={index === 0 || busy}
            aria-label="Forrige prøve"
            className="tap px-2 text-lg hover:text-primary disabled:opacity-25"
          >
            ‹
          </button>

          <span className="font-semibold">Prøve {draft.seq}</span>
          <span
            className={`tabular rounded-md px-1.5 text-sm font-semibold ${
              isLabSample ? "bg-primary-soft text-primary" : "bg-surface-2 text-muted"
            }`}
          >
            {label}
          </span>

          <button
            type="button"
            onClick={onNext}
            disabled={busy}
            aria-label="Næste prøve"
            className="tap px-2 text-lg hover:text-primary disabled:opacity-25"
          >
            ›
          </button>

          <span className="ml-auto pr-2 text-xs text-muted">
            {filled} registreret
          </span>
        </div>
        {/* Kun nar der er noget galt. Koen fyldes og tommes hele tiden under
            normalt arbejde, og et banner ved hvert tastetryk laerer screeneren
            at overse det — netop nar daekningen svigter. */}
        {stalled && unsynced > 0 && (
          <p className="bg-warning-soft px-4 py-1 text-xs text-warning">
            {unsynced} ting venter på forbindelse
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
                  className="tap rounded-lg border border-white/40 px-4 hover:bg-white/10"
                >
                  Prøv igen
                </button>
              )}
              {cameraState !== "starting" && (
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="tap rounded-lg bg-white px-4 text-black hover:bg-white/85"
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
            className="tap absolute right-3 top-3 rounded-full bg-black/50 px-3 text-white hover:bg-black/70"
          >
            {torchOn ? "Lys fra" : "Lys til"}
          </button>
        )}

        {/* En baelte over billedet frem for et lag der daekker det: screeneren
            skal stadig kunne se motivet nar hun blader til naeste prove. */}
        {atPhotoLimit && (
          <p className="absolute inset-x-0 bottom-0 bg-black/70 px-4 py-2 text-center text-sm text-white">
            {MAX_PHOTOS} af {MAX_PHOTOS} billeder — slet et for at tage et nyt
          </p>
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
          <p className="text-[13px] text-muted">
            Tryk på billedet ovenfor — hver prøve skal have mindst ét billede
          </p>
        ) : (
          thumbs.map((t) => (
            // Selve billedet er ikke en knap. Sletning ligger pa det lille
            // kryds, sa et tilfaeldigt tryk ikke koster et foto.
            <div
              key={t.id}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(t.id)}
                aria-label="Slet billedet"
                className="absolute right-0.5 top-0.5 flex size-6 items-center justify-center rounded-full bg-black/65 text-sm leading-none text-white"
              >
                ×
              </button>
            </div>
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
          <span className="label-xs">Periode</span>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PERIOD_LABEL) as BuildingPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  const period = draft.period === p ? null : p;
                  update({ period, ...analysesForPeriod(period) });
                }}
                aria-pressed={draft.period === p}
                className={`tap rounded-xl px-3 transition-colors ${
                  draft.period === p
                    ? "bg-primary-soft font-medium text-primary inset-ring inset-ring-primary-line"
                    : "bg-surface shadow-card hover:bg-surface-2"
                }`}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="label-xs">Estimeret mængde (ton)</span>
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
            className="tap tabular w-full rounded-xl bg-surface px-3.5 py-2.5 shadow-card outline-none placeholder:text-muted"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="label-xs">Analyser</span>
          <div className="grid grid-cols-2 gap-2">
            {ANALYSIS_FIELDS.map((a) => {
              const applies = analysisApplies(a.key, draft.period);
              return (
                <button
                  key={a.key}
                  type="button"
                  disabled={!applies}
                  onClick={() => update({ [a.key]: !draft[a.key] })}
                  aria-pressed={draft[a.key]}
                  className={`tap rounded-xl px-3 text-sm transition-colors ${
                    draft[a.key]
                      ? "bg-primary-soft font-medium text-primary inset-ring inset-ring-primary-line"
                      : "bg-surface shadow-card hover:bg-surface-2"
                  } ${applies ? "" : "opacity-40"}`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-muted">
            {isLabSample
              ? `Sendes til laboratoriet som ${label}.`
              : "Uden analyse registreres materialet kun — det sendes ikke til laboratoriet."}
            {draft.period === "efter_1990" &&
              ` ${EXCLUDED_LABELS} bestilles ikke på en bygning fra efter 1990.`}
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="label-xs">Kommentar</span>
          <textarea
            rows={2}
            value={draft.comment ?? ""}
            onChange={(e) => update({ comment: e.target.value || null })}
            className="w-full rounded-xl bg-surface px-3.5 py-2.5 shadow-card outline-none"
          />
        </label>

        {/* Sletning ligger nederst og uden flade: den skal kunne findes, men
            aldrig rammes pa vej ned gennem felterne. */}
        {started(draft) && (
          <button
            type="button"
            onClick={() => setSletter(true)}
            disabled={busy}
            className="tap -mx-1 self-start px-1 text-left text-sm font-medium text-danger hover:underline disabled:opacity-50"
          >
            Slet prøve {draft.seq}
          </button>
        )}

        {filled > 0 && (
          <section>
            <h2 className="label-xs uppercase tracking-wide">
              Registreret på sagen
            </h2>
            <ul className="mt-2 flex flex-col gap-1">
              {rows.map((r, i) =>
                started(r) ? (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (i === index) return;
                        await commit(false);
                        goTo(i);
                      }}
                      className={`tap flex w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors ${
                        i === index
                          ? "bg-primary-soft inset-ring inset-ring-primary-line"
                          : "bg-surface shadow-card hover:bg-surface-2"
                      }`}
                    >
                      <span className="tabular w-8 shrink-0 font-semibold">
                        {labelFor(r)}
                      </span>
                      <span
                        className={`truncate ${r.material ? "" : "text-muted"}`}
                      >
                        {r.material ?? "Uden materiale"}
                      </span>
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

      {/* max-w matcher app-layoutets kolonne, sa linjen ikke spaender hele
          skaermen pa en pc. */}
      <div className="safe-b fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-xl border-t border-border bg-surface px-4 pt-3">
        {notice && <p className="pb-2 text-xs text-warning">{notice}</p>}
        {/* "Naeste" er den handling der gentages hundredvis af gange, sa den
            far bade mest plads og den staerkeste vaegt. */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onNext}
            disabled={busy}
            className="tap flex-1 rounded-xl bg-primary px-4 font-medium text-primary-fg hover:bg-primary-hover active:bg-primary-hover disabled:opacity-60"
          >
            {isLastRow ? "Næste prøve" : "Næste"}
          </button>
          <button
            type="button"
            onClick={onFinish}
            disabled={busy}
            className="tap rounded-xl border border-border-strong hover:bg-surface-2 px-5 font-medium disabled:opacity-60"
          >
            Afslut
          </button>
        </div>
      </div>

      {sletter && (
        <SletDialog
          titel={`Slet prøve ${draft.seq}?`}
          indledning="Alt på prøven forsvinder med den, og det kan ikke fortrydes. Posen i bilen beholder sit nummer — næste prøve får det næste."
          lag={sletLag()}
          sletTekst="Slet prøven"
          onSlet={sletProeve}
          onLuk={() => setSletter(false)}
        />
      )}
    </div>
  );
}
