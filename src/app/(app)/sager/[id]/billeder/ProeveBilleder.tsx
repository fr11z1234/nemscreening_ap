"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SletBilledeDialog } from "@/components/SletBilledeDialog";
import { flush } from "@/lib/offline/sync";
import { photoIsPending } from "@/lib/offline/store";
import {
  MAX_PHOTOS,
  koeBilleder,
  laesFiler,
  sletBillede,
} from "@/lib/offline/billeder";

export type GennemgaaetBillede = { id: string; url: string };
type Billede = GennemgaaetBillede & { lokalt: boolean };

/**
 * En proves billeder i gennemgangen, med det samme greb som i provetagningen:
 * et kryds pa hvert billede, og et stiplet plus hvor der er plads til et nyt.
 *
 * At skifte et billede er at slette det og laegge et nyt op. Der er ingen
 * «erstat»-knap: den ville vaere en tredje vej ind med sine egne regler for
 * hvad der sker, hvis halvdelen gik galt.
 */
export function ProeveBilleder({
  caseId,
  sampleId,
  label,
  kraevet,
  billeder: fraServeren,
}: {
  caseId: string;
  sampleId: string;
  label: string;
  /** Proven skal til laboratoriet, og et billede er derfor ikke frivilligt. */
  kraevet: boolean;
  billeder: GennemgaaetBillede[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const input = useRef<HTMLInputElement>(null);

  // Siden genopfriskes efter hver aendring, sa optaellingen oeverst passer, og
  // komponenten monteres forfra, nar serverens liste aendrer sig (se noeglen
  // pa siden). Indtil da er listen her sin egen: et billede lagt op uden
  // daekning findes kun pa enheden, og det skal blive staaende, til det er oppe.
  const [billeder, setBilleder] = useState<Billede[]>(() =>
    fraServeren.map((b) => ({ ...b, lokalt: false })),
  );
  const [travl, setTravl] = useState(false);
  const [besked, setBesked] = useState<string | null>(null);
  const [tilSletning, setTilSletning] = useState<Billede | null>(null);

  // Object-URL'er til lokale billeder skal frigives. Saettet fyldes kun fra
  // event handlers, aldrig under render.
  const lokaleUrls = useRef<Set<string>>(new Set());
  useEffect(() => {
    const urls = lokaleUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  async function onVaelg(e: React.ChangeEvent<HTMLInputElement>) {
    const filer = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (filer.length === 0) return;

    setTravl(true);
    try {
      const { nye, besked: laesBesked } = await laesFiler(
        filer,
        MAX_PHOTOS - billeder.length,
      );
      const ids = await koeBilleder(caseId, sampleId, nye, billeder.length);
      setBilleder((prev) => [
        ...prev,
        ...nye.map((b, i) => {
          const url = URL.createObjectURL(b.blob);
          lokaleUrls.current.add(url);
          return { id: ids[i], url, lokalt: true };
        }),
      ]);

      await flush(supabase);
      // Spoerges pr. billede og ikke pa synkens samlede tal: en anden proves
      // raekke kan staa fast i koen, uden at det her billede gjorde.
      const venter = (await Promise.all(ids.map(photoIsPending))).some(Boolean);
      setBesked(
        [
          laesBesked,
          venter
            ? "Gemt på enheden. Sendes, når der er forbindelse igen."
            : null,
        ]
          .filter(Boolean)
          .join(" ") || null,
      );
      if (!venter && ids.length > 0) router.refresh();
    } finally {
      setTravl(false);
    }
  }

  async function slet(billede: Billede): Promise<string | null> {
    const fejl = await sletBillede(supabase, caseId, sampleId, billede.id);
    if (fejl) return fejl;

    if (billede.lokalt) {
      URL.revokeObjectURL(billede.url);
      lokaleUrls.current.delete(billede.url);
    }
    setBilleder((prev) => prev.filter((b) => b.id !== billede.id));
    setTilSletning(null);
    setBesked(null);
    router.refresh();
    return null;
  }

  const ledige = Math.max(0, MAX_PHOTOS - billeder.length);
  // Gult kun sa laenge der intet er. Det andet felt pa en prove med et billede
  // er en mulighed, ikke en mangel.
  const mangler = kraevet && billeder.length === 0;

  return (
    <>
      {/* Uden capture: telefonen tilbyder kameraet, billedbiblioteket og
          filerne, og pc'en en almindelig filvaelger. */}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        onChange={onVaelg}
        className="hidden"
      />

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {billeder.map((b, i) => (
          <div
            key={b.id}
            className="relative aspect-square overflow-hidden rounded-xl bg-surface-2"
          >
            {/* Fuld storrelse aabnes i en ny fane. Signeret URL, sa den
                virker uden endnu et login. */}
            <a href={b.url} target="_blank" rel="noreferrer" className="block size-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.url}
                alt={`${label}, billede ${i + 1}`}
                loading="lazy"
                className="size-full object-cover"
              />
            </a>
            <button
              type="button"
              onClick={() => setTilSletning(b)}
              aria-label={`Slet billede ${i + 1} af ${label}`}
              className="tap absolute right-1 top-1 flex items-center justify-center rounded-full bg-black/65 text-xl leading-none text-white hover:bg-black/80 active:bg-black/80"
            >
              ×
            </button>
          </div>
        ))}

        {Array.from({ length: ledige }, (_, i) => (
          <button
            key={`tom-${i}`}
            type="button"
            onClick={() => input.current?.click()}
            disabled={travl}
            aria-label={`Upload billede til ${label}`}
            className={`flex aspect-square items-center justify-center rounded-xl border-2 border-dashed text-5xl leading-none transition-colors disabled:opacity-50 ${
              mangler
                ? "border-warning bg-warning-soft text-warning hover:opacity-85 active:opacity-85"
                : "border-grid text-muted hover:border-primary hover:bg-primary-soft hover:text-primary active:border-primary active:bg-primary-soft active:text-primary"
            }`}
          >
            {travl && i === 0 ? (
              <span className="text-sm">Lægger op…</span>
            ) : (
              "+"
            )}
          </button>
        ))}
      </div>

      {besked && <p className="mt-2 text-xs text-warning">{besked}</p>}

      {tilSletning && (
        <SletBilledeDialog
          url={tilSletning.url}
          onSlet={() => slet(tilSletning)}
          onLuk={() => setTilSletning(null)}
        />
      )}
    </>
  );
}
