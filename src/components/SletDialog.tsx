"use client";

import { useEffect, useId, useState } from "react";

export type SletLag = {
  id: string;
  /** Hvad der forsvinder, skrevet ud: "12 billeder taget i marken". */
  tekst: string;
};

/**
 * Bekraeftelse af en sletning, et lag ad gangen.
 *
 * Et enkelt "er du sikker?" bliver trykket vaek uden at blive laest, og det
 * der forsvinder er altid mere end det man trykkede pa: en sag baerer
 * bygninger, prover, billeder, svar fra laboratoriet og rapportens bilag med
 * ned. Derfor et flueben pr. lag — den der sletter skal have set hvert enkelt
 * staa skrevet, og "Slet" abner sig forst nar de alle er sat.
 *
 * Lag der er tomme kommer ikke med. Et flueben ved "0 billeder" laerer kun
 * folk at saette flueben uden at laese.
 */
export function SletDialog({
  titel,
  indledning,
  lag,
  sletTekst = "Slet",
  onSlet,
  onLuk,
}: {
  titel: string;
  indledning: string;
  lag: SletLag[];
  sletTekst?: string;
  /** Fejlbeskeden, eller null nar det lykkedes. */
  onSlet: () => Promise<string | null>;
  onLuk: () => void;
}) {
  const overskriftId = useId();
  const [afkrydset, setAfkrydset] = useState<string[]>([]);
  const [travl, setTravl] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);

  // Escape er vejen ud af enhver dialog, og her er den ogsa den sikre vej:
  // den fortryder. Ikke mens der slettes — der er der intet at fortryde.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !travl) onLuk();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onLuk, travl]);

  const klar = lag.every((l) => afkrydset.includes(l.id));

  function skift(id: string) {
    setAfkrydset((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }

  async function slet() {
    setFejl(null);
    setTravl(true);

    // Ogsa det kastede. Uden det ville et kald der gik i vandet efterlade
    // dialogen pa "Sletter…" for altid, uden en vej frem eller tilbage.
    let besked: string | null;
    try {
      besked = await onSlet();
    } catch (cause) {
      besked =
        cause instanceof Error ? cause.message : "Det kunne ikke lade sig gøre.";
    }

    if (besked) {
      setFejl(besked);
      setTravl(false);
      return;
    }
    // Ingen setTravl(false) her: lykkes det, forsvinder dialogen sammen med
    // det den slettede, og en tilstand sat pa en afmonteret komponent er
    // stoj i konsollen.
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={overskriftId}
      className="fixed inset-0 z-50 flex items-end justify-center bg-fg/40 p-3 sm:items-center"
    >
      <div className="card max-h-[85vh] w-full max-w-md overflow-y-auto overscroll-contain p-5 shadow-sheet">
        <h2 id={overskriftId} className="text-lg font-semibold text-danger">
          {titel}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{indledning}</p>

        <ul className="mt-4 flex flex-col gap-1.5">
          {lag.map((l) => (
            <li key={l.id}>
              {/* Hele linjen er kontakten. Et flueben pa 20 px er ikke et mal
                  man rammer med en tommelfinger i arbejdshandske. */}
              <label className="tap flex items-start gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-sm leading-relaxed">
                <input
                  type="checkbox"
                  checked={afkrydset.includes(l.id)}
                  onChange={() => skift(l.id)}
                  disabled={travl}
                  className="mt-0.5 size-5 shrink-0 accent-danger"
                />
                <span>{l.tekst}</span>
              </label>
            </li>
          ))}
        </ul>

        {fejl && (
          <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">
            {fejl}
          </p>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={slet}
            disabled={!klar || travl}
            className="tap flex-1 rounded-xl bg-danger px-4 font-medium text-white hover:opacity-85 active:opacity-85 disabled:opacity-40"
          >
            {travl ? "Sletter…" : sletTekst}
          </button>
          <button
            type="button"
            onClick={onLuk}
            disabled={travl}
            className="tap rounded-xl border border-border-strong px-5 font-medium hover:bg-surface-2 active:bg-surface-2 disabled:opacity-50"
          >
            Fortryd
          </button>
        </div>

        {!klar && (
          <p className="mt-2.5 text-center text-xs text-muted">
            Sæt flueben ved alt det, der forsvinder.
          </p>
        )}
      </div>
    </div>
  );
}
