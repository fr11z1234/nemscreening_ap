"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Besked, felt, GemKnap } from "@/components/PanelFelter";
import { Maerke } from "@/components/rapport/Linjegruppe";
import { maerkerFor, TEKST_ORDEN } from "@/lib/rapport/ressourcer";
import type { Indstillinger } from "@/lib/indstillinger";
import {
  DISPOSAL_SENTENCE_FIELD,
  DISPOSAL_SENTENCE_HINT,
  type Bortskaffelsestekst,
} from "@/lib/types";
import { gemIndstillinger } from "./actions";
import type { PanelState } from "@/lib/panel";

/**
 * Bortskaffelsesteksterne, faelles for alle materialer.
 *
 * De fire saetninger er de samme uanset materiale — «farligt affald skal til et
 * godkendt modtageanlaeg» aendrer sig ikke af, om det er beton eller tagpap. De
 * blev alligevel skrevet pr. materiale, fordi de bor sammen med genbrugs- og
 * genanvendelsessaetningen, og de to ER forskellige fra materiale til materiale.
 *
 * Derfor en kontakt og ikke en udskiftning: paapeger en kommune en dag, at en
 * tekst skal vaere unik for det enkelte materiale, er svaret et flueben og ikke
 * en udrulning. Materialernes egne saetninger staar uroerte imens.
 */
export function IndstillingerPanel({
  indstillinger,
}: {
  indstillinger: Indstillinger;
}) {
  const [state, formAction] = useActionState<PanelState, FormData>(
    gemIndstillinger,
    {},
  );

  const [faelles, setFaelles] = useState(indstillinger.faellesBortskaffelse);
  const [tekster, setTekster] = useState<Record<string, string>>(
    Object.fromEntries(
      TEKST_ORDEN.map((t) => [
        DISPOSAL_SENTENCE_FIELD[t],
        indstillinger.tekster[t] ?? "",
      ]),
    ),
  );

  return (
    <form action={formAction} className="mt-6 flex max-w-3xl flex-col gap-5">
      <section>
        <h2 className="text-lg font-semibold">Bortskaffelsestekster</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Rapportens forureningsafsnit skriver en sætning om, hvad der skal ske
          med affaldet. Sætningen kan enten være fælles for alle materialer —
          så står den ét sted under linjerne — eller stå på hvert materiale
          under{" "}
          <Link href="/materialer" className="underline hover:text-fg">
            Materialer
          </Link>
          .
        </p>
      </section>

      {/* Kontakten forst: den afgor, om felterne nedenunder overhovedet bliver
          laest, og det skal kunne ses for man skriver i dem. */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-grid bg-surface p-4">
        <input
          type="checkbox"
          name="faelles"
          checked={faelles}
          onChange={(e) => setFaelles(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
        />
        <span className="flex flex-col gap-1">
          <span className="font-medium">
            Brug én fælles tekst for alle materialer
          </span>
          <span className="text-sm leading-relaxed text-muted">
            {faelles
              ? "Rapporten skriver de fire tekster én gang under forureningslinjerne, og mærket på linjen peger på den, der gælder."
              : "Rapporten henter sætningen fra hvert materiale og skriver den efter mængden. Felterne nedenfor bruges ikke."}
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-4">
        {TEKST_ORDEN.map((t) => (
          <Tekstfelt
            key={t}
            tekst={t}
            vaerdi={tekster[DISPOSAL_SENTENCE_FIELD[t]]}
            onChange={(v) =>
              setTekster((s) => ({ ...s, [DISPOSAL_SENTENCE_FIELD[t]]: v }))
            }
            ibrug={faelles}
          />
        ))}
      </div>

      <Besked state={state} />

      <div>
        <GemKnap />
      </div>
    </form>
  );
}

/**
 * Et af de fire felter, med det maerke der henter netop den tekst.
 *
 * Maerket og ikke feltets navn: det er det, laeseren ser i rapporten, og det
 * er det, teksten kommer til at staa ved siden af.
 */
function Tekstfelt({
  tekst,
  vaerdi,
  onChange,
  ibrug,
}: {
  tekst: Bortskaffelsestekst;
  vaerdi: string;
  onChange: (v: string) => void;
  ibrug: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${ibrug ? "" : "opacity-55"}`}>
      <span className="flex flex-wrap items-center gap-1">
        {maerkerFor(tekst).map((m) => (
          <Maerke key={m} maerke={m} />
        ))}
      </span>
      <span className="text-xs text-muted">{DISPOSAL_SENTENCE_HINT[tekst]}</span>
      <textarea
        name={DISPOSAL_SENTENCE_FIELD[tekst]}
        rows={4}
        value={vaerdi}
        onChange={(e) => onChange(e.target.value)}
        className={`${felt} resize-y text-sm leading-relaxed`}
      />
    </label>
  );
}
